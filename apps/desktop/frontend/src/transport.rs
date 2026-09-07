//! 浏览器 fetch 传输实现（WASM 单线程）。
//! Tauri 壳落地后，此处仅作为浏览器测试模式传输（方案 §16）。
#![allow(dead_code)]

use std::sync::Arc;

use async_trait::async_trait;
use futures::StreamExt;
use magic_frontend::api::client::{
    ApiClient, HttpMethod, Transport, TransportRequest, TransportResponse,
};
use magic_frontend::api::error::ApiError;
use js_sys::{Reflect, Uint8Array};
use wasm_bindgen::{JsCast, JsValue};
use wasm_bindgen_futures::JsFuture;
use web_sys::{Headers, ReadableStreamDefaultReader, Request, RequestInit, Response};

/// 开发模式 API 基址（正式版由 Tauri manifest 下发，FZ-9）。
pub const API_BASE: &str = "http://127.0.0.1:45280";

/// The desktop shell may inject this short-lived value on `window` without
/// putting it in the URL, local storage, or the DSH session transcript.
const API_TOKEN_PROPERTY: &str = "__MAGIC_API_TOKEN__";
const API_BASE_PROPERTY: &str = "__MAGIC_API_BASE__";

pub fn api_base() -> String {
    let window = web_sys::window();
    window
        .and_then(|window| {
            Reflect::get(window.as_ref(), &JsValue::from_str(API_BASE_PROPERTY))
                .ok()
                .and_then(|value| value.as_string())
        })
        .filter(|base| !base.trim().is_empty())
        .unwrap_or_else(|| API_BASE.to_owned())
}

pub fn api_token() -> Option<String> {
    let window = web_sys::window()?;
    Reflect::get(window.as_ref(), &JsValue::from_str(API_TOKEN_PROPERTY))
        .ok()
        .and_then(|value| value.as_string())
        .filter(|token| !token.trim().is_empty())
}

pub struct GlooTransport;

#[async_trait(?Send)]
impl Transport for GlooTransport {
    async fn send(&self, request: TransportRequest) -> Result<TransportResponse, ApiError> {
        let url = format!("{}{}", api_base(), request.path);
        let builder = match request.method {
            HttpMethod::Get => gloo_net::http::Request::get(&url),
            HttpMethod::Post => gloo_net::http::Request::post(&url),
            HttpMethod::Delete => gloo_net::http::Request::delete(&url),
        };
        let mut builder = builder;
        for (key, value) in &request.headers {
            builder = builder.header(key, value);
        }
        // 超时由浏览器默认行为兜底（粗糙版）；正式版在此实现读 10s/写 30s（方案 §7）。
        let response = match &request.body {
            Some(body) => builder
                .body(body.clone())
                .map_err(|e| ApiError::Network(e.to_string()))?
                .send()
                .await
                .map_err(|e| ApiError::Network(e.to_string()))?,
            None => builder
                .send()
                .await
                .map_err(|e| ApiError::Network(e.to_string()))?,
        };
        let status = response.status();
        let text = response
            .text()
            .await
            .map_err(|e| ApiError::Network(e.to_string()))?;
        Ok(TransportResponse { status, body: text })
    }
}

pub fn make_client() -> ApiClient {
    let client = ApiClient::new(Arc::new(GlooTransport), api_base());
    if let Some(token) = api_token() {
        client.with_token(token)
    } else {
        client
    }
}

/// Consume a browser SSE endpoint. Fetch is used when the desktop shell has
/// supplied a token because EventSource cannot set an Authorization header;
/// the tokenless development preview keeps the simpler native EventSource.
pub async fn follow_sse<F>(url: &str, token: Option<&str>, mut on_event: F) -> Result<(), String>
where
    F: FnMut(String),
{
    if token.is_none() {
        return follow_event_source(url, on_event).await;
    }

    let headers = Headers::new().map_err(js_error)?;
    headers.set("Accept", "text/event-stream").map_err(js_error)?;
    headers
        .set("Authorization", &format!("Bearer {}", token.unwrap_or_default()))
        .map_err(js_error)?;
    let options = RequestInit::new();
    options.set_method("GET");
    options.set_headers(&headers);
    let request = Request::new_with_str_and_init(url, &options).map_err(js_error)?;
    let window = web_sys::window().ok_or_else(|| "browser window is unavailable".to_string())?;
    let response = JsFuture::from(window.fetch_with_request(&request))
        .await
        .map_err(js_error)?;
    let response: Response = response.dyn_into().map_err(js_error)?;
    if !response.ok() {
        return Err(format!("SSE request failed with HTTP {}", response.status()));
    }
    let body = response
        .body()
        .ok_or_else(|| "SSE response has no readable body".to_string())?;
    let reader: ReadableStreamDefaultReader = body
        .get_reader()
        .dyn_into()
        .map_err(|error| js_error(error.into()))?;
    let mut decoder = SseDecoder::default();
    loop {
        let result = JsFuture::from(reader.read()).await.map_err(js_error)?;
        let done = Reflect::get(&result, &JsValue::from_str("done"))
            .map_err(js_error)?
            .as_bool()
            .unwrap_or(false);
        let value = Reflect::get(&result, &JsValue::from_str("value")).map_err(js_error)?;
        if !value.is_undefined() && !value.is_null() {
            let bytes = Uint8Array::new(&value).to_vec();
            decoder.push(&bytes, &mut on_event)?;
        }
        if done {
            decoder.finish(&mut on_event)?;
            return Ok(());
        }
    }
}

async fn follow_event_source<F>(url: &str, mut on_event: F) -> Result<(), String>
where
    F: FnMut(String),
{
    let mut source = gloo_net::eventsource::futures::EventSource::new(url)
        .map_err(|error| error.to_string())?;
    let mut stream = source
        .subscribe("message")
        .map_err(|error| error.to_string())?;
    while let Some(result) = stream.next().await {
        let (_event_type, event) = result.map_err(|error| error.to_string())?;
        if let Some(data) = event.data().as_string() {
            on_event(data);
        }
    }
    Err("SSE connection closed".into())
}

#[derive(Default)]
struct SseDecoder {
    bytes: Vec<u8>,
    data_lines: Vec<String>,
}

impl SseDecoder {
    fn push<F>(&mut self, chunk: &[u8], on_event: &mut F) -> Result<(), String>
    where
        F: FnMut(String),
    {
        self.bytes.extend_from_slice(chunk);
        while let Some(index) = self.bytes.iter().position(|byte| *byte == b'\n') {
            let line = self.bytes.drain(..=index).collect::<Vec<_>>();
            self.line(&line[..line.len().saturating_sub(1)], on_event)?;
        }
        Ok(())
    }

    fn finish<F>(&mut self, on_event: &mut F) -> Result<(), String>
    where
        F: FnMut(String),
    {
        if !self.bytes.is_empty() {
            let line = std::mem::take(&mut self.bytes);
            self.line(&line, on_event)?;
        }
        if !self.data_lines.is_empty() {
            on_event(self.data_lines.join("\n"));
            self.data_lines.clear();
        }
        Ok(())
    }

    fn line<F>(&mut self, line: &[u8], on_event: &mut F) -> Result<(), String>
    where
        F: FnMut(String),
    {
        let line = line.strip_suffix(b"\r").unwrap_or(line);
        if line.is_empty() {
            if !self.data_lines.is_empty() {
                on_event(self.data_lines.join("\n"));
                self.data_lines.clear();
            }
            return Ok(());
        }
        if let Some(data) = line.strip_prefix(b"data:") {
            let data = data.strip_prefix(b" ").unwrap_or(data);
            self.data_lines.push(
                String::from_utf8(data.to_vec()).map_err(|error| error.to_string())?,
            );
        }
        Ok(())
    }
}

fn js_error(error: JsValue) -> String {
    error
        .as_string()
        .unwrap_or_else(|| "browser SSE operation failed".into())
}
