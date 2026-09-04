//! Product use cases that coordinate domain rules, persistence and execution ports.

use magic_domain::{
    Attempt, AttemptId, AttemptStatus, InvalidTransition, Task, TaskId, TaskStatus,
};
use magic_execution_port::{observed_transition, ExecutionObservation, ExecutionPort};
use magic_persistence_port::{
    AttemptBinding, AttemptRepository, AttemptSummaryRow, EventQueryRepository, LedgerEvent,
    PersistenceError, TaskListItemRow, TaskRecord, TaskRepository, TimestampOrdering,
};
use serde_json::json;
use sha2::{Digest, Sha256};
use thiserror::Error;
use uuid::Uuid;

pub struct Application<E, R> {
    execution: E,
    repository: R,
}

pub struct DispatchRequest {
    pub task_id: TaskId,
    pub attempt_id: AttemptId,
    pub attempt_no: u32,
    pub idempotency_key: String,
    pub request_hash: String,
    pub directory: Option<String>,
    pub input: String,
}

#[derive(Debug, Eq, PartialEq)]
pub enum DispatchResult {
    Created {
        attempt_id: AttemptId,
        event_seq: u64,
    },
    Existing {
        attempt_id: AttemptId,
        status: AttemptStatus,
    },
}

#[derive(Debug, Eq, PartialEq)]
pub struct ReconcileResult {
    pub attempt_id: AttemptId,
    pub status: AttemptStatus,
    pub event_seq: Option<u64>,
}

pub struct CreateTaskRequest {
    pub idempotency_key: String,
    pub goal: String,
    pub acceptance_criteria: Vec<String>,
    pub owner_id: String,
    pub mode: String,
}

#[derive(Debug, Eq, PartialEq)]
pub enum CreateTaskResult {
    Created {
        task_id: TaskId,
        status: TaskStatus,
        event_seq: u64,
    },
    Existing {
        task_id: TaskId,
        status: TaskStatus,
    },
}

pub struct TaskListQuery {
    pub status: Option<TaskStatus>,
    pub owner: Option<String>,
    pub offset: usize,
    pub limit: usize,
}

pub struct TaskListPage {
    pub items: Vec<TaskListItemRow>,
    pub next_offset: Option<u64>,
    pub ordering: TimestampOrdering,
}

pub struct TaskDetailView {
    pub task: TaskRecord,
    pub attempts: Vec<AttemptSummaryRow>,
    pub last_seq: u64,
    pub ordering: TimestampOrdering,
}

pub struct AttemptListPage {
    pub items: Vec<AttemptSummaryRow>,
    pub next_cursor: Option<u64>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EventSourceFilter {
    Magic,
    Execution,
}

pub struct EventPageQuery {
    pub task_id: TaskId,
    pub attempt_id: AttemptId,
    pub after_seq: u64,
    pub limit: usize,
    pub source: Option<EventSourceFilter>,
}

pub struct EventPage {
    pub events: Vec<LedgerEvent>,
    pub next_cursor: Option<u64>,
    pub confirmed_seq: u64,
}

#[derive(Debug, Error)]
pub enum ApplicationError {
    #[error(transparent)]
    Persistence(#[from] PersistenceError),
    #[error("execution failed: {0}")]
    Execution(String),
    #[error("idempotency key was reused with a different request body")]
    IdempotencyConflict,
    #[error("attempt does not exist after idempotency lookup")]
    MissingAttempt,
    #[error("task record missing after idempotency lookup")]
    MissingTask,
    #[error("attempt has no active execution binding")]
    MissingBinding,
    #[error("not found: {0}")]
    NotFound(String),
    #[error("invalid parameter: {0}")]
    InvalidParameter(String),
}

/// FZ-5 request_hash for non-dispatch write endpoints: SHA-256 over the
/// canonical request body with `idempotency_key` (and `request_hash`) removed —
/// object keys sorted, no whitespace, array order preserved.
pub fn canonical_task_request_hash(
    goal: &str,
    acceptance_criteria: &[String],
    owner_id: &str,
    mode: &str,
) -> String {
    let canonical = serde_json::to_string(&json!({
        "acceptance_criteria": acceptance_criteria,
        "goal": goal,
        "mode": mode,
        "owner_id": owner_id,
    }))
    .expect("serializing a serde_json value cannot fail");
    hex_digest(&Sha256::digest(canonical.as_bytes()))
}

fn hex_digest(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

impl<E, R> Application<E, R>
where
    E: ExecutionPort,
    R: AttemptRepository + TaskRepository + EventQueryRepository,
{
    pub fn new(execution: E, repository: R) -> Self {
        Self {
            execution,
            repository,
        }
    }

    pub fn dispatch_attempt(
        &self,
        request: DispatchRequest,
    ) -> Result<DispatchResult, ApplicationError> {
        if let Some(existing) = self
            .repository
            .find_idempotency(&request.task_id, &request.idempotency_key)?
        {
            if existing.request_hash != request.request_hash {
                return Err(ApplicationError::IdempotencyConflict);
            }
            let status = self
                .repository
                .status(&existing.attempt_id)?
                .ok_or(ApplicationError::MissingAttempt)?;
            if matches!(status, AttemptStatus::Running) {
                self.progress_task_on_dispatch(&request.task_id)?;
            }
            return Ok(DispatchResult::Existing {
                attempt_id: existing.attempt_id,
                status,
            });
        }

        let mut attempt = Attempt::new(request.attempt_id.clone(), request.task_id.clone());
        attempt.admit().expect("new Attempt must be admissible");
        if let Err(error) = self.repository.create_attempt(
            &request.task_id,
            &request.attempt_id,
            request.attempt_no,
            &request.idempotency_key,
            &request.request_hash,
        ) {
            // Another caller may have won the unique-key race between lookup and insert.
            if let Some(existing) = self
                .repository
                .find_idempotency(&request.task_id, &request.idempotency_key)?
            {
                if existing.request_hash != request.request_hash {
                    return Err(ApplicationError::IdempotencyConflict);
                }
                let status = self
                    .repository
                    .status(&existing.attempt_id)?
                    .ok_or(ApplicationError::MissingAttempt)?;
                if matches!(status, AttemptStatus::Running) {
                    self.progress_task_on_dispatch(&request.task_id)?;
                }
                return Ok(DispatchResult::Existing {
                    attempt_id: existing.attempt_id,
                    status,
                });
            }
            return Err(ApplicationError::Persistence(error));
        }

        self.repository.append_status(
            &request.task_id,
            &request.attempt_id,
            AttemptStatus::Admitted,
        )?;

        let session = match self.execution.create_session(request.directory.as_deref()) {
            Ok(session) => session,
            Err(error) => {
                self.repository.append_status(
                    &request.task_id,
                    &request.attempt_id,
                    AttemptStatus::Failed,
                )?;
                return Err(ApplicationError::Execution(error.to_string()));
            }
        };
        if let Err(error) = self.repository.create_binding(&AttemptBinding {
            attempt_id: request.attempt_id.clone(),
            adapter: self.execution.adapter_name().into(),
            session_id: session.id.clone(),
            message_id: None,
        }) {
            let _ = self.repository.append_status(
                &request.task_id,
                &request.attempt_id,
                AttemptStatus::Failed,
            );
            return Err(ApplicationError::Persistence(error));
        }
        let receipt = match self
            .execution
            .submit(&request.attempt_id, &session.id, &request.input)
        {
            Ok(receipt) => receipt,
            Err(error) => {
                self.repository.append_status(
                    &request.task_id,
                    &request.attempt_id,
                    AttemptStatus::Failed,
                )?;
                return Err(ApplicationError::Execution(error.to_string()));
            }
        };
        self.repository
            .set_message_id(&request.attempt_id, receipt.message_id.as_deref())?;
        attempt.start().expect("admitted Attempt must start");
        let event_seq = self.repository.append_status(
            &request.task_id,
            &request.attempt_id,
            AttemptStatus::Running,
        )?;
        self.progress_task_on_dispatch(&request.task_id)?;
        Ok(DispatchResult::Created {
            attempt_id: request.attempt_id,
            event_seq,
        })
    }

    /// FZ-1 status probe shared by user-triggered reconcile and startup recovery.
    ///
    /// A live session keeps the Attempt in its current state without events;
    /// terminal evidence closes it; only a missing binding, a lost session or a
    /// failed observation falls back to `unknown_after_restart`.
    pub fn reconcile_attempt(
        &self,
        task_id: &TaskId,
        attempt_id: &AttemptId,
    ) -> Result<ReconcileResult, ApplicationError> {
        let current = self
            .repository
            .status(attempt_id)?
            .ok_or(ApplicationError::MissingAttempt)?;
        if matches!(
            current,
            AttemptStatus::Succeeded | AttemptStatus::Failed | AttemptStatus::Cancelled
        ) {
            if matches!(current, AttemptStatus::Succeeded) {
                self.progress_task_on_success(task_id)?;
            }
            return Ok(ReconcileResult {
                attempt_id: attempt_id.clone(),
                status: current,
                event_seq: None,
            });
        }
        let Some(binding) = self.repository.binding(attempt_id)? else {
            return match current {
                AttemptStatus::Created | AttemptStatus::UnknownAfterRestart => {
                    Ok(ReconcileResult {
                        attempt_id: attempt_id.clone(),
                        status: current,
                        event_seq: None,
                    })
                }
                _ => {
                    let event_seq = self.repository.append_status(
                        task_id,
                        attempt_id,
                        AttemptStatus::UnknownAfterRestart,
                    )?;
                    Ok(ReconcileResult {
                        attempt_id: attempt_id.clone(),
                        status: AttemptStatus::UnknownAfterRestart,
                        event_seq: Some(event_seq),
                    })
                }
            };
        };
        let observation = match self.execution.reconcile(attempt_id, &binding.session_id) {
            Ok(observation) => observation,
            Err(_) => ExecutionObservation::Unknown,
        };
        match observed_transition(&current, &observation) {
            Some(next) => {
                let event_seq = self
                    .repository
                    .append_status(task_id, attempt_id, next.clone())?;
                if matches!(next, AttemptStatus::Succeeded) {
                    self.progress_task_on_success(task_id)?;
                }
                Ok(ReconcileResult {
                    attempt_id: attempt_id.clone(),
                    status: next,
                    event_seq: Some(event_seq),
                })
            }
            None => Ok(ReconcileResult {
                attempt_id: attempt_id.clone(),
                status: current,
                event_seq: None,
            }),
        }
    }

    pub fn create_task(
        &self,
        request: CreateTaskRequest,
    ) -> Result<CreateTaskResult, ApplicationError> {
        let request_hash = canonical_task_request_hash(
            &request.goal,
            &request.acceptance_criteria,
            &request.owner_id,
            &request.mode,
        );
        if let Some(result) = self.reuse_task(&request, &request_hash)? {
            return Ok(result);
        }
        let task_id = TaskId(Uuid::new_v4().to_string());
        let mut task = Task::new(task_id.clone());
        task.assign_owner(request.owner_id.clone())
            .map_err(|error| ApplicationError::InvalidParameter(error.to_string()))?;
        task.define_acceptance()
            .map_err(|error| ApplicationError::InvalidParameter(error.to_string()))?;
        task.mark_ready()
            .map_err(|error| ApplicationError::InvalidParameter(error.to_string()))?;
        let record = TaskRecord {
            id: task_id.clone(),
            goal: request.goal.clone(),
            acceptance_criteria: request.acceptance_criteria.clone(),
            owner_id: request.owner_id.clone(),
            mode: request.mode.clone(),
            status: task.status.clone(),
            updated_at: None,
        };
        if let Err(error) =
            self.repository
                .create_task(&record, &request.idempotency_key, &request_hash)
        {
            // Another caller may have won the unique-key race between lookup and insert.
            if let Some(result) = self.reuse_task(&request, &request_hash)? {
                return Ok(result);
            }
            return Err(ApplicationError::Persistence(error));
        }
        let event_seq = self
            .repository
            .append_task_status(&task_id, task.status.clone())?;
        Ok(CreateTaskResult::Created {
            task_id,
            status: task.status,
            event_seq,
        })
    }

    fn reuse_task(
        &self,
        request: &CreateTaskRequest,
        request_hash: &str,
    ) -> Result<Option<CreateTaskResult>, ApplicationError> {
        let Some(existing) = self
            .repository
            .find_task_idempotency(&request.idempotency_key)?
        else {
            return Ok(None);
        };
        if existing.request_hash != request_hash {
            return Err(ApplicationError::IdempotencyConflict);
        }
        let status = self
            .repository
            .task(&existing.task_id)?
            .ok_or(ApplicationError::MissingTask)?
            .status;
        Ok(Some(CreateTaskResult::Existing {
            task_id: existing.task_id,
            status,
        }))
    }

    pub fn list_tasks(&self, query: TaskListQuery) -> Result<TaskListPage, ApplicationError> {
        let ordering = self.repository.timestamp_ordering()?;
        let rows = self.repository.list_tasks(
            query.status.as_ref(),
            query.owner.as_deref(),
            query.offset,
            query.limit + 1,
            ordering,
        )?;
        let has_more = rows.len() > query.limit;
        let items = rows.into_iter().take(query.limit).collect();
        let next_offset = has_more.then(|| (query.offset + query.limit) as u64);
        Ok(TaskListPage {
            items,
            next_offset,
            ordering,
        })
    }

    pub fn task_detail(&self, task_id: &TaskId) -> Result<TaskDetailView, ApplicationError> {
        let task = self
            .repository
            .task(task_id)?
            .ok_or_else(|| ApplicationError::NotFound("task not found".into()))?;
        let attempts = self.repository.attempts_for_task(task_id, None, None)?;
        let last_seq = self.repository.task_last_seq(task_id)?;
        let ordering = self.repository.timestamp_ordering()?;
        Ok(TaskDetailView {
            task,
            attempts,
            last_seq,
            ordering,
        })
    }

    pub fn task_attempts(
        &self,
        task_id: &TaskId,
        before_attempt_no: Option<u32>,
        limit: usize,
    ) -> Result<AttemptListPage, ApplicationError> {
        if self.repository.task(task_id)?.is_none() {
            return Err(ApplicationError::NotFound("task not found".into()));
        }
        let rows =
            self.repository
                .attempts_for_task(task_id, before_attempt_no, Some(limit + 1))?;
        let has_more = rows.len() > limit;
        let items: Vec<AttemptSummaryRow> = rows.into_iter().take(limit).collect();
        let next_cursor =
            has_more.then(|| items.last().expect("page is not empty").attempt_no as u64);
        Ok(AttemptListPage { items, next_cursor })
    }

    pub fn attempt_binding(
        &self,
        attempt_id: &AttemptId,
    ) -> Result<AttemptBinding, ApplicationError> {
        if self.repository.status(attempt_id)?.is_none() {
            return Err(ApplicationError::NotFound("attempt not found".into()));
        }
        self.repository
            .binding(attempt_id)?
            .ok_or_else(|| ApplicationError::NotFound("attempt has no active binding".into()))
    }

    pub fn attempt_events(&self, query: EventPageQuery) -> Result<EventPage, ApplicationError> {
        let owner = self
            .repository
            .attempt_task(&query.attempt_id)?
            .ok_or_else(|| ApplicationError::NotFound("attempt not found".into()))?;
        if owner != query.task_id {
            return Err(ApplicationError::NotFound(
                "attempt does not belong to task".into(),
            ));
        }
        let (events, confirmed_seq) = match query.source {
            Some(EventSourceFilter::Execution) => {
                let binding = self.repository.binding(&query.attempt_id)?.ok_or_else(|| {
                    ApplicationError::NotFound("attempt has no active binding".into())
                })?;
                let sessions = vec![binding.session_id];
                let events =
                    self.repository
                        .session_events(&sessions, query.after_seq, query.limit + 1)?;
                let confirmed_seq = self.repository.session_max_seq(&sessions)?;
                (events, confirmed_seq)
            }
            Some(EventSourceFilter::Magic) | None => {
                let events = self.repository.attempt_events(
                    &query.attempt_id,
                    query.after_seq,
                    query.limit + 1,
                    Some("magic"),
                )?;
                let confirmed_seq = self.repository.attempt_max_seq(&query.attempt_id)?;
                (events, confirmed_seq)
            }
        };
        let has_more = events.len() > query.limit;
        let events: Vec<LedgerEvent> = events.into_iter().take(query.limit).collect();
        let next_cursor = has_more.then(|| events.last().expect("page is not empty").seq);
        Ok(EventPage {
            events,
            next_cursor,
            confirmed_seq,
        })
    }

    fn progress_task_on_dispatch(&self, task_id: &TaskId) -> Result<(), ApplicationError> {
        self.transition_task(task_id, |task| task.begin_attempt())
    }

    fn progress_task_on_success(&self, task_id: &TaskId) -> Result<(), ApplicationError> {
        self.transition_task(task_id, |task| task.await_review())
    }

    /// FZ-8: Task transitions are server-driven and only written when the domain
    /// state machine allows them; tasks without a projection row are skipped.
    fn transition_task(
        &self,
        task_id: &TaskId,
        transition: impl FnOnce(&mut Task) -> Result<(), InvalidTransition>,
    ) -> Result<(), ApplicationError> {
        let Some(record) = self.repository.task(task_id)? else {
            return Ok(());
        };
        let mut task = Task {
            id: record.id.clone(),
            status: record.status,
            current_owner_id: Some(record.owner_id),
            acceptance_criteria_defined: true,
        };
        if transition(&mut task).is_err() {
            return Ok(());
        }
        self.repository
            .append_task_status(task_id, task.status.clone())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use magic_execution_port::{ExecutionError, ExecutionReceipt, ExecutionSession};
    use magic_persistence::SqlitePersistence;
    use magic_persistence_port::EventRepository;
    use std::sync::{Arc, Mutex};

    #[derive(Clone)]
    struct FakeExecution {
        calls: Arc<Mutex<u32>>,
        should_fail: bool,
        observation: ExecutionObservation,
        reconcile_fails: bool,
    }

    impl FakeExecution {
        fn running() -> Self {
            Self {
                calls: Arc::new(Mutex::new(0)),
                should_fail: false,
                observation: ExecutionObservation::Running,
                reconcile_fails: false,
            }
        }

        fn with_observation(observation: ExecutionObservation) -> Self {
            Self {
                observation,
                ..Self::running()
            }
        }
    }

    impl ExecutionPort for FakeExecution {
        fn adapter_name(&self) -> &'static str {
            "test-v1"
        }

        fn create_session(
            &self,
            _directory: Option<&str>,
        ) -> Result<ExecutionSession, ExecutionError> {
            Ok(ExecutionSession {
                id: "session-1".into(),
            })
        }

        fn submit(
            &self,
            _attempt_id: &AttemptId,
            _session_id: &str,
            _input: &str,
        ) -> Result<ExecutionReceipt, ExecutionError> {
            *self.calls.lock().unwrap() += 1;
            if self.should_fail {
                Err(ExecutionError::Adapter("simulated failure".into()))
            } else {
                Ok(ExecutionReceipt {
                    message_id: Some("message-1".into()),
                })
            }
        }

        fn cancel(&self, _attempt_id: &AttemptId, _session_id: &str) -> Result<(), ExecutionError> {
            Ok(())
        }

        fn reconcile(
            &self,
            _attempt_id: &AttemptId,
            _session_id: &str,
        ) -> Result<ExecutionObservation, ExecutionError> {
            if self.reconcile_fails {
                Err(ExecutionError::Adapter("observation failed".into()))
            } else {
                Ok(self.observation.clone())
            }
        }
    }

    fn request(hash: &str, id: &str) -> DispatchRequest {
        request_for(&TaskId("task-1".into()), hash, id)
    }

    fn request_for(task_id: &TaskId, hash: &str, id: &str) -> DispatchRequest {
        DispatchRequest {
            task_id: task_id.clone(),
            attempt_id: AttemptId(id.into()),
            attempt_no: 1,
            idempotency_key: "request-1".into(),
            request_hash: hash.into(),
            directory: Some("C:/Magic".into()),
            input: "do work".into(),
        }
    }

    fn new_task(app: &Application<FakeExecution, SqlitePersistence>) -> TaskId {
        match app.create_task(create_task_request("key-1")).unwrap() {
            CreateTaskResult::Created { task_id, .. } => task_id,
            other => panic!("unexpected result: {other:?}"),
        }
    }

    fn create_task_request(key: &str) -> CreateTaskRequest {
        CreateTaskRequest {
            idempotency_key: key.into(),
            goal: "ship the thing".into(),
            acceptance_criteria: vec!["tests pass".into()],
            owner_id: "member-1".into(),
            mode: "agent".into(),
        }
    }

    #[test]
    fn canonical_request_hash_is_stable_and_distinguishes_bodies() {
        let first = canonical_task_request_hash("goal", &["a".into()], "owner", "agent");
        let second = canonical_task_request_hash("goal", &["a".into()], "owner", "agent");
        assert_eq!(first, second);
        assert_eq!(first.len(), 64);
        let changed_criteria = canonical_task_request_hash("goal", &["b".into()], "owner", "agent");
        let changed_mode = canonical_task_request_hash("goal", &["a".into()], "owner", "ceo");
        assert_ne!(first, changed_criteria);
        assert_ne!(first, changed_mode);
    }

    #[test]
    fn create_task_auto_progresses_proposed_to_ready() {
        let app = Application::new(
            FakeExecution::running(),
            SqlitePersistence::open_in_memory().unwrap(),
        );
        let result = app.create_task(create_task_request("key-1")).unwrap();
        let task_id = match result {
            CreateTaskResult::Created {
                task_id,
                status,
                event_seq,
            } => {
                assert_eq!(status, TaskStatus::Ready);
                assert_eq!(event_seq, 1);
                task_id
            }
            other => panic!("unexpected result: {other:?}"),
        };
        let detail = app.task_detail(&task_id).unwrap();
        assert_eq!(detail.task.status, TaskStatus::Ready);
        assert_eq!(detail.task.owner_id, "member-1");
        assert_eq!(detail.task.acceptance_criteria, vec!["tests pass"]);
        assert_eq!(detail.last_seq, 1);
    }

    #[test]
    fn same_task_idempotency_key_reuses_and_conflicting_body_is_rejected() {
        let app = Application::new(
            FakeExecution::running(),
            SqlitePersistence::open_in_memory().unwrap(),
        );
        let first = app.create_task(create_task_request("key-1")).unwrap();
        let task_id = match &first {
            CreateTaskResult::Created { task_id, .. } => task_id.clone(),
            other => panic!("unexpected result: {other:?}"),
        };
        let reused = app.create_task(create_task_request("key-1")).unwrap();
        assert_eq!(
            reused,
            CreateTaskResult::Existing {
                task_id,
                status: TaskStatus::Ready
            }
        );
        let mut changed = create_task_request("key-1");
        changed.goal = "different goal".into();
        assert!(matches!(
            app.create_task(changed),
            Err(ApplicationError::IdempotencyConflict)
        ));
    }

    #[test]
    fn dispatch_progresses_ready_task_to_in_progress() {
        let repository = SqlitePersistence::open_in_memory().unwrap();
        let app = Application::new(FakeExecution::running(), repository.clone());
        let task_id = new_task(&app);
        app.dispatch_attempt(request_for(&task_id, "hash-1", "attempt-1"))
            .unwrap();
        let task = repository.task(&task_id).unwrap().unwrap();
        assert_eq!(task.status, TaskStatus::InProgress);

        app.dispatch_attempt(DispatchRequest {
            attempt_no: 2,
            attempt_id: AttemptId("attempt-2".into()),
            ..request_for(&task_id, "hash-1", "attempt-2")
        })
        .unwrap();
        let task = repository.task(&task_id).unwrap().unwrap();
        assert_eq!(task.status, TaskStatus::InProgress);
    }

    #[test]
    fn reconcile_with_live_session_keeps_running_without_events() {
        let app = Application::new(
            FakeExecution::running(),
            SqlitePersistence::open_in_memory().unwrap(),
        );
        app.dispatch_attempt(request("hash-1", "attempt-1"))
            .unwrap();
        let result = app
            .reconcile_attempt(&TaskId("task-1".into()), &AttemptId("attempt-1".into()))
            .unwrap();
        assert_eq!(result.status, AttemptStatus::Running);
        assert_eq!(result.event_seq, None);
    }

    #[test]
    fn reconcile_with_terminal_evidence_closes_attempt_and_awaits_review() {
        let repository = SqlitePersistence::open_in_memory().unwrap();
        let app = Application::new(
            FakeExecution::with_observation(ExecutionObservation::Terminal(
                AttemptStatus::Succeeded,
            )),
            repository.clone(),
        );
        let task_id = new_task(&app);
        app.dispatch_attempt(request_for(&task_id, "hash-1", "attempt-1"))
            .unwrap();
        let result = app
            .reconcile_attempt(&task_id, &AttemptId("attempt-1".into()))
            .unwrap();
        assert_eq!(result.status, AttemptStatus::Succeeded);
        assert_eq!(result.event_seq, Some(3));
        let task = repository.task(&task_id).unwrap().unwrap();
        assert_eq!(task.status, TaskStatus::AwaitingReview);
    }

    #[test]
    fn reconcile_without_binding_falls_back_to_unknown_for_active_attempts() {
        let repository = SqlitePersistence::open_in_memory().unwrap();
        let app = Application::new(FakeExecution::running(), repository.clone());
        let task_id = TaskId("task-1".into());
        let attempt_id = AttemptId("attempt-1".into());
        repository
            .create_attempt(&task_id, &attempt_id, 1, "request-1", "hash-1")
            .unwrap();
        repository
            .append_status(&task_id, &attempt_id, AttemptStatus::Admitted)
            .unwrap();
        let result = app.reconcile_attempt(&task_id, &attempt_id).unwrap();
        assert_eq!(result.status, AttemptStatus::UnknownAfterRestart);
        assert_eq!(result.event_seq, Some(2));
    }

    #[test]
    fn reconcile_failure_marks_active_attempt_unknown() {
        let mut execution = FakeExecution::running();
        execution.reconcile_fails = true;
        let app = Application::new(execution, SqlitePersistence::open_in_memory().unwrap());
        app.dispatch_attempt(request("hash-1", "attempt-1"))
            .unwrap();
        let result = app
            .reconcile_attempt(&TaskId("task-1".into()), &AttemptId("attempt-1".into()))
            .unwrap();
        assert_eq!(result.status, AttemptStatus::UnknownAfterRestart);
        assert_eq!(result.event_seq, Some(3));
    }

    #[test]
    fn reconcile_on_created_attempt_without_binding_is_a_noop() {
        let repository = SqlitePersistence::open_in_memory().unwrap();
        let app = Application::new(FakeExecution::running(), repository.clone());
        let task_id = TaskId("task-1".into());
        let attempt_id = AttemptId("attempt-1".into());
        repository
            .create_attempt(&task_id, &attempt_id, 1, "request-1", "hash-1")
            .unwrap();
        let result = app.reconcile_attempt(&task_id, &attempt_id).unwrap();
        assert_eq!(result.status, AttemptStatus::Created);
        assert_eq!(result.event_seq, None);
    }

    #[test]
    fn reconcile_on_unknown_attempt_with_live_session_stays_unknown() {
        let repository = SqlitePersistence::open_in_memory().unwrap();
        let app = Application::new(FakeExecution::running(), repository.clone());
        let task_id = TaskId("task-1".into());
        let attempt_id = AttemptId("attempt-1".into());
        repository
            .create_attempt(&task_id, &attempt_id, 1, "request-1", "hash-1")
            .unwrap();
        repository
            .append_status(&task_id, &attempt_id, AttemptStatus::Admitted)
            .unwrap();
        repository
            .append_status(&task_id, &attempt_id, AttemptStatus::Running)
            .unwrap();
        repository
            .append_status(&task_id, &attempt_id, AttemptStatus::UnknownAfterRestart)
            .unwrap();
        repository
            .create_binding(&AttemptBinding {
                attempt_id: attempt_id.clone(),
                adapter: "opencode-v1".into(),
                session_id: "session-1".into(),
                message_id: None,
            })
            .unwrap();
        let result = app.reconcile_attempt(&task_id, &attempt_id).unwrap();
        assert_eq!(result.status, AttemptStatus::UnknownAfterRestart);
        assert_eq!(result.event_seq, None);
    }

    #[test]
    fn dispatch_persists_and_submits_once() {
        let calls = Arc::new(Mutex::new(0));
        let app = Application::new(
            FakeExecution {
                calls: calls.clone(),
                ..FakeExecution::running()
            },
            SqlitePersistence::open_in_memory().unwrap(),
        );
        let result = app
            .dispatch_attempt(request("hash-1", "attempt-1"))
            .unwrap();
        assert_eq!(
            result,
            DispatchResult::Created {
                attempt_id: AttemptId("attempt-1".into()),
                event_seq: 2
            }
        );
        assert_eq!(*calls.lock().unwrap(), 1);
    }

    #[test]
    fn same_idempotent_request_returns_existing_without_resubmit() {
        let calls = Arc::new(Mutex::new(0));
        let app = Application::new(
            FakeExecution {
                calls: calls.clone(),
                ..FakeExecution::running()
            },
            SqlitePersistence::open_in_memory().unwrap(),
        );
        app.dispatch_attempt(request("hash-1", "attempt-1"))
            .unwrap();
        let result = app
            .dispatch_attempt(request("hash-1", "attempt-2"))
            .unwrap();
        assert_eq!(
            result,
            DispatchResult::Existing {
                attempt_id: AttemptId("attempt-1".into()),
                status: AttemptStatus::Running
            }
        );
        assert_eq!(*calls.lock().unwrap(), 1);
    }

    #[test]
    fn changed_request_body_with_same_key_is_rejected() {
        let app = Application::new(
            FakeExecution::running(),
            SqlitePersistence::open_in_memory().unwrap(),
        );
        app.dispatch_attempt(request("hash-1", "attempt-1"))
            .unwrap();
        assert!(matches!(
            app.dispatch_attempt(request("hash-2", "attempt-2")),
            Err(ApplicationError::IdempotencyConflict)
        ));
    }

    #[test]
    fn execution_failure_is_recorded_as_failed() {
        let calls = Arc::new(Mutex::new(0));
        let repository = SqlitePersistence::open_in_memory().unwrap();
        let app = Application::new(
            FakeExecution {
                calls: calls.clone(),
                should_fail: true,
                ..FakeExecution::running()
            },
            repository,
        );
        assert!(matches!(
            app.dispatch_attempt(request("hash-1", "attempt-1")),
            Err(ApplicationError::Execution(_))
        ));
        assert_eq!(*calls.lock().unwrap(), 1);
    }

    #[test]
    fn task_queries_paginate_and_filter() {
        let repository = SqlitePersistence::open_in_memory().unwrap();
        let app = Application::new(FakeExecution::running(), repository.clone());
        for key in ["key-1", "key-2", "key-3"] {
            app.create_task(create_task_request(key)).unwrap();
        }
        let page = app
            .list_tasks(TaskListQuery {
                status: None,
                owner: None,
                offset: 0,
                limit: 2,
            })
            .unwrap();
        assert_eq!(page.items.len(), 2);
        assert_eq!(page.next_offset, Some(2));
        assert_eq!(page.ordering, TimestampOrdering::UpdatedAt);
        let last = app
            .list_tasks(TaskListQuery {
                status: None,
                owner: None,
                offset: 2,
                limit: 2,
            })
            .unwrap();
        assert_eq!(last.items.len(), 1);
        assert_eq!(last.next_offset, None);
        let filtered = app
            .list_tasks(TaskListQuery {
                status: Some(TaskStatus::Ready),
                owner: Some("member-1".into()),
                offset: 0,
                limit: 10,
            })
            .unwrap();
        assert_eq!(filtered.items.len(), 3);
        let empty = app
            .list_tasks(TaskListQuery {
                status: Some(TaskStatus::Completed),
                owner: None,
                offset: 0,
                limit: 10,
            })
            .unwrap();
        assert!(empty.items.is_empty());
        assert!(matches!(
            app.task_detail(&TaskId("missing".into())),
            Err(ApplicationError::NotFound(_))
        ));
    }

    #[test]
    fn attempt_list_pages_by_descending_attempt_no() {
        let repository = SqlitePersistence::open_in_memory().unwrap();
        let app = Application::new(FakeExecution::running(), repository.clone());
        let task_id = new_task(&app);
        for no in 1..=3 {
            app.dispatch_attempt(DispatchRequest {
                attempt_no: no,
                attempt_id: AttemptId(format!("attempt-{no}")),
                idempotency_key: format!("request-{no}"),
                ..request_for(&task_id, "hash", "attempt-x")
            })
            .unwrap();
        }
        let page = app.task_attempts(&task_id, None, 2).unwrap();
        assert_eq!(
            page.items
                .iter()
                .map(|item| item.attempt_no)
                .collect::<Vec<_>>(),
            vec![3, 2]
        );
        assert_eq!(page.next_cursor, Some(2));
        let tail = app.task_attempts(&task_id, Some(2), 2).unwrap();
        assert_eq!(
            tail.items
                .iter()
                .map(|item| item.attempt_no)
                .collect::<Vec<_>>(),
            vec![1]
        );
        assert_eq!(tail.next_cursor, None);
        assert!(matches!(
            app.task_attempts(&TaskId("missing".into()), None, 10),
            Err(ApplicationError::NotFound(_))
        ));
    }

    #[test]
    fn binding_query_distinguishes_missing_attempt_and_missing_binding() {
        let repository = SqlitePersistence::open_in_memory().unwrap();
        let app = Application::new(FakeExecution::running(), repository.clone());
        app.dispatch_attempt(request("hash-1", "attempt-1"))
            .unwrap();
        let binding = app.attempt_binding(&AttemptId("attempt-1".into())).unwrap();
        assert_eq!(binding.adapter, "test-v1");
        assert_eq!(binding.session_id, "session-1");
        assert_eq!(binding.message_id, Some("message-1".into()));

        repository
            .create_attempt(
                &TaskId("task-1".into()),
                &AttemptId("attempt-2".into()),
                2,
                "request-2",
                "hash-2",
            )
            .unwrap();
        assert!(matches!(
            app.attempt_binding(&AttemptId("attempt-2".into())),
            Err(ApplicationError::NotFound(_))
        ));
        assert!(matches!(
            app.attempt_binding(&AttemptId("missing".into())),
            Err(ApplicationError::NotFound(_))
        ));
    }

    #[test]
    fn event_queries_filter_by_source_and_page() {
        let repository = SqlitePersistence::open_in_memory().unwrap();
        let app = Application::new(FakeExecution::running(), repository.clone());
        let task_id = new_task(&app);
        app.dispatch_attempt(request_for(&task_id, "hash-1", "attempt-1"))
            .unwrap();
        repository
            .append_external_event(&magic_persistence_port::ExternalEvent {
                aggregate_type: "opencode".into(),
                aggregate_id: "session-1".into(),
                seq: Some(1),
                event_type: "session.updated".into(),
                source: "opencode-v1".into(),
                source_event_id: Some("event-1".into()),
                payload_json: r#"{"status":"running"}"#.into(),
            })
            .unwrap();

        let query = {
            let task_id = task_id.clone();
            move |after_seq: u64, source: Option<EventSourceFilter>| EventPageQuery {
                task_id: task_id.clone(),
                attempt_id: AttemptId("attempt-1".into()),
                after_seq,
                limit: 1,
                source,
            }
        };
        let magic = app
            .attempt_events(query(0, Some(EventSourceFilter::Magic)))
            .unwrap();
        assert_eq!(magic.events.len(), 1);
        assert_eq!(magic.events[0].seq, 1);
        assert_eq!(magic.next_cursor, Some(1));
        assert_eq!(magic.confirmed_seq, 2);
        let rest = app
            .attempt_events(query(1, Some(EventSourceFilter::Magic)))
            .unwrap();
        assert_eq!(rest.events.len(), 1);
        assert_eq!(rest.events[0].seq, 2);
        assert_eq!(rest.next_cursor, None);
        let external = app
            .attempt_events(query(0, Some(EventSourceFilter::Execution)))
            .unwrap();
        assert_eq!(external.events.len(), 1);
        assert_eq!(external.events[0].source, "opencode-v1");
        assert_eq!(external.confirmed_seq, 1);
        let default_view = app.attempt_events(query(0, None)).unwrap();
        assert_eq!(default_view.events.len(), 1);
        assert_eq!(default_view.confirmed_seq, 2);
        app.dispatch_attempt(request_for(
            &TaskId("task-9".into()),
            "hash-2",
            "attempt-foreign",
        ))
        .unwrap();
        assert!(matches!(
            app.attempt_events(EventPageQuery {
                task_id: TaskId("task-1".into()),
                attempt_id: AttemptId("attempt-foreign".into()),
                after_seq: 0,
                limit: 10,
                source: None,
            }),
            Err(ApplicationError::NotFound(_))
        ));
    }
}
