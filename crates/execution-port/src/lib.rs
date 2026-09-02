use magic_domain::{AttemptId, AttemptStatus};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ExecutionError {
    #[error("execution adapter error: {0}")]
    Adapter(String),
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExecutionSession {
    pub id: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExecutionReceipt {
    pub message_id: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExecutionEvent {
    pub id: String,
    pub aggregate_id: Option<String>,
    pub seq: Option<u64>,
    pub event_type: String,
    pub data_json: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExecutionHistoryEvent {
    pub id: String,
    pub aggregate_id: String,
    pub seq: u64,
    pub event_type: String,
    pub data_json: String,
}

pub trait EventSource: Send + Sync {
    fn read_events(&self, max_events: usize) -> Result<Vec<ExecutionEvent>, ExecutionError>;
    fn sync_history(
        &self,
        known_sequences: &HashMap<String, u64>,
    ) -> Result<Vec<ExecutionHistoryEvent>, ExecutionError>;
}

pub trait ExecutionPort: Send + Sync {
    fn create_session(&self, directory: Option<&str>) -> Result<ExecutionSession, ExecutionError>;
    fn submit(
        &self,
        attempt_id: &AttemptId,
        session_id: &str,
        input: &str,
    ) -> Result<ExecutionReceipt, ExecutionError>;
    fn cancel(&self, attempt_id: &AttemptId, session_id: &str) -> Result<(), ExecutionError>;
    fn reconcile(
        &self,
        attempt_id: &AttemptId,
        session_id: &str,
    ) -> Result<AttemptStatus, ExecutionError>;
}
