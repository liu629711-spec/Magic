//! SQLite/rusqlite adapter for the Magic event ledger and projections.

use magic_domain::{AttemptId, AttemptStatus, TaskId};
use magic_persistence_port::{
    ActiveAttempt, AttemptBinding, AttemptRepository, EventAppendResult, EventCursor,
    EventRepository, ExternalEvent, IdempotencyRecord, PersistenceError,
};
use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct SqlitePersistence {
    connection: Arc<Mutex<Connection>>,
}

impl SqlitePersistence {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, PersistenceError> {
        let connection = Connection::open(path).map_err(storage_error)?;
        connection
            .pragma_update(None, "journal_mode", "WAL")
            .map_err(storage_error)?;
        let store = Self {
            connection: Arc::new(Mutex::new(connection)),
        };
        store.migrate()?;
        Ok(store)
    }

    pub fn open_in_memory() -> Result<Self, PersistenceError> {
        let connection = Connection::open_in_memory().map_err(storage_error)?;
        connection
            .pragma_update(None, "journal_mode", "WAL")
            .map_err(storage_error)?;
        let store = Self {
            connection: Arc::new(Mutex::new(connection)),
        };
        store.migrate()?;
        Ok(store)
    }

    pub fn migrate(&self) -> Result<(), PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        connection
            .execute_batch(
                "PRAGMA foreign_keys = ON;
             CREATE TABLE IF NOT EXISTS task_attempt (
                 id TEXT PRIMARY KEY,
                 task_id TEXT NOT NULL,
                 attempt_no INTEGER NOT NULL,
                 status TEXT NOT NULL,
                 idempotency_key TEXT NOT NULL,
                 input_hash TEXT NOT NULL,
                 UNIQUE(task_id, attempt_no),
                 UNIQUE(task_id, idempotency_key)
             );
             CREATE TABLE IF NOT EXISTS event_ledger (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 aggregate_type TEXT NOT NULL,
                 aggregate_id TEXT NOT NULL,
                 seq INTEGER NOT NULL,
                 event_type TEXT NOT NULL,
                 source TEXT NOT NULL,
                 source_event_id TEXT,
                 payload_json TEXT NOT NULL,
                 UNIQUE(aggregate_type, aggregate_id, seq),
                 UNIQUE(source, source_event_id)
             );
             CREATE INDEX IF NOT EXISTS idx_event_ledger_aggregate
                 ON event_ledger(aggregate_type, aggregate_id, seq);
             CREATE TABLE IF NOT EXISTS attempt_binding (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 attempt_id TEXT NOT NULL REFERENCES task_attempt(id),
                 adapter TEXT NOT NULL,
                 session_id TEXT NOT NULL,
                 message_id TEXT,
                 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                 released_at TEXT,
                 UNIQUE(attempt_id, adapter, session_id)
             );
             CREATE INDEX IF NOT EXISTS idx_attempt_binding_session
                 ON attempt_binding(session_id);
             CREATE TABLE IF NOT EXISTS event_cursor (
                 aggregate_type TEXT NOT NULL,
                 aggregate_id TEXT NOT NULL,
                 last_confirmed_seq INTEGER NOT NULL,
                 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                 PRIMARY KEY (aggregate_type, aggregate_id)
             );",
            )
            .map_err(storage_error)
    }

    fn insert_attempt(
        &self,
        task_id: &TaskId,
        attempt_id: &AttemptId,
        attempt_no: u32,
        idempotency_key: &str,
        request_hash: &str,
    ) -> Result<(), PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        connection
            .execute(
                "INSERT INTO task_attempt (id, task_id, attempt_no, status, idempotency_key, input_hash)
                 VALUES (?1, ?2, ?3, 'created', ?4, ?5)",
                params![attempt_id.0, task_id.0, attempt_no, idempotency_key, request_hash],
            )
            .map(|_| ())
            .map_err(storage_error)
    }

    #[cfg(test)]
    fn event_count(&self, aggregate_id: &str) -> usize {
        let connection = self.connection.lock().unwrap();
        connection
            .query_row(
                "SELECT COUNT(*) FROM event_ledger WHERE aggregate_id = ?1",
                [aggregate_id],
                |row| row.get::<_, i64>(0),
            )
            .unwrap() as usize
    }

    #[cfg(test)]
    fn binding_for_attempt(&self, attempt_id: &str) -> Option<(String, String, Option<String>)> {
        let connection = self.connection.lock().unwrap();
        connection
            .query_row(
                "SELECT adapter, session_id, message_id FROM attempt_binding
                 WHERE attempt_id = ?1 AND released_at IS NULL",
                [attempt_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .optional()
            .unwrap()
    }
}

impl AttemptRepository for SqlitePersistence {
    fn create_attempt(
        &self,
        task_id: &TaskId,
        attempt_id: &AttemptId,
        attempt_no: u32,
        idempotency_key: &str,
        request_hash: &str,
    ) -> Result<(), PersistenceError> {
        self.insert_attempt(
            task_id,
            attempt_id,
            attempt_no,
            idempotency_key,
            request_hash,
        )
    }

    fn find_idempotency(
        &self,
        task_id: &TaskId,
        idempotency_key: &str,
    ) -> Result<Option<IdempotencyRecord>, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let mut statement = connection
            .prepare(
                "SELECT id, input_hash FROM task_attempt
                 WHERE task_id = ?1 AND idempotency_key = ?2",
            )
            .map_err(storage_error)?;
        statement
            .query_row(params![task_id.0, idempotency_key], |row| {
                Ok(IdempotencyRecord {
                    attempt_id: AttemptId(row.get(0)?),
                    request_hash: row.get(1)?,
                })
            })
            .optional()
            .map_err(storage_error)
    }

    fn status(&self, attempt_id: &AttemptId) -> Result<Option<AttemptStatus>, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let mut statement = connection
            .prepare("SELECT status FROM task_attempt WHERE id = ?1")
            .map_err(storage_error)?;
        let value = statement
            .query_row([&attempt_id.0], |row| row.get::<_, String>(0))
            .optional()
            .map_err(storage_error)?;
        value
            .map(|status| serde_json::from_str(&format!("\"{status}\"")).map_err(storage_error))
            .transpose()
    }

    fn active_attempts(&self) -> Result<Vec<ActiveAttempt>, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let mut statement = connection
            .prepare(
                "SELECT task_id, id, status FROM task_attempt
                 WHERE status IN ('admitted', 'running', 'cancelling')
                 ORDER BY task_id, attempt_no",
            )
            .map_err(storage_error)?;
        let rows = statement
            .query_map([], |row| {
                let status: String = row.get(2)?;
                Ok((TaskId(row.get(0)?), AttemptId(row.get(1)?), status))
            })
            .map_err(storage_error)?;
        rows.map(|row| {
            let (task_id, attempt_id, status) = row.map_err(storage_error)?;
            let status = serde_json::from_str(&format!("\"{status}\"")).map_err(storage_error)?;
            Ok(ActiveAttempt {
                task_id,
                attempt_id,
                status,
            })
        })
        .collect()
    }

    fn append_status(
        &self,
        task_id: &TaskId,
        attempt_id: &AttemptId,
        status: AttemptStatus,
    ) -> Result<u64, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let transaction = connection.unchecked_transaction().map_err(storage_error)?;
        let current: String = transaction
            .query_row(
                "SELECT status FROM task_attempt WHERE id = ?1 AND task_id = ?2",
                params![attempt_id.0, task_id.0],
                |row| row.get(0),
            )
            .map_err(storage_error)?;
        let next_seq: i64 = transaction
            .query_row(
                "SELECT COALESCE(MAX(seq), 0) + 1 FROM event_ledger WHERE aggregate_type = 'attempt' AND aggregate_id = ?1",
                [&attempt_id.0],
                |row| row.get(0),
            )
            .map_err(storage_error)?;
        let status_name = serde_json::to_string(&status)
            .map_err(storage_error)?
            .trim_matches('"')
            .to_string();
        let payload = serde_json::json!({ "from": current, "to": status_name });
        transaction
            .execute(
                "INSERT INTO event_ledger (aggregate_type, aggregate_id, seq, event_type, source, payload_json)
                 VALUES ('attempt', ?1, ?2, 'attempt.status_changed', 'magic', ?3)",
                params![attempt_id.0, next_seq, payload.to_string()],
            )
            .map_err(storage_error)?;
        transaction
            .execute(
                "UPDATE task_attempt SET status = ?1 WHERE id = ?2",
                params![status_name, attempt_id.0],
            )
            .map_err(storage_error)?;
        transaction.commit().map_err(storage_error)?;
        u64::try_from(next_seq).map_err(|_| storage_error("event sequence overflow"))
    }

    fn create_binding(&self, binding: &AttemptBinding) -> Result<(), PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        connection
            .execute(
                "INSERT INTO attempt_binding (attempt_id, adapter, session_id, message_id)
                 VALUES (?1, ?2, ?3, ?4)",
                params![
                    binding.attempt_id.0,
                    binding.adapter,
                    binding.session_id,
                    binding.message_id
                ],
            )
            .map(|_| ())
            .map_err(storage_error)
    }

    fn binding(&self, attempt_id: &AttemptId) -> Result<Option<AttemptBinding>, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        connection
            .query_row(
                "SELECT attempt_id, adapter, session_id, message_id FROM attempt_binding
                 WHERE attempt_id = ?1 AND released_at IS NULL
                 ORDER BY id DESC LIMIT 1",
                [&attempt_id.0],
                |row| {
                    Ok(AttemptBinding {
                        attempt_id: AttemptId(row.get(0)?),
                        adapter: row.get(1)?,
                        session_id: row.get(2)?,
                        message_id: row.get(3)?,
                    })
                },
            )
            .optional()
            .map_err(storage_error)
    }

    fn set_message_id(
        &self,
        attempt_id: &AttemptId,
        message_id: Option<&str>,
    ) -> Result<(), PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        connection
            .execute(
                "UPDATE attempt_binding SET message_id = ?1
                 WHERE attempt_id = ?2 AND released_at IS NULL",
                params![message_id, attempt_id.0],
            )
            .map(|_| ())
            .map_err(storage_error)
    }
}

impl EventRepository for SqlitePersistence {
    fn append_external_event(
        &self,
        event: &ExternalEvent,
    ) -> Result<EventAppendResult, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let transaction = connection.unchecked_transaction().map_err(storage_error)?;
        let seq = match event.seq {
            Some(seq) => {
                i64::try_from(seq).map_err(|_| storage_error("event sequence overflow"))?
            }
            None => transaction
                .query_row(
                    "SELECT COALESCE(MAX(seq), 0) + 1 FROM event_ledger
                     WHERE aggregate_type = ?1 AND aggregate_id = ?2",
                    params![event.aggregate_type, event.aggregate_id],
                    |row| row.get::<_, i64>(0),
                )
                .map_err(storage_error)?,
        };
        let changed = transaction
            .execute(
                "INSERT INTO event_ledger
                 (aggregate_type, aggregate_id, seq, event_type, source, source_event_id, payload_json)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT DO NOTHING",
                params![
                    event.aggregate_type,
                    event.aggregate_id,
                    seq,
                    event.event_type,
                    event.source,
                    event.source_event_id,
                    event.payload_json
                ],
            )
            .map_err(storage_error)?;
        let actual_seq = if changed == 1 {
            seq
        } else {
            transaction
                .query_row(
                    "SELECT seq FROM event_ledger
                     WHERE (aggregate_type = ?1 AND aggregate_id = ?2 AND seq = ?3)
                        OR (?4 IS NOT NULL AND source = ?5 AND source_event_id = ?4)",
                    params![
                        event.aggregate_type,
                        event.aggregate_id,
                        seq,
                        event.source_event_id,
                        event.source
                    ],
                    |row| row.get::<_, i64>(0),
                )
                .map_err(storage_error)?
        };
        transaction.commit().map_err(storage_error)?;
        Ok(EventAppendResult {
            inserted: changed == 1,
            seq: u64::try_from(actual_seq).map_err(|_| storage_error("event sequence overflow"))?,
        })
    }

    fn cursor(
        &self,
        aggregate_type: &str,
        aggregate_id: &str,
    ) -> Result<Option<EventCursor>, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let value = connection
            .query_row(
                "SELECT aggregate_type, aggregate_id, last_confirmed_seq FROM event_cursor
                 WHERE aggregate_type = ?1 AND aggregate_id = ?2",
                params![aggregate_type, aggregate_id],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, i64>(2)?,
                    ))
                },
            )
            .optional()
            .map_err(storage_error)?;
        value
            .map(|(aggregate_type, aggregate_id, seq)| {
                Ok(EventCursor {
                    aggregate_type,
                    aggregate_id,
                    last_confirmed_seq: u64::try_from(seq)
                        .map_err(|_| storage_error("event sequence overflow"))?,
                })
            })
            .transpose()
    }

    fn cursors(&self) -> Result<Vec<EventCursor>, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let mut statement = connection
            .prepare(
                "SELECT aggregate_type, aggregate_id, last_confirmed_seq
                 FROM event_cursor ORDER BY aggregate_type, aggregate_id",
            )
            .map_err(storage_error)?;
        let rows = statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)?,
                ))
            })
            .map_err(storage_error)?;
        rows.map(|row| {
            let (aggregate_type, aggregate_id, seq) = row.map_err(storage_error)?;
            Ok(EventCursor {
                aggregate_type,
                aggregate_id,
                last_confirmed_seq: u64::try_from(seq)
                    .map_err(|_| storage_error("event sequence overflow"))?,
            })
        })
        .collect()
    }

    fn advance_cursor(
        &self,
        aggregate_type: &str,
        aggregate_id: &str,
        seq: u64,
    ) -> Result<(), PersistenceError> {
        let seq = i64::try_from(seq).map_err(|_| storage_error("event sequence overflow"))?;
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        connection
            .execute(
                "INSERT INTO event_cursor (aggregate_type, aggregate_id, last_confirmed_seq)
                 VALUES (?1, ?2, ?3)
                 ON CONFLICT(aggregate_type, aggregate_id) DO UPDATE SET
                   last_confirmed_seq = MAX(last_confirmed_seq, excluded.last_confirmed_seq),
                   updated_at = CURRENT_TIMESTAMP",
                params![aggregate_type, aggregate_id, seq],
            )
            .map(|_| ())
            .map_err(storage_error)
    }
}

fn storage_error(error: impl ToString) -> PersistenceError {
    PersistenceError::Storage(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids() -> (TaskId, AttemptId) {
        (TaskId("task-1".into()), AttemptId("attempt-1".into()))
    }

    #[test]
    fn migration_and_atomic_status_event_write_work() {
        let store = SqlitePersistence::open_in_memory().unwrap();
        let (task_id, attempt_id) = ids();
        store
            .create_attempt(&task_id, &attempt_id, 1, "request-1", "hash-1")
            .unwrap();
        assert_eq!(
            store.status(&attempt_id).unwrap(),
            Some(AttemptStatus::Created)
        );
        assert_eq!(
            store
                .append_status(&task_id, &attempt_id, AttemptStatus::Admitted)
                .unwrap(),
            1
        );
        assert_eq!(
            store
                .append_status(&task_id, &attempt_id, AttemptStatus::Running)
                .unwrap(),
            2
        );
        assert_eq!(
            store.status(&attempt_id).unwrap(),
            Some(AttemptStatus::Running)
        );
        assert_eq!(store.event_count(&attempt_id.0), 2);
    }

    #[test]
    fn duplicate_idempotency_key_is_rejected_by_sqlite() {
        let store = SqlitePersistence::open_in_memory().unwrap();
        let (task_id, first_attempt) = ids();
        store
            .create_attempt(&task_id, &first_attempt, 1, "same-key", "hash-1")
            .unwrap();
        let duplicate = store.create_attempt(
            &task_id,
            &AttemptId("attempt-2".into()),
            2,
            "same-key",
            "hash-2",
        );
        assert!(duplicate.is_err());
    }

    #[test]
    fn attempt_binding_keeps_external_session_and_message_reference() {
        let store = SqlitePersistence::open_in_memory().unwrap();
        let (task_id, attempt_id) = ids();
        store
            .create_attempt(&task_id, &attempt_id, 1, "request-1", "hash-1")
            .unwrap();
        store
            .create_binding(&AttemptBinding {
                attempt_id: attempt_id.clone(),
                adapter: "opencode-v1".into(),
                session_id: "session-1".into(),
                message_id: None,
            })
            .unwrap();
        store
            .set_message_id(&attempt_id, Some("message-1"))
            .unwrap();
        assert_eq!(
            store.binding_for_attempt(&attempt_id.0),
            Some((
                "opencode-v1".into(),
                "session-1".into(),
                Some("message-1".into())
            ))
        );
    }
}
