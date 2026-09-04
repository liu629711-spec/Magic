//! Event deduplication, history backfill and restart reconciliation.

use magic_domain::{AttemptStatus, TaskId, TaskStatus};
use magic_execution_port::{
    observed_transition, EventSource, ExecutionError, ExecutionObservation, ExecutionPort,
};
use magic_persistence_port::{
    AttemptRepository, EventRepository, ExternalEvent, PersistenceError, TaskRepository,
};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ReconciliationError {
    #[error(transparent)]
    Persistence(#[from] PersistenceError),
    #[error(transparent)]
    Execution(#[from] ExecutionError),
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct RecoveryReport {
    pub fetched: usize,
    pub inserted: usize,
    pub confirmed_sequences: usize,
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct ProbeReport {
    pub probed: usize,
    pub closed: usize,
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
    R: EventRepository + AttemptRepository + TaskRepository,
{
    pub fn new(source: S, repository: R) -> Self {
        Self {
            source,
            reconciler: Reconciler::new(repository),
        }
    }

    /// FZ-1: the periodic cycle only backfills execution history into the ledger.
    /// It never probes live attempts, so a running Attempt is never rewritten to
    /// `unknown_after_restart` just because terminal evidence is missing.
    pub fn run_once(&self) -> Result<RecoveryReport, ReconciliationError> {
        let known: HashMap<String, u64> = self
            .reconciler
            .repository
            .cursors()?
            .into_iter()
            .map(|cursor| (cursor.aggregate_id, cursor.last_confirmed_seq))
            .collect();
        let history = self.source.sync_history(&known)?;
        let mut report = RecoveryReport {
            fetched: history.len(),
            ..RecoveryReport::default()
        };
        for event in &history {
            let result = self.reconciler.ingest(ExternalEvent {
                aggregate_type: self.source.aggregate_type().into(),
                aggregate_id: event.aggregate_id.clone(),
                seq: Some(event.seq),
                event_type: event.event_type.clone(),
                source: self.source.event_source_name().into(),
                source_event_id: Some(event.id.clone()),
                payload_json: event.data_json.clone(),
            })?;
            report.inserted += usize::from(result.inserted);
            report.confirmed_sequences += usize::from(result.confirmed_seq == result.event_seq);
        }
        Ok(report)
    }

    /// FZ-1 startup recovery: probe every active Attempt once (also used as the
    /// shared probe semantics for user-triggered reconciliation).
    pub fn probe_active_attempts(&self) -> Result<ProbeReport, ReconciliationError> {
        let mut report = ProbeReport::default();
        for active in self.reconciler.repository.active_attempts()? {
            report.probed += 1;
            let Some(binding) = self.reconciler.repository.binding(&active.attempt_id)? else {
                self.reconciler.repository.append_status(
                    &active.task_id,
                    &active.attempt_id,
                    AttemptStatus::UnknownAfterRestart,
                )?;
                report.closed += 1;
                report.unknown += 1;
                continue;
            };
            let observation = match self
                .source
                .reconcile(&active.attempt_id, &binding.session_id)
            {
                Ok(observation) => observation,
                Err(_) => ExecutionObservation::Unknown,
            };
            if let Some(next) = observed_transition(&active.status, &observation) {
                self.reconciler.repository.append_status(
                    &active.task_id,
                    &active.attempt_id,
                    next.clone(),
                )?;
                report.closed += 1;
                report.unknown += usize::from(next == AttemptStatus::UnknownAfterRestart);
                if next == AttemptStatus::Succeeded {
                    self.progress_task_on_success(&active.task_id);
                }
            }
        }
        Ok(report)
    }

    fn progress_task_on_success(&self, task_id: &TaskId) {
        let Ok(Some(record)) = self.reconciler.repository.task(task_id) else {
            return;
        };
        if !matches!(record.status, TaskStatus::InProgress) {
            return;
        }
        let _ = self
            .reconciler
            .repository
            .append_task_status(task_id, TaskStatus::AwaitingReview);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use magic_execution_port::{ExecutionEvent, ExecutionHistoryEvent};
    use magic_persistence::SqlitePersistence;
    use magic_persistence_port::{
        AttemptBinding, AttemptRepository, EventQueryRepository, TaskRepository,
    };
    use std::sync::{Arc, Mutex};

    #[derive(Clone)]
    struct FakeSource {
        observation: ExecutionObservation,
        reconcile_fails: bool,
        reconcile_calls: Arc<Mutex<u32>>,
    }

    impl FakeSource {
        fn running() -> Self {
            Self {
                observation: ExecutionObservation::Running,
                reconcile_fails: false,
                reconcile_calls: Arc::new(Mutex::new(0)),
            }
        }
    }

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
        fn adapter_name(&self) -> &'static str {
            "test-v1"
        }

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
        ) -> Result<ExecutionObservation, ExecutionError> {
            *self.reconcile_calls.lock().unwrap() += 1;
            if self.reconcile_fails {
                Err(ExecutionError::Adapter("observation failed".into()))
            } else {
                Ok(self.observation.clone())
            }
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

    fn running_attempt(repository: &SqlitePersistence) -> (TaskId, magic_domain::AttemptId) {
        let task_id = TaskId("task-1".into());
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
            .create_binding(&AttemptBinding {
                attempt_id: attempt_id.clone(),
                adapter: "opencode-v1".into(),
                session_id: "session-1".into(),
                message_id: None,
            })
            .unwrap();
        (task_id, attempt_id)
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
        let worker = RecoveryWorker::new(
            FakeSource::running(),
            SqlitePersistence::open_in_memory().unwrap(),
        );
        let report = worker.run_once().unwrap();
        assert_eq!(
            report,
            RecoveryReport {
                fetched: 1,
                inserted: 1,
                confirmed_sequences: 1,
            }
        );
    }

    #[test]
    fn worker_cycles_never_touch_running_attempts() {
        let repository = SqlitePersistence::open_in_memory().unwrap();
        let (task_id, attempt_id) = running_attempt(&repository);
        let worker = RecoveryWorker::new(FakeSource::running(), repository.clone());
        for _ in 0..5 {
            worker.run_once().unwrap();
        }
        assert_eq!(
            repository.status(&attempt_id).unwrap(),
            Some(AttemptStatus::Running)
        );
        assert_eq!(repository.task_last_seq(&task_id).unwrap(), 2);
    }

    #[test]
    fn startup_probe_keeps_live_sessions_running_without_events() {
        let repository = SqlitePersistence::open_in_memory().unwrap();
        let (task_id, attempt_id) = running_attempt(&repository);
        let source = FakeSource::running();
        let worker = RecoveryWorker::new(source.clone(), repository.clone());
        let report = worker.probe_active_attempts().unwrap();
        assert_eq!(
            report,
            ProbeReport {
                probed: 1,
                closed: 0,
                unknown: 0
            }
        );
        assert_eq!(*source.reconcile_calls.lock().unwrap(), 1);
        assert_eq!(
            repository.status(&attempt_id).unwrap(),
            Some(AttemptStatus::Running)
        );
        assert_eq!(repository.task_last_seq(&task_id).unwrap(), 2);
        let task = repository.task(&task_id).unwrap();
        assert_eq!(task, None);
    }

    #[test]
    fn startup_probe_closes_terminal_evidence_and_awaits_review() {
        let repository = SqlitePersistence::open_in_memory().unwrap();
        let (task_id, attempt_id) = running_attempt(&repository);
        repository
            .create_task(
                &magic_persistence_port::TaskRecord {
                    id: task_id.clone(),
                    goal: "ship".into(),
                    acceptance_criteria: vec!["tests pass".into()],
                    owner_id: "member-1".into(),
                    mode: "agent".into(),
                    status: TaskStatus::Proposed,
                    updated_at: None,
                },
                "idem-1",
                "hash-1",
            )
            .unwrap();
        repository
            .append_task_status(&task_id, TaskStatus::Ready)
            .unwrap();
        repository
            .append_task_status(&task_id, TaskStatus::InProgress)
            .unwrap();
        let worker = RecoveryWorker::new(
            FakeSource {
                observation: ExecutionObservation::Terminal(AttemptStatus::Succeeded),
                ..FakeSource::running()
            },
            repository.clone(),
        );
        let report = worker.probe_active_attempts().unwrap();
        assert_eq!(report.closed, 1);
        assert_eq!(report.unknown, 0);
        assert_eq!(
            repository.status(&attempt_id).unwrap(),
            Some(AttemptStatus::Succeeded)
        );
        let task = repository.task(&task_id).unwrap().unwrap();
        assert_eq!(task.status, TaskStatus::AwaitingReview);
    }

    #[test]
    fn startup_probe_marks_unknown_without_binding_or_on_failure() {
        let repository = SqlitePersistence::open_in_memory().unwrap();
        let task_id = TaskId("task-1".into());
        let attempt_id = magic_domain::AttemptId("attempt-1".into());
        repository
            .create_attempt(&task_id, &attempt_id, 1, "key-1", "hash-1")
            .unwrap();
        repository
            .append_status(&task_id, &attempt_id, AttemptStatus::Admitted)
            .unwrap();
        let worker = RecoveryWorker::new(FakeSource::running(), repository.clone());
        let report = worker.probe_active_attempts().unwrap();
        assert_eq!(report.closed, 1);
        assert_eq!(report.unknown, 1);
        assert_eq!(
            repository.status(&attempt_id).unwrap(),
            Some(AttemptStatus::UnknownAfterRestart)
        );

        let repository = SqlitePersistence::open_in_memory().unwrap();
        let (task_id, attempt_id) = running_attempt(&repository);
        let worker = RecoveryWorker::new(
            FakeSource {
                reconcile_fails: true,
                ..FakeSource::running()
            },
            repository.clone(),
        );
        let report = worker.probe_active_attempts().unwrap();
        assert_eq!(report.unknown, 1);
        assert_eq!(
            repository.status(&attempt_id).unwrap(),
            Some(AttemptStatus::UnknownAfterRestart)
        );
        assert_eq!(repository.task_last_seq(&task_id).unwrap(), 3);
    }
}
