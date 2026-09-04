//! 浏览器 fetch 传输实现（WASM 单线程）。
//! Tauri 壳落地后，此处仅作为浏览器测试模式传输（方案 §16）。
#![allow(dead_code)]

use std::sync::Arc;

use async_trait::async_trait;
use magic_frontend::api::client::{
    ApiClient, HttpMethod, Transport, TransportRequest, TransportResponse,
};
use magic_frontend::api::error::ApiError;

/// 开发模式 API 基址（正式版由 Tauri manifest 下发，FZ-9）。
pub const API_BASE: &str = "http://127.0.0.1:45280";

pub struct GlooTransport;

#[async_trait(?Send)]
impl Transport for GlooTransport {
    async fn send(&self, request: TransportRequest) -> Result<TransportResponse, ApiError> {
        let url = format!("{API_BASE}{}", request.path);
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
    ApiClient::new(Arc::new(GlooTransport), API_BASE)
}
