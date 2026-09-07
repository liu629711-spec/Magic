//! 请求/响应结构（serde）。已实现接口（方案 §6.1）与阶段 1 读路径（§6.2 冻结契约）；
//! 阶段 3 的能力类接口（artifacts/cost/side-effects 等，FZ-6 形态）随对应页面落地。

use serde::{Deserialize, Serialize};

/// Execution-base-owned session summary. Magic reads this through its local
/// proxy and does not persist a parallel conversation record.
#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct SessionListItem {
    pub session_id: String,
    pub title: String,
    pub directory: String,
    pub parent_id: Option<String>,
    pub updated_at: Option<u64>,
    #[serde(default)]
    pub pinned: bool,
    #[serde(default)]
    pub standalone: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SessionListResponse {
    pub items: Vec<SessionListItem>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateSessionRequestBody {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub directory: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateSessionResponse {
    pub session_id: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ValidateDirectoryRequestBody {
    pub directory: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ValidatedDirectoryResponse {
    pub directory: String,
    pub name: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RenameSessionRequestBody {
    pub title: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RenameSessionResponse {
    pub title: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SetSessionPresentationRequestBody {
    pub pinned: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SetSessionProjectRequestBody {
    pub directory: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SendSessionMessageRequestBody {
    pub input: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SendSessionMessageResponse {
    pub message_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct SessionToolActivity {
    pub call_id: String,
    pub name: String,
    pub status: String,
    pub arguments_summary: String,
    pub result_summary: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct SessionJobActivity {
    pub id: String,
    pub kind: String,
    pub label: String,
    pub status: String,
    pub detail: Option<String>,
    pub started_at: u64,
    pub finished_at: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct SessionActivityArtifact {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub summary: String,
    pub detail: String,
    #[serde(default)]
    pub call_id: Option<String>,
    #[serde(default)]
    pub event_seq: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct SessionUsageStats {
    pub turns: u32,
    pub steps: u32,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_read_tokens: u64,
    pub reasoning_tokens: u64,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct SessionActivityResponse {
    pub tools: Vec<SessionToolActivity>,
    #[serde(default)]
    pub artifacts: Vec<SessionActivityArtifact>,
    pub jobs: Vec<SessionJobActivity>,
    #[serde(default)]
    pub stats: Option<SessionUsageStats>,
    pub jobs_available: bool,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct SessionApprovalRequest {
    pub id: String,
    pub session_id: String,
    pub tool_name: String,
    pub call_id: Option<String>,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct SessionApprovalResponse {
    pub items: Vec<SessionApprovalRequest>,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct FileReferenceItem {
    pub path: String,
    pub kind: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct FileReferenceResponse {
    pub items: Vec<FileReferenceItem>,
}

/// Write-only API key used only while the browser sends a provider profile to
/// the local service. The service never returns it.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SaveModelProviderRequestBody {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_id: Option<String>,
    pub display_name: String,
    pub base_url: String,
    pub api: String,
    pub models: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SaveModelProviderResponse {
    pub provider_id: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SetModelProviderPresentationRequestBody {
    pub enabled: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DiscoverModelsRequestBody {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_id: Option<String>,
    pub base_url: String,
    pub api: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DiscoverModelsResponse {
    pub models: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SelectSessionModelRequestBody {
    pub provider: String,
    pub model: String,
}

/// POST /api/tasks/{task_id}/attempts 请求体（`apps/local-service/src/main.rs:26-33`）。
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DispatchRequestBody {
    pub attempt_id: String,
    pub attempt_no: u32,
    pub idempotency_key: String,
    pub request_hash: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub directory: Option<String>,
    pub input: String,
}

/// 派发响应：首次 201 `reused:false`，幂等复用 200 `reused:true` 且 `event_seq:null`（S3）。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct AttemptResponse {
    pub attempt_id: String,
    pub status: String,
    pub event_seq: Option<u64>,
    pub reused: bool,
}

/// reconcile 响应：`event_seq:null` 表示状态未变化（S8）。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct ReconcileResponse {
    pub attempt_id: String,
    pub status: String,
    pub event_seq: Option<u64>,
}

/// 统一错误体（`{ "error": string }`，方案 §6.2 通用约定 1）。
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ApiErrorBody {
    pub error: String,
}

/// POST /api/tasks 请求体（清单第 1 条，后端已实现；`mode` 仅 agent/ceo）。
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateTaskRequestBody {
    pub goal: String,
    pub acceptance_criteria: Vec<String>,
    pub owner_id: String,
    pub mode: String,
    pub idempotency_key: String,
    pub request_hash: String,
}

/// 创建任务响应：首次 201（FZ-8：status 已在创建用例内推进到 ready）；同键 200 复用。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct CreateTaskResponse {
    pub task_id: String,
    pub status: String,
    pub event_seq: Option<u64>,
    pub reused: bool,
}

/// Worker 状态（B-7 / service-info）。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct WorkerInfo {
    pub running: bool,
    pub poll_ms: u64,
}

/// GET /health：`healthy:true` 必返，其余为可选诊断字段（B-7）。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct HealthResponse {
    pub healthy: bool,
    pub protocol_version: Option<String>,
    pub worker: Option<WorkerInfo>,
    /// 执行底座侧事件游标水位（event_cursor），前端只作展示、不消费其 attempt 语义。
    pub cursor_watermark: Option<u64>,
}

/// GET /api/service-info：能力发现权威（FZ-9），绝不包含令牌。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct ServiceInfoResponse {
    pub protocol_version: String,
    pub instance_id: String,
    pub capabilities: std::collections::HashMap<String, bool>,
    pub worker: WorkerInfo,
}

/// FZ-4：Task 列表 items 投影。`updated_at` 时间戳迁移完成前为 null；排序一律读外层 `ordering`。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct TaskListItem {
    pub task_id: String,
    pub goal: String,
    pub status: String,
    pub owner_id: String,
    pub current_attempt_no: Option<u32>,
    pub current_attempt_status: Option<String>,
    pub last_seq: u64,
    pub updated_at: Option<String>,
}

/// FZ-4/C-2：`ordering` 迁移完成前为 `"creation"`（前端显示降级提示）；
/// 迁移后默认 `updated_at DESC, id DESC`（取值字符串由后端实现时定，建议 `updated_at_desc_id_desc`）。
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TaskListResponse {
    pub items: Vec<TaskListItem>,
    pub next_offset: Option<u64>,
    pub ordering: String,
}

/// Attempt 摘要（列表与详情共用；`last_seq` 为该 Attempt 聚合最大 seq）。
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AttemptSummary {
    pub attempt_id: String,
    pub attempt_no: u32,
    pub status: String,
    pub last_seq: u64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TaskDetailResponse {
    pub task_id: String,
    pub goal: String,
    pub status: String,
    pub owner_id: String,
    pub acceptance_criteria: Vec<String>,
    pub attempts: Vec<AttemptSummary>,
    pub last_seq: u64,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AttemptListResponse {
    pub items: Vec<AttemptSummary>,
    pub next_cursor: Option<u64>,
}

/// Binding 查询（清单第 6 条）：仅证据引用，非状态来源；`message_id` 可空。
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BindingResponse {
    pub attempt_id: String,
    pub adapter: String,
    pub session_id: String,
    pub message_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct EventItem {
    pub seq: u64,
    pub event_type: String,
    pub source: String,
    pub source_event_id: Option<String>,
    pub payload: serde_json::Value,
    /// B-1 迁移完成前为 null（前端显示"时间未知"，不伪造历史时间）。
    pub occurred_at: Option<String>,
}

/// FZ-3：`confirmed_seq` = Attempt 聚合在 event_ledger 的最大 seq；
/// `next_cursor` = 本页最后一条事件的 seq，无更多数据为 null。
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct EventsResponse {
    pub events: Vec<EventItem>,
    pub next_cursor: Option<u64>,
    pub confirmed_seq: u64,
}
