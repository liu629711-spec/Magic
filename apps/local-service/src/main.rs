//! Independent local API/Worker process entry point.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use magic_application::{
    Application, ApplicationError, DispatchRequest, DispatchResult, ReconcileResult,
};
use magic_domain::{AttemptId, AttemptStatus, TaskId};
use magic_execution_opencode_v1::OpenCodeV1Adapter;
use magic_persistence::SqlitePersistence;
use magic_reconciliation::RecoveryWorker;
use serde::{Deserialize, Serialize};
use std::{env, sync::Arc};

#[derive(Clone)]
struct AppState {
    application: Arc<Application<OpenCodeV1Adapter, SqlitePersistence>>,
}

#[derive(Deserialize)]
struct CreateAttemptBody {
    attempt_id: String,
    attempt_no: u32,
    idempotency_key: String,
    request_hash: String,
    directory: Option<String>,
    input: String,
}

#[derive(Serialize)]
struct AttemptResponse {
    attempt_id: String,
    status: String,
    event_seq: Option<u64>,
    reused: bool,
}

#[derive(Serialize)]
struct ReconcileResponse {
    attempt_id: String,
    status: String,
    event_seq: Option<u64>,
}

#[derive(Serialize)]
struct HealthResponse {
    healthy: bool,
}

#[derive(Serialize)]
struct ApiErrorBody {
    error: String,
}

#[tokio::main]
async fn main() {
    let database_path = env::var("MAGIC_DATABASE_PATH").unwrap_or_else(|_| "magic.db".into());
    let repository = SqlitePersistence::open(database_path).expect("open Magic database");
    let worker_repository = repository.clone();
    let opencode_url =
        env::var("MAGIC_OPENCODE_URL").unwrap_or_else(|_| "http://127.0.0.1:45176".into());
    let worker_url = opencode_url.clone();
    let state = AppState {
        application: Arc::new(Application::new(
            OpenCodeV1Adapter::new(opencode_url),
            repository,
        )),
    };
    tokio::spawn(async move {
        let worker = Arc::new(RecoveryWorker::new(
            OpenCodeV1Adapter::new(worker_url),
            worker_repository,
        ));
        let poll_ms = env::var("MAGIC_RECOVERY_POLL_MS")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .filter(|value| *value > 0)
            .unwrap_or(30_000);
        loop {
            let cycle_worker = worker.clone();
            let result = tokio::task::spawn_blocking(move || cycle_worker.run_once()).await;
            if let Err(error) = result {
                eprintln!("Magic recovery worker failed to join: {error}");
            } else if let Ok(Err(error)) = result {
                eprintln!("Magic recovery worker cycle failed: {error}");
            }
            tokio::time::sleep(std::time::Duration::from_millis(poll_ms)).await;
        }
    });
    let app = router(state);
    let address = env::var("MAGIC_LOCAL_SERVICE_ADDR").unwrap_or_else(|_| "127.0.0.1:45280".into());
    let listener = tokio::net::TcpListener::bind(&address)
        .await
        .expect("bind Magic local API");
    println!("Magic local API listening at {address}");
    axum::serve(listener, app)
        .await
        .expect("serve Magic local API");
}

fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/api/tasks/{task_id}/attempts", post(create_attempt))
        .route(
            "/api/tasks/{task_id}/attempts/{attempt_id}/reconcile",
            post(reconcile_attempt),
        )
        .with_state(state)
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { healthy: true })
}

async fn create_attempt(
    State(state): State<AppState>,
    Path(task_id): Path<String>,
    Json(body): Json<CreateAttemptBody>,
) -> Result<(StatusCode, Json<AttemptResponse>), ApiError> {
    let request = DispatchRequest {
        task_id: TaskId(task_id),
        attempt_id: AttemptId(body.attempt_id),
        attempt_no: body.attempt_no,
        idempotency_key: body.idempotency_key,
        request_hash: body.request_hash,
        directory: body.directory,
        input: body.input,
    };
    let application = state.application.clone();
    let result = tokio::task::spawn_blocking(move || application.dispatch_attempt(request))
        .await
        .map_err(|error| {
            ApiError(ApplicationError::Execution(format!(
                "dispatch worker failed: {error}"
            )))
        })??;
    let response = match result {
        DispatchResult::Created {
            attempt_id,
            event_seq,
        } => AttemptResponse {
            attempt_id: attempt_id.0,
            status: "running".into(),
            event_seq: Some(event_seq),
            reused: false,
        },
        DispatchResult::Existing { attempt_id, status } => AttemptResponse {
            attempt_id: attempt_id.0,
            status: status_name(status),
            event_seq: None,
            reused: true,
        },
    };
    let code = if response.reused {
        StatusCode::OK
    } else {
        StatusCode::CREATED
    };
    Ok((code, Json(response)))
}

async fn reconcile_attempt(
    State(state): State<AppState>,
    Path((task_id, attempt_id)): Path<(String, String)>,
) -> Result<Json<ReconcileResponse>, ApiError> {
    let application = state.application.clone();
    let result = tokio::task::spawn_blocking(move || {
        application.reconcile_attempt(&TaskId(task_id), &AttemptId(attempt_id))
    })
    .await
    .map_err(|error| {
        ApiError(ApplicationError::Execution(format!(
            "reconcile worker failed: {error}"
        )))
    })??;
    Ok(Json(reconcile_response(result)))
}

fn reconcile_response(result: ReconcileResult) -> ReconcileResponse {
    ReconcileResponse {
        attempt_id: result.attempt_id.0,
        status: status_name(result.status),
        event_seq: result.event_seq,
    }
}

fn status_name(status: AttemptStatus) -> String {
    serde_json::to_string(&status)
        .unwrap()
        .trim_matches('"')
        .to_string()
}

struct ApiError(ApplicationError);

impl From<ApplicationError> for ApiError {
    fn from(error: ApplicationError) -> Self {
        Self(error)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self.0 {
            ApplicationError::IdempotencyConflict => {
                (StatusCode::CONFLICT, "idempotency key conflict".into())
            }
            ApplicationError::Execution(message) => (StatusCode::BAD_GATEWAY, message),
            ApplicationError::MissingAttempt => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "attempt record missing".into(),
            ),
            ApplicationError::MissingBinding => (
                StatusCode::CONFLICT,
                "attempt has no active execution binding".into(),
            ),
            ApplicationError::Persistence(error) => {
                (StatusCode::INTERNAL_SERVER_ERROR, error.to_string())
            }
        };
        (status, Json(ApiErrorBody { error: message })).into_response()
    }
}
