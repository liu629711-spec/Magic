use magic_domain::{AttemptId, AttemptStatus, TaskId};
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
