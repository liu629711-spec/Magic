//! Product use cases that coordinate domain rules, persistence and execution ports.

use magic_domain::{Attempt, AttemptId, AttemptStatus, TaskId};
use magic_execution_port::ExecutionPort;
use magic_persistence_port::{AttemptBinding, AttemptRepository, PersistenceError};
use thiserror::Error;

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
    #[error("attempt has no active execution binding")]
    MissingBinding,
}

impl<E, R> Application<E, R>
where
    E: ExecutionPort,
    R: AttemptRepository,
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
            adapter: "opencode-v1".into(),
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
        Ok(DispatchResult::Created {
            attempt_id: request.attempt_id,
            event_seq,
        })
    }

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
            return Ok(ReconcileResult {
                attempt_id: attempt_id.clone(),
                status: current,
                event_seq: None,
            });
        }
        let binding = self
            .repository
            .binding(attempt_id)?
            .ok_or(ApplicationError::MissingBinding)?;
        let observed = self
            .execution
            .reconcile(attempt_id, &binding.session_id)
            .map_err(|error| ApplicationError::Execution(error.to_string()))?;
        let next = safe_reconciled_status(current.clone(), observed);
        if next == current {
            return Ok(ReconcileResult {
                attempt_id: attempt_id.clone(),
                status: current,
                event_seq: None,
            });
        }
        let event_seq = self
            .repository
            .append_status(task_id, attempt_id, next.clone())?;
        Ok(ReconcileResult {
            attempt_id: attempt_id.clone(),
            status: next,
            event_seq: Some(event_seq),
        })
    }
}

fn safe_reconciled_status(current: AttemptStatus, observed: AttemptStatus) -> AttemptStatus {
    if matches!(observed, AttemptStatus::Succeeded | AttemptStatus::Failed) {
        return observed;
    }
    if matches!(current, AttemptStatus::UnknownAfterRestart) {
        return current;
    }
    if matches!(observed, AttemptStatus::Cancelled) && matches!(current, AttemptStatus::Cancelling)
    {
        return observed;
    }
    if matches!(
        current,
        AttemptStatus::Admitted | AttemptStatus::Running | AttemptStatus::Cancelling
    ) {
        return AttemptStatus::UnknownAfterRestart;
    }
    current
}

#[cfg(test)]
mod tests {
    use super::*;
    use magic_execution_port::{ExecutionError, ExecutionReceipt, ExecutionSession};
    use magic_persistence::SqlitePersistence;
    use std::sync::{Arc, Mutex};

    #[derive(Clone)]
    struct FakeExecution {
        calls: Arc<Mutex<u32>>,
        should_fail: bool,
    }

    impl ExecutionPort for FakeExecution {
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
        ) -> Result<AttemptStatus, ExecutionError> {
            Ok(AttemptStatus::Running)
        }
    }

    fn request(hash: &str, id: &str) -> DispatchRequest {
        DispatchRequest {
            task_id: TaskId("task-1".into()),
            attempt_id: AttemptId(id.into()),
            attempt_no: 1,
            idempotency_key: "request-1".into(),
            request_hash: hash.into(),
            directory: Some("C:/Magic".into()),
            input: "do work".into(),
        }
    }

    #[test]
    fn dispatch_persists_and_submits_once() {
        let calls = Arc::new(Mutex::new(0));
        let app = Application::new(
            FakeExecution {
                calls: calls.clone(),
                should_fail: false,
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
                should_fail: false,
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
            FakeExecution {
                calls: Arc::new(Mutex::new(0)),
                should_fail: false,
            },
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
    fn reconcile_without_terminal_evidence_moves_running_to_unknown() {
        let app = Application::new(
            FakeExecution {
                calls: Arc::new(Mutex::new(0)),
                should_fail: false,
            },
            SqlitePersistence::open_in_memory().unwrap(),
        );
        app.dispatch_attempt(request("hash-1", "attempt-1"))
            .unwrap();
        let result = app
            .reconcile_attempt(&TaskId("task-1".into()), &AttemptId("attempt-1".into()))
            .unwrap();
        assert_eq!(result.status, AttemptStatus::UnknownAfterRestart);
        assert_eq!(result.event_seq, Some(3));
    }
}
