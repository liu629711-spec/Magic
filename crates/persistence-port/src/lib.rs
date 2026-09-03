use magic_domain::{AttemptId, AttemptStatus, TaskId, TaskStatus};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PersistenceError {
    #[error("persistence error: {0}")]
    Storage(String),
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IdempotencyRecord {
    pub attempt_id: AttemptId,
    pub request_hash: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AttemptBinding {
    pub attempt_id: AttemptId,
    pub adapter: String,
    pub session_id: String,
    pub message_id: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ActiveAttempt {
    pub task_id: TaskId,
    pub attempt_id: AttemptId,
    pub status: AttemptStatus,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExternalEvent {
    pub aggregate_type: String,
    pub aggregate_id: String,
    pub seq: Option<u64>,
    pub event_type: String,
    pub source: String,
    pub source_event_id: Option<String>,
    pub payload_json: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventAppendResult {
    pub inserted: bool,
    pub seq: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventCursor {
    pub aggregate_type: String,
    pub aggregate_id: String,
    pub last_confirmed_seq: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TaskRecord {
    pub id: TaskId,
    pub goal: String,
    pub acceptance_criteria: Vec<String>,
    pub owner_id: String,
    pub mode: String,
    pub status: TaskStatus,
    pub updated_at: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TaskIdempotencyRecord {
    pub task_id: TaskId,
    pub request_hash: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AttemptSummaryRow {
    pub attempt_id: AttemptId,
    pub attempt_no: u32,
    pub status: AttemptStatus,
    pub last_seq: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TaskListItemRow {
    pub id: TaskId,
    pub goal: String,
    pub status: TaskStatus,
    pub owner_id: String,
    pub current_attempt_no: Option<u32>,
    pub current_attempt_status: Option<AttemptStatus>,
    pub last_seq: u64,
    pub updated_at: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LedgerEvent {
    pub seq: u64,
    pub event_type: String,
    pub source: String,
    pub source_event_id: Option<String>,
    pub payload_json: String,
    pub occurred_at: Option<String>,
}

/// Ordering mode for the task list (C-2): `Creation` until the timestamp
/// migration has completed, `UpdatedAt` (updated_at DESC, id DESC) afterwards.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TimestampOrdering {
    Creation,
    UpdatedAt,
}

pub trait AttemptRepository: Send + Sync {
    fn create_attempt(
        &self,
        task_id: &TaskId,
        attempt_id: &AttemptId,
        attempt_no: u32,
        idempotency_key: &str,
        request_hash: &str,
    ) -> Result<(), PersistenceError>;
    fn find_idempotency(
        &self,
        task_id: &TaskId,
        idempotency_key: &str,
    ) -> Result<Option<IdempotencyRecord>, PersistenceError>;
    fn status(&self, attempt_id: &AttemptId) -> Result<Option<AttemptStatus>, PersistenceError>;
    fn active_attempts(&self) -> Result<Vec<ActiveAttempt>, PersistenceError>;
    fn append_status(
        &self,
        task_id: &TaskId,
        attempt_id: &AttemptId,
        status: AttemptStatus,
    ) -> Result<u64, PersistenceError>;
    fn create_binding(&self, binding: &AttemptBinding) -> Result<(), PersistenceError>;
    fn binding(&self, attempt_id: &AttemptId) -> Result<Option<AttemptBinding>, PersistenceError>;
    fn set_message_id(
        &self,
        attempt_id: &AttemptId,
        message_id: Option<&str>,
    ) -> Result<(), PersistenceError>;
}

pub trait TaskRepository: Send + Sync {
    fn create_task(&self, task: &TaskRecord, idempotency_key: &str, request_hash: &str)
        -> Result<(), PersistenceError>;
    fn find_task_idempotency(
        &self,
        idempotency_key: &str,
    ) -> Result<Option<TaskIdempotencyRecord>, PersistenceError>;
    fn task(&self, task_id: &TaskId) -> Result<Option<TaskRecord>, PersistenceError>;
    fn append_task_status(&self, task_id: &TaskId, next: TaskStatus) -> Result<u64, PersistenceError>;
    fn list_tasks(
        &self,
        status: Option<&TaskStatus>,
        owner: Option<&str>,
        offset: usize,
        limit: usize,
        ordering: TimestampOrdering,
    ) -> Result<Vec<TaskListItemRow>, PersistenceError>;
    fn attempts_for_task(
        &self,
        task_id: &TaskId,
        before_attempt_no: Option<u32>,
        limit: Option<usize>,
    ) -> Result<Vec<AttemptSummaryRow>, PersistenceError>;
    fn attempt_task(&self, attempt_id: &AttemptId) -> Result<Option<TaskId>, PersistenceError>;
    fn timestamp_ordering(&self) -> Result<TimestampOrdering, PersistenceError>;
}

pub trait EventQueryRepository: Send + Sync {
    fn attempt_events(
        &self,
        attempt_id: &AttemptId,
        after_seq: u64,
        limit: usize,
        source: Option<&str>,
    ) -> Result<Vec<LedgerEvent>, PersistenceError>;
    fn attempt_max_seq(&self, attempt_id: &AttemptId) -> Result<u64, PersistenceError>;
    fn session_events(
        &self,
        session_ids: &[String],
        after_seq: u64,
        limit: usize,
    ) -> Result<Vec<LedgerEvent>, PersistenceError>;
    fn session_max_seq(&self, session_ids: &[String]) -> Result<u64, PersistenceError>;
    fn task_last_seq(&self, task_id: &TaskId) -> Result<u64, PersistenceError>;
    fn opencode_cursor_watermark(&self) -> Result<u64, PersistenceError>;
}

pub trait EventRepository: Send + Sync {
    fn append_external_event(
        &self,
        event: &ExternalEvent,
    ) -> Result<EventAppendResult, PersistenceError>;
    fn cursor(
        &self,
        aggregate_type: &str,
        aggregate_id: &str,
    ) -> Result<Option<EventCursor>, PersistenceError>;
    fn cursors(&self) -> Result<Vec<EventCursor>, PersistenceError>;
    fn advance_cursor(
        &self,
        aggregate_type: &str,
        aggregate_id: &str,
        seq: u64,
    ) -> Result<(), PersistenceError>;
}
