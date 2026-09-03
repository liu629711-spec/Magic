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
