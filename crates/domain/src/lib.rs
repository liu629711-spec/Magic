use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Clone, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
pub struct TaskId(pub String);

#[derive(Clone, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
pub struct AttemptId(pub String);

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Proposed,
    Ready,
    InProgress,
    AwaitingReview,
    Completed,
    Blocked,
    Cancelled,
    Failed,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AttemptStatus {
    Created,
    Admitted,
    Running,
    Cancelling,
    Cancelled,
    Succeeded,
    Failed,
    UnknownAfterRestart,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InvalidTransition {
    pub entity: &'static str,
    pub from: String,
    pub action: &'static str,
}

impl fmt::Display for InvalidTransition {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "{} cannot {} from {}",
            self.entity, self.action, self.from
        )
    }
}

impl std::error::Error for InvalidTransition {}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Attempt {
    pub id: AttemptId,
    pub task_id: TaskId,
    pub status: AttemptStatus,
}

impl Attempt {
    pub fn new(id: AttemptId, task_id: TaskId) -> Self {
        Self {
            id,
            task_id,
            status: AttemptStatus::Created,
        }
    }

    pub fn admit(&mut self) -> Result<(), InvalidTransition> {
        self.move_to(AttemptStatus::Admitted, "admit", |status| {
            matches!(status, AttemptStatus::Created)
        })
    }

    pub fn start(&mut self) -> Result<(), InvalidTransition> {
        self.move_to(AttemptStatus::Running, "start", |status| {
            matches!(status, AttemptStatus::Admitted)
        })
    }

    pub fn request_cancel(&mut self) -> Result<(), InvalidTransition> {
        self.move_to(
            AttemptStatus::Cancelling,
            "request cancellation",
            |status| matches!(status, AttemptStatus::Running),
        )
    }

    pub fn mark_succeeded(&mut self) -> Result<(), InvalidTransition> {
        self.move_to(AttemptStatus::Succeeded, "mark succeeded", |status| {
            matches!(
                status,
                AttemptStatus::Running
                    | AttemptStatus::Cancelling
                    | AttemptStatus::UnknownAfterRestart
            )
        })
    }

    pub fn mark_failed(&mut self) -> Result<(), InvalidTransition> {
        self.move_to(AttemptStatus::Failed, "mark failed", |status| {
            matches!(
                status,
                AttemptStatus::Running
                    | AttemptStatus::Cancelling
                    | AttemptStatus::UnknownAfterRestart
            )
        })
    }

    pub fn mark_cancelled(&mut self) -> Result<(), InvalidTransition> {
        self.move_to(AttemptStatus::Cancelled, "mark cancelled", |status| {
            matches!(
                status,
                AttemptStatus::Cancelling | AttemptStatus::UnknownAfterRestart
            )
        })
    }

    pub fn mark_unknown_after_restart(&mut self) -> Result<(), InvalidTransition> {
        self.move_to(
            AttemptStatus::UnknownAfterRestart,
            "mark unknown after restart",
            |status| {
                matches!(
                    status,
                    AttemptStatus::Admitted | AttemptStatus::Running | AttemptStatus::Cancelling
                )
            },
        )
    }

    fn move_to<F>(
        &mut self,
        next: AttemptStatus,
        action: &'static str,
        allowed: F,
    ) -> Result<(), InvalidTransition>
    where
        F: FnOnce(&AttemptStatus) -> bool,
    {
        if !allowed(&self.status) {
            return Err(InvalidTransition {
                entity: "Attempt",
                from: format!("{:?}", self.status),
                action,
            });
        }
        self.status = next;
        Ok(())
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Task {
    pub id: TaskId,
    pub status: TaskStatus,
    pub current_owner_id: Option<String>,
    pub acceptance_criteria_defined: bool,
}

impl Task {
    pub fn new(id: TaskId) -> Self {
        Self {
            id,
            status: TaskStatus::Proposed,
            current_owner_id: None,
            acceptance_criteria_defined: false,
        }
    }

    pub fn assign_owner(&mut self, owner_id: impl Into<String>) -> Result<(), InvalidTransition> {
        if matches!(self.status, TaskStatus::Completed | TaskStatus::Cancelled) {
            return Err(self.invalid("assign owner"));
        }
        self.current_owner_id = Some(owner_id.into());
        Ok(())
    }

    pub fn define_acceptance(&mut self) -> Result<(), InvalidTransition> {
        if matches!(self.status, TaskStatus::Completed | TaskStatus::Cancelled) {
            return Err(self.invalid("define acceptance"));
        }
        self.acceptance_criteria_defined = true;
        Ok(())
    }

    pub fn mark_ready(&mut self) -> Result<(), InvalidTransition> {
        if !matches!(
            self.status,
            TaskStatus::Proposed | TaskStatus::Blocked | TaskStatus::Failed
        ) {
            return Err(self.invalid("mark ready"));
        }
        if self.current_owner_id.is_none() || !self.acceptance_criteria_defined {
            return Err(self.invalid("mark ready without owner and acceptance criteria"));
        }
        self.status = TaskStatus::Ready;
        Ok(())
    }

    pub fn begin_attempt(&mut self) -> Result<(), InvalidTransition> {
        self.move_to(TaskStatus::InProgress, "begin attempt", |status| {
            matches!(status, TaskStatus::Ready)
        })
    }

    pub fn await_review(&mut self) -> Result<(), InvalidTransition> {
        self.move_to(TaskStatus::AwaitingReview, "await review", |status| {
            matches!(status, TaskStatus::InProgress)
        })
    }

    pub fn complete(&mut self, acceptance_evidence_present: bool) -> Result<(), InvalidTransition> {
        if !matches!(self.status, TaskStatus::AwaitingReview) || !acceptance_evidence_present {
            return Err(self.invalid("complete without review and acceptance evidence"));
        }
        self.status = TaskStatus::Completed;
        Ok(())
    }

    pub fn block(&mut self) -> Result<(), InvalidTransition> {
        self.move_to(TaskStatus::Blocked, "block", |status| {
            !matches!(status, TaskStatus::Completed | TaskStatus::Cancelled)
        })
    }

    pub fn cancel(&mut self) -> Result<(), InvalidTransition> {
        self.move_to(TaskStatus::Cancelled, "cancel", |status| {
            !matches!(status, TaskStatus::Completed | TaskStatus::Cancelled)
        })
    }

    fn move_to<F>(
        &mut self,
        next: TaskStatus,
        action: &'static str,
        allowed: F,
    ) -> Result<(), InvalidTransition>
    where
        F: FnOnce(&TaskStatus) -> bool,
    {
        if !allowed(&self.status) {
            return Err(self.invalid(action));
        }
        self.status = next;
        Ok(())
    }

    fn invalid(&self, action: &'static str) -> InvalidTransition {
        InvalidTransition {
            entity: "Task",
            from: format!("{:?}", self.status),
            action,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn attempt() -> Attempt {
        Attempt::new(AttemptId("attempt-1".into()), TaskId("task-1".into()))
    }

    #[test]
    fn attempt_happy_path_reaches_success() {
        let mut attempt = attempt();
        attempt.admit().unwrap();
        attempt.start().unwrap();
        attempt.mark_succeeded().unwrap();
        assert_eq!(attempt.status, AttemptStatus::Succeeded);
    }

    #[test]
    fn cancellation_is_not_terminal_until_confirmed() {
        let mut attempt = attempt();
        attempt.admit().unwrap();
        attempt.start().unwrap();
        attempt.request_cancel().unwrap();
        assert_eq!(attempt.status, AttemptStatus::Cancelling);
        attempt.mark_cancelled().unwrap();
    }

    #[test]
    fn cancellation_race_can_finish_as_success() {
        let mut attempt = attempt();
        attempt.admit().unwrap();
        attempt.start().unwrap();
        attempt.request_cancel().unwrap();
        attempt.mark_succeeded().unwrap();
        assert_eq!(attempt.status, AttemptStatus::Succeeded);
    }

    #[test]
    fn unknown_after_restart_requires_explicit_evidence_to_close() {
        let mut attempt = attempt();
        attempt.admit().unwrap();
        attempt.start().unwrap();
        attempt.mark_unknown_after_restart().unwrap();
        assert!(attempt.request_cancel().is_err());
        attempt.mark_failed().unwrap();
        assert_eq!(attempt.status, AttemptStatus::Failed);
    }

    #[test]
    fn task_cannot_be_ready_without_owner_and_acceptance() {
        let mut task = Task::new(TaskId("task-1".into()));
        assert!(task.mark_ready().is_err());
        task.assign_owner("member-1").unwrap();
        assert!(task.mark_ready().is_err());
        task.define_acceptance().unwrap();
        task.mark_ready().unwrap();
    }

    #[test]
    fn task_completion_requires_review_evidence() {
        let mut task = Task::new(TaskId("task-1".into()));
        task.assign_owner("member-1").unwrap();
        task.define_acceptance().unwrap();
        task.mark_ready().unwrap();
        task.begin_attempt().unwrap();
        task.await_review().unwrap();
        assert!(task.complete(false).is_err());
        task.complete(true).unwrap();
        assert_eq!(task.status, TaskStatus::Completed);
        assert!(task.cancel().is_err());
    }

    #[test]
    fn status_wire_names_match_api_contract() {
        assert_eq!(
            serde_json::to_string(&AttemptStatus::UnknownAfterRestart).unwrap(),
            "\"unknown_after_restart\""
        );
        assert_eq!(
            serde_json::to_string(&TaskStatus::AwaitingReview).unwrap(),
            "\"awaiting_review\""
        );
    }
}
