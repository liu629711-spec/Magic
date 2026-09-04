//! SQLite/rusqlite adapter for the Magic event ledger and projections.

use magic_domain::{AttemptId, AttemptStatus, TaskId, TaskStatus};
use magic_persistence_port::{
    ActiveAttempt, AttemptBinding, AttemptRepository, AttemptSummaryRow, EventAppendResult,
    EventCursor, EventQueryRepository, EventRepository, ExternalEvent, IdempotencyRecord,
    LedgerEvent, PersistenceError, TaskIdempotencyRecord, TaskListItemRow, TaskRecord,
    TaskRepository, TimestampOrdering,
};
use rusqlite::{params, params_from_iter, Connection, OptionalExtension, ToSql};
use serde::Serialize;
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct SqlitePersistence {
    connection: Arc<Mutex<Connection>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SessionPresentation {
    pub pinned: bool,
    pub archived: bool,
    pub standalone: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ModelProviderPresentation {
    pub enabled: bool,
}

fn status_wire_name<T: Serialize>(value: &T) -> Result<String, PersistenceError> {
    Ok(serde_json::to_string(value)
        .map_err(storage_error)?
        .trim_matches('"')
        .to_string())
}

const UTC_NOW_SQL: &str = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

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
            .execute_batch(&format!(
                "PRAGMA foreign_keys = ON;
             CREATE TABLE IF NOT EXISTS task_attempt (
                 id TEXT PRIMARY KEY,
                 task_id TEXT NOT NULL,
                 attempt_no INTEGER NOT NULL,
                 status TEXT NOT NULL,
                 idempotency_key TEXT NOT NULL,
                 input_hash TEXT NOT NULL,
                 updated_at TEXT,
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
                 occurred_at TEXT,
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
             );
             CREATE TABLE IF NOT EXISTS tasks (
                 id TEXT PRIMARY KEY,
                 goal TEXT NOT NULL,
                 acceptance_criteria_json TEXT NOT NULL,
                 owner_id TEXT NOT NULL,
                 mode TEXT NOT NULL,
                 status TEXT NOT NULL,
                 idempotency_key TEXT NOT NULL UNIQUE,
                 request_hash TEXT NOT NULL,
                 updated_at TEXT
             );
             CREATE TABLE IF NOT EXISTS schema_meta (
                 key TEXT PRIMARY KEY,
                 value TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS session_presentation (
                 session_id TEXT PRIMARY KEY,
                 pinned INTEGER NOT NULL DEFAULT 0,
                 archived INTEGER NOT NULL DEFAULT 0,
                 standalone INTEGER NOT NULL DEFAULT 0,
                 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                 CHECK (pinned IN (0, 1)),
                 CHECK (archived IN (0, 1)),
                 CHECK (standalone IN (0, 1))
             );
             CREATE TABLE IF NOT EXISTS session_project (
                 session_id TEXT PRIMARY KEY,
                 directory TEXT NOT NULL,
                 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
             );
             CREATE TABLE IF NOT EXISTS model_provider_presentation (
                 provider_id TEXT PRIMARY KEY,
                 enabled INTEGER NOT NULL DEFAULT 1,
                 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                 CHECK (enabled IN (0, 1))
             );"
            ))
            .map_err(storage_error)?;
        if !column_exists(&connection, "session_presentation", "standalone")? {
            connection
                .execute(
                    "ALTER TABLE session_presentation ADD COLUMN standalone INTEGER NOT NULL DEFAULT 0",
                    [],
                )
                .map_err(storage_error)?;
        }
        let legacy = !column_exists(&connection, "event_ledger", "occurred_at")?;
        if legacy {
            connection
                .execute("ALTER TABLE event_ledger ADD COLUMN occurred_at TEXT", [])
                .map_err(storage_error)?;
            connection
                .execute("ALTER TABLE task_attempt ADD COLUMN updated_at TEXT", [])
                .map_err(storage_error)?;
            let migration_moment: String = connection
                .query_row(&format!("SELECT {UTC_NOW_SQL}"), [], |row| row.get(0))
                .map_err(storage_error)?;
            connection
                .execute(
                    "UPDATE task_attempt SET updated_at = ?1 WHERE updated_at IS NULL",
                    [&migration_moment],
                )
                .map_err(storage_error)?;
            connection
                .execute(
                    "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('timestamps_approximate', ?1)",
                    [&migration_moment],
                )
                .map_err(storage_error)?;
        }
        connection
            .execute(
                "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('timestamps_ready', '1')",
                [],
            )
            .map_err(storage_error)?;
        Ok(())
    }

    pub fn session_presentations(
        &self,
    ) -> Result<HashMap<String, SessionPresentation>, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let mut statement = connection
            .prepare("SELECT session_id, pinned, archived, standalone FROM session_presentation")
            .map_err(storage_error)?;
        let rows = statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    SessionPresentation {
                        pinned: row.get::<_, i64>(1)? != 0,
                        archived: row.get::<_, i64>(2)? != 0,
                        standalone: row.get::<_, i64>(3)? != 0,
                    },
                ))
            })
            .map_err(storage_error)?;
        rows.collect::<Result<HashMap<_, _>, _>>()
            .map_err(storage_error)
    }

    pub fn set_session_pinned(
        &self,
        session_id: &str,
        pinned: bool,
    ) -> Result<(), PersistenceError> {
        self.update_session_presentation(session_id, Some(pinned), None, None)
    }

    pub fn archive_session_presentation(&self, session_id: &str) -> Result<(), PersistenceError> {
        self.update_session_presentation(session_id, Some(false), Some(true), None)
    }

    pub fn mark_session_standalone(&self, session_id: &str) -> Result<(), PersistenceError> {
        self.update_session_presentation(session_id, None, None, Some(true))
    }

    pub fn session_project_directories(&self) -> Result<HashMap<String, String>, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let mut statement = connection
            .prepare("SELECT session_id, directory FROM session_project")
            .map_err(storage_error)?;
        let rows = statement
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(storage_error)?;
        rows.collect::<Result<HashMap<_, _>, _>>()
            .map_err(storage_error)
    }

    pub fn model_provider_presentations(
        &self,
    ) -> Result<HashMap<String, ModelProviderPresentation>, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let mut statement = connection
            .prepare("SELECT provider_id, enabled FROM model_provider_presentation")
            .map_err(storage_error)?;
        let rows = statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    ModelProviderPresentation {
                        enabled: row.get::<_, i64>(1)? != 0,
                    },
                ))
            })
            .map_err(storage_error)?;
        rows.collect::<Result<HashMap<_, _>, _>>()
            .map_err(storage_error)
    }

    pub fn set_model_provider_enabled(
        &self,
        provider_id: &str,
        enabled: bool,
    ) -> Result<(), PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        connection
            .execute(
                &format!(
                    "INSERT INTO model_provider_presentation (provider_id, enabled, updated_at)
                     VALUES (?1, ?2, {UTC_NOW_SQL})
                     ON CONFLICT(provider_id) DO UPDATE SET
                         enabled = excluded.enabled,
                         updated_at = {UTC_NOW_SQL}"
                ),
                params![provider_id, bool_to_sql(enabled)],
            )
            .map_err(storage_error)?;
        Ok(())
    }

    pub fn remove_model_provider_presentation(
        &self,
        provider_id: &str,
    ) -> Result<(), PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        connection
            .execute(
                "DELETE FROM model_provider_presentation WHERE provider_id = ?1",
                [provider_id],
            )
            .map_err(storage_error)?;
        Ok(())
    }

    pub fn assign_session_project(
        &self,
        session_id: &str,
        directory: &str,
    ) -> Result<(), PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        connection
            .execute(
                &format!(
                    "INSERT INTO session_project (session_id, directory, updated_at)
                     VALUES (?1, ?2, {UTC_NOW_SQL})
                     ON CONFLICT(session_id) DO UPDATE SET
                         directory = excluded.directory,
                         updated_at = {UTC_NOW_SQL}"
                ),
                params![session_id, directory],
            )
            .map_err(storage_error)?;
        connection
            .execute(
                "UPDATE session_presentation SET standalone = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE session_id = ?1",
                [session_id],
            )
            .map_err(storage_error)?;
        Ok(())
    }

    fn update_session_presentation(
        &self,
        session_id: &str,
        pinned: Option<bool>,
        archived: Option<bool>,
        standalone: Option<bool>,
    ) -> Result<(), PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        connection
            .execute(
                &format!(
                    "INSERT INTO session_presentation (session_id, pinned, archived, standalone, updated_at)
                     VALUES (?1, ?2, ?3, ?4, {UTC_NOW_SQL})
                     ON CONFLICT(session_id) DO UPDATE SET
                         pinned = COALESCE(?5, session_presentation.pinned),
                         archived = COALESCE(?6, session_presentation.archived),
                         standalone = COALESCE(?7, session_presentation.standalone),
                         updated_at = {UTC_NOW_SQL}"
                ),
                params![
                    session_id,
                    pinned.map(bool_to_sql).unwrap_or(0),
                    archived.map(bool_to_sql).unwrap_or(0),
                    standalone.map(bool_to_sql).unwrap_or(0),
                    pinned.map(bool_to_sql),
                    archived.map(bool_to_sql),
                    standalone.map(bool_to_sql),
                ],
            )
            .map_err(storage_error)?;
        Ok(())
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
                &format!(
                    "INSERT INTO task_attempt (id, task_id, attempt_no, status, idempotency_key, input_hash, updated_at)
                     VALUES (?1, ?2, ?3, 'created', ?4, ?5, {UTC_NOW_SQL})"
                ),
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

    #[cfg(test)]
    fn schema_meta(&self, key: &str) -> Option<String> {
        let connection = self.connection.lock().unwrap();
        connection
            .query_row(
                "SELECT value FROM schema_meta WHERE key = ?1",
                [key],
                |row| row.get(0),
            )
            .optional()
            .unwrap()
    }

    #[cfg(test)]
    fn set_schema_meta(&self, key: &str, value: Option<&str>) {
        let connection = self.connection.lock().unwrap();
        match value {
            Some(value) => {
                connection
                    .execute(
                        "INSERT OR REPLACE INTO schema_meta (key, value) VALUES (?1, ?2)",
                        params![key, value],
                    )
                    .unwrap();
            }
            None => {
                connection
                    .execute("DELETE FROM schema_meta WHERE key = ?1", [key])
                    .unwrap();
            }
        }
    }
}

fn bool_to_sql(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

fn column_exists(
    connection: &Connection,
    table: &str,
    column: &str,
) -> Result<bool, PersistenceError> {
    let mut statement = connection
        .prepare(&format!("PRAGMA table_info({table})"))
        .map_err(storage_error)?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(storage_error)?;
    for name in rows {
        if name.map_err(storage_error)? == column {
            return Ok(true);
        }
    }
    Ok(false)
}

fn parse_task_status(raw: &str) -> Result<TaskStatus, PersistenceError> {
    serde_json::from_str(&format!("\"{raw}\"")).map_err(storage_error)
}

fn parse_attempt_status(raw: &str) -> Result<AttemptStatus, PersistenceError> {
    serde_json::from_str(&format!("\"{raw}\"")).map_err(storage_error)
}

fn task_wire_name(status: &TaskStatus) -> Result<String, PersistenceError> {
    status_wire_name(status)
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
            .map(|status| parse_attempt_status(&status))
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
            let status = parse_attempt_status(&status)?;
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
                &format!(
                    "INSERT INTO event_ledger (aggregate_type, aggregate_id, seq, event_type, source, payload_json, occurred_at)
                     VALUES ('attempt', ?1, ?2, 'attempt.status_changed', 'magic', ?3, {UTC_NOW_SQL})"
                ),
                params![attempt_id.0, next_seq, payload.to_string()],
            )
            .map_err(storage_error)?;
        transaction
            .execute(
                &format!(
                    "UPDATE task_attempt SET status = ?1, updated_at = {UTC_NOW_SQL} WHERE id = ?2"
                ),
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

impl TaskRepository for SqlitePersistence {
    fn create_task(
        &self,
        task: &TaskRecord,
        idempotency_key: &str,
        request_hash: &str,
    ) -> Result<(), PersistenceError> {
        let criteria = serde_json::to_string(&task.acceptance_criteria).map_err(storage_error)?;
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        connection
            .execute(
                &format!(
                    "INSERT INTO tasks (id, goal, acceptance_criteria_json, owner_id, mode, status, idempotency_key, request_hash, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, 'proposed', ?6, ?7, {UTC_NOW_SQL})"
                ),
                params![
                    task.id.0,
                    task.goal,
                    criteria,
                    task.owner_id,
                    task.mode,
                    idempotency_key,
                    request_hash
                ],
            )
            .map(|_| ())
            .map_err(storage_error)
    }

    fn find_task_idempotency(
        &self,
        idempotency_key: &str,
    ) -> Result<Option<TaskIdempotencyRecord>, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let mut statement = connection
            .prepare("SELECT id, request_hash FROM tasks WHERE idempotency_key = ?1")
            .map_err(storage_error)?;
        statement
            .query_row([idempotency_key], |row| {
                Ok(TaskIdempotencyRecord {
                    task_id: TaskId(row.get(0)?),
                    request_hash: row.get(1)?,
                })
            })
            .optional()
            .map_err(storage_error)
    }

    fn task(&self, task_id: &TaskId) -> Result<Option<TaskRecord>, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let value = connection
            .query_row(
                "SELECT id, goal, acceptance_criteria_json, owner_id, mode, status, updated_at
                 FROM tasks WHERE id = ?1",
                [&task_id.0],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, String>(3)?,
                        row.get::<_, String>(4)?,
                        row.get::<_, String>(5)?,
                        row.get::<_, Option<String>>(6)?,
                    ))
                },
            )
            .optional()
            .map_err(storage_error)?;
        let Some((id, goal, criteria, owner_id, mode, status, updated_at)) = value else {
            return Ok(None);
        };
        Ok(Some(TaskRecord {
            id: TaskId(id),
            goal,
            acceptance_criteria: serde_json::from_str(&criteria).map_err(storage_error)?,
            owner_id,
            mode,
            status: parse_task_status(&status)?,
            updated_at,
        }))
    }

    fn append_task_status(
        &self,
        task_id: &TaskId,
        next: TaskStatus,
    ) -> Result<u64, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let transaction = connection.unchecked_transaction().map_err(storage_error)?;
        let current: String = transaction
            .query_row(
                "SELECT status FROM tasks WHERE id = ?1",
                [&task_id.0],
                |row| row.get(0),
            )
            .map_err(storage_error)?;
        let next_seq: i64 = transaction
            .query_row(
                "SELECT COALESCE(MAX(seq), 0) + 1 FROM event_ledger WHERE aggregate_type = 'task' AND aggregate_id = ?1",
                [&task_id.0],
                |row| row.get(0),
            )
            .map_err(storage_error)?;
        let status_name = task_wire_name(&next)?;
        let payload = serde_json::json!({ "from": current, "to": status_name });
        transaction
            .execute(
                &format!(
                    "INSERT INTO event_ledger (aggregate_type, aggregate_id, seq, event_type, source, payload_json, occurred_at)
                     VALUES ('task', ?1, ?2, 'task.status_changed', 'magic', ?3, {UTC_NOW_SQL})"
                ),
                params![task_id.0, next_seq, payload.to_string()],
            )
            .map_err(storage_error)?;
        transaction
            .execute(
                &format!("UPDATE tasks SET status = ?1, updated_at = {UTC_NOW_SQL} WHERE id = ?2"),
                params![status_name, task_id.0],
            )
            .map_err(storage_error)?;
        transaction.commit().map_err(storage_error)?;
        u64::try_from(next_seq).map_err(|_| storage_error("event sequence overflow"))
    }

    fn list_tasks(
        &self,
        status: Option<&TaskStatus>,
        owner: Option<&str>,
        offset: usize,
        limit: usize,
        ordering: TimestampOrdering,
    ) -> Result<Vec<TaskListItemRow>, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let mut sql = String::from(
            "SELECT t.id, t.goal, t.status, t.owner_id, t.updated_at, ca.attempt_no, ca.status,
                    COALESCE((
                        SELECT MAX(e.seq) FROM event_ledger e
                        WHERE (e.aggregate_type = 'task' AND e.aggregate_id = t.id)
                           OR (e.aggregate_type = 'attempt' AND e.aggregate_id IN (
                               SELECT id FROM task_attempt WHERE task_id = t.id))
                    ), 0)
             FROM tasks t
             LEFT JOIN task_attempt ca
                ON ca.id = (SELECT id FROM task_attempt WHERE task_id = t.id
                            ORDER BY attempt_no DESC LIMIT 1)
             WHERE 1 = 1",
        );
        let mut params: Vec<Box<dyn ToSql>> = Vec::new();
        if let Some(status) = status {
            params.push(Box::new(task_wire_name(status)?));
            sql.push_str(&format!(" AND t.status = ?{}", params.len()));
        }
        if let Some(owner) = owner {
            params.push(Box::new(owner.to_string()));
            sql.push_str(&format!(" AND t.owner_id = ?{}", params.len()));
        }
        match ordering {
            TimestampOrdering::Creation => sql.push_str(" ORDER BY t.rowid DESC"),
            TimestampOrdering::UpdatedAt => sql.push_str(" ORDER BY t.updated_at DESC, t.id DESC"),
        }
        params.push(Box::new(limit as i64));
        params.push(Box::new(offset as i64));
        sql.push_str(&format!(
            " LIMIT ?{} OFFSET ?{}",
            params.len() - 1,
            params.len()
        ));
        let mut statement = connection.prepare(&sql).map_err(storage_error)?;
        let rows = statement
            .query_map(
                params_from_iter(params.iter().map(|param| param.as_ref())),
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, String>(3)?,
                        row.get::<_, Option<String>>(4)?,
                        row.get::<_, Option<i64>>(5)?,
                        row.get::<_, Option<String>>(6)?,
                        row.get::<_, i64>(7)?,
                    ))
                },
            )
            .map_err(storage_error)?;
        let mut items = Vec::new();
        for row in rows {
            let (
                id,
                goal,
                status,
                owner_id,
                updated_at,
                current_attempt_no,
                current_attempt_status,
                last_seq,
            ) = row.map_err(storage_error)?;
            items.push(TaskListItemRow {
                id: TaskId(id),
                goal,
                status: parse_task_status(&status)?,
                owner_id,
                current_attempt_no: current_attempt_no.map(|no| no as u32),
                current_attempt_status: current_attempt_status
                    .map(|status| parse_attempt_status(&status))
                    .transpose()?,
                last_seq: last_seq.max(0) as u64,
                updated_at,
            });
        }
        Ok(items)
    }

    fn attempts_for_task(
        &self,
        task_id: &TaskId,
        before_attempt_no: Option<u32>,
        limit: Option<usize>,
    ) -> Result<Vec<AttemptSummaryRow>, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let mut sql = String::from(
            "SELECT a.id, a.attempt_no, a.status,
                    COALESCE((SELECT MAX(e.seq) FROM event_ledger e
                              WHERE e.aggregate_type = 'attempt' AND e.aggregate_id = a.id), 0)
             FROM task_attempt a
             WHERE a.task_id = ?1 AND (?2 IS NULL OR a.attempt_no < ?2)
             ORDER BY a.attempt_no DESC",
        );
        if limit.is_some() {
            sql.push_str(" LIMIT ?3");
        }
        let mut statement = connection.prepare(&sql).map_err(storage_error)?;
        let map_row = |row: &rusqlite::Row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
            ))
        };
        let mut items = Vec::new();
        if let Some(limit) = limit {
            let rows = statement
                .query_map(
                    params![task_id.0, before_attempt_no.map(i64::from), limit as i64],
                    map_row,
                )
                .map_err(storage_error)?;
            for row in rows {
                let (id, no, status, last_seq) = row.map_err(storage_error)?;
                items.push(AttemptSummaryRow {
                    attempt_id: AttemptId(id),
                    attempt_no: no as u32,
                    status: parse_attempt_status(&status)?,
                    last_seq: last_seq.max(0) as u64,
                });
            }
        } else {
            let rows = statement
                .query_map(
                    params![task_id.0, before_attempt_no.map(i64::from)],
                    map_row,
                )
                .map_err(storage_error)?;
            for row in rows {
                let (id, no, status, last_seq) = row.map_err(storage_error)?;
                items.push(AttemptSummaryRow {
                    attempt_id: AttemptId(id),
                    attempt_no: no as u32,
                    status: parse_attempt_status(&status)?,
                    last_seq: last_seq.max(0) as u64,
                });
            }
        }
        Ok(items)
    }

    fn attempt_task(&self, attempt_id: &AttemptId) -> Result<Option<TaskId>, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let mut statement = connection
            .prepare("SELECT task_id FROM task_attempt WHERE id = ?1")
            .map_err(storage_error)?;
        statement
            .query_row([&attempt_id.0], |row| row.get::<_, String>(0))
            .optional()
            .map_err(storage_error)
            .map(|value| value.map(TaskId))
    }

    fn timestamp_ordering(&self) -> Result<TimestampOrdering, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let ready: Option<String> = connection
            .query_row(
                "SELECT value FROM schema_meta WHERE key = 'timestamps_ready'",
                [],
                |row| row.get(0),
            )
            .optional()
            .map_err(storage_error)?;
        if ready.is_some() {
            Ok(TimestampOrdering::UpdatedAt)
        } else {
            Ok(TimestampOrdering::Creation)
        }
    }
}

impl EventQueryRepository for SqlitePersistence {
    fn attempt_events(
        &self,
        attempt_id: &AttemptId,
        after_seq: u64,
        limit: usize,
        source: Option<&str>,
    ) -> Result<Vec<LedgerEvent>, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let mut statement = connection
            .prepare(
                "SELECT seq, event_type, source, source_event_id, payload_json, occurred_at
                 FROM event_ledger
                 WHERE aggregate_type = 'attempt' AND aggregate_id = ?1 AND seq > ?2
                   AND (?3 IS NULL OR source = ?3)
                 ORDER BY seq ASC LIMIT ?4",
            )
            .map_err(storage_error)?;
        let rows = statement
            .query_map(
                params![attempt_id.0, after_seq as i64, source, limit as i64],
                ledger_event_row,
            )
            .map_err(storage_error)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(storage_error)
    }

    fn attempt_max_seq(&self, attempt_id: &AttemptId) -> Result<u64, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let seq: i64 = connection
            .query_row(
                "SELECT COALESCE(MAX(seq), 0) FROM event_ledger
                 WHERE aggregate_type = 'attempt' AND aggregate_id = ?1",
                [&attempt_id.0],
                |row| row.get(0),
            )
            .map_err(storage_error)?;
        Ok(seq.max(0) as u64)
    }

    fn session_events(
        &self,
        session_ids: &[String],
        after_seq: u64,
        limit: usize,
    ) -> Result<Vec<LedgerEvent>, PersistenceError> {
        if session_ids.is_empty() {
            return Ok(Vec::new());
        }
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let placeholders = (1..=session_ids.len())
            .map(|index| format!("?{index}"))
            .collect::<Vec<_>>()
            .join(", ");
        let sql = format!(
            "SELECT seq, event_type, source, source_event_id, payload_json, occurred_at
             FROM event_ledger
             WHERE aggregate_id IN ({placeholders}) AND seq > ?{}
             ORDER BY seq ASC, aggregate_id ASC LIMIT ?{}",
            session_ids.len() + 1,
            session_ids.len() + 2
        );
        let mut params: Vec<Box<dyn ToSql>> = session_ids
            .iter()
            .map(|id| Box::new(id.clone()) as Box<dyn ToSql>)
            .collect();
        params.push(Box::new(after_seq as i64));
        params.push(Box::new(limit as i64));
        let mut statement = connection.prepare(&sql).map_err(storage_error)?;
        let rows = statement
            .query_map(
                params_from_iter(params.iter().map(|param| param.as_ref())),
                ledger_event_row,
            )
            .map_err(storage_error)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(storage_error)
    }

    fn session_max_seq(&self, session_ids: &[String]) -> Result<u64, PersistenceError> {
        if session_ids.is_empty() {
            return Ok(0);
        }
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let placeholders = (1..=session_ids.len())
            .map(|index| format!("?{index}"))
            .collect::<Vec<_>>()
            .join(", ");
        let sql = format!(
            "SELECT COALESCE(MAX(seq), 0) FROM event_ledger
             WHERE aggregate_id IN ({placeholders})"
        );
        let params: Vec<Box<dyn ToSql>> = session_ids
            .iter()
            .map(|id| Box::new(id.clone()) as Box<dyn ToSql>)
            .collect();
        let seq: i64 = connection
            .query_row(
                &sql,
                params_from_iter(params.iter().map(|p| p.as_ref())),
                |row| row.get(0),
            )
            .map_err(storage_error)?;
        Ok(seq.max(0) as u64)
    }

    fn task_last_seq(&self, task_id: &TaskId) -> Result<u64, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let seq: i64 = connection
            .query_row(
                "SELECT COALESCE(MAX(seq), 0) FROM event_ledger e
                 WHERE (e.aggregate_type = 'task' AND e.aggregate_id = ?1)
                    OR (e.aggregate_type = 'attempt' AND e.aggregate_id IN (
                        SELECT id FROM task_attempt WHERE task_id = ?1))",
                [&task_id.0],
                |row| row.get(0),
            )
            .map_err(storage_error)?;
        Ok(seq.max(0) as u64)
    }

    fn execution_cursor_watermark(&self) -> Result<u64, PersistenceError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| storage_error("sqlite mutex poisoned"))?;
        let seq: i64 = connection
            .query_row(
                "SELECT COALESCE(MAX(last_confirmed_seq), 0) FROM event_cursor",
                [],
                |row| row.get(0),
            )
            .map_err(storage_error)?;
        Ok(seq.max(0) as u64)
    }
}

fn ledger_event_row(row: &rusqlite::Row) -> rusqlite::Result<LedgerEvent> {
    Ok(LedgerEvent {
        seq: row.get::<_, i64>(0)?.max(0) as u64,
        event_type: row.get(1)?,
        source: row.get(2)?,
        source_event_id: row.get(3)?,
        payload_json: row.get(4)?,
        occurred_at: row.get(5)?,
    })
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
                &format!(
                    "INSERT INTO event_ledger
                     (aggregate_type, aggregate_id, seq, event_type, source, source_event_id, payload_json, occurred_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, {UTC_NOW_SQL})
                     ON CONFLICT DO NOTHING"
                ),
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
    use magic_persistence_port::{
        AttemptRepository, EventQueryRepository, EventRepository, TaskRepository,
    };
    use std::sync::atomic::{AtomicUsize, Ordering as AtomicOrdering};

    static TEMP_DB_COUNTER: AtomicUsize = AtomicUsize::new(0);

    fn ids() -> (TaskId, AttemptId) {
        (TaskId("task-1".into()), AttemptId("attempt-1".into()))
    }

    fn temp_db_path() -> std::path::PathBuf {
        let unique = TEMP_DB_COUNTER.fetch_add(1, AtomicOrdering::SeqCst);
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("magic-migration-{nanos}-{unique}.db"))
    }

    fn task_record(id: &str) -> TaskRecord {
        TaskRecord {
            id: TaskId(id.into()),
            goal: "ship the thing".into(),
            acceptance_criteria: vec!["tests pass".into()],
            owner_id: "member-1".into(),
            mode: "agent".into(),
            status: TaskStatus::Proposed,
            updated_at: None,
        }
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
    fn session_presentation_persists_pin_and_archive_state() {
        let store = SqlitePersistence::open_in_memory().unwrap();
        store.set_session_pinned("session-1", true).unwrap();
        assert_eq!(
            store.session_presentations().unwrap().get("session-1"),
            Some(&SessionPresentation {
                pinned: true,
                archived: false,
                standalone: false,
            })
        );
        store.mark_session_standalone("session-1").unwrap();
        store.archive_session_presentation("session-1").unwrap();
        assert_eq!(
            store.session_presentations().unwrap().get("session-1"),
            Some(&SessionPresentation {
                pinned: false,
                archived: true,
                standalone: true,
            })
        );
    }

    #[test]
    fn model_provider_presentation_persists_enabled_state() {
        let store = SqlitePersistence::open_in_memory().unwrap();
        assert!(store.model_provider_presentations().unwrap().is_empty());
        store
            .set_model_provider_enabled("provider-1", false)
            .unwrap();
        assert_eq!(
            store
                .model_provider_presentations()
                .unwrap()
                .get("provider-1"),
            Some(&ModelProviderPresentation { enabled: false })
        );
        store
            .set_model_provider_enabled("provider-1", true)
            .unwrap();
        assert_eq!(
            store
                .model_provider_presentations()
                .unwrap()
                .get("provider-1"),
            Some(&ModelProviderPresentation { enabled: true })
        );
        store
            .remove_model_provider_presentation("provider-1")
            .unwrap();
        assert!(store.model_provider_presentations().unwrap().is_empty());
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

    #[test]
    fn legacy_database_is_migrated_with_backfilled_updated_at_and_null_occurred_at() {
        let path = temp_db_path();
        let connection = Connection::open(&path).unwrap();
        connection
            .execute_batch(
                "CREATE TABLE task_attempt (
                     id TEXT PRIMARY KEY, task_id TEXT NOT NULL, attempt_no INTEGER NOT NULL,
                     status TEXT NOT NULL, idempotency_key TEXT NOT NULL, input_hash TEXT NOT NULL,
                     UNIQUE(task_id, attempt_no), UNIQUE(task_id, idempotency_key));
                 CREATE TABLE event_ledger (
                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                     aggregate_type TEXT NOT NULL, aggregate_id TEXT NOT NULL, seq INTEGER NOT NULL,
                     event_type TEXT NOT NULL, source TEXT NOT NULL, source_event_id TEXT,
                     payload_json TEXT NOT NULL,
                     UNIQUE(aggregate_type, aggregate_id, seq), UNIQUE(source, source_event_id));
                 CREATE TABLE session_presentation (
                     session_id TEXT PRIMARY KEY, pinned INTEGER NOT NULL DEFAULT 0,
                     archived INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
                 INSERT INTO task_attempt (id, task_id, attempt_no, status, idempotency_key, input_hash)
                     VALUES ('attempt-1', 'task-1', 1, 'created', 'key-1', 'hash-1');
                 INSERT INTO event_ledger (aggregate_type, aggregate_id, seq, event_type, source, payload_json)
                     VALUES ('attempt', 'attempt-1', 1, 'attempt.status_changed', 'magic', '{}');",
            )
            .unwrap();
        drop(connection);

        let store = SqlitePersistence::open(&path).unwrap();
        let connection = store.connection.lock().unwrap();
        let updated_at: Option<String> = connection
            .query_row(
                "SELECT updated_at FROM task_attempt WHERE id = 'attempt-1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(updated_at.is_some(), "legacy attempt rows are backfilled");
        let occurred_at: Option<String> = connection
            .query_row(
                "SELECT occurred_at FROM event_ledger WHERE aggregate_id = 'attempt-1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(
            occurred_at.is_none(),
            "legacy event rows keep occurred_at NULL"
        );
        assert!(
            column_exists(&connection, "session_presentation", "standalone").unwrap(),
            "existing session presentation rows gain the standalone marker"
        );
        drop(connection);
        assert_eq!(store.schema_meta("timestamps_ready").as_deref(), Some("1"));
        assert!(store.schema_meta("timestamps_approximate").is_some());
        assert_eq!(
            store.timestamp_ordering().unwrap(),
            TimestampOrdering::UpdatedAt
        );

        let new_event_seq = store
            .append_status(
                &TaskId("task-1".into()),
                &AttemptId("attempt-1".into()),
                AttemptStatus::Admitted,
            )
            .unwrap();
        assert_eq!(new_event_seq, 2);
        let connection = store.connection.lock().unwrap();
        let occurred_at: Option<String> = connection
            .query_row(
                "SELECT occurred_at FROM event_ledger WHERE aggregate_id = 'attempt-1' AND seq = 2",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(occurred_at.is_some(), "new event rows carry occurred_at");
        drop(connection);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn ordering_falls_back_to_creation_without_timestamp_readiness() {
        let store = SqlitePersistence::open_in_memory().unwrap();
        assert_eq!(
            store.timestamp_ordering().unwrap(),
            TimestampOrdering::UpdatedAt
        );
        store.set_schema_meta("timestamps_ready", None);
        assert_eq!(
            store.timestamp_ordering().unwrap(),
            TimestampOrdering::Creation
        );
    }

    #[test]
    fn task_projection_round_trip_and_status_events() {
        let store = SqlitePersistence::open_in_memory().unwrap();
        let record = task_record("task-1");
        store.create_task(&record, "idem-1", "hash-1").unwrap();

        let stored = store.task(&TaskId("task-1".into())).unwrap().unwrap();
        assert_eq!(stored.status, TaskStatus::Proposed);
        assert_eq!(stored.acceptance_criteria, vec!["tests pass"]);
        assert!(stored.updated_at.is_some());

        let seq = store
            .append_task_status(&TaskId("task-1".into()), TaskStatus::Ready)
            .unwrap();
        assert_eq!(seq, 1);
        let updated = store.task(&TaskId("task-1".into())).unwrap().unwrap();
        assert_eq!(updated.status, TaskStatus::Ready);

        let connection = store.connection.lock().unwrap();
        let (event_type, source, occurred_at): (String, String, Option<String>) = connection
            .query_row(
                "SELECT event_type, source, occurred_at FROM event_ledger
                 WHERE aggregate_type = 'task' AND aggregate_id = 'task-1'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap();
        drop(connection);
        assert_eq!(event_type, "task.status_changed");
        assert_eq!(source, "magic");
        assert!(occurred_at.is_some());

        let duplicate = store.create_task(&task_record("task-2"), "idem-1", "hash-2");
        assert!(
            duplicate.is_err(),
            "task idempotency key is globally unique"
        );
    }

    #[test]
    fn task_list_projects_current_attempt_and_last_seq() {
        let store = SqlitePersistence::open_in_memory().unwrap();
        let (task_id, attempt_id) = ids();
        store
            .create_task(&task_record("task-1"), "idem-1", "hash-1")
            .unwrap();

        let rows = store
            .list_tasks(None, None, 0, 10, TimestampOrdering::UpdatedAt)
            .unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].current_attempt_no, None);
        assert_eq!(rows[0].last_seq, 0);

        store
            .append_task_status(&task_id, TaskStatus::Ready)
            .unwrap();
        store
            .create_attempt(&task_id, &attempt_id, 1, "request-1", "hash-1")
            .unwrap();
        store
            .append_status(&task_id, &attempt_id, AttemptStatus::Admitted)
            .unwrap();
        store
            .append_status(&task_id, &attempt_id, AttemptStatus::Running)
            .unwrap();

        let rows = store
            .list_tasks(None, None, 0, 10, TimestampOrdering::UpdatedAt)
            .unwrap();
        assert_eq!(rows[0].current_attempt_no, Some(1));
        assert_eq!(rows[0].current_attempt_status, Some(AttemptStatus::Running));
        assert_eq!(rows[0].last_seq, 2, "max over task and attempt aggregates");
        assert_eq!(rows[0].status, TaskStatus::Ready);

        let filtered = store
            .list_tasks(
                Some(&TaskStatus::InProgress),
                None,
                0,
                10,
                TimestampOrdering::UpdatedAt,
            )
            .unwrap();
        assert!(filtered.is_empty());
        let owner = store
            .list_tasks(None, Some("member-1"), 0, 10, TimestampOrdering::UpdatedAt)
            .unwrap();
        assert_eq!(owner.len(), 1);
        assert_eq!(store.task_last_seq(&task_id).unwrap(), 2);
    }

    #[test]
    fn attempt_and_session_event_queries_page_by_seq() {
        let store = SqlitePersistence::open_in_memory().unwrap();
        let (task_id, attempt_id) = ids();
        store
            .create_attempt(&task_id, &attempt_id, 1, "request-1", "hash-1")
            .unwrap();
        store
            .append_status(&task_id, &attempt_id, AttemptStatus::Admitted)
            .unwrap();
        store
            .append_status(&task_id, &attempt_id, AttemptStatus::Running)
            .unwrap();

        let events = store
            .attempt_events(&attempt_id, 0, 10, Some("magic"))
            .unwrap();
        assert_eq!(events.len(), 2);
        assert_eq!(events[0].seq, 1);
        assert!(events[0].occurred_at.is_some());
        assert_eq!(events[0].source, "magic");
        assert!(events[0].source_event_id.is_none());

        let paged = store.attempt_events(&attempt_id, 1, 10, None).unwrap();
        assert_eq!(paged.len(), 1);
        assert_eq!(paged[0].seq, 2);
        assert_eq!(store.attempt_max_seq(&attempt_id).unwrap(), 2);

        store
            .create_binding(&AttemptBinding {
                attempt_id: attempt_id.clone(),
                adapter: "opencode-v1".into(),
                session_id: "session-1".into(),
                message_id: None,
            })
            .unwrap();
        store
            .append_external_event(&ExternalEvent {
                aggregate_type: "opencode".into(),
                aggregate_id: "session-1".into(),
                seq: Some(1),
                event_type: "session.updated".into(),
                source: "opencode-v1".into(),
                source_event_id: Some("event-1".into()),
                payload_json: "{}".into(),
            })
            .unwrap();
        let session_events = store.session_events(&["session-1".into()], 0, 10).unwrap();
        assert_eq!(session_events.len(), 1);
        assert_eq!(session_events[0].source, "opencode-v1");
        assert!(session_events[0].occurred_at.is_some());
        assert_eq!(
            store
                .session_events(&["session-1".into()], 1, 10)
                .unwrap()
                .len(),
            0
        );
        assert_eq!(store.session_max_seq(&["session-1".into()]).unwrap(), 1);
        assert_eq!(
            store.attempt_task(&attempt_id).unwrap().unwrap().0,
            "task-1"
        );
    }
}
