use magic_domain::{AttemptId, AttemptStatus, TaskId};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct AttemptView {
    pub id: AttemptId,
    pub task_id: TaskId,
    pub status: AttemptStatus,
    pub event_seq: u64,
}
