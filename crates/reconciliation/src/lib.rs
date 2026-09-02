//! Event deduplication, history backfill and restart reconciliation.

use magic_domain::AttemptStatus;
use magic_execution_port::{EventSource, ExecutionError, ExecutionPort};
use magic_persistence_port::{AttemptRepository, EventRepository, ExternalEvent, PersistenceError};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ReconciliationError {
    #[error(transparent)]
    Persistence(#[from] PersistenceError),
    #[error(transparent)]
    Execution(#[from] ExecutionError),
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RecoveryReport {
    pub fetched: usize,
    pub inserted: usize,
    pub confirmed_sequences: usize,
    pub reconciled: usize,
    pub unknown: usize,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IngestResult {
    pub inserted: bool,
    pub event_seq: u64,
    pub confirmed_seq: u64,
}

pub struct Reconciler<R> {
    repository: R,
}

impl<R> Reconciler<R>
where
    R: EventRepository,
{
    pub fn new(repository: R) -> Self {
        Self { repository }
    }

    pub fn ingest(&self, event: ExternalEvent) -> Result<IngestResult, ReconciliationError> {
        let aggregate_type = event.aggregate_type.clone();
        let aggregate_id = event.aggregate_id.clone();
        let result = self.repository.append_external_event(&event)?;
        let previous = self
            .repository
            .cursor(&aggregate_type, &aggregate_id)?
            .map(|cursor| cursor.last_confirmed_seq)
            .unwrap_or(0);
        if result.seq == previous.saturating_add(1) {
            self.repository
                .advance_cursor(&aggregate_type, &aggregate_id, result.seq)?;
        }
        let confirmed_seq = self
            .repository
            .cursor(&aggregate_type, &aggregate_id)?
            .map(|cursor| cursor.last_confirmed_seq)
            .unwrap_or(0);
        Ok(IngestResult {
            inserted: result.inserted,
            event_seq: result.seq,
            confirmed_seq,
        })
    }
}

pub struct RecoveryWorker<S, R> {
    source: S,
    reconciler: Reconciler<R>,
}

impl<S, R> RecoveryWorker<S, R>
where
    S: EventSource + ExecutionPort,
    R: EventRepository + AttemptRepository,
{
    pub fn new(source: S, repository: R) -> Self {
        Self {
            source,
            reconciler: Reconciler::new(repository),
        }
    }

    pub fn run_once(&self) -> Result<RecoveryReport, ReconciliationError> {
        let known: HashMap<String, u64> = self
            .reconciler
            .repository
            .cursors()?
            .into_iter()
            .map(|cursor| (cursor.aggregate_id, cursor.last_confirmed_seq))
            .collect();
        let history = self.source.sync_history(&known)?;
        let mut inserted = 0;
        let mut confirmed_sequences = 0;
        for event in &history {
            let result = self.reconciler.ingest(ExternalEvent {
                aggregate_type: "opencode".into(),
                aggregate_id: event.aggregate_id.clone(),
                seq: Some(event.seq),
                event_type: event.event_type.clone(),
                source: "opencode-v1".into(),
                source_event_id: Some(event.id.clone()),
                payload_json: event.data_json.clone(),
            })?;
            inserted += usize::from(result.inserted);
            confirmed_sequences += usize::from(result.confirmed_seq == result.event_seq);
        }
        let mut reconciled = 0;
        let mut unknown = 0;
        for active in self.reconciler.repository.active_attempts()? {
            let Some(binding) = self.reconciler.repository.binding(&active.attempt_id)? else {
                let _ = self.reconciler.repository.append_status(
                    &active.task_id,
                    &active.attempt_id,
                    AttemptStatus::UnknownAfterRestart,
                );
                unknown += 1;
                continue;
            };
            let observed = match self
                .source
                .reconcile(&active.attempt_id, &binding.session_id)
            {
                Ok(status) => status,
                Err(_) => AttemptStatus::UnknownAfterRestart,
            };
            let next = safe_reconciled_status(active.status.clone(), observed);
            if next == active.status {
                continue;
            }
            self.reconciler.repository.append_status(
                &active.task_id,
                &active.attempt_id,
                next.clone(),
            )?;
            reconciled += 1;
            unknown += usize::from(next == AttemptStatus::UnknownAfterRestart);
        }
        Ok(RecoveryReport {
            fetched: history.len(),
            inserted,
            confirmed_sequences,
            reconciled,
            unknown,
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
    use magic_execution_port::{ExecutionEvent, ExecutionHistoryEvent};
    use magic_persistence::SqlitePersistence;

    struct FakeSource;

    impl EventSource for FakeSource {
        fn read_events(&self, _max_events: usize) -> Result<Vec<ExecutionEvent>, ExecutionError> {
            Ok(Vec::new())
        }

        fn sync_history(
            &self,
            _known_sequences: &HashMap<String, u64>,
        ) -> Result<Vec<ExecutionHistoryEvent>, ExecutionError> {
            Ok(vec![ExecutionHistoryEvent {
                id: "event-1".into(),
                aggregate_id: "session-1".into(),
                seq: 1,
                event_type: "session.updated".into(),
                data_json: "{}".into(),
            }])
        }
    }

    impl ExecutionPort for FakeSource {
        fn create_session(
            &self,
            _directory: Option<&str>,
        ) -> Result<magic_execution_port::ExecutionSession, ExecutionError> {
            unreachable!()
        }

        fn submit(
            &self,
            _attempt_id: &magic_domain::AttemptId,
            _session_id: &str,
            _input: &str,
        ) -> Result<magic_execution_port::ExecutionReceipt, ExecutionError> {
            unreachable!()
        }

        fn cancel(
            &self,
            _attempt_id: &magic_domain::AttemptId,
            _session_id: &str,
        ) -> Result<(), ExecutionError> {
            unreachable!()
        }

        fn reconcile(
            &self,
            _attempt_id: &magic_domain::AttemptId,
            _session_id: &str,
        ) -> Result<AttemptStatus, ExecutionError> {
            Ok(AttemptStatus::UnknownAfterRestart)
        }
    }

    fn event(seq: u64, id: &str) -> ExternalEvent {
        ExternalEvent {
            aggregate_type: "attempt".into(),
            aggregate_id: "attempt-1".into(),
            seq: Some(seq),
            event_type: "execution.progress".into(),
            source: "opencode-v1".into(),
            source_event_id: Some(id.into()),
            payload_json: "{}".into(),
        }
    }

    #[test]
    fn duplicate_source_event_is_ignored_and_cursor_is_monotonic() {
        let reconciler = Reconciler::new(SqlitePersistence::open_in_memory().unwrap());
        let first = reconciler.ingest(event(1, "event-1")).unwrap();
        assert_eq!(
            first,
            IngestResult {
                inserted: true,
                event_seq: 1,
                confirmed_seq: 1
            }
        );
        let duplicate = reconciler.ingest(event(1, "event-1")).unwrap();
        assert_eq!(duplicate.inserted, false);
        assert_eq!(duplicate.confirmed_seq, 1);
    }

    #[test]
    fn out_of_order_event_does_not_skip_cursor_gap() {
        let reconciler = Reconciler::new(SqlitePersistence::open_in_memory().unwrap());
        let result = reconciler.ingest(event(2, "event-2")).unwrap();
        assert_eq!(result.confirmed_seq, 0);
        let result = reconciler.ingest(event(1, "event-1")).unwrap();
        assert_eq!(result.confirmed_seq, 1);
    }

    #[test]
    fn recovery_worker_pulls_history_using_persisted_cursor() {
        let worker = RecoveryWorker::new(FakeSource, SqlitePersistence::open_in_memory().unwrap());
        let report = worker.run_once().unwrap();
        assert_eq!(
            report,
            RecoveryReport {
                fetched: 1,
                inserted: 1,
                confirmed_sequences: 1,
                reconciled: 0,
                unknown: 0,
            }
        );
    }

    #[test]
    fn recovery_worker_reconciles_active_attempts_without_re_dispatching() {
        let repository = SqlitePersistence::open_in_memory().unwrap();
        let task_id = magic_domain::TaskId("task-1".into());
        let attempt_id = magic_domain::AttemptId("attempt-1".into());
        repository
            .create_attempt(&task_id, &attempt_id, 1, "key-1", "hash-1")
            .unwrap();
        repository
            .append_status(&task_id, &attempt_id, AttemptStatus::Admitted)
            .unwrap();
        repository
            .append_status(&task_id, &attempt_id, AttemptStatus::Running)
            .unwrap();
        repository
            .create_binding(&magic_persistence_port::AttemptBinding {
                attempt_id: attempt_id.clone(),
                adapter: "opencode-v1".into(),
                session_id: "session-1".into(),
                message_id: None,
            })
            .unwrap();
        let worker = RecoveryWorker::new(FakeSource, repository.clone());
        let report = worker.run_once().unwrap();
        assert_eq!(report.reconciled, 1);
        assert_eq!(report.unknown, 1);
        assert_eq!(
            repository.status(&attempt_id).unwrap(),
            Some(AttemptStatus::UnknownAfterRestart)
        );
    }
}
