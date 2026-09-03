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

/// Outcome of probing a live execution session (FZ-1 observation semantics).
///
/// `Running` means the session binding is alive but no terminal evidence exists;
/// `Terminal` carries explicit terminal evidence; `Unknown` means the observation
/// itself could not be established (session lost, adapter failure).
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ExecutionObservation {
    Running,
    Terminal(AttemptStatus),
    Unknown,
}

/// Maps an observation onto the next Attempt status.
///
/// Returns `None` when the Attempt must keep its current state without a new
/// event: sessions that are alive keep the status untouched, and transitions the
/// domain state machine does not allow are never written.
pub fn observed_transition(
    current: &AttemptStatus,
    observation: &ExecutionObservation,
) -> Option<AttemptStatus> {
    match observation {
        ExecutionObservation::Running => None,
        ExecutionObservation::Unknown => match current {
            AttemptStatus::Admitted | AttemptStatus::Running | AttemptStatus::Cancelling => {
                Some(AttemptStatus::UnknownAfterRestart)
            }
            _ => None,
        },
        ExecutionObservation::Terminal(observed) => match (current, observed) {
            (_, AttemptStatus::Succeeded | AttemptStatus::Failed)
                if matches!(
                    current,
                    AttemptStatus::Admitted
                        | AttemptStatus::Running
                        | AttemptStatus::Cancelling
                        | AttemptStatus::UnknownAfterRestart
                ) =>
            {
                Some(observed.clone())
            }
            (
                AttemptStatus::Cancelling | AttemptStatus::UnknownAfterRestart,
                AttemptStatus::Cancelled,
            ) => Some(AttemptStatus::Cancelled),
            (AttemptStatus::Admitted | AttemptStatus::Running, AttemptStatus::Cancelled) => {
                Some(AttemptStatus::UnknownAfterRestart)
            }
            _ => None,
        },
    }
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
    ) -> Result<ExecutionObservation, ExecutionError>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn running_observation_never_changes_state_or_emits_events() {
        for current in [
            AttemptStatus::Created,
            AttemptStatus::Admitted,
            AttemptStatus::Running,
            AttemptStatus::Cancelling,
            AttemptStatus::UnknownAfterRestart,
        ] {
            assert_eq!(
                observed_transition(&current, &ExecutionObservation::Running),
                None
            );
        }
    }

    #[test]
    fn unknown_observation_only_closes_active_attempts() {
        for current in [
            AttemptStatus::Admitted,
            AttemptStatus::Running,
            AttemptStatus::Cancelling,
        ] {
            assert_eq!(
                observed_transition(&current, &ExecutionObservation::Unknown),
                Some(AttemptStatus::UnknownAfterRestart)
            );
        }
        assert_eq!(
            observed_transition(&AttemptStatus::Created, &ExecutionObservation::Unknown),
            None
        );
        assert_eq!(
            observed_transition(
                &AttemptStatus::UnknownAfterRestart,
                &ExecutionObservation::Unknown
            ),
            None
        );
    }

    #[test]
    fn terminal_success_and_failure_evidence_close_attempts() {
        for current in [
            AttemptStatus::Admitted,
            AttemptStatus::Running,
            AttemptStatus::Cancelling,
            AttemptStatus::UnknownAfterRestart,
        ] {
            assert_eq!(
                observed_transition(
                    &current,
                    &ExecutionObservation::Terminal(AttemptStatus::Succeeded)
                ),
                Some(AttemptStatus::Succeeded)
            );
            assert_eq!(
                observed_transition(
                    &current,
                    &ExecutionObservation::Terminal(AttemptStatus::Failed)
                ),
                Some(AttemptStatus::Failed)
            );
        }
        assert_eq!(
            observed_transition(
                &AttemptStatus::Created,
                &ExecutionObservation::Terminal(AttemptStatus::Succeeded)
            ),
            None
        );
    }

    #[test]
    fn cancelled_evidence_only_closes_cancelling_or_unknown_attempts() {
        assert_eq!(
            observed_transition(
                &AttemptStatus::Cancelling,
                &ExecutionObservation::Terminal(AttemptStatus::Cancelled)
            ),
            Some(AttemptStatus::Cancelled)
        );
        assert_eq!(
            observed_transition(
                &AttemptStatus::UnknownAfterRestart,
                &ExecutionObservation::Terminal(AttemptStatus::Cancelled)
            ),
            Some(AttemptStatus::Cancelled)
        );
        assert_eq!(
            observed_transition(
                &AttemptStatus::Running,
                &ExecutionObservation::Terminal(AttemptStatus::Cancelled)
            ),
            Some(AttemptStatus::UnknownAfterRestart)
        );
        assert_eq!(
            observed_transition(
                &AttemptStatus::Admitted,
                &ExecutionObservation::Terminal(AttemptStatus::Cancelled)
            ),
            Some(AttemptStatus::UnknownAfterRestart)
        );
        assert_eq!(
            observed_transition(
                &AttemptStatus::Created,
                &ExecutionObservation::Terminal(AttemptStatus::Cancelled)
            ),
            None
        );
    }
}
