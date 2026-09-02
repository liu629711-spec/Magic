use axum::{extract::State, routing::get, Json, Router};
use rusqlite::Connection;
use serde::Serialize;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
struct AppState {
    db: Arc<Mutex<Connection>>,
}

#[derive(Serialize)]
struct Health {
    healthy: bool,
    sqlite_wal: bool,
}

#[tokio::main]
async fn main() {
    let connection = Connection::open_in_memory().expect("open sqlite");
    connection.pragma_update(None, "journal_mode", "WAL").expect("enable WAL");
    connection.execute_batch("CREATE TABLE probe (id INTEGER PRIMARY KEY, value TEXT NOT NULL);")
        .expect("create probe table");
    let state = AppState { db: Arc::new(Mutex::new(connection)) };
    let app = Router::new().route("/health", get(health)).with_state(state);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.expect("bind");
    axum::serve(listener, app).await.expect("serve");
}

async fn health(State(state): State<AppState>) -> Json<Health> {
    let db = state.db.lock().expect("sqlite lock");
    let mode: String = db.query_row("PRAGMA journal_mode", [], |row| row.get(0)).expect("read WAL mode");
    Json(Health { healthy: true, sqlite_wal: mode.eq_ignore_ascii_case("wal") })
}

