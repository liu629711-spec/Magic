//! ApiClient：传输通道隔离（方案 §7）。
//!
//! 页面代码只依赖本模块，不感知传输实现：WASM 侧由 Yew 壳提供 gloo-net Transport，
//! 测试提供 MockTransport（冻结契约样例驱动）。重试判定在 [`ApiError::retryable`]，
//! 409 一律进入幂等冲突卡、禁止静默重试（方案 §6.4/§9.4）。

use async_trait::async_trait;
use std::sync::Arc;

use super::dto::{
    ApiErrorBody, AttemptListResponse, AttemptResponse, BindingResponse, CreateTaskRequestBody,
    CreateTaskResponse, DispatchRequestBody, EventsResponse, HealthResponse, ReconcileResponse,
    ServiceInfoResponse, TaskDetailResponse, TaskListResponse,
};
use super::error::ApiError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HttpMethod {
    Get,
    Post,
}

/// 事件查询的 source 过滤（取值为实际落账值：
/// `crates/persistence/src/lib.rs:270`、`crates/reconciliation/src/lib.rs:105`）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EventSourceFilter {
    Magic,
    OpencodeV1,
}

impl EventSourceFilter {
    pub fn as_str(self) -> &'static str {
        match self {
            EventSourceFilter::Magic => "magic",
            EventSourceFilter::OpencodeV1 => "opencode-v1",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TransportRequest {
    pub method: HttpMethod,
    /// 以 `/` 开头的路径，查询串已编码。
    pub path: String,
    pub headers: Vec<(String, String)>,
    pub body: Option<String>,
    /// 方案 §7：读 10s、写 30s，由传输实现执行超时。
    pub timeout_secs: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TransportResponse {
    pub status: u16,
    pub body: String,
}

/// 传输通道抽象。`?Send`：WASM 单线程下 fetch future 不满足 Send，
/// 本 crate 明确定位为 Yew/WASM 侧（方案 §7），宿主 mock 测试用 block_on 驱动即可。
#[async_trait(?Send)]
pub trait Transport {
    async fn send(&self, request: TransportRequest) -> Result<TransportResponse, ApiError>;
}

/// 派发结果（S3）：首次创建 201，幂等复用 200。两者都不是错误（方案 §6.4）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DispatchOutcome {
    Created(AttemptResponse),
    Reused(AttemptResponse),
}

/// 创建任务结果：首次 201，幂等复用 200。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CreateTaskOutcome {
    Created(CreateTaskResponse),
    Reused(CreateTaskResponse),
}

#[derive(Clone)]
pub struct ApiClient {
    transport: Arc<dyn Transport>,
    base_url: String,
    token: Option<String>,
    read_timeout_secs: u64,
    write_timeout_secs: u64,
}

impl std::fmt::Debug for ApiClient {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("ApiClient")
            .field("base_url", &self.base_url)
            .field("token", &self.token.as_ref().map(|_| "***"))
            .field("read_timeout_secs", &self.read_timeout_secs)
            .field("write_timeout_secs", &self.write_timeout_secs)
            .finish()
    }
}

impl ApiClient {
    pub fn new(transport: Arc<dyn Transport>, base_url: impl Into<String>) -> Self {
        Self {
            transport,
            base_url: base_url.into().trim_end_matches('/').to_string(),
            token: None,
            read_timeout_secs: 10,
            write_timeout_secs: 30,
        }
    }

    /// Bearer 令牌槽（FZ-9：来自 manifest；开发模式可缺省）。
    pub fn with_token(mut self, token: impl Into<String>) -> Self {
        self.token = Some(token.into());
        self
    }

    async fn send_json(
        &self,
        method: HttpMethod,
        path: String,
        body: Option<serde_json::Value>,
        write: bool,
    ) -> Result<TransportResponse, ApiError> {
        let mut headers = Vec::new();
        if let Some(token) = &self.token {
            headers.push(("Authorization".into(), format!("Bearer {token}")));
        }
        if body.is_some() {
            headers.push(("Content-Type".into(), "application/json".into()));
        }
        let request = TransportRequest {
            method,
            path,
            headers,
            body: body.map(|value| value.to_string()),
            timeout_secs: if write {
                self.write_timeout_secs
            } else {
                self.read_timeout_secs
            },
        };
        let response = self.transport.send(request).await?;
        if (200..300).contains(&response.status) {
            Ok(response)
        } else {
            let message = serde_json::from_str::<ApiErrorBody>(&response.body)
                .map(|e| e.error)
                .unwrap_or_else(|_| response.body.clone());
            Err(ApiError::Status(response.status, message))
        }
    }

    /// 创建 Task（清单第 1 条，后端已实现）：`request_hash` 按 FZ-5 规范化体口径，
    /// 由调用方用 [`crate::api::ids::non_dispatch_request_hash`] 计算后传入。
    pub async fn create_task(
        &self,
        body: &CreateTaskRequestBody,
    ) -> Result<CreateTaskOutcome, ApiError> {
        let payload = serde_json::to_value(body).map_err(|e| ApiError::Decode(e.to_string()))?;
        let response = self
            .send_json(HttpMethod::Post, "/api/tasks".into(), Some(payload), true)
            .await?;
        let parsed: CreateTaskResponse = parse(&response)?;
        if response.status == 201 {
            Ok(CreateTaskOutcome::Created(parsed))
        } else {
            Ok(CreateTaskOutcome::Reused(parsed))
        }
    }

    /// 派发 Attempt（已实现，S1/S3）。502 表示执行已失败并落账（S9），不自动重发。
    pub async fn dispatch_attempt(
        &self,
        task_id: &str,
        body: &DispatchRequestBody,
    ) -> Result<DispatchOutcome, ApiError> {
        let payload = serde_json::to_value(body).map_err(|e| ApiError::Decode(e.to_string()))?;
        let response = self
            .send_json(
                HttpMethod::Post,
                format!("/api/tasks/{task_id}/attempts"),
                Some(payload),
                true,
            )
            .await?;
        let parsed: AttemptResponse = parse(&response)?;
        if response.status == 201 {
            Ok(DispatchOutcome::Created(parsed))
        } else {
            Ok(DispatchOutcome::Reused(parsed))
        }
    }

    /// 对账（已实现，S1；FZ-1 冻结语义）：状态探测——会话存活 → 200 状态不变无事件；
    /// 终态证据 → 收口；无 binding/会话丢失/对账失败 → 200 落 `unknown_after_restart`。
    /// 注意：用户 reconcile 对无 binding 的活跃 Attempt 返回 200 unknown（不再是旧 409 MissingBinding）。
    pub async fn reconcile_attempt(
        &self,
        task_id: &str,
        attempt_id: &str,
    ) -> Result<ReconcileResponse, ApiError> {
        let response = self
            .send_json(
                HttpMethod::Post,
                format!("/api/tasks/{task_id}/attempts/{attempt_id}/reconcile"),
                None,
                false,
            )
            .await?;
        parse(&response)
    }

    /// 存活探测（B-7）：状态带轮询入口（方案 §6.6 工作台/列表 10s 节奏）。
    pub async fn health(&self) -> Result<HealthResponse, ApiError> {
        let response = self
            .send_json(HttpMethod::Get, "/health".into(), None, false)
            .await?;
        parse(&response)
    }

    /// 能力发现（FZ-9）：service-info 为权威，前端据此渲染"能力未接入"空态。
    pub async fn service_info(&self) -> Result<ServiceInfoResponse, ApiError> {
        let response = self
            .send_json(HttpMethod::Get, "/api/service-info".into(), None, false)
            .await?;
        parse(&response)
    }

    /// Task 列表（FZ-4）。
    pub async fn task_list(
        &self,
        status: Option<&str>,
        owner: Option<&str>,
        limit: Option<u32>,
        offset: Option<u64>,
    ) -> Result<TaskListResponse, ApiError> {
        let mut query: Vec<(&str, String)> = Vec::new();
        if let Some(value) = status {
            query.push(("status", value.to_string()));
        }
        if let Some(value) = owner {
            query.push(("owner", value.to_string()));
        }
        if let Some(value) = limit {
            query.push(("limit", value.to_string()));
        }
        if let Some(value) = offset {
            query.push(("offset", value.to_string()));
        }
        let response = self
            .send_json(HttpMethod::Get, build_path("/api/tasks", &query), None, false)
            .await?;
        parse(&response)
    }

    /// Task 详情（清单第 3 条）。
    pub async fn task_detail(&self, task_id: &str) -> Result<TaskDetailResponse, ApiError> {
        let response = self
            .send_json(
                HttpMethod::Get,
                format!("/api/tasks/{task_id}"),
                None,
                false,
            )
            .await?;
        parse(&response)
    }

    /// Attempt 列表（清单第 4 条，`attempt_no` 倒序）。
    pub async fn attempt_list(
        &self,
        task_id: &str,
        cursor: Option<u64>,
    ) -> Result<AttemptListResponse, ApiError> {
        let path = build_path(
            &format!("/api/tasks/{task_id}/attempts"),
            &cursor.map(|c| vec![("cursor", c.to_string())]).unwrap_or_default(),
        );
        let response = self.send_json(HttpMethod::Get, path, None, false).await?;
        parse(&response)
    }

    /// Binding 查询（清单第 6 条）：仅证据引用。
    pub async fn attempt_binding(
        &self,
        attempt_id: &str,
    ) -> Result<BindingResponse, ApiError> {
        let response = self
            .send_json(
                HttpMethod::Get,
                format!("/api/attempts/{attempt_id}/binding"),
                None,
                false,
            )
            .await?;
        parse(&response)
    }

    /// 事件查询（B-1/FZ-3）：seq 升序，游标语义见 [`crate::api::dto::EventsResponse`]。
    /// 查询不推进游标、不触发 reconcile；严禁以固定节奏调用本接口冒充刷新（方案 §6.6）。
    pub async fn attempt_events(
        &self,
        task_id: &str,
        attempt_id: &str,
        after_seq: u64,
        limit: Option<u32>,
        source: Option<EventSourceFilter>,
    ) -> Result<EventsResponse, ApiError> {
        let mut query = vec![("after_seq", after_seq.to_string())];
        if let Some(value) = limit {
            query.push(("limit", value.to_string()));
        }
        if let Some(value) = source {
            query.push(("source", value.as_str().to_string()));
        }
        let path = build_path(
            &format!("/api/tasks/{task_id}/attempts/{attempt_id}/events"),
            &query,
        );
        let response = self.send_json(HttpMethod::Get, path, None, false).await?;
        parse(&response)
    }
}

fn parse<T: serde::de::DeserializeOwned>(response: &TransportResponse) -> Result<T, ApiError> {
    serde_json::from_str(&response.body).map_err(|e| ApiError::Decode(e.to_string()))
}

/// 查询串保守百分号编码（RFC 3986 unreserved 之外全部转义）。
fn build_path(path: &str, query: &[(&str, String)]) -> String {
    if query.is_empty() {
        return path.to_string();
    }
    let pairs: Vec<String> = query
        .iter()
        .map(|(key, value)| format!("{key}={}", encode_query_value(value)))
        .collect();
    format!("{path}?{}", pairs.join("&"))
}

fn encode_query_value(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char)
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use serde_json::json;
    use std::sync::Mutex;

    pub(crate) struct MockTransport {
        handler: Box<dyn Fn(&TransportRequest) -> Result<TransportResponse, ApiError> + Send + Sync>,
        recorded: Mutex<Vec<TransportRequest>>,
    }

    impl MockTransport {
        pub(crate) fn new(
            handler: impl Fn(&TransportRequest) -> Result<TransportResponse, ApiError>
                + Send
                + Sync
                + 'static,
        ) -> Self {
            Self {
                handler: Box::new(handler),
                recorded: Mutex::new(Vec::new()),
            }
        }

        pub(crate) fn last_request(&self) -> TransportRequest {
            self.recorded.lock().unwrap().last().unwrap().clone()
        }
    }

    #[async_trait(?Send)]
    impl Transport for MockTransport {
        async fn send(&self, request: TransportRequest) -> Result<TransportResponse, ApiError> {
            self.recorded.lock().unwrap().push(request.clone());
            (self.handler)(&request)
        }
    }

    fn client(transport: MockTransport) -> (ApiClient, Arc<MockTransport>) {
        let transport = Arc::new(transport);
        let client = ApiClient::new(transport.clone(), "http://127.0.0.1:45280");
        (client, transport)
    }

    fn json_response(status: u16, body: serde_json::Value) -> Result<TransportResponse, ApiError> {
        Ok(TransportResponse {
            status,
            body: body.to_string(),
        })
    }

    fn dispatch_body() -> DispatchRequestBody {
        DispatchRequestBody {
            attempt_id: "attempt-1".into(),
            attempt_no: 1,
            idempotency_key: "key-1".into(),
            request_hash: "hash-1".into(),
            directory: Some("C:/Magic".into()),
            input: "do work".into(),
        }
    }

    #[test]
    fn health_parses_optional_diagnostics() {
        let (full_client, transport) = client(MockTransport::new(|_| {
            json_response(
                200,
                json!({"healthy":true,"protocol_version":"1","worker":{"running":true,"poll_ms":30000},"cursor_watermark":7}),
            )
        }));
        let health = futures::executor::block_on(full_client.health()).unwrap();
        assert!(transport.last_request().path == "/health");
        assert!(health.healthy);
        assert_eq!(health.cursor_watermark, Some(7));
        // 旧客户端最小响应（只有 healthy）也必须能解析
        let (client_min, _) =
            client(MockTransport::new(|_| json_response(200, json!({"healthy":true}))));
        let health_min = futures::executor::block_on(client_min.health()).unwrap();
        assert!(health_min.protocol_version.is_none());
        assert!(health_min.cursor_watermark.is_none());
    }

    #[test]
    fn service_info_parses_capabilities() {
        let (client, transport) = client(MockTransport::new(|_| {
            json_response(
                200,
                json!({
                    "protocol_version":"1","instance_id":"inst-1",
                    "capabilities":{"task_create":true,"approvals":false},
                    "worker":{"running":true,"poll_ms":30000}
                }),
            )
        }));
        let info = futures::executor::block_on(client.service_info()).unwrap();
        assert!(transport.last_request().path == "/api/service-info");
        assert_eq!(info.capabilities.get("task_create"), Some(&true));
        assert_eq!(info.capabilities.get("approvals"), Some(&false));
        assert!(info.worker.running);
    }

    #[test]
    fn create_task_201_accepts_server_generated_task_id() {
        let (client, transport) = client(MockTransport::new(|_| {
            json_response(
                201,
                json!({"task_id":"8cd49b0b-481e-4691-a806-81e5c8258522","status":"ready","event_seq":1,"reused":false}),
            )
        }));
        let body = CreateTaskRequestBody {
            goal: "联调冒烟任务".into(),
            acceptance_criteria: vec!["测试全绿".into()],
            owner_id: "local-user".into(),
            mode: "agent".into(),
            idempotency_key: "it-key-1".into(),
            request_hash: "17dafd01".into(),
        };
        let outcome = futures::executor::block_on(client.create_task(&body)).unwrap();
        assert_eq!(
            transport.last_request().path,
            "/api/tasks"
        );
        match outcome {
            CreateTaskOutcome::Created(response) => {
                assert_eq!(response.status, "ready");
                assert_eq!(response.event_seq, Some(1));
            }
            other => panic!("expected Created, got {other:?}"),
        }
    }

    #[test]
    fn dispatch_created_201_sends_bearer_and_body() {
        let (client, transport) = client(MockTransport::new(|_| {
            json_response(
                201,
                json!({"attempt_id":"attempt-1","status":"running","event_seq":2,"reused":false}),
            )
        }));
        let client = client.with_token("tok-1");
        let outcome =
            futures::executor::block_on(client.dispatch_attempt("task-1", &dispatch_body()))
                .unwrap();
        let request = transport.last_request();
        assert_eq!(request.method, HttpMethod::Post);
        assert_eq!(request.path, "/api/tasks/task-1/attempts");
        assert!(request
            .headers
            .contains(&("Authorization".into(), "Bearer tok-1".into())));
        let sent: serde_json::Value = serde_json::from_str(&request.body.unwrap()).unwrap();
        assert_eq!(sent["attempt_id"], "attempt-1");
        assert_eq!(sent["request_hash"], "hash-1");
        assert_eq!(request.timeout_secs, 30);
        match outcome {
            DispatchOutcome::Created(response) => {
                assert_eq!(response.event_seq, Some(2));
                assert!(!response.reused);
            }
            other => panic!("expected Created, got {other:?}"),
        }
    }

    #[test]
    fn dispatch_reuse_200_is_not_an_error() {
        let (client, _) = client(MockTransport::new(|_| {
            json_response(
                200,
                json!({"attempt_id":"attempt-1","status":"running","event_seq":null,"reused":true}),
            )
        }));
        let outcome =
            futures::executor::block_on(client.dispatch_attempt("task-1", &dispatch_body()))
                .unwrap();
        match outcome {
            DispatchOutcome::Reused(response) => {
                assert!(response.reused);
                assert_eq!(response.event_seq, None);
            }
            other => panic!("expected Reused, got {other:?}"),
        }
    }

    #[test]
    fn idempotency_conflict_409_maps_error_body_and_never_retries() {
        let (client, _) = client(MockTransport::new(|_| {
            json_response(409, json!({"error": "idempotency key conflict"}))
        }));
        let error =
            futures::executor::block_on(client.dispatch_attempt("task-1", &dispatch_body()))
                .unwrap_err();
        assert_eq!(error, ApiError::Status(409, "idempotency key conflict".into()));
        assert!(error.is_idempotency_conflict());
        assert!(!error.retryable());
    }

    #[test]
    fn execution_502_is_mapped_and_not_silently_retried() {
        let (client, _) = client(MockTransport::new(|_| {
            json_response(502, json!({"error": "execution failed: boom"}))
        }));
        let error =
            futures::executor::block_on(client.dispatch_attempt("task-1", &dispatch_body()))
                .unwrap_err();
        assert_eq!(error, ApiError::Status(502, "execution failed: boom".into()));
        // 502 标记为可重试类，但派发语义下由用户决定重发（同键同体），客户端不静默重试（S9）。
        assert!(error.retryable());
    }

    #[test]
    fn reconcile_200_parses_with_null_event_seq() {
        let (client, _) = client(MockTransport::new(|_| {
            json_response(
                200,
                json!({"attempt_id":"attempt-1","status":"unknown_after_restart","event_seq":null}),
            )
        }));
        let response =
            futures::executor::block_on(client.reconcile_attempt("task-1", "attempt-1")).unwrap();
        assert_eq!(response.status, "unknown_after_restart");
        assert_eq!(response.event_seq, None);
    }

    #[test]
    fn task_list_parses_fz4_projection_without_updated_at() {
        let (client, transport) = client(MockTransport::new(|_| {
            json_response(
                200,
                json!({
                    "items": [{
                        "task_id": "task-1",
                        "goal": "发布新版本",
                        "status": "in_progress",
                        "owner_id": "local-user",
                        "current_attempt_no": 2,
                        "current_attempt_status": "running",
                        "last_seq": 7
                    }],
                    "next_offset": null,
                    "ordering": "creation"
                }),
            )
        }));
        let response =
            futures::executor::block_on(client.task_list(Some("in_progress"), None, Some(50), Some(0)))
                .unwrap();
        let request = transport.last_request();
        assert_eq!(request.method, HttpMethod::Get);
        assert_eq!(request.path, "/api/tasks?status=in_progress&limit=50&offset=0");
        assert_eq!(request.timeout_secs, 10);
        assert_eq!(response.ordering, "creation");
        assert_eq!(response.next_offset, None);
        let item = &response.items[0];
        assert_eq!(item.goal, "发布新版本");
        assert_eq!(item.current_attempt_status.as_deref(), Some("running"));
        assert!(item.updated_at.is_none());
    }

    #[test]
    fn task_detail_and_attempt_list_parse() {
        let (client, _) = client(MockTransport::new(|request| match request.path.as_str() {
            "/api/tasks/task-1" => json_response(
                200,
                json!({
                    "task_id":"task-1","goal":"发布新版本","status":"awaiting_review",
                    "owner_id":"local-user","acceptance_criteria":["测试全绿"],
                    "attempts":[{"attempt_id":"a-1","attempt_no":1,"status":"succeeded","last_seq":4}],
                    "last_seq":4
                }),
            ),
            "/api/tasks/task-1/attempts" => json_response(
                200,
                json!({
                    "items":[{"attempt_id":"a-1","attempt_no":1,"status":"succeeded","last_seq":4}],
                    "next_cursor": null
                }),
            ),
            other => panic!("unexpected path {other}"),
        }));
        let detail = futures::executor::block_on(client.task_detail("task-1")).unwrap();
        assert_eq!(detail.attempts[0].attempt_no, 1);
        assert_eq!(detail.acceptance_criteria, vec!["测试全绿"]);
        let attempts = futures::executor::block_on(client.attempt_list("task-1", None)).unwrap();
        assert_eq!(attempts.next_cursor, None);
    }

    #[test]
    fn binding_parses_with_optional_message_id() {
        let (client, _) = client(MockTransport::new(|_| {
            json_response(
                200,
                json!({"attempt_id":"a-1","adapter":"opencode-v1","session_id":"session-1"}),
            )
        }));
        let binding = futures::executor::block_on(client.attempt_binding("a-1")).unwrap();
        assert_eq!(binding.session_id, "session-1");
        assert!(binding.message_id.is_none());
    }

    #[test]
    fn events_parse_fz3_cursor_envelope_and_query_encoding() {
        let (client, transport) = client(MockTransport::new(|_| {
            json_response(
                200,
                json!({
                    "events": [
                        {"seq":1,"event_type":"attempt.status_changed","source":"magic",
                         "payload":{"from":"created","to":"admitted"},"occurred_at":null},
                        {"seq":2,"event_type":"attempt.status_changed","source":"magic",
                         "source_event_id":null,
                         "payload":{"from":"admitted","to":"running"},"occurred_at":null}
                    ],
                    "next_cursor": null,
                    "confirmed_seq": 2
                }),
            )
        }));
        let response = futures::executor::block_on(client.attempt_events(
            "task-1",
            "a-1",
            0,
            Some(100),
            Some(EventSourceFilter::OpencodeV1),
        ))
        .unwrap();
        assert_eq!(transport.last_request().path,
            "/api/tasks/task-1/attempts/a-1/events?after_seq=0&limit=100&source=opencode-v1");
        assert_eq!(response.confirmed_seq, 2);
        assert_eq!(response.next_cursor, None);
        assert_eq!(response.events.len(), 2);
        assert!(response.events[0].occurred_at.is_none());
    }
}
