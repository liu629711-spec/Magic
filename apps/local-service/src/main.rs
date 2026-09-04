//! Independent local API/Worker process entry point.

#![recursion_limit = "256"]

use axum::{
    extract::{rejection::JsonRejection, Path, Query, Request, State},
    http::{header, HeaderValue, Method, StatusCode},
    response::{IntoResponse, Response},
    routing::{delete, get, post},
    Json, Router,
};
use magic_application::{
    Application, ApplicationError, CreateTaskRequest as CreateTaskInput, CreateTaskResult,
    DispatchRequest, DispatchResult, EventPageQuery, EventSourceFilter, ReconcileResult,
    TaskListQuery,
};
use magic_contracts::{
    BindingResponse, CreateSessionResponse, CreateTaskRequest as CreateTaskBody,
    CreateTaskResponse, DiscoverModelsRequest, DiscoverModelsResponse, EventsResponse,
    FileReferenceItem, FileReferenceResponse, HealthResponse, LedgerEventDto, RenameSessionRequest,
    RenameSessionResponse, SaveModelProviderRequest, SaveModelProviderResponse,
    SelectSessionModelRequest, SendSessionMessageResponse, ServiceInfoResponse,
    SessionActivityResponse, SessionJobActivity, SessionListItem, SessionListResponse,
    SessionUsageStats,
    SessionToolActivity, SetModelProviderPresentationRequest, SetSessionPresentationRequest,
    SetSessionProjectRequest, TaskDetailResponse, TaskListItem, TaskListResponse, TaskMode,
    WorkerInfo,
};
use magic_domain::{AttemptId, AttemptStatus, TaskId, TaskStatus};
use magic_execution_dsh_v1::{DshLaunchConfig, DshProviderDraft, DshV1Adapter};
use magic_execution_port::ExecutionPort;
use magic_persistence::SqlitePersistence;
use magic_persistence_port::{EventQueryRepository, TimestampOrdering};
use magic_reconciliation::RecoveryWorker;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::HashMap,
    env,
    path::Path as FsPath,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::Duration,
};
use tower_http::cors::{AllowOrigin, CorsLayer};
use uuid::Uuid;

const PROTOCOL_VERSION: &str = "1";
const DEFAULT_LIST_LIMIT: usize = 100;
const MAX_LIST_LIMIT: usize = 500;

#[derive(Clone)]
struct AppState {
    application: Arc<Application<DshV1Adapter, SqlitePersistence>>,
    dsh: Arc<DshV1Adapter>,
    repository: SqlitePersistence,
    transport: Arc<TransportConfig>,
    instance_id: String,
    worker: Arc<WorkerStatus>,
}

struct TransportConfig {
    token: Option<String>,
    cors_origins: Vec<String>,
}

struct WorkerStatus {
    running: AtomicBool,
    poll_ms: u64,
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

#[derive(Deserialize)]
struct CreateSessionBody {
    directory: Option<String>,
}

#[derive(Deserialize)]
struct ValidateDirectoryBody {
    directory: String,
}

#[derive(Serialize)]
struct ValidatedDirectoryResponse {
    directory: String,
    name: String,
}

#[derive(Deserialize)]
struct SendSessionMessageBody {
    input: String,
}

#[derive(Deserialize)]
struct DshRpcBody {
    endpoint: String,
    #[serde(default)]
    args: Value,
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
struct ApiErrorBody {
    error: String,
}

#[tokio::main]
async fn main() {
    let database_path = env::var("MAGIC_DATABASE_PATH").unwrap_or_else(|_| "magic.db".into());
    let repository = SqlitePersistence::open(database_path).expect("open Magic database");
    let worker_repository = repository.clone();
    let poll_ms = env::var("MAGIC_RECOVERY_POLL_MS")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(30_000);
    let address = env::var("MAGIC_LOCAL_SERVICE_ADDR").unwrap_or_else(|_| "127.0.0.1:45280".into());
    let transport = Arc::new(load_transport_config(&address));
    let worker_status = Arc::new(WorkerStatus {
        running: AtomicBool::new(false),
        poll_ms,
    });
    let dsh = Arc::new(
        DshV1Adapter::launch(DshLaunchConfig::from_environment()).expect("launch DeepSeek Harness"),
    );
    let state = AppState {
        application: Arc::new(Application::new((*dsh).clone(), repository.clone())),
        dsh: dsh.clone(),
        repository,
        transport,
        instance_id: Uuid::new_v4().to_string(),
        worker: worker_status.clone(),
    };
    tokio::spawn(async move {
        worker_status.running.store(true, Ordering::SeqCst);
        let worker = Arc::new(RecoveryWorker::new((*dsh).clone(), worker_repository));
        // FZ-1 startup recovery: one observation pass over active attempts.
        let probe_worker = worker.clone();
        match tokio::task::spawn_blocking(move || probe_worker.probe_active_attempts()).await {
            Ok(Ok(report)) => println!(
                "Magic startup recovery probed {} active attempts ({} closed, {} unknown)",
                report.probed, report.closed, report.unknown
            ),
            Ok(Err(error)) => eprintln!("Magic startup recovery probe failed: {error}"),
            Err(error) => eprintln!("Magic startup recovery probe failed to join: {error}"),
        }
        loop {
            let cycle_worker = worker.clone();
            let result = tokio::task::spawn_blocking(move || cycle_worker.run_once()).await;
            if let Err(error) = result {
                eprintln!("Magic recovery worker failed to join: {error}");
            } else if let Ok(Err(error)) = result {
                eprintln!("Magic recovery worker cycle failed: {error}");
            }
            tokio::time::sleep(Duration::from_millis(poll_ms)).await;
        }
    });
    let app = router(state);
    let listener = tokio::net::TcpListener::bind(&address)
        .await
        .expect("bind Magic local API");
    println!("Magic local API listening at {address}");
    axum::serve(listener, app)
        .await
        .expect("serve Magic local API");
}

/// FZ-9 transport configuration.
///
/// - `MAGIC_API_TOKEN`: enables `Authorization: Bearer` enforcement on /api routes.
/// - `MAGIC_API_CORS_ORIGINS`: comma-separated origin allowlist; wildcard `*` is
///   rejected at startup.
/// - `MAGIC_ALLOW_INSECURE_LOCAL_DEV`: opts into serving without a token, only
///   on a loopback bind address.
fn load_transport_config(address: &str) -> TransportConfig {
    let token = env::var("MAGIC_API_TOKEN")
        .ok()
        .filter(|token| !token.trim().is_empty());
    let mut cors_origins: Vec<String> = env::var("MAGIC_API_CORS_ORIGINS")
        .ok()
        .map(|raw| {
            raw.split(',')
                .map(str::trim)
                .filter(|origin| !origin.is_empty())
                .map(ToOwned::to_owned)
                .collect()
        })
        .unwrap_or_default();
    if cors_origins.iter().any(|origin| origin == "*") {
        panic!("MAGIC_API_CORS_ORIGINS must not contain the wildcard origin '*'");
    }
    let dev_mode = env::var("MAGIC_ALLOW_INSECURE_LOCAL_DEV")
        .ok()
        .is_some_and(|value| matches!(value.trim(), "1" | "true" | "True" | "TRUE"));
    if token.is_none() {
        if !dev_mode {
            panic!(
                "no API token configured: set MAGIC_API_TOKEN for production, or enable local development with MAGIC_ALLOW_INSECURE_LOCAL_DEV=1"
            );
        }
        if !is_loopback_address(address) {
            panic!(
                "MAGIC_ALLOW_INSECURE_LOCAL_DEV requires a loopback bind address, got {address}"
            );
        }
        // Browser preview is a strictly local development mode. Production
        // still requires an explicit allowlist together with its bearer token.
        if cors_origins.is_empty() {
            cors_origins.push("http://127.0.0.1:1420".into());
        }
    }
    TransportConfig {
        token,
        cors_origins,
    }
}

fn is_loopback_address(address: &str) -> bool {
    let host = address
        .rsplit_once(':')
        .map(|(host, _)| host)
        .unwrap_or(address)
        .trim_start_matches('[')
        .trim_end_matches(']');
    host == "localhost" || host == "::1" || host.starts_with("127.")
}

enum BearerCheck {
    Missing,
    Invalid,
    Ok,
}

fn constant_time_eq(left: &str, right: &str) -> bool {
    let (left, right) = (left.as_bytes(), right.as_bytes());
    if left.len() != right.len() {
        return false;
    }
    left.iter()
        .zip(right)
        .fold(0u8, |acc, (x, y)| acc | (x ^ y))
        == 0
}

fn check_bearer(header: Option<&str>, expected: &str) -> BearerCheck {
    let Some(header) = header else {
        return BearerCheck::Missing;
    };
    let Some(token) = header.strip_prefix("Bearer ") else {
        return BearerCheck::Missing;
    };
    if constant_time_eq(token, expected) {
        BearerCheck::Ok
    } else {
        BearerCheck::Invalid
    }
}

async fn require_bearer(
    State(state): State<AppState>,
    request: Request,
    next: axum::middleware::Next,
) -> Response {
    let Some(expected) = state.transport.token.as_deref() else {
        return next.run(request).await;
    };
    let header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok());
    match check_bearer(header, expected) {
        BearerCheck::Ok => next.run(request).await,
        BearerCheck::Missing => error_response(StatusCode::UNAUTHORIZED, "missing bearer token"),
        BearerCheck::Invalid => error_response(StatusCode::FORBIDDEN, "invalid bearer token"),
    }
}

fn cors_layer(config: &TransportConfig) -> CorsLayer {
    let origins = AllowOrigin::list(
        config
            .cors_origins
            .iter()
            .map(|origin| HeaderValue::from_str(origin).expect("configured origin must be valid"))
            .collect::<Vec<_>>(),
    );
    CorsLayer::new()
        .allow_origin(origins)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE])
        .max_age(Duration::from_secs(600))
}

fn router(state: AppState) -> Router {
    let api = Router::new()
        .route("/api/sessions", get(list_sessions).post(create_session))
        .route(
            "/api/sessions/{session_id}/project",
            post(set_session_project),
        )
        .route("/api/directories/validate", post(validate_directory))
        .route("/api/sessions/status", get(session_statuses))
        .route(
            "/api/sessions/{session_id}/messages",
            get(session_messages).post(send_session_message),
        )
        .route("/api/sessions/{session_id}/cancel", post(cancel_session))
        .route("/api/sessions/{session_id}/rename", post(rename_session))
        .route("/api/sessions/{session_id}/fork", post(fork_session))
        .route("/api/sessions/{session_id}/archive", post(archive_session))
        .route(
            "/api/sessions/{session_id}/presentation",
            post(set_session_presentation),
        )
        .route("/api/sessions/{session_id}/activity", get(session_activity))
        .route(
            "/api/sessions/{session_id}/file-references",
            get(file_references),
        )
        .route("/api/models", get(model_configuration))
        .route("/api/dsh/plugins", get(dsh_plugins))
        .route("/api/dsh/agent-presets", get(dsh_agent_presets))
        .route("/api/dsh/rpc", post(dsh_rpc))
        .route("/api/model-providers", post(save_model_provider))
        .route(
            "/api/model-providers/{provider_id}",
            delete(delete_model_provider),
        )
        .route(
            "/api/model-providers/{provider_id}/presentation",
            post(set_model_provider_presentation),
        )
        .route("/api/model-providers/discover", post(discover_models))
        .route(
            "/api/sessions/{session_id}/model",
            post(select_session_model),
        )
        .route("/api/tasks", post(create_task).get(list_tasks))
        .route("/api/tasks/{task_id}", get(task_detail))
        .route(
            "/api/tasks/{task_id}/attempts",
            post(create_attempt).get(list_attempts),
        )
        .route(
            "/api/tasks/{task_id}/attempts/{attempt_id}/reconcile",
            post(reconcile_attempt),
        )
        .route(
            "/api/tasks/{task_id}/attempts/{attempt_id}/events",
            get(attempt_events),
        )
        .route("/api/attempts/{attempt_id}/binding", get(attempt_binding))
        .route("/api/service-info", get(service_info))
        .route_layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_bearer,
        ));
    Router::new()
        .route("/health", get(health))
        .merge(api)
        .layer(cors_layer(&state.transport))
        .with_state(state)
}

fn capabilities() -> Value {
    serde_json::json!({
        "session_list": true,
        "session_create": true,
        "session_messages": true,
        "session_cancel": true,
        "session_rename": true,
        "session_fork": true,
        "session_archive": true,
        "session_presentation": true,
        "session_activity": true,
        "file_references": true,
        "session_status": true,
        "model_configuration": true,
        "model_provider_save": true,
        "model_provider_presentation": true,
        "model_discovery": true,
        "session_model_selection": true,
        "dsh_plugin_inventory": true,
        "dsh_agent_presets": true,
        "dsh_remote_controls": true,
        "dsh_reasoning_events": true,
        "dsh_tool_events": true,
        "dsh_terminal_events": true,
        "dsh_approval_events": true,
        "dsh_permission_presets": true,
        "dsh_subagents": true,
        "dsh_background_jobs": true,
        "dsh_goals": true,
        "dsh_plan_mode": true,
        "dsh_skills": true,
        "dsh_web_tools": true,
        "dsh_attachments": true,
        "dsh_session_search": true,
        "dsh_message_feedback": true,
        "task_create": true,
        "task_list": true,
        "task_detail": true,
        "task_attempts_list": true,
        "attempt_binding": true,
        "attempt_events": true,
        "attempt_dispatch": true,
        "attempt_reconcile": true,
        "task_complete": false,
        "attempt_cancel": false,
        "attempt_resolve": false,
        "plan": false,
        "approvals": false,
        "artifacts": false,
        "changesets": false,
        "test_evidence": false,
        "cost": false,
        "side_effects": false
    })
}

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    let repository = state.repository.clone();
    let cursor_watermark =
        tokio::task::spawn_blocking(move || repository.execution_cursor_watermark())
            .await
            .ok()
            .and_then(|result| result.ok());
    Json(HealthResponse {
        healthy: true,
        protocol_version: Some(PROTOCOL_VERSION.into()),
        worker: Some(WorkerInfo {
            running: state.worker.running.load(Ordering::SeqCst),
            poll_ms: state.worker.poll_ms,
        }),
        cursor_watermark,
    })
}

async fn service_info(State(state): State<AppState>) -> Json<ServiceInfoResponse> {
    Json(ServiceInfoResponse {
        protocol_version: PROTOCOL_VERSION.into(),
        instance_id: state.instance_id.clone(),
        capabilities: capabilities(),
        worker: WorkerInfo {
            running: state.worker.running.load(Ordering::SeqCst),
            poll_ms: state.worker.poll_ms,
        },
    })
}

async fn list_sessions(
    State(state): State<AppState>,
) -> Result<Json<SessionListResponse>, ApiError> {
    let dsh = state.dsh.clone();
    let sessions = tokio::task::spawn_blocking(move || dsh.sessions())
        .await
        .map_err(join_error("list sessions worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    let repository = state.repository.clone();
    let presentations = tokio::task::spawn_blocking(move || repository.session_presentations())
        .await
        .map_err(join_error("list session presentations worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Persistence(error)))?;
    let repository = state.repository.clone();
    let project_directories =
        tokio::task::spawn_blocking(move || repository.session_project_directories())
            .await
            .map_err(join_error("list session projects worker failed"))?
            .map_err(|error| ApiError(ApplicationError::Persistence(error)))?;
    let items = sessions
        .into_iter()
        .filter(|session| {
            !presentations
                .get(&session.id)
                .is_some_and(|presentation| presentation.archived)
        })
        .map(|session| {
            let project_directory = project_directories.get(&session.id).cloned();
            SessionListItem {
                pinned: presentations
                    .get(&session.id)
                    .is_some_and(|presentation| presentation.pinned),
                standalone: project_directory.is_none()
                    && presentations
                        .get(&session.id)
                        .is_some_and(|presentation| presentation.standalone),
                session_id: session.id,
                title: session.title,
                directory: project_directory.unwrap_or(session.directory),
                parent_id: session.parent_id,
                updated_at: session.updated_at,
            }
        })
        .collect();
    Ok(Json(SessionListResponse { items }))
}

async fn rename_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    body: Result<Json<RenameSessionRequest>, JsonRejection>,
) -> Result<Json<RenameSessionResponse>, ApiError> {
    let Json(body) = body
        .map_err(|rejection| ApiError(ApplicationError::InvalidParameter(rejection.body_text())))?;
    let title = body.title.trim().to_owned();
    if title.is_empty() {
        return Err(ApiError(ApplicationError::InvalidParameter(
            "session title must not be empty".into(),
        )));
    }
    let dsh = state.dsh.clone();
    let title = tokio::task::spawn_blocking(move || dsh.rename_session(&session_id, &title))
        .await
        .map_err(join_error("rename session worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    Ok(Json(RenameSessionResponse { title }))
}

async fn fork_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> Result<(StatusCode, Json<CreateSessionResponse>), ApiError> {
    let repository = state.repository.clone();
    let source_session_id = session_id.clone();
    let source_is_standalone = tokio::task::spawn_blocking(move || {
        repository.session_presentations().map(|presentations| {
            presentations
                .get(&source_session_id)
                .is_some_and(|presentation| presentation.standalone)
        })
    })
    .await
    .map_err(join_error("read source session presentation worker failed"))?
    .map_err(|error| ApiError(ApplicationError::Persistence(error)))?;
    let dsh = state.dsh.clone();
    let session = tokio::task::spawn_blocking(move || dsh.fork_session(&session_id))
        .await
        .map_err(join_error("fork session worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    if source_is_standalone {
        let repository = state.repository.clone();
        let fork_id = session.id.clone();
        tokio::task::spawn_blocking(move || repository.mark_session_standalone(&fork_id))
            .await
            .map_err(join_error("mark fork session standalone worker failed"))?
            .map_err(|error| ApiError(ApplicationError::Persistence(error)))?;
    }
    Ok((
        StatusCode::CREATED,
        Json(CreateSessionResponse {
            session_id: session.id,
        }),
    ))
}

async fn archive_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> Result<Json<Value>, ApiError> {
    let dsh = state.dsh.clone();
    let dsh_session_id = session_id.clone();
    tokio::task::spawn_blocking(move || dsh.archive_session(&dsh_session_id))
        .await
        .map_err(join_error("archive session worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    let repository = state.repository.clone();
    tokio::task::spawn_blocking(move || repository.archive_session_presentation(&session_id))
        .await
        .map_err(join_error("archive session presentation worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Persistence(error)))?;
    Ok(Json(serde_json::json!({ "archived": true })))
}

async fn set_session_presentation(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    body: Result<Json<SetSessionPresentationRequest>, JsonRejection>,
) -> Result<Json<Value>, ApiError> {
    let Json(body) = body
        .map_err(|rejection| ApiError(ApplicationError::InvalidParameter(rejection.body_text())))?;
    let repository = state.repository.clone();
    tokio::task::spawn_blocking(move || repository.set_session_pinned(&session_id, body.pinned))
        .await
        .map_err(join_error("set session presentation worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Persistence(error)))?;
    Ok(Json(serde_json::json!({ "pinned": body.pinned })))
}

async fn set_session_project(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    body: Result<Json<SetSessionProjectRequest>, JsonRejection>,
) -> Result<Json<Value>, ApiError> {
    let Json(body) = body
        .map_err(|rejection| ApiError(ApplicationError::InvalidParameter(rejection.body_text())))?;
    let directory = body.directory.trim().to_owned();
    if directory.is_empty() {
        return Err(ApiError(ApplicationError::InvalidParameter(
            "project directory must not be empty".into(),
        )));
    }
    let repository = state.repository.clone();
    let directory_for_storage = directory.clone();
    tokio::task::spawn_blocking(move || {
        repository.assign_session_project(&session_id, &directory_for_storage)
    })
    .await
    .map_err(join_error("assign session project worker failed"))?
    .map_err(|error| ApiError(ApplicationError::Persistence(error)))?;
    Ok(Json(serde_json::json!({ "directory": directory })))
}

async fn create_session(
    State(state): State<AppState>,
    body: Result<Json<CreateSessionBody>, JsonRejection>,
) -> Result<(StatusCode, Json<CreateSessionResponse>), ApiError> {
    let Json(body) = body
        .map_err(|rejection| ApiError(ApplicationError::InvalidParameter(rejection.body_text())))?;
    let is_standalone = body
        .directory
        .as_deref()
        .is_none_or(|directory| directory.trim().is_empty());
    let dsh = state.dsh.clone();
    let session =
        tokio::task::spawn_blocking(move || dsh.create_session(body.directory.as_deref()))
            .await
            .map_err(join_error("create session worker failed"))?
            .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    if is_standalone {
        let repository = state.repository.clone();
        let session_id = session.id.clone();
        tokio::task::spawn_blocking(move || repository.mark_session_standalone(&session_id))
            .await
            .map_err(join_error("mark standalone session worker failed"))?
            .map_err(|error| ApiError(ApplicationError::Persistence(error)))?;
    }
    Ok((
        StatusCode::CREATED,
        Json(CreateSessionResponse {
            session_id: session.id,
        }),
    ))
}

async fn validate_directory(
    body: Result<Json<ValidateDirectoryBody>, JsonRejection>,
) -> Result<Json<ValidatedDirectoryResponse>, ApiError> {
    let Json(body) = body
        .map_err(|rejection| ApiError(ApplicationError::InvalidParameter(rejection.body_text())))?;
    let directory = body.directory.trim();
    if directory.is_empty() {
        return Err(ApiError(ApplicationError::InvalidParameter(
            "directory must not be empty".into(),
        )));
    }
    let path = FsPath::new(directory);
    if !path.is_absolute() {
        return Err(ApiError(ApplicationError::InvalidParameter(
            "directory must be an absolute path".into(),
        )));
    }
    let canonical = std::fs::canonicalize(path).map_err(|_| {
        ApiError(ApplicationError::InvalidParameter(
            "directory does not exist or cannot be accessed".into(),
        ))
    })?;
    if !canonical.is_dir() {
        return Err(ApiError(ApplicationError::InvalidParameter(
            "path is not a directory".into(),
        )));
    }
    let name = canonical
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .unwrap_or(directory)
        .to_owned();
    Ok(Json(ValidatedDirectoryResponse {
        directory: user_directory_path(&canonical),
        name,
    }))
}

fn user_directory_path(path: &FsPath) -> String {
    let path = path.to_string_lossy();
    if let Some(path) = path.strip_prefix(r"\\?\UNC\") {
        return format!(r"\\{path}");
    }
    path.strip_prefix(r"\\?\").unwrap_or(&path).to_owned()
}

async fn session_messages(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> Result<Json<Value>, ApiError> {
    let dsh = state.dsh.clone();
    let messages = tokio::task::spawn_blocking(move || dsh.messages(&session_id))
        .await
        .map_err(join_error("get session messages worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    Ok(Json(Value::Array(messages)))
}

async fn cancel_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> Result<Json<Value>, ApiError> {
    let dsh = state.dsh.clone();
    tokio::task::spawn_blocking(move || dsh.cancel_session(&session_id))
        .await
        .map_err(join_error("cancel session worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    Ok(Json(serde_json::json!({ "accepted": true })))
}

async fn session_activity(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> Result<Json<SessionActivityResponse>, ApiError> {
    let dsh = state.dsh.clone();
    let activity = tokio::task::spawn_blocking(move || dsh.session_activity(&session_id))
        .await
        .map_err(join_error("get session activity worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    Ok(Json(SessionActivityResponse {
        tools: activity
            .tools
            .into_iter()
            .map(|tool| SessionToolActivity {
                call_id: tool.call_id,
                name: tool.name,
                status: tool.status,
                arguments_summary: tool.arguments_summary,
                result_summary: tool.result_summary,
            })
            .collect(),
        jobs: activity
            .jobs
            .into_iter()
            .map(|job| SessionJobActivity {
                id: job.id,
                kind: job.kind,
                label: job.label,
                status: job.status,
                detail: job.detail,
                started_at: job.started_at,
                finished_at: job.finished_at,
            })
            .collect(),
        stats: activity.stats.map(|stats| SessionUsageStats {
            turns: stats.turns,
            steps: stats.steps,
            input_tokens: stats.input_tokens,
            output_tokens: stats.output_tokens,
            cache_read_tokens: stats.cache_read_tokens,
            reasoning_tokens: stats.reasoning_tokens,
        }),
        jobs_available: activity.jobs_available,
    }))
}

async fn file_references(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    Query(query): Query<HashMap<String, String>>,
) -> Result<Json<FileReferenceResponse>, ApiError> {
    let text = query.get("query").cloned().unwrap_or_default();
    let dsh = state.dsh.clone();
    let references = tokio::task::spawn_blocking(move || dsh.file_references(&session_id, &text))
        .await
        .map_err(join_error("get file references worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    Ok(Json(FileReferenceResponse {
        items: references
            .into_iter()
            .map(|item| FileReferenceItem {
                path: item.path,
                kind: item.kind,
            })
            .collect(),
    }))
}

async fn send_session_message(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    body: Result<Json<SendSessionMessageBody>, JsonRejection>,
) -> Result<Json<SendSessionMessageResponse>, ApiError> {
    let Json(body) = body
        .map_err(|rejection| ApiError(ApplicationError::InvalidParameter(rejection.body_text())))?;
    if body.input.trim().is_empty() {
        return Err(ApiError(ApplicationError::InvalidParameter(
            "message input must not be empty".into(),
        )));
    }
    let dsh = state.dsh.clone();
    let receipt = tokio::task::spawn_blocking(move || dsh.prompt_async(&session_id, &body.input))
        .await
        .map_err(join_error("send session message worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    Ok(Json(SendSessionMessageResponse {
        message_id: receipt.message_id,
    }))
}

async fn session_statuses(State(state): State<AppState>) -> Result<Json<Value>, ApiError> {
    let dsh = state.dsh.clone();
    let statuses = tokio::task::spawn_blocking(move || dsh.session_statuses())
        .await
        .map_err(join_error("get session statuses worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    Ok(Json(Value::Object(statuses.into_iter().collect())))
}

async fn model_configuration(State(state): State<AppState>) -> Result<Json<Value>, ApiError> {
    let dsh = state.dsh.clone();
    let mut configuration = tokio::task::spawn_blocking(move || dsh.model_configuration())
        .await
        .map_err(join_error("get model configuration worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    let repository = state.repository.clone();
    let presentations =
        tokio::task::spawn_blocking(move || repository.model_provider_presentations())
            .await
            .map_err(join_error("get model provider presentation worker failed"))?
            .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    if let Some(object) = configuration.as_object_mut() {
        object.insert(
            "magic_provider_presentation".into(),
            Value::Object(
                presentations
                    .into_iter()
                    .map(|(provider_id, presentation)| {
                        (
                            provider_id,
                            serde_json::json!({ "enabled": presentation.enabled }),
                        )
                    })
                    .collect(),
            ),
        );
    }
    Ok(Json(configuration))
}

async fn dsh_plugins(State(state): State<AppState>) -> Result<Json<Value>, ApiError> {
    let dsh = state.dsh.clone();
    let value = tokio::task::spawn_blocking(move || dsh.plugin_inventory())
        .await
        .map_err(join_error("get DSH plugin inventory worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    Ok(Json(value))
}

async fn dsh_agent_presets(State(state): State<AppState>) -> Result<Json<Value>, ApiError> {
    let dsh = state.dsh.clone();
    let value = tokio::task::spawn_blocking(move || dsh.agent_presets())
        .await
        .map_err(join_error("get DSH agent preset worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    Ok(Json(value))
}

async fn dsh_rpc(
    State(state): State<AppState>,
    body: Result<Json<DshRpcBody>, JsonRejection>,
) -> Result<Json<Value>, ApiError> {
    let Json(body) = body
        .map_err(|rejection| ApiError(ApplicationError::InvalidParameter(rejection.body_text())))?;
    // Keep the bridge limited to user-facing DSH controls. In particular,
    // settings/credentials and arbitrary host invocation never cross this API.
    const ALLOWED: &[&str] = &[
        "agentPresets/read",
        "agentPresets/copy",
        "agentPresets/deletePreset",
        "agentPresets/select",
        "permission/preset",
        "subagents/list",
        "subagents/prompt",
        "subagents/interruptByParent",
        "commands/list",
        "commands/execute",
        "skills/list",
        "directoryPicker/pick",
        "directoryPicker/list",
        "directoryPicker/createDirectory",
        "sessionReferenceResolver/candidates",
        "session/canOpenWorkspacePath",
        "session/openWorkspacePath",
        "settings/canOpenAgentPresetDirectory",
        "settings/openAgentPresetDirectory",
        "goals/create",
        "goals/edit",
        "goals/pause",
        "goals/resume",
        "goals/complete",
        "goals/clear",
        "messageFeedback/list",
        "messageFeedback/put",
        "messageFeedback/delete",
        "session/search",
        "session/page",
        "session/attachment",
    ];
    if !ALLOWED.contains(&body.endpoint.as_str()) {
        return Err(ApiError(ApplicationError::InvalidParameter(
            "DSH Remote 方法未向 Magic 开放".into(),
        )));
    }
    let dsh = state.dsh.clone();
    let value = tokio::task::spawn_blocking(move || dsh.remote_call(&body.endpoint, body.args))
        .await
        .map_err(join_error("call DSH Remote worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    Ok(Json(value))
}

async fn save_model_provider(
    State(state): State<AppState>,
    body: Result<Json<SaveModelProviderRequest>, JsonRejection>,
) -> Result<Json<SaveModelProviderResponse>, ApiError> {
    let Json(body) = body
        .map_err(|rejection| ApiError(ApplicationError::InvalidParameter(rejection.body_text())))?;
    let draft = provider_draft(
        body.provider_id,
        body.display_name,
        body.base_url,
        body.api,
        body.models,
        body.api_key,
        true,
    )?;
    let dsh = state.dsh.clone();
    let provider_id = tokio::task::spawn_blocking(move || dsh.save_provider(draft))
        .await
        .map_err(join_error("save model provider worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    Ok(Json(SaveModelProviderResponse { provider_id }))
}

async fn delete_model_provider(
    State(state): State<AppState>,
    Path(provider_id): Path<String>,
) -> Result<StatusCode, ApiError> {
    let dsh = state.dsh.clone();
    let presentation_provider_id = provider_id.clone();
    tokio::task::spawn_blocking(move || dsh.delete_provider(&provider_id))
        .await
        .map_err(join_error("delete model provider worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    let repository = state.repository.clone();
    tokio::task::spawn_blocking(move || {
        repository.remove_model_provider_presentation(&presentation_provider_id)
    })
    .await
    .map_err(join_error(
        "remove model provider presentation worker failed",
    ))?
    .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    Ok(StatusCode::NO_CONTENT)
}

async fn set_model_provider_presentation(
    State(state): State<AppState>,
    Path(provider_id): Path<String>,
    body: Result<Json<SetModelProviderPresentationRequest>, JsonRejection>,
) -> Result<StatusCode, ApiError> {
    let Json(body) = body
        .map_err(|rejection| ApiError(ApplicationError::InvalidParameter(rejection.body_text())))?;
    if provider_id.trim().is_empty() {
        return Err(ApiError(ApplicationError::InvalidParameter(
            "provider id must not be empty".into(),
        )));
    }
    let repository = state.repository.clone();
    tokio::task::spawn_blocking(move || {
        repository.set_model_provider_enabled(&provider_id, body.enabled)
    })
    .await
    .map_err(join_error("set model provider presentation worker failed"))?
    .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    Ok(StatusCode::NO_CONTENT)
}

async fn discover_models(
    State(state): State<AppState>,
    body: Result<Json<DiscoverModelsRequest>, JsonRejection>,
) -> Result<Json<DiscoverModelsResponse>, ApiError> {
    let Json(body) = body
        .map_err(|rejection| ApiError(ApplicationError::InvalidParameter(rejection.body_text())))?;
    let draft = provider_draft(
        body.provider_id,
        "discovery".into(),
        body.base_url,
        body.api,
        Vec::new(),
        body.api_key,
        false,
    )?;
    let dsh = state.dsh.clone();
    let models = tokio::task::spawn_blocking(move || dsh.discover_models(&draft))
        .await
        .map_err(join_error("discover models worker failed"))?
        .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    Ok(Json(DiscoverModelsResponse { models }))
}

async fn select_session_model(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    body: Result<Json<SelectSessionModelRequest>, JsonRejection>,
) -> Result<Json<Value>, ApiError> {
    let Json(body) = body
        .map_err(|rejection| ApiError(ApplicationError::InvalidParameter(rejection.body_text())))?;
    if body.provider.trim().is_empty() || body.model.trim().is_empty() {
        return Err(ApiError(ApplicationError::InvalidParameter(
            "model provider and model must not be empty".into(),
        )));
    }
    let repository = state.repository.clone();
    let provider_id = body.provider.clone();
    let enabled = tokio::task::spawn_blocking(move || {
        repository
            .model_provider_presentations()
            .map(|presentations| {
                presentations
                    .get(&provider_id)
                    .map(|state| state.enabled)
                    .unwrap_or(true)
            })
    })
    .await
    .map_err(join_error("get model provider presentation worker failed"))?
    .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    if !enabled {
        return Err(ApiError(ApplicationError::InvalidParameter(
            "provider is disabled in Magic".into(),
        )));
    }
    let dsh = state.dsh.clone();
    let selection = tokio::task::spawn_blocking(move || {
        dsh.select_session_model(&session_id, &body.provider, &body.model)
    })
    .await
    .map_err(join_error("select session model worker failed"))?
    .map_err(|error| ApiError(ApplicationError::Execution(error.to_string())))?;
    Ok(Json(selection))
}

fn provider_draft(
    provider_id: Option<String>,
    display_name: String,
    base_url: String,
    api: String,
    models: Vec<String>,
    api_key: Option<String>,
    require_models: bool,
) -> Result<DshProviderDraft, ApiError> {
    let display_name = display_name.trim().to_owned();
    let base_url = base_url.trim().to_owned();
    let api = api.trim().to_owned();
    let models: Vec<String> = models
        .into_iter()
        .map(|model| model.trim().to_owned())
        .filter(|model| !model.is_empty())
        .collect();
    if display_name.is_empty() || base_url.is_empty() || api.is_empty() {
        return Err(ApiError(ApplicationError::InvalidParameter(
            "provider name, Base URL, and API format must not be empty".into(),
        )));
    }
    if require_models && models.is_empty() {
        return Err(ApiError(ApplicationError::InvalidParameter(
            "at least one model must be configured".into(),
        )));
    }
    if !matches!(
        api.as_str(),
        "openai-completions" | "openai-responses" | "anthropic-messages"
    ) {
        return Err(ApiError(ApplicationError::InvalidParameter(
            "unsupported API format".into(),
        )));
    }
    Ok(DshProviderDraft {
        provider_id: provider_id.filter(|value| !value.trim().is_empty()),
        display_name,
        base_url,
        api,
        models,
        api_key: api_key.filter(|value| !value.trim().is_empty()),
    })
}

async fn create_task(
    State(state): State<AppState>,
    body: Result<Json<CreateTaskBody>, JsonRejection>,
) -> Result<(StatusCode, Json<CreateTaskResponse>), ApiError> {
    let Json(body) = body
        .map_err(|rejection| ApiError(ApplicationError::InvalidParameter(rejection.body_text())))?;
    let mode = match body.mode {
        TaskMode::Agent => "agent",
        TaskMode::Ceo => "ceo",
    };
    let input = CreateTaskInput {
        idempotency_key: body.idempotency_key,
        goal: body.goal,
        acceptance_criteria: body.acceptance_criteria,
        owner_id: body.owner_id,
        mode: mode.into(),
    };
    let application = state.application.clone();
    let result = tokio::task::spawn_blocking(move || application.create_task(input))
        .await
        .map_err(|error| {
            ApiError(ApplicationError::Execution(format!(
                "create task worker failed: {error}"
            )))
        })??;
    let response = match result {
        CreateTaskResult::Created {
            task_id,
            status,
            event_seq,
        } => CreateTaskResponse {
            task_id: task_id.0,
            status,
            event_seq: Some(event_seq),
            reused: false,
        },
        CreateTaskResult::Existing { task_id, status } => CreateTaskResponse {
            task_id: task_id.0,
            status,
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

async fn list_tasks(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<TaskListResponse>, ApiError> {
    let status = match params.get("status").map(String::as_str) {
        None => None,
        Some(raw) => Some(parse_task_status(raw)?),
    };
    let owner = params
        .get("owner")
        .filter(|owner| !owner.is_empty())
        .cloned();
    let limit = parse_limit(params.get("limit"))?;
    let offset = parse_offset(params.get("offset"))?;
    let application = state.application.clone();
    let page = tokio::task::spawn_blocking(move || {
        application.list_tasks(TaskListQuery {
            status,
            owner,
            offset,
            limit,
        })
    })
    .await
    .map_err(join_error("list tasks worker failed"))??;
    let ordering = match page.ordering {
        TimestampOrdering::Creation => "creation",
        TimestampOrdering::UpdatedAt => "updated_at",
    };
    let items = page
        .items
        .into_iter()
        .map(|row| TaskListItem {
            task_id: row.id.0,
            goal: row.goal,
            status: row.status,
            owner_id: row.owner_id,
            current_attempt_no: row.current_attempt_no,
            current_attempt_status: row.current_attempt_status,
            last_seq: row.last_seq,
            updated_at: match page.ordering {
                TimestampOrdering::Creation => None,
                TimestampOrdering::UpdatedAt => row.updated_at,
            },
        })
        .collect();
    Ok(Json(TaskListResponse {
        items,
        next_offset: page.next_offset,
        ordering: ordering.into(),
    }))
}

async fn task_detail(
    State(state): State<AppState>,
    Path(task_id): Path<String>,
) -> Result<Json<TaskDetailResponse>, ApiError> {
    let application = state.application.clone();
    let detail = tokio::task::spawn_blocking(move || application.task_detail(&TaskId(task_id)))
        .await
        .map_err(join_error("task detail worker failed"))??;
    let response = TaskDetailResponse {
        task_id: detail.task.id.0,
        goal: detail.task.goal,
        status: detail.task.status,
        owner_id: detail.task.owner_id,
        acceptance_criteria: detail.task.acceptance_criteria,
        attempts: detail.attempts.into_iter().map(attempt_summary).collect(),
        last_seq: detail.last_seq,
        updated_at: match detail.ordering {
            TimestampOrdering::Creation => None,
            TimestampOrdering::UpdatedAt => detail.task.updated_at,
        },
    };
    Ok(Json(response))
}

async fn list_attempts(
    State(state): State<AppState>,
    Path(task_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<magic_contracts::AttemptListResponse>, ApiError> {
    let limit = parse_limit(params.get("limit"))?;
    let cursor = parse_u32_param(params.get("cursor"), "cursor")?;
    let application = state.application.clone();
    let page = tokio::task::spawn_blocking(move || {
        application.task_attempts(&TaskId(task_id), cursor, limit)
    })
    .await
    .map_err(join_error("attempt list worker failed"))??;
    Ok(Json(magic_contracts::AttemptListResponse {
        items: page.items.into_iter().map(attempt_summary).collect(),
        next_cursor: page.next_cursor,
    }))
}

async fn attempt_binding(
    State(state): State<AppState>,
    Path(attempt_id): Path<String>,
) -> Result<Json<BindingResponse>, ApiError> {
    let application = state.application.clone();
    let binding =
        tokio::task::spawn_blocking(move || application.attempt_binding(&AttemptId(attempt_id)))
            .await
            .map_err(join_error("binding worker failed"))??;
    Ok(Json(BindingResponse {
        attempt_id: binding.attempt_id.0,
        adapter: binding.adapter,
        session_id: binding.session_id,
        message_id: binding.message_id,
    }))
}

async fn attempt_events(
    State(state): State<AppState>,
    Path((task_id, attempt_id)): Path<(String, String)>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<EventsResponse>, ApiError> {
    let after_seq = parse_u64_param(params.get("after_seq"), "after_seq")?;
    let limit = parse_limit(params.get("limit"))?;
    let source = match params.get("source").map(String::as_str) {
        None => None,
        Some("magic") => Some(EventSourceFilter::Magic),
        Some("dsh-v1") => Some(EventSourceFilter::Execution),
        Some(other) => {
            return Err(ApiError(ApplicationError::InvalidParameter(format!(
                "unknown event source: {other}"
            ))));
        }
    };
    let application = state.application.clone();
    let page = tokio::task::spawn_blocking(move || {
        application.attempt_events(EventPageQuery {
            task_id: TaskId(task_id),
            attempt_id: AttemptId(attempt_id),
            after_seq,
            limit,
            source,
        })
    })
    .await
    .map_err(join_error("event query worker failed"))??;
    let events = page
        .events
        .into_iter()
        .map(|event| LedgerEventDto {
            seq: event.seq,
            event_type: event.event_type,
            source: event.source,
            source_event_id: event.source_event_id,
            payload: serde_json::from_str(&event.payload_json)
                .unwrap_or_else(|_| Value::String(event.payload_json.clone())),
            occurred_at: event.occurred_at,
        })
        .collect();
    Ok(Json(EventsResponse {
        events,
        next_cursor: page.next_cursor,
        confirmed_seq: page.confirmed_seq,
    }))
}

fn attempt_summary(
    row: magic_persistence_port::AttemptSummaryRow,
) -> magic_contracts::AttemptSummary {
    magic_contracts::AttemptSummary {
        attempt_id: row.attempt_id.0,
        attempt_no: row.attempt_no,
        status: row.status,
        last_seq: row.last_seq,
    }
}

fn parse_task_status(raw: &str) -> Result<TaskStatus, ApiError> {
    serde_json::from_str(&format!("\"{raw}\"")).map_err(|_| {
        ApiError(ApplicationError::InvalidParameter(format!(
            "unknown task status: {raw}"
        )))
    })
}

fn parse_limit(raw: Option<&String>) -> Result<usize, ApiError> {
    let Some(raw) = raw else {
        return Ok(DEFAULT_LIST_LIMIT);
    };
    let value: usize = raw.parse().map_err(|_| {
        ApiError(ApplicationError::InvalidParameter(format!(
            "invalid limit: {raw}"
        )))
    })?;
    if value == 0 {
        return Err(ApiError(ApplicationError::InvalidParameter(
            "limit must be positive".into(),
        )));
    }
    Ok(value.min(MAX_LIST_LIMIT))
}

fn parse_offset(raw: Option<&String>) -> Result<usize, ApiError> {
    parse_u64_param(raw, "offset").map(|value| value as usize)
}

fn parse_u64_param(raw: Option<&String>, name: &str) -> Result<u64, ApiError> {
    let Some(raw) = raw else {
        return Ok(0);
    };
    raw.parse::<u64>().map_err(|_| {
        ApiError(ApplicationError::InvalidParameter(format!(
            "invalid {name}: {raw}"
        )))
    })
}

fn parse_u32_param(raw: Option<&String>, name: &str) -> Result<Option<u32>, ApiError> {
    let Some(raw) = raw else {
        return Ok(None);
    };
    raw.parse::<u32>().map(Some).map_err(|_| {
        ApiError(ApplicationError::InvalidParameter(format!(
            "invalid {name}: {raw}"
        )))
    })
}

fn join_error(message: &'static str) -> impl Fn(tokio::task::JoinError) -> ApiError {
    move |error: tokio::task::JoinError| {
        ApiError(ApplicationError::Execution(format!("{message}: {error}")))
    }
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
        .map_err(join_error("dispatch worker failed"))??;
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
    .map_err(join_error("reconcile worker failed"))??;
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
            ApplicationError::MissingTask => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "task record missing".into(),
            ),
            ApplicationError::MissingBinding => (
                StatusCode::CONFLICT,
                "attempt has no active execution binding".into(),
            ),
            ApplicationError::NotFound(message) => (StatusCode::NOT_FOUND, message),
            ApplicationError::InvalidParameter(message) => (StatusCode::BAD_REQUEST, message),
            ApplicationError::Persistence(error) => {
                (StatusCode::INTERNAL_SERVER_ERROR, error.to_string())
            }
        };
        (status, Json(ApiErrorBody { error: message })).into_response()
    }
}

fn error_response(status: StatusCode, message: impl Into<String>) -> Response {
    (
        status,
        Json(ApiErrorBody {
            error: message.into(),
        }),
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use http_body_util::BodyExt;
    use magic_persistence_port::{AttemptRepository, EventRepository};
    use std::net::TcpListener;
    use tower::ServiceExt;

    fn test_state(transport: TransportConfig) -> AppState {
        let repository = SqlitePersistence::open_in_memory().unwrap();
        let refused = refused_port();
        let dsh_origin = format!("http://127.0.0.1:{refused}");
        let dsh = DshV1Adapter::connect(dsh_origin, "magic-test-cookie");
        AppState {
            application: Arc::new(Application::new(dsh.clone(), repository.clone())),
            dsh: Arc::new(dsh),
            repository,
            transport: Arc::new(transport),
            instance_id: "instance-test".into(),
            worker: Arc::new(WorkerStatus {
                running: AtomicBool::new(true),
                poll_ms: 30_000,
            }),
        }
    }

    fn dev_config() -> TransportConfig {
        TransportConfig {
            token: None,
            cors_origins: vec![],
        }
    }

    fn refused_port() -> u16 {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        drop(listener);
        address.port()
    }

    async fn send(app: Router, request: axum::http::Request<Body>) -> axum::http::Response<Body> {
        app.oneshot(request).await.unwrap()
    }

    fn request(method: Method, uri: &str) -> axum::http::Request<Body> {
        axum::http::Request::builder()
            .method(method)
            .uri(uri)
            .body(Body::empty())
            .unwrap()
    }

    fn json_request(method: Method, uri: &str, body: Value) -> axum::http::Request<Body> {
        axum::http::Request::builder()
            .method(method)
            .uri(uri)
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(body.to_string()))
            .unwrap()
    }

    async fn body_json(response: axum::http::Response<Body>) -> Value {
        let bytes = response.into_body().collect().await.unwrap().to_bytes();
        serde_json::from_slice(&bytes).unwrap()
    }

    async fn status_of(app: Router, request: axum::http::Request<Body>) -> (StatusCode, Value) {
        let response = send(app, request).await;
        let status = response.status();
        (status, body_json(response).await)
    }

    #[tokio::test]
    async fn health_stays_backwards_compatible_with_diagnostics() {
        let app = router(test_state(dev_config()));
        let (status, body) = status_of(app, request(Method::GET, "/health")).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["healthy"], true);
        assert_eq!(body["protocol_version"], "1");
        assert_eq!(body["worker"]["running"], true);
        assert_eq!(body["worker"]["poll_ms"], 30_000);
        assert_eq!(body["cursor_watermark"], 0);
        assert!(body.get("token").is_none());
    }

    #[tokio::test]
    async fn service_info_reports_capabilities_without_token() {
        let app = router(test_state(dev_config()));
        let (status, body) = status_of(app, request(Method::GET, "/api/service-info")).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["protocol_version"], "1");
        assert_eq!(body["instance_id"], "instance-test");
        assert_eq!(body["capabilities"]["task_create"], true);
        assert_eq!(body["capabilities"]["attempt_events"], true);
        assert_eq!(body["capabilities"]["session_rename"], true);
        assert_eq!(body["capabilities"]["session_presentation"], true);
        assert_eq!(body["capabilities"]["task_complete"], false);
        assert_eq!(body["worker"]["poll_ms"], 30_000);
        assert!(body.get("token").is_none());
    }

    #[tokio::test]
    async fn directory_validation_accepts_an_existing_absolute_directory() {
        let app = router(test_state(dev_config()));
        let directory = env::current_dir().unwrap().to_string_lossy().into_owned();
        let (status, body) = status_of(
            app,
            json_request(
                Method::POST,
                "/api/directories/validate",
                serde_json::json!({ "directory": directory }),
            ),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert!(body["directory"]
            .as_str()
            .is_some_and(|path| !path.is_empty() && !path.starts_with(r"\\?\")));
    }

    #[tokio::test]
    async fn directory_validation_rejects_a_relative_path() {
        let app = router(test_state(dev_config()));
        let (status, _) = status_of(
            app,
            json_request(
                Method::POST,
                "/api/directories/validate",
                serde_json::json!({ "directory": "." }),
            ),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn session_presentation_endpoint_persists_the_pin_choice() {
        let state = test_state(dev_config());
        let repository = state.repository.clone();
        let app = router(state);
        let (status, body) = status_of(
            app,
            json_request(
                Method::POST,
                "/api/sessions/session-1/presentation",
                serde_json::json!({ "pinned": true }),
            ),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["pinned"], true);
        assert!(repository
            .session_presentations()
            .unwrap()
            .get("session-1")
            .is_some_and(|presentation| presentation.pinned));
    }

    #[tokio::test]
    async fn create_task_freezes_idempotent_create_and_reuse() {
        let app = router(test_state(dev_config()));
        let body = serde_json::json!({
            "idempotency_key": "key-1",
            "goal": "ship the thing",
            "acceptance_criteria": ["tests pass"],
            "owner_id": "member-1",
            "mode": "agent"
        });
        let (status, body) =
            status_of(app.clone(), json_request(Method::POST, "/api/tasks", body)).await;
        assert_eq!(status, StatusCode::CREATED);
        assert_eq!(body["reused"], false);
        assert_eq!(body["status"], "ready");
        assert_eq!(body["event_seq"], 1);
        let task_id = body["task_id"].as_str().unwrap().to_string();

        let (status, body) = status_of(
            app.clone(),
            json_request(
                Method::POST,
                "/api/tasks",
                serde_json::json!({
                    "idempotency_key": "key-1",
                    "goal": "ship the thing",
                    "acceptance_criteria": ["tests pass"],
                    "owner_id": "member-1",
                    "mode": "agent"
                }),
            ),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["reused"], true);
        assert_eq!(body["event_seq"], Value::Null);
        assert_eq!(body["task_id"], task_id.as_str());

        let (status, body) = status_of(
            app.clone(),
            json_request(
                Method::POST,
                "/api/tasks",
                serde_json::json!({
                    "idempotency_key": "key-1",
                    "goal": "a different goal",
                    "acceptance_criteria": ["tests pass"],
                    "owner_id": "member-1",
                    "mode": "agent"
                }),
            ),
        )
        .await;
        assert_eq!(status, StatusCode::CONFLICT);
        assert!(body["error"].is_string());

        let (status, body) = status_of(
            app.clone(),
            json_request(
                Method::POST,
                "/api/tasks",
                serde_json::json!({
                    "idempotency_key": "key-2",
                    "goal": "x",
                    "owner_id": "member-1",
                    "mode": "unknown-mode"
                }),
            ),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert!(body["error"].is_string());

        let (status, _) = status_of(
            app,
            json_request(
                Method::POST,
                "/api/tasks",
                serde_json::json!({ "idempotency_key": "key-3", "goal": "x", "owner_id": "member-1" }),
            ),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn task_list_matches_frozen_projection() {
        let state = test_state(dev_config());
        state
            .application
            .create_task(CreateTaskInput {
                idempotency_key: "key-1".into(),
                goal: "first".into(),
                acceptance_criteria: vec![],
                owner_id: "member-1".into(),
                mode: "agent".into(),
            })
            .unwrap();
        state
            .application
            .create_task(CreateTaskInput {
                idempotency_key: "key-2".into(),
                goal: "second".into(),
                acceptance_criteria: vec!["criteria".into()],
                owner_id: "member-2".into(),
                mode: "ceo".into(),
            })
            .unwrap();
        let app = router(state);
        let (status, body) = status_of(app.clone(), request(Method::GET, "/api/tasks")).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["ordering"], "updated_at");
        assert_eq!(body["next_offset"], Value::Null);
        let items = body["items"].as_array().unwrap();
        assert_eq!(items.len(), 2);
        let item = &items[0];
        for field in [
            "task_id",
            "goal",
            "status",
            "owner_id",
            "last_seq",
            "updated_at",
        ] {
            assert!(item.get(field).is_some(), "missing field {field}");
        }
        assert!(item.get("current_attempt_no").is_some());
        assert_eq!(item["current_attempt_no"], Value::Null);

        let (status, body) = status_of(
            app.clone(),
            request(
                Method::GET,
                "/api/tasks?status=ready&owner=member-2&limit=1&offset=0",
            ),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["items"].as_array().unwrap().len(), 1);
        assert_eq!(body["items"][0]["goal"], "second");

        let (status, body) = status_of(
            app.clone(),
            request(Method::GET, "/api/tasks?limit=1&offset=0"),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["items"].as_array().unwrap().len(), 1);
        assert_eq!(body["next_offset"], 1);

        let (status, body) = status_of(
            app.clone(),
            request(Method::GET, "/api/tasks?limit=1&offset=1"),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["items"].as_array().unwrap().len(), 1);
        assert_eq!(body["next_offset"], Value::Null);

        let (status, body) = status_of(app, request(Method::GET, "/api/tasks?status=bogus")).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert!(body["error"].is_string());
    }

    #[tokio::test]
    async fn task_detail_and_attempt_list_respect_ownership() {
        let state = test_state(dev_config());
        let task_id = match state
            .application
            .create_task(CreateTaskInput {
                idempotency_key: "key-1".into(),
                goal: "first".into(),
                acceptance_criteria: vec!["criteria".into()],
                owner_id: "member-1".into(),
                mode: "agent".into(),
            })
            .unwrap()
        {
            CreateTaskResult::Created { task_id, .. } => task_id,
            other => panic!("unexpected result: {other:?}"),
        };
        let task_ref = task_id.0.clone();
        state
            .repository
            .create_attempt(
                &task_id,
                &AttemptId("attempt-2".into()),
                2,
                "key-a2",
                "hash-2",
            )
            .unwrap();
        state
            .repository
            .append_status(
                &task_id,
                &AttemptId("attempt-2".into()),
                AttemptStatus::Admitted,
            )
            .unwrap();
        state
            .repository
            .create_attempt(
                &task_id,
                &AttemptId("attempt-1".into()),
                1,
                "key-a1",
                "hash-1",
            )
            .unwrap();
        let app = router(state);

        let (status, body) = status_of(
            app.clone(),
            request(Method::GET, &format!("/api/tasks/{task_ref}")),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["goal"], "first");
        assert_eq!(body["acceptance_criteria"], serde_json::json!(["criteria"]));
        assert_eq!(body["last_seq"], 1);
        let attempts = body["attempts"].as_array().unwrap();
        assert_eq!(attempts.len(), 2);
        assert_eq!(attempts[0]["attempt_no"], 2);
        assert_eq!(attempts[0]["status"], "admitted");
        assert_eq!(attempts[1]["attempt_no"], 1);

        let (status, body) = status_of(
            app.clone(),
            request(Method::GET, &format!("/api/tasks/{task_ref}/attempts")),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["items"].as_array().unwrap().len(), 2);
        assert_eq!(body["next_cursor"], Value::Null);

        let (status, body) = status_of(
            app.clone(),
            request(
                Method::GET,
                &format!("/api/tasks/{task_ref}/attempts?limit=1"),
            ),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["items"][0]["attempt_no"], 2);
        assert_eq!(body["next_cursor"], 2);

        let (status, _) = status_of(app.clone(), request(Method::GET, "/api/tasks/missing")).await;
        assert_eq!(status, StatusCode::NOT_FOUND);
        let (status, _) = status_of(app, request(Method::GET, "/api/tasks/missing/attempts")).await;
        assert_eq!(status, StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn binding_query_returns_active_reference_or_404() {
        let state = test_state(dev_config());
        state
            .repository
            .create_attempt(
                &TaskId("task-1".into()),
                &AttemptId("attempt-1".into()),
                1,
                "key-1",
                "hash-1",
            )
            .unwrap();
        state
            .repository
            .create_binding(&magic_persistence_port::AttemptBinding {
                attempt_id: AttemptId("attempt-1".into()),
                adapter: "dsh-v1".into(),
                session_id: "session-1".into(),
                message_id: None,
            })
            .unwrap();
        let app = router(state);
        let (status, body) = status_of(
            app.clone(),
            request(Method::GET, "/api/attempts/attempt-1/binding"),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["attempt_id"], "attempt-1");
        assert_eq!(body["adapter"], "dsh-v1");
        assert_eq!(body["session_id"], "session-1");
        assert_eq!(body["message_id"], Value::Null);

        let (status, _) = status_of(
            app.clone(),
            request(Method::GET, "/api/attempts/missing/binding"),
        )
        .await;
        assert_eq!(status, StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn binding_query_404_for_attempt_without_active_binding() {
        let state = test_state(dev_config());
        state
            .repository
            .create_attempt(
                &TaskId("task-1".into()),
                &AttemptId("attempt-9".into()),
                1,
                "key-9",
                "hash-9",
            )
            .unwrap();
        let app = router(state);
        let (status, body) =
            status_of(app, request(Method::GET, "/api/attempts/attempt-9/binding")).await;
        assert_eq!(status, StatusCode::NOT_FOUND);
        assert!(body["error"].is_string());
    }

    #[tokio::test]
    async fn events_query_follows_frozen_cursor_semantics() {
        let state = test_state(dev_config());
        state
            .repository
            .create_attempt(
                &TaskId("task-1".into()),
                &AttemptId("attempt-1".into()),
                1,
                "key-1",
                "hash-1",
            )
            .unwrap();
        state
            .repository
            .append_status(
                &TaskId("task-1".into()),
                &AttemptId("attempt-1".into()),
                AttemptStatus::Admitted,
            )
            .unwrap();
        state
            .repository
            .append_status(
                &TaskId("task-1".into()),
                &AttemptId("attempt-1".into()),
                AttemptStatus::Running,
            )
            .unwrap();
        state
            .repository
            .create_binding(&magic_persistence_port::AttemptBinding {
                attempt_id: AttemptId("attempt-1".into()),
                adapter: "dsh-v1".into(),
                session_id: "session-1".into(),
                message_id: None,
            })
            .unwrap();
        state
            .repository
            .append_external_event(&magic_persistence_port::ExternalEvent {
                aggregate_type: "dsh".into(),
                aggregate_id: "session-1".into(),
                seq: Some(1),
                event_type: "session.updated".into(),
                source: "dsh-v1".into(),
                source_event_id: Some("event-1".into()),
                payload_json: r#"{"status":"running"}"#.into(),
            })
            .unwrap();
        let app = router(state);

        let (status, body) = status_of(
            app.clone(),
            request(Method::GET, "/api/tasks/task-1/attempts/attempt-1/events"),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        let events = body["events"].as_array().unwrap();
        assert_eq!(events.len(), 2);
        assert_eq!(events[0]["seq"], 1);
        assert_eq!(events[0]["event_type"], "attempt.status_changed");
        assert_eq!(events[0]["source"], "magic");
        assert_eq!(events[0]["payload"]["from"], "created");
        assert!(events[0]["occurred_at"].is_string());
        assert_eq!(body["confirmed_seq"], 2);
        assert_eq!(body["next_cursor"], Value::Null);

        let (status, body) = status_of(
            app.clone(),
            request(
                Method::GET,
                "/api/tasks/task-1/attempts/attempt-1/events?after_seq=0&limit=1",
            ),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["events"].as_array().unwrap().len(), 1);
        assert_eq!(body["next_cursor"], 1);

        let (status, body) = status_of(
            app.clone(),
            request(
                Method::GET,
                "/api/tasks/task-1/attempts/attempt-1/events?source=dsh-v1",
            ),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        let events = body["events"].as_array().unwrap();
        assert_eq!(events.len(), 1);
        assert_eq!(events[0]["source"], "dsh-v1");
        assert_eq!(events[0]["source_event_id"], "event-1");
        assert_eq!(body["confirmed_seq"], 1);

        let (status, _) = status_of(
            app.clone(),
            request(
                Method::GET,
                "/api/tasks/task-1/attempts/attempt-1/events?source=opencode-v1",
            ),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST);

        let (status, _) = status_of(
            app.clone(),
            request(
                Method::GET,
                "/api/tasks/task-1/attempts/attempt-1/events?limit=0",
            ),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST);

        let (status, _) = status_of(
            app.clone(),
            request(
                Method::GET,
                "/api/tasks/task-1/attempts/attempt-1/events?limit=99999",
            ),
        )
        .await;
        assert_eq!(status, StatusCode::OK);

        let (status, _) = status_of(
            app.clone(),
            request(
                Method::GET,
                "/api/tasks/task-1/attempts/other-attempt/events",
            ),
        )
        .await;
        assert_eq!(status, StatusCode::NOT_FOUND);

        let (status, _) = status_of(
            app,
            request(
                Method::GET,
                "/api/tasks/task-1/attempts/attempt-1/events?after_seq=x",
            ),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn dispatch_reuses_key_and_reconcile_falls_back_to_unknown_on_failure() {
        let state = test_state(dev_config());
        state
            .repository
            .create_attempt(
                &TaskId("task-1".into()),
                &AttemptId("attempt-1".into()),
                1,
                "key-1",
                "hash-1",
            )
            .unwrap();
        state
            .repository
            .append_status(
                &TaskId("task-1".into()),
                &AttemptId("attempt-1".into()),
                AttemptStatus::Admitted,
            )
            .unwrap();
        state
            .repository
            .append_status(
                &TaskId("task-1".into()),
                &AttemptId("attempt-1".into()),
                AttemptStatus::Running,
            )
            .unwrap();
        state
            .repository
            .create_binding(&magic_persistence_port::AttemptBinding {
                attempt_id: AttemptId("attempt-1".into()),
                adapter: "dsh-v1".into(),
                session_id: "session-1".into(),
                message_id: None,
            })
            .unwrap();
        let app = router(state);
        let body = serde_json::json!({
            "attempt_id": "attempt-ignored",
            "attempt_no": 9,
            "idempotency_key": "key-1",
            "request_hash": "hash-1",
            "directory": null,
            "input": "do work"
        });
        let (status, body) = status_of(
            app.clone(),
            json_request(Method::POST, "/api/tasks/task-1/attempts", body),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["reused"], true);
        assert_eq!(body["status"], "running");

        let (status, body) = status_of(app, reconcile_via_post("task-1", "attempt-1")).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["status"], "unknown_after_restart");
        assert_eq!(body["event_seq"], 3);
    }

    fn reconcile_via_post(task_id: &str, attempt_id: &str) -> axum::http::Request<Body> {
        json_request(
            Method::POST,
            &format!("/api/tasks/{task_id}/attempts/{attempt_id}/reconcile"),
            serde_json::json!({}),
        )
    }

    #[tokio::test]
    async fn bearer_token_is_enforced_on_api_routes_only() {
        let state = test_state(TransportConfig {
            token: Some("secret".into()),
            cors_origins: vec![],
        });
        let app = router(state);
        let (status, _) = status_of(app.clone(), request(Method::GET, "/api/service-info")).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        let (status, _) = status_of(app.clone(), request(Method::GET, "/health")).await;
        assert_eq!(status, StatusCode::OK);

        let authorized = |mut req: axum::http::Request<Body>| {
            req.headers_mut().insert(
                header::AUTHORIZATION,
                HeaderValue::from_static("Bearer wrong"),
            );
            req
        };
        let (status, _) = status_of(
            app.clone(),
            authorized(request(Method::GET, "/api/service-info")),
        )
        .await;
        assert_eq!(status, StatusCode::FORBIDDEN);

        let authorized = |mut req: axum::http::Request<Body>| {
            req.headers_mut().insert(
                header::AUTHORIZATION,
                HeaderValue::from_static("Bearer secret"),
            );
            req
        };
        let (status, _) =
            status_of(app, authorized(request(Method::GET, "/api/service-info"))).await;
        assert_eq!(status, StatusCode::OK);
    }

    #[tokio::test]
    async fn cors_is_restricted_to_configured_origins() {
        let state = test_state(TransportConfig {
            token: None,
            cors_origins: vec!["http://localhost:5173".into()],
        });
        let app = router(state);
        let origin_request = |uri: &str| {
            let mut req = request(Method::OPTIONS, uri);
            req.headers_mut().insert(
                header::ORIGIN,
                HeaderValue::from_static("http://localhost:5173"),
            );
            req.headers_mut().insert(
                header::ACCESS_CONTROL_REQUEST_METHOD,
                HeaderValue::from_static("POST"),
            );
            req
        };
        let response = send(app.clone(), origin_request("/api/tasks")).await;
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response
                .headers()
                .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
                .unwrap(),
            "http://localhost:5173"
        );

        let mut foreign = origin_request("/api/tasks");
        foreign.headers_mut().insert(
            header::ORIGIN,
            HeaderValue::from_static("http://evil.example"),
        );
        let response = send(app.clone(), foreign).await;
        assert!(response
            .headers()
            .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
            .is_none());

        let mut plain = request(Method::GET, "/api/tasks");
        plain.headers_mut().insert(
            header::ORIGIN,
            HeaderValue::from_static("http://localhost:5173"),
        );
        let response = send(app, plain).await;
        assert_eq!(
            response
                .headers()
                .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
                .unwrap(),
            "http://localhost:5173"
        );
    }

    #[test]
    fn check_bearer_and_constant_time_eq() {
        assert!(matches!(check_bearer(None, "secret"), BearerCheck::Missing));
        assert!(matches!(
            check_bearer(Some("Basic abc"), "secret"),
            BearerCheck::Missing
        ));
        assert!(matches!(
            check_bearer(Some("Bearer secret"), "secret"),
            BearerCheck::Ok
        ));
        assert!(matches!(
            check_bearer(Some("Bearer nope"), "secret"),
            BearerCheck::Invalid
        ));
        assert!(constant_time_eq("abc", "abc"));
        assert!(!constant_time_eq("abc", "abd"));
        assert!(!constant_time_eq("abc", "abcd"));
    }

    #[test]
    fn transport_config_rejects_wildcard_and_requires_token() {
        env::set_var("MAGIC_API_CORS_ORIGINS", "*");
        let result = std::panic::catch_unwind(|| load_transport_config("127.0.0.1:45280"));
        env::remove_var("MAGIC_API_CORS_ORIGINS");
        assert!(result.is_err(), "wildcard origin must be rejected");

        env::remove_var("MAGIC_API_TOKEN");
        env::remove_var("MAGIC_ALLOW_INSECURE_LOCAL_DEV");
        let result = std::panic::catch_unwind(|| load_transport_config("127.0.0.1:45280"));
        assert!(
            result.is_err(),
            "tokenless start must fail without dev mode"
        );

        env::set_var("MAGIC_ALLOW_INSECURE_LOCAL_DEV", "1");
        let config = load_transport_config("127.0.0.1:45280");
        assert!(config.token.is_none());
        assert_eq!(config.cors_origins, vec!["http://127.0.0.1:1420"]);
        let result = std::panic::catch_unwind(|| load_transport_config("0.0.0.0:45280"));
        env::remove_var("MAGIC_ALLOW_INSECURE_LOCAL_DEV");
        assert!(result.is_err(), "dev mode must refuse non-loopback bind");

        env::set_var("MAGIC_API_TOKEN", "secret");
        let config = load_transport_config("127.0.0.1:45280");
        env::remove_var("MAGIC_API_TOKEN");
        assert_eq!(config.token.as_deref(), Some("secret"));
    }

    #[test]
    fn loopback_detection() {
        assert!(is_loopback_address("127.0.0.1:45280"));
        assert!(is_loopback_address("127.9.9.9:45280"));
        assert!(is_loopback_address("localhost:45280"));
        assert!(is_loopback_address("[::1]:45280"));
        assert!(!is_loopback_address("0.0.0.0:45280"));
        assert!(!is_loopback_address("192.168.1.5:45280"));
    }

    #[test]
    fn provider_draft_rejects_unsupported_api_formats() {
        let result = provider_draft(
            None,
            "Company".into(),
            "https://api.example.com/v1".into(),
            "unsupported".into(),
            vec!["model-1".into()],
            Some("secret".into()),
            true,
        );
        assert!(result.is_err());
    }

    #[test]
    fn provider_draft_removes_blank_model_names() {
        let result = provider_draft(
            None,
            "Company".into(),
            "https://api.example.com/v1".into(),
            "openai-completions".into(),
            vec!["  model-1  ".into(), " ".into()],
            None,
            true,
        );
        let Ok(draft) = result else {
            panic!("valid provider draft should be accepted");
        };
        assert_eq!(draft.models, vec!["model-1"]);
    }
}
