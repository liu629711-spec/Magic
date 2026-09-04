//! Wire DTOs for the frozen frontend contract (frontend plan §6.2, 2026-09-03).

use magic_domain::{AttemptId, AttemptStatus, TaskId, TaskStatus};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct AttemptView {
    pub id: AttemptId,
    pub task_id: TaskId,
    pub status: AttemptStatus,
    pub event_seq: u64,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskMode {
    Agent,
    Ceo,
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskRequest {
    pub idempotency_key: String,
    pub goal: String,
    #[serde(default)]
    pub acceptance_criteria: Vec<String>,
    pub owner_id: String,
    pub mode: TaskMode,
}

#[derive(Debug, Serialize)]
pub struct CreateTaskResponse {
    pub task_id: String,
    pub status: TaskStatus,
    pub event_seq: Option<u64>,
    pub reused: bool,
}

#[derive(Debug, Serialize)]
pub struct TaskListItem {
    pub task_id: String,
    pub goal: String,
    pub status: TaskStatus,
    pub owner_id: String,
    pub current_attempt_no: Option<u32>,
    pub current_attempt_status: Option<AttemptStatus>,
    pub last_seq: u64,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TaskListResponse {
    pub items: Vec<TaskListItem>,
    pub next_offset: Option<u64>,
    pub ordering: String,
}

#[derive(Debug, Serialize)]
pub struct AttemptSummary {
    pub attempt_id: String,
    pub attempt_no: u32,
    pub status: AttemptStatus,
    pub last_seq: u64,
}

#[derive(Debug, Serialize)]
pub struct TaskDetailResponse {
    pub task_id: String,
    pub goal: String,
    pub status: TaskStatus,
    pub owner_id: String,
    pub acceptance_criteria: Vec<String>,
    pub attempts: Vec<AttemptSummary>,
    pub last_seq: u64,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AttemptListResponse {
    pub items: Vec<AttemptSummary>,
    pub next_cursor: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct BindingResponse {
    pub attempt_id: String,
    pub adapter: String,
    pub session_id: String,
    pub message_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LedgerEventDto {
    pub seq: u64,
    pub event_type: String,
    pub source: String,
    pub source_event_id: Option<String>,
    pub payload: Value,
    pub occurred_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct EventsResponse {
    pub events: Vec<LedgerEventDto>,
    pub next_cursor: Option<u64>,
    pub confirmed_seq: u64,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct WorkerInfo {
    pub running: bool,
    pub poll_ms: u64,
}

#[derive(Debug, Serialize)]
pub struct ServiceInfoResponse {
    pub protocol_version: String,
    pub instance_id: String,
    pub capabilities: Value,
    pub worker: WorkerInfo,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub healthy: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub protocol_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub worker: Option<WorkerInfo>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor_watermark: Option<u64>,
}

/// Execution-base-owned session projection returned by the local service.
/// It is never stored in Magic's database.
#[derive(Debug, Serialize)]
pub struct SessionListItem {
    pub session_id: String,
    pub title: String,
    pub directory: String,
    pub parent_id: Option<String>,
    pub updated_at: Option<u64>,
    pub pinned: bool,
    pub standalone: bool,
}

#[derive(Debug, Serialize)]
pub struct SessionListResponse {
    pub items: Vec<SessionListItem>,
}

#[derive(Debug, Serialize)]
pub struct CreateSessionResponse {
    pub session_id: String,
}

#[derive(Debug, Deserialize)]
pub struct RenameSessionRequest {
    pub title: String,
}

#[derive(Debug, Serialize)]
pub struct RenameSessionResponse {
    pub title: String,
}

#[derive(Debug, Deserialize)]
pub struct SetSessionPresentationRequest {
    pub pinned: bool,
}

#[derive(Debug, Deserialize)]
pub struct SetSessionProjectRequest {
    pub directory: String,
}

#[derive(Debug, Serialize)]
pub struct SendSessionMessageResponse {
    pub message_id: Option<String>,
}

/// A redacted, display-safe tool lifecycle projected from one DSH session log.
/// Magic never returns raw tool payloads because they can contain credentials or
/// large local-file contents.
#[derive(Debug, Serialize)]
pub struct SessionToolActivity {
    pub call_id: String,
    pub name: String,
    pub status: String,
    pub arguments_summary: String,
    pub result_summary: Option<String>,
}

/// A display-safe DSH background-job row for one session.
#[derive(Debug, Serialize)]
pub struct SessionJobActivity {
    pub id: String,
    pub kind: String,
    pub label: String,
    pub status: String,
    pub detail: Option<String>,
    pub started_at: u64,
    pub finished_at: Option<u64>,
}

/// Provider-reported usage accumulated from DSH assistant usage events.
#[derive(Debug, Serialize)]
pub struct SessionUsageStats {
    pub turns: u32,
    pub steps: u32,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_read_tokens: u64,
    pub reasoning_tokens: u64,
}

/// Current execution activity owned by DSH, not by Magic's database.
#[derive(Debug, Serialize)]
pub struct SessionActivityResponse {
    pub tools: Vec<SessionToolActivity>,
    pub jobs: Vec<SessionJobActivity>,
    pub stats: Option<SessionUsageStats>,
    /// False means the connected DSH instance did not make its live job
    /// snapshot available. It is distinct from an empty job list.
    pub jobs_available: bool,
}

#[derive(Debug, Serialize)]
pub struct FileReferenceItem {
    pub path: String,
    pub kind: String,
}

#[derive(Debug, Serialize)]
pub struct FileReferenceResponse {
    pub items: Vec<FileReferenceItem>,
}

/// User-authored generic provider profile. `api_key` is write-only and must
/// never occur in any response, persistence record, or log.
#[derive(Debug, Deserialize)]
pub struct SaveModelProviderRequest {
    #[serde(default)]
    pub provider_id: Option<String>,
    pub display_name: String,
    pub base_url: String,
    pub api: String,
    pub models: Vec<String>,
    #[serde(default)]
    pub api_key: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SaveModelProviderResponse {
    pub provider_id: String,
}

/// Magic-owned availability state for a configured provider. This deliberately
/// remains outside DSH's provider schema so upstream configuration stays valid.
#[derive(Debug, Deserialize)]
pub struct SetModelProviderPresentationRequest {
    pub enabled: bool,
}

/// Draft endpoint check. Like save, the key is one-way input only.
#[derive(Debug, Deserialize)]
pub struct DiscoverModelsRequest {
    #[serde(default)]
    pub provider_id: Option<String>,
    pub base_url: String,
    pub api: String,
    #[serde(default)]
    pub api_key: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DiscoverModelsResponse {
    pub models: Vec<Value>,
}

#[derive(Debug, Deserialize)]
pub struct SelectSessionModelRequest {
    pub provider: String,
    pub model: String,
}
