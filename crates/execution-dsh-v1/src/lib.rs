//! DeepSeek Harness adapter over its authenticated local Remote API.

use magic_domain::{AttemptId, AttemptStatus};
use magic_execution_port::{
    EventSource, ExecutionError, ExecutionEvent, ExecutionHistoryEvent, ExecutionObservation,
    ExecutionPort, ExecutionReceipt, ExecutionSession,
};
use serde_json::{json, Value};
use std::{
    collections::{HashMap, HashSet},
    env,
    ffi::OsString,
    io::{BufRead, BufReader},
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{mpsc, Arc, Mutex},
    time::Duration,
};
use tungstenite::{client::ClientRequestBuilder, connect, Message};
use uuid::Uuid;

const ADAPTER_NAME: &str = "dsh-v1";
const DEFAULT_STARTUP_TIMEOUT: Duration = Duration::from_secs(30);

/// Process settings for Magic-owned DSH development and packaged deployments.
#[derive(Clone, Debug)]
pub struct DshLaunchConfig {
    pub program: OsString,
    pub args: Vec<OsString>,
    pub working_directory: PathBuf,
    pub dsh_home: PathBuf,
    pub startup_timeout: Duration,
}

impl DshLaunchConfig {
    /// Reads only launch configuration. Provider credentials remain owned by DSH.
    pub fn from_environment() -> Self {
        let working_directory = env::var_os("MAGIC_DSH_WORKDIR")
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from("reference-project/deepseek-harness"));
        let dsh_home = env::var_os("MAGIC_DSH_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from(".magic-dsh"));
        let default_program = if cfg!(windows) { "pnpm.cmd" } else { "pnpm" };
        let program =
            env::var_os("MAGIC_DSH_COMMAND").unwrap_or_else(|| OsString::from(default_program));

        Self {
            program,
            args: vec![
                OsString::from("dsh"),
                OsString::from("web"),
                OsString::from("--no-open"),
                OsString::from("--port"),
                OsString::from("0"),
            ],
            working_directory,
            dsh_home,
            startup_timeout: DEFAULT_STARTUP_TIMEOUT,
        }
    }
}

#[derive(Clone)]
pub struct DshV1Adapter {
    client: Arc<DshRemoteClient>,
    _process: Option<Arc<ManagedDshProcess>>,
    approvals: Arc<DshApprovalBroker>,
}

struct ManagedDshProcess {
    child: Mutex<Child>,
}

impl Drop for ManagedDshProcess {
    fn drop(&mut self) {
        #[cfg(windows)]
        {
            let Ok(child) = self.child.lock() else {
                return;
            };
            let _ = Command::new("taskkill")
                .args(["/PID", &child.id().to_string(), "/T", "/F"])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status();
        }
        #[cfg(not(windows))]
        if let Ok(mut child) = self.child.lock() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

/// DSH-owned session metadata used by Magic's conversation list.
#[derive(Clone, Debug, PartialEq)]
pub struct DshSessionInfo {
    pub id: String,
    pub title: String,
    pub directory: String,
    pub parent_id: Option<String>,
    pub updated_at: Option<u64>,
    pub running: bool,
}

/// One Magic-authored provider profile. The API key is only used while this
/// value crosses from the local service into DSH's credential store.
#[derive(Clone, Debug, PartialEq)]
pub struct DshProviderDraft {
    pub provider_id: Option<String>,
    pub display_name: String,
    pub base_url: String,
    pub api: String,
    pub models: Vec<String>,
    pub api_key: Option<String>,
}

/// Display-safe activity projected from a DSH session. Raw tool payloads stay
/// inside DSH because they may contain local file contents or credentials.
#[derive(Clone, Debug, PartialEq)]
pub struct DshSessionActivity {
    pub tools: Vec<DshToolActivity>,
    pub artifacts: Vec<DshSessionArtifact>,
    pub jobs: Vec<DshSessionJob>,
    pub jobs_available: bool,
    pub stats: Option<DshUsageStats>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct DshUsageStats {
    pub turns: u32,
    pub steps: u32,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_read_tokens: u64,
    pub reasoning_tokens: u64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct DshToolActivity {
    pub call_id: String,
    pub name: String,
    pub status: String,
    pub arguments_summary: String,
    pub result_summary: Option<String>,
}

/// A bounded, redacted UI payload from DSH's typed tool/event presentation.
/// The adapter deliberately does not expose the original event or meta JSON.
#[derive(Clone, Debug, PartialEq)]
pub struct DshSessionArtifact {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub summary: String,
    pub detail: String,
    pub call_id: Option<String>,
    pub event_seq: Option<u64>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct DshSessionJob {
    pub id: String,
    pub kind: String,
    pub label: String,
    pub status: String,
    pub detail: Option<String>,
    pub started_at: u64,
    pub finished_at: Option<u64>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct DshFileReference {
    pub path: String,
    pub kind: String,
}

/// One DSH approval request waiting for a user decision in Magic.
#[derive(Clone, Debug, PartialEq)]
pub struct DshApprovalRequest {
    pub id: String,
    pub session_id: String,
    pub tool_name: String,
    pub call_id: Option<String>,
    pub reason: Option<String>,
}

#[derive(Clone, Debug)]
struct PendingDshApproval {
    request: DshApprovalRequest,
    client_id: String,
    event_id: String,
}

#[derive(Default)]
struct DshApprovalBroker {
    pending: Mutex<HashMap<String, PendingDshApproval>>,
}

impl DshApprovalBroker {
    fn upsert(&self, pending: PendingDshApproval) {
        if let Ok(mut requests) = self.pending.lock() {
            // A reconnect can replay the same waterfall request with a new
            // client generation. Replacing the entry refreshes the transport
            // correlation while preserving one visible approval request.
            requests.insert(pending.request.id.clone(), pending);
        }
    }

    fn remove(&self, id: &str) {
        if let Ok(mut requests) = self.pending.lock() {
            requests.remove(id);
        }
    }
}

struct DshRemoteClient {
    origin: String,
    cookie: String,
    agent: ureq::Agent,
}

impl DshV1Adapter {
    pub fn launch(config: DshLaunchConfig) -> Result<Self, ExecutionError> {
        let dsh_home = if config.dsh_home.is_absolute() {
            config.dsh_home.clone()
        } else {
            env::current_dir()
                .map_err(|error| {
                    ExecutionError::Adapter(format!(
                        "resolve Magic working directory failed: {error}"
                    ))
                })?
                .join(&config.dsh_home)
        };
        let mut child = Command::new(&config.program)
            .args(&config.args)
            .current_dir(&config.working_directory)
            .env("DSH_HOME", dsh_home)
            .env("DSH_TELEMETRY_DISABLED", "1")
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|error| {
                ExecutionError::Adapter(format!("start DSH process failed: {error}"))
            })?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| ExecutionError::Adapter("DSH process did not expose stdout".into()))?;
        let (ready_sender, ready_receiver) = mpsc::sync_channel(1);
        std::thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                let Some(url) = line.strip_prefix("dsh web: ") else {
                    continue;
                };
                let launch_url = url.split_whitespace().next().unwrap_or_default().to_owned();
                if !launch_url.is_empty() {
                    let _ = ready_sender.send(launch_url);
                    return;
                }
            }
        });
        let launch_url = match ready_receiver.recv_timeout(config.startup_timeout) {
            Ok(url) => url,
            Err(error) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(ExecutionError::Adapter(format!(
                    "DSH did not report a local launch URL: {error}"
                )));
            }
        };
        let client = DshRemoteClient::connect(&launch_url)?;
        let adapter = Self {
            client: Arc::new(client),
            _process: Some(Arc::new(ManagedDshProcess {
                child: Mutex::new(child),
            })),
            approvals: Arc::new(DshApprovalBroker::default()),
        };
        adapter.start_approval_bridge();
        Ok(adapter)
    }

    /// Connects to a DSH process already authenticated by Magic's supervisor.
    pub fn connect(origin: impl Into<String>, cookie: impl Into<String>) -> Self {
        Self {
            client: Arc::new(DshRemoteClient {
                origin: origin.into().trim_end_matches('/').to_owned(),
                cookie: cookie.into(),
                agent: ureq::Agent::new_with_defaults(),
            }),
            _process: None,
            approvals: Arc::new(DshApprovalBroker::default()),
        }
    }

    fn start_approval_bridge(&self) {
        let client = self.client.clone();
        let approvals = self.approvals.clone();
        std::thread::spawn(move || loop {
            if let Err(error) = client.follow_approval_events(approvals.clone()) {
                eprintln!("DSH approval event bridge stopped: {error}");
            }
            std::thread::sleep(Duration::from_secs(2));
        });
    }

    pub fn sessions(&self) -> Result<Vec<DshSessionInfo>, ExecutionError> {
        self.client.sessions()
    }

    pub fn messages(&self, session_id: &str) -> Result<Vec<Value>, ExecutionError> {
        self.client.session_records(session_id)
    }

    /// Follows one DSH session until the consumer stops accepting frames.
    ///
    /// DSH's `session/follow` stream opens with a complete snapshot and then
    /// emits one durable event per frame. Magic keeps the transport here so
    /// callers never need to handle the authenticated DSH WebSocket directly.
    pub fn follow_session<F>(&self, session_id: &str, on_frame: F) -> Result<(), ExecutionError>
    where
        F: FnMut(Value) -> bool,
    {
        let address = self.client.session_address(session_id)?;
        self.client.follow_session_address(address, on_frame)
    }

    /// Returns pending DSH approval requests for one session.
    pub fn approvals(&self, session_id: &str) -> Vec<DshApprovalRequest> {
        self.approvals
            .pending
            .lock()
            .map(|pending| {
                pending
                    .values()
                    .filter(|item| item.request.session_id == session_id)
                    .map(|item| item.request.clone())
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Answers one pending DSH approval through the active `$events` client.
    pub fn answer_approval(&self, id: &str, outcome: &str) -> Result<(), ExecutionError> {
        if !matches!(outcome, "allowed-once" | "rejected") {
            return Err(ExecutionError::Adapter(
                "DSH approval outcome must be allowed-once or rejected".into(),
            ));
        }
        let pending = self
            .approvals
            .pending
            .lock()
            .map_err(|_| ExecutionError::Adapter("DSH approval broker is unavailable".into()))?
            .remove(id)
            .ok_or_else(|| {
                ExecutionError::Adapter("DSH approval request is no longer pending".into())
            })?;
        let result = self.client.rpc(
            "$events/result",
            json!({
                "clientId": pending.client_id,
                "eventId": pending.event_id,
                "outcome": { "kind": "result", "value": outcome },
            }),
        );
        if let Err(error) = result {
            if let Ok(mut requests) = self.approvals.pending.lock() {
                requests.insert(pending.request.id.clone(), pending);
            }
            return Err(error);
        }
        Ok(())
    }

    /// Reads DSH-owned tool and job activity without copying raw transcripts
    /// into Magic storage.
    pub fn session_activity(&self, session_id: &str) -> Result<DshSessionActivity, ExecutionError> {
        let records = self.client.session_records(session_id)?;
        let (jobs, jobs_available) = match self.client.session_jobs(session_id) {
            Ok(jobs) => (jobs, true),
            Err(_) => (Vec::new(), false),
        };
        Ok(DshSessionActivity {
            tools: project_tool_activities(&records),
            artifacts: project_session_artifacts(&records),
            jobs,
            jobs_available,
            stats: project_usage_stats(&records),
        })
    }

    pub fn file_references(
        &self,
        session_id: &str,
        query: &str,
    ) -> Result<Vec<DshFileReference>, ExecutionError> {
        self.client.file_references(session_id, query)
    }

    /// Sends a conversation message without creating a Magic task Attempt.
    pub fn prompt_async(
        &self,
        session_id: &str,
        input: &str,
    ) -> Result<ExecutionReceipt, ExecutionError> {
        self.client.submit_prompt(session_id, input)
    }

    pub fn cancel_session(&self, session_id: &str) -> Result<(), ExecutionError> {
        self.client.rpc(
            "session/cancel",
            json!({ "request": { "sessionId": session_id } }),
        )?;
        Ok(())
    }

    /// Changes the DSH-owned title shown by every session surface.
    pub fn rename_session(&self, session_id: &str, title: &str) -> Result<String, ExecutionError> {
        self.client.rename_session(session_id, title)
    }

    /// Creates a DSH session at the most recent completed turn boundary.
    pub fn fork_session(&self, session_id: &str) -> Result<ExecutionSession, ExecutionError> {
        self.client.fork_session(session_id)
    }

    /// Hides a session from DSH workspace grouping without deleting its history.
    pub fn archive_session(&self, session_id: &str) -> Result<(), ExecutionError> {
        self.client.archive_session(session_id)
    }

    pub fn session_statuses(&self) -> Result<HashMap<String, Value>, ExecutionError> {
        Ok(self
            .sessions()?
            .into_iter()
            .map(|session| {
                let status = if session.running { "busy" } else { "idle" };
                (session.id, json!({ "type": status }))
            })
            .collect())
    }

    /// Returns DSH's redacted settings plus its active model catalog.
    pub fn model_configuration(&self) -> Result<Value, ExecutionError> {
        self.client.model_configuration()
    }

    /// Returns DSH's read-only plugin inventory, including preset compositions.
    pub fn plugin_inventory(&self) -> Result<Value, ExecutionError> {
        self.client.rpc("pluginInventory/list", json!({}))
    }

    /// Returns the configured Agent preset roster and authoring capability.
    pub fn agent_presets(&self) -> Result<Value, ExecutionError> {
        self.client.rpc("agentPresets/list", json!({}))
    }

    /// Reads one preset document through DSH's path-free Remote projection.
    pub fn agent_preset_read(&self, preset_id: &str) -> Result<Value, ExecutionError> {
        ensure_remote_id("agentPreset", preset_id)?;
        self.client
            .rpc("agentPresets/read", json!({ "agentPreset": preset_id }))
    }

    /// Copies a system or user preset into the writable preset root.
    pub fn agent_preset_copy(
        &self,
        from: &str,
        id: &str,
        name: Option<&str>,
    ) -> Result<Value, ExecutionError> {
        ensure_remote_id("from", from)?;
        ensure_remote_id("id", id)?;
        let mut args = serde_json::Map::new();
        args.insert("from".into(), Value::String(from.into()));
        args.insert("id".into(), Value::String(id.into()));
        if let Some(name) = name.filter(|value| !value.trim().is_empty()) {
            args.insert("name".into(), Value::String(name.into()));
        }
        self.client.rpc("agentPresets/copy", Value::Object(args))
    }

    /// Deletes a user-authored preset. DSH rejects shipped presets itself.
    pub fn agent_preset_delete(&self, preset_id: &str) -> Result<Value, ExecutionError> {
        ensure_remote_id("id", preset_id)?;
        self.client
            .rpc("agentPresets/deletePreset", json!({ "id": preset_id }))
    }

    /// Selects the composition for a blank DSH session.
    pub fn agent_preset_select(
        &self,
        session_id: &str,
        preset_id: &str,
    ) -> Result<Value, ExecutionError> {
        ensure_remote_id("agentId", session_id)?;
        ensure_remote_id("agentPreset", preset_id)?;
        self.client.rpc(
            "agentPresets/select",
            json!({ "agentId": session_id, "agentPreset": preset_id }),
        )
    }

    /// Switches the effective permission preset through DSH's supported
    /// `/permission` command. Permission presets are session events, not a
    /// standalone Remote namespace; routing the command preserves DSH's
    /// validation and sandbox/approval knob updates.
    pub fn permission_preset(
        &self,
        session_id: &str,
        preset_id: &str,
    ) -> Result<ExecutionReceipt, ExecutionError> {
        ensure_remote_id("sessionId", session_id)?;
        ensure_remote_id("preset", preset_id)?;
        if preset_id.contains('\n') || preset_id.contains('\r') {
            return Err(ExecutionError::Adapter(
                "permission preset must not contain line breaks".into(),
            ));
        }
        self.prompt_async(session_id, &format!("/permission {preset_id}"))
    }

    /// Lists durable direct children of a session without resuming them.
    pub fn subagents_list(&self, parent_session_id: &str) -> Result<Value, ExecutionError> {
        ensure_remote_id("parentSessionId", parent_session_id)?;
        self.client.rpc(
            "subagents/list",
            json!({ "parentSessionId": parent_session_id }),
        )
    }

    /// Delivers a browser-authored prompt to a continuable child. The request
    /// object is validated by DSH and is intentionally kept opaque here so
    /// future content-block fields can flow without copying DSH types.
    pub fn subagent_prompt(&self, request: Value) -> Result<Value, ExecutionError> {
        self.client
            .rpc("subagents/prompt", json!({ "request": request }))
    }

    pub fn subagent_interrupt(
        &self,
        child_session_id: &str,
        parent_session_id: &str,
    ) -> Result<Value, ExecutionError> {
        ensure_remote_id("childSessionId", child_session_id)?;
        ensure_remote_id("parentSessionId", parent_session_id)?;
        self.client.rpc(
            "subagents/interruptByParent",
            json!({
                "childSessionId": child_session_id,
                "parentSessionId": parent_session_id,
                "mode": "continuable",
            }),
        )
    }

    pub fn goal_create(
        &self,
        session_id: &str,
        objective: &str,
        max_goal_rounds: Option<u64>,
    ) -> Result<Value, ExecutionError> {
        ensure_remote_id("agentId", session_id)?;
        if objective.trim().is_empty() {
            return Err(ExecutionError::Adapter(
                "goal objective must not be empty".into(),
            ));
        }
        let mut request = serde_json::Map::new();
        request.insert("objective".into(), Value::String(objective.into()));
        if let Some(rounds) = max_goal_rounds {
            request.insert("maxGoalRounds".into(), json!(rounds));
        }
        self.client.rpc(
            "goals/create",
            json!({ "agentId": session_id, "request": request }),
        )
    }

    fn goal_mutation(
        &self,
        endpoint: &str,
        session_id: &str,
        goal_ref: Value,
        request: Option<Value>,
    ) -> Result<Value, ExecutionError> {
        ensure_remote_id("agentId", session_id)?;
        let mut args = serde_json::Map::new();
        args.insert("agentId".into(), Value::String(session_id.into()));
        args.insert("ref".into(), goal_ref);
        if let Some(request) = request {
            args.insert("request".into(), request);
        }
        self.client.rpc(endpoint, Value::Object(args))
    }

    pub fn goal_edit(
        &self,
        session_id: &str,
        goal_ref: Value,
        request: Value,
    ) -> Result<Value, ExecutionError> {
        self.goal_mutation("goals/edit", session_id, goal_ref, Some(request))
    }

    pub fn goal_pause(&self, session_id: &str, goal_ref: Value) -> Result<Value, ExecutionError> {
        self.goal_mutation("goals/pause", session_id, goal_ref, None)
    }

    pub fn goal_resume(&self, session_id: &str, goal_ref: Value) -> Result<Value, ExecutionError> {
        self.goal_mutation("goals/resume", session_id, goal_ref, None)
    }

    pub fn goal_complete(
        &self,
        session_id: &str,
        goal_ref: Value,
    ) -> Result<Value, ExecutionError> {
        self.goal_mutation("goals/complete", session_id, goal_ref, None)
    }

    pub fn goal_clear(&self, session_id: &str, goal_ref: Value) -> Result<Value, ExecutionError> {
        self.goal_mutation("goals/clear", session_id, goal_ref, None)
    }

    pub fn message_feedback_list(&self, session_id: &str) -> Result<Value, ExecutionError> {
        ensure_remote_id("sessionId", session_id)?;
        self.client.rpc(
            "messageFeedback/list",
            json!({ "request": { "sessionId": session_id } }),
        )
    }

    pub fn message_feedback_put(&self, request: Value) -> Result<Value, ExecutionError> {
        self.client
            .rpc("messageFeedback/put", json!({ "request": request }))
    }

    pub fn message_feedback_delete(&self, request: Value) -> Result<Value, ExecutionError> {
        self.client
            .rpc("messageFeedback/delete", json!({ "request": request }))
    }

    /// Calls one explicitly allow-listed DSH Remote method. Magic uses this
    /// narrow bridge for first-party controls (preset read/copy/delete/select
    /// and capability panels) while keeping credentials and raw event data in
    /// DSH. Callers must pass the complete DSH argument envelope.
    pub fn remote_call(&self, endpoint: &str, args: Value) -> Result<Value, ExecutionError> {
        self.client.rpc(endpoint, args)
    }

    /// Writes one generic pi-ai provider profile and, when supplied, stores
    /// its credential in DSH. The credential never appears in a response.
    pub fn save_provider(&self, draft: DshProviderDraft) -> Result<String, ExecutionError> {
        self.client.save_provider(draft)
    }

    /// Removes one Magic-owned provider profile and its stored credential.
    pub fn delete_provider(&self, provider_id: &str) -> Result<(), ExecutionError> {
        self.client.delete_provider(provider_id)
    }

    /// Interrogates a draft endpoint without writing the draft or its key.
    pub fn discover_models(&self, draft: &DshProviderDraft) -> Result<Vec<Value>, ExecutionError> {
        self.client.discover_models(draft)
    }

    /// Persists the model choice on the addressed DSH session.
    pub fn select_session_model(
        &self,
        session_id: &str,
        provider: &str,
        model: &str,
    ) -> Result<Value, ExecutionError> {
        self.client
            .select_session_model(session_id, provider, model)
    }
}

fn ensure_remote_id(field: &str, value: &str) -> Result<(), ExecutionError> {
    if value.trim().is_empty() {
        return Err(ExecutionError::Adapter(format!(
            "DSH Remote {field} must not be empty"
        )));
    }
    Ok(())
}

impl ExecutionPort for DshV1Adapter {
    fn adapter_name(&self) -> &'static str {
        ADAPTER_NAME
    }

    fn create_session(&self, directory: Option<&str>) -> Result<ExecutionSession, ExecutionError> {
        let mut request = serde_json::Map::new();
        if let Some(directory) = directory.filter(|directory| !directory.trim().is_empty()) {
            request.insert("cwd".into(), Value::String(directory.into()));
        }
        let value = self
            .client
            .rpc("session/create", json!({ "request": request }))?;
        let id = value
            .get("sessionId")
            .and_then(Value::as_str)
            .ok_or_else(|| {
                ExecutionError::Adapter("DSH session/create returned no sessionId".into())
            })?;
        Ok(ExecutionSession { id: id.to_owned() })
    }

    fn submit(
        &self,
        _attempt_id: &AttemptId,
        session_id: &str,
        input: &str,
    ) -> Result<ExecutionReceipt, ExecutionError> {
        self.prompt_async(session_id, input)
    }

    fn cancel(&self, _attempt_id: &AttemptId, session_id: &str) -> Result<(), ExecutionError> {
        self.client.rpc(
            "session/cancel",
            json!({ "request": { "sessionId": session_id } }),
        )?;
        Ok(())
    }

    fn reconcile(
        &self,
        _attempt_id: &AttemptId,
        session_id: &str,
    ) -> Result<ExecutionObservation, ExecutionError> {
        let session = self
            .sessions()?
            .into_iter()
            .find(|session| session.id == session_id)
            .ok_or_else(|| ExecutionError::Adapter("DSH session was not found".into()))?;
        if session.running {
            return Ok(ExecutionObservation::Running);
        }
        let records = self.messages(session_id)?;
        Ok(observation_from_records(&records))
    }
}

impl EventSource for DshV1Adapter {
    fn aggregate_type(&self) -> &'static str {
        "dsh"
    }

    fn event_source_name(&self) -> &'static str {
        ADAPTER_NAME
    }

    fn read_events(&self, _max_events: usize) -> Result<Vec<ExecutionEvent>, ExecutionError> {
        Ok(Vec::new())
    }

    fn sync_history(
        &self,
        _known_sequences: &HashMap<String, u64>,
    ) -> Result<Vec<ExecutionHistoryEvent>, ExecutionError> {
        // DSH exposes ordered per-session journals. Magic reads those through
        // session/follow during reconciliation rather than treating the Web UI
        // event channel as a global durable queue.
        Ok(Vec::new())
    }
}

impl DshRemoteClient {
    fn follow_approval_events(
        &self,
        approvals: Arc<DshApprovalBroker>,
    ) -> Result<(), ExecutionError> {
        let websocket_url = self.origin.replacen("http", "ws", 1) + "/api/remote.mux";
        let request = ClientRequestBuilder::new(websocket_url.parse().map_err(|error| {
            ExecutionError::Adapter(format!("invalid DSH WebSocket URL: {error}"))
        })?)
        .with_header("Cookie", &self.cookie);
        let (mut socket, _) = connect(request).map_err(|error| {
            ExecutionError::Adapter(format!("connect to DSH approval stream failed: {error}"))
        })?;
        let stream_id = format!("magic-approval-{}", Uuid::new_v4());
        socket
            .send(Message::Text(
                json!({
                    "type": "open",
                    "streamId": stream_id,
                    "endpoint": "$events",
                    "payload": { "args": {} },
                })
                .to_string()
                .into(),
            ))
            .map_err(|error| {
                ExecutionError::Adapter(format!("open DSH approval stream failed: {error}"))
            })?;
        let mut client_id = None::<String>;
        loop {
            let message = socket.read().map_err(|error| {
                ExecutionError::Adapter(format!("read DSH approval stream failed: {error}"))
            })?;
            let Message::Text(text) = message else {
                continue;
            };
            let frame: Value = serde_json::from_str(&text).map_err(|error| {
                ExecutionError::Adapter(format!("decode DSH approval stream frame failed: {error}"))
            })?;
            if frame.get("streamId").and_then(Value::as_str) != Some(stream_id.as_str()) {
                continue;
            }
            if frame.get("type").and_then(Value::as_str) == Some("error") {
                return Err(ExecutionError::Adapter(format!(
                    "DSH approval stream failed: {}",
                    frame.get("error").cloned().unwrap_or(Value::Null)
                )));
            }
            let Some(value) = frame.get("value") else {
                continue;
            };
            match value.get("type").and_then(Value::as_str) {
                Some("ready") => {
                    client_id = value
                        .get("clientId")
                        .and_then(Value::as_str)
                        .map(ToOwned::to_owned);
                }
                Some("waterfall")
                    if value.get("event").and_then(Value::as_str) == Some("approval/request") =>
                {
                    let Some(client_id) = client_id.clone() else {
                        return Err(ExecutionError::Adapter(
                            "DSH approval stream sent a request before ready".into(),
                        ));
                    };
                    let Some(event_id) = value.get("eventId").and_then(Value::as_str) else {
                        continue;
                    };
                    let Some(request) = value.get("request") else {
                        continue;
                    };
                    let Some(session_id) = value.get("agentId").and_then(Value::as_str) else {
                        continue;
                    };
                    let approval = DshApprovalRequest {
                        id: event_id.to_owned(),
                        session_id: session_id.to_owned(),
                        tool_name: request
                            .get("toolName")
                            .and_then(Value::as_str)
                            .unwrap_or("未知工具")
                            .to_owned(),
                        call_id: request
                            .get("callId")
                            .and_then(Value::as_str)
                            .map(ToOwned::to_owned),
                        reason: request
                            .get("reason")
                            .and_then(Value::as_str)
                            .map(ToOwned::to_owned),
                    };
                    approvals.upsert(PendingDshApproval {
                        request: approval,
                        client_id,
                        event_id: event_id.to_owned(),
                    });
                }
                Some("cancel") => {
                    // DSH sends this when the host settles the waterfall or
                    // releases its context. Do not leave a dead approval in
                    // Magic's UI or allow a later click to reuse its id.
                    if let Some(event_id) = value.get("eventId").and_then(Value::as_str) {
                        approvals.remove(event_id);
                    }
                }
                _ => {}
            }
        }
    }

    fn submit_prompt(
        &self,
        session_id: &str,
        input: &str,
    ) -> Result<ExecutionReceipt, ExecutionError> {
        self.rpc(
            "session/prompt",
            json!({
                "request": {
                    "requestId": Uuid::new_v4().to_string(),
                    "sessionId": session_id,
                    "mode": "queue",
                    "content": [{ "type": "text", "text": input }],
                }
            }),
        )?;
        Ok(ExecutionReceipt { message_id: None })
    }

    fn connect(launch_url: &str) -> Result<Self, ExecutionError> {
        let origin = launch_url
            .split_once("/?")
            .map(|(origin, _)| origin)
            .ok_or_else(|| ExecutionError::Adapter("invalid DSH launch URL".into()))?;
        let agent: ureq::Agent = ureq::config::Config::builder()
            .max_redirects(0)
            .build()
            .into();
        let response = agent.get(launch_url).call().map_err(|error| {
            ExecutionError::Adapter(format!("DSH launch-token exchange failed: {error}"))
        })?;
        if response.status() != 303 {
            return Err(ExecutionError::Adapter(format!(
                "DSH launch-token exchange returned HTTP {}",
                response.status()
            )));
        }
        let cookie = response
            .headers()
            .get("set-cookie")
            .and_then(|header| header.to_str().ok())
            .and_then(|header| header.split(';').next())
            .filter(|cookie| !cookie.is_empty())
            .ok_or_else(|| {
                ExecutionError::Adapter("DSH launch-token exchange returned no cookie".into())
            })?;
        Ok(Self {
            origin: origin.to_owned(),
            cookie: cookie.to_owned(),
            agent: ureq::Agent::new_with_defaults(),
        })
    }

    fn sessions(&self) -> Result<Vec<DshSessionInfo>, ExecutionError> {
        let value = self.rpc("session/list", json!({ "_request": {} }))?;
        let items = value
            .get("items")
            .and_then(Value::as_array)
            .ok_or_else(|| ExecutionError::Adapter("DSH session/list returned no items".into()))?;
        items
            .iter()
            .map(|item| {
                let id = item
                    .get("sessionId")
                    .and_then(Value::as_str)
                    .ok_or_else(|| {
                        ExecutionError::Adapter("DSH session list item has no id".into())
                    })?;
                let values = item
                    .get("projections")
                    .and_then(|projection| projection.get("values"));
                Ok(DshSessionInfo {
                    id: id.to_owned(),
                    title: values
                        .and_then(|values| values.get("title"))
                        .and_then(Value::as_str)
                        .filter(|title| !title.trim().is_empty())
                        .unwrap_or("新会话")
                        .to_owned(),
                    directory: item
                        .get("cwd")
                        .and_then(Value::as_str)
                        .unwrap_or_default()
                        .to_owned(),
                    parent_id: item
                        .get("parentSessionId")
                        .and_then(Value::as_str)
                        .map(ToOwned::to_owned),
                    updated_at: item.get("updatedAt").and_then(Value::as_u64),
                    running: item
                        .get("running")
                        .and_then(Value::as_bool)
                        .unwrap_or(false),
                })
            })
            .collect()
    }

    fn session_records(&self, session_id: &str) -> Result<Vec<Value>, ExecutionError> {
        let mut records = None;
        let address = self.session_address(session_id)?;
        self.follow_session_address(address, |value| {
            if value.get("type").and_then(Value::as_str) == Some("snapshot") {
                records = value.get("records").and_then(Value::as_array).cloned();
                return false;
            }
            true
        })?;
        records.ok_or_else(|| ExecutionError::Adapter("DSH session stream had no snapshot".into()))
    }

    fn session_address(&self, session_id: &str) -> Result<Value, ExecutionError> {
        let sessions = self.sessions()?;
        let Some(session) = sessions
            .into_iter()
            .find(|session| session.id == session_id)
        else {
            return Err(ExecutionError::Adapter(format!(
                "DSH session {session_id} was not found"
            )));
        };
        let Some(parent_session_id) = session.parent_id else {
            return Ok(json!({ "kind": "session", "sessionId": session_id }));
        };

        // DSH rejects the ordinary session address for child Agents. Resolve
        // the catalog entry so the follow stream carries the same durable
        // parent address as session/page and subagents/prompt.
        let catalog = self.rpc(
            "subagents/list",
            json!({ "parentSessionId": parent_session_id }),
        )?;
        let mode = catalog
            .get("entries")
            .or_else(|| catalog.get("value").and_then(|value| value.get("entries")))
            .and_then(Value::as_array)
            .and_then(|entries| {
                entries
                    .iter()
                    .find(|entry| entry.get("id").and_then(Value::as_str) == Some(session_id))
            })
            .and_then(|entry| entry.get("mode").and_then(Value::as_str))
            .unwrap_or("continuable");
        if !matches!(mode, "one-shot" | "continuable") {
            return Err(ExecutionError::Adapter(format!(
                "DSH child session {session_id} has unsupported mode {mode}"
            )));
        }
        Ok(json!({
            "kind": "subagent",
            "parentSessionId": parent_session_id,
            "childSessionId": session_id,
            "mode": mode,
        }))
    }

    fn follow_session_address<F>(
        &self,
        address: Value,
        mut on_frame: F,
    ) -> Result<(), ExecutionError>
    where
        F: FnMut(Value) -> bool,
    {
        let websocket_url = self.origin.replacen("http", "ws", 1) + "/api/remote.mux";
        let request = ClientRequestBuilder::new(websocket_url.parse().map_err(|error| {
            ExecutionError::Adapter(format!("invalid DSH WebSocket URL: {error}"))
        })?)
        .with_header("Cookie", &self.cookie);
        let (mut socket, _) = connect(request).map_err(|error| {
            ExecutionError::Adapter(format!("connect to DSH session stream failed: {error}"))
        })?;
        let stream_id = format!("magic-{}", Uuid::new_v4());
        socket
            .send(Message::Text(
                json!({
                    "type": "open",
                    "streamId": stream_id,
                    "endpoint": "session/follow",
                    "payload": {
                        "args": {
                            "request": {
                                "address": address,
                                "maxMessages": 500,
                            }
                        }
                    }
                })
                .to_string()
                .into(),
            ))
            .map_err(|error| {
                ExecutionError::Adapter(format!("open DSH session stream failed: {error}"))
            })?;
        loop {
            let message = socket.read().map_err(|error| {
                ExecutionError::Adapter(format!("read DSH session stream failed: {error}"))
            })?;
            let Message::Text(text) = message else {
                continue;
            };
            let frame: Value = serde_json::from_str(&text).map_err(|error| {
                ExecutionError::Adapter(format!("decode DSH session stream frame failed: {error}"))
            })?;
            if frame.get("streamId").and_then(Value::as_str) != Some(stream_id.as_str()) {
                continue;
            }
            if frame.get("type").and_then(Value::as_str) == Some("error") {
                return Err(ExecutionError::Adapter(format!(
                    "DSH session stream failed: {}",
                    frame.get("error").cloned().unwrap_or(Value::Null)
                )));
            }
            let Some(value) = frame.get("value").cloned() else {
                continue;
            };
            if !on_frame(value) {
                return Ok(());
            }
        }
    }

    fn rename_session(&self, session_id: &str, title: &str) -> Result<String, ExecutionError> {
        let value = self.rpc(
            "session/rename",
            json!({ "request": { "sessionId": session_id, "title": title } }),
        )?;
        value
            .get("title")
            .and_then(Value::as_str)
            .map(ToOwned::to_owned)
            .ok_or_else(|| ExecutionError::Adapter("DSH session/rename returned no title".into()))
    }

    fn fork_session(&self, session_id: &str) -> Result<ExecutionSession, ExecutionError> {
        let value = self.rpc(
            "session/fork",
            json!({ "request": { "sessionId": session_id } }),
        )?;
        let id = value
            .get("sessionId")
            .and_then(Value::as_str)
            .ok_or_else(|| {
                ExecutionError::Adapter("DSH session/fork returned no sessionId".into())
            })?;
        Ok(ExecutionSession { id: id.to_owned() })
    }

    fn archive_session(&self, session_id: &str) -> Result<(), ExecutionError> {
        self.rpc(
            "workspace/archiveSession",
            json!({ "request": { "sessionId": session_id } }),
        )?;
        Ok(())
    }

    fn session_jobs(&self, session_id: &str) -> Result<Vec<DshSessionJob>, ExecutionError> {
        let websocket_url = self.origin.replacen("http", "ws", 1) + "/api/remote.mux";
        let request = ClientRequestBuilder::new(websocket_url.parse().map_err(|error| {
            ExecutionError::Adapter(format!("invalid DSH WebSocket URL: {error}"))
        })?)
        .with_header("Cookie", &self.cookie);
        let (mut socket, _) = connect(request).map_err(|error| {
            ExecutionError::Adapter(format!("connect to DSH control stream failed: {error}"))
        })?;
        let stream_id = format!("magic-{}", Uuid::new_v4());
        socket
            .send(Message::Text(
                json!({
                    "type": "open",
                    "streamId": stream_id,
                    "endpoint": "session/control",
                    "payload": { "args": {} },
                })
                .to_string()
                .into(),
            ))
            .map_err(|error| {
                ExecutionError::Adapter(format!("open DSH control stream failed: {error}"))
            })?;
        loop {
            let message = socket.read().map_err(|error| {
                ExecutionError::Adapter(format!("read DSH control stream failed: {error}"))
            })?;
            let Message::Text(text) = message else {
                continue;
            };
            let frame: Value = serde_json::from_str(&text).map_err(|error| {
                ExecutionError::Adapter(format!("decode DSH control stream frame failed: {error}"))
            })?;
            if frame.get("streamId").and_then(Value::as_str) != Some(stream_id.as_str()) {
                continue;
            }
            if frame.get("type").and_then(Value::as_str) == Some("error") {
                return Err(ExecutionError::Adapter(format!(
                    "DSH control stream failed: {}",
                    frame.get("error").cloned().unwrap_or(Value::Null)
                )));
            }
            let Some(baseline) = frame.get("value") else {
                continue;
            };
            if baseline.get("type").and_then(Value::as_str) != Some("baseline") {
                continue;
            }
            let jobs = baseline
                .get("value")
                .and_then(|value| value.get("jobs"))
                .and_then(|jobs| jobs.get(session_id))
                .and_then(Value::as_array)
                .map(|jobs| jobs.iter().filter_map(dsh_session_job).collect())
                .unwrap_or_default();
            let _ = socket.close(None);
            return Ok(jobs);
        }
    }

    fn file_references(
        &self,
        session_id: &str,
        query: &str,
    ) -> Result<Vec<DshFileReference>, ExecutionError> {
        let value = self.rpc(
            "fileReferences/list",
            json!({ "agentId": session_id, "query": query }),
        )?;
        let references = value
            .as_array()
            .ok_or_else(|| ExecutionError::Adapter("DSH file references returned no list".into()))?
            .iter()
            .filter_map(|candidate| {
                Some(DshFileReference {
                    path: candidate.get("path")?.as_str()?.to_owned(),
                    kind: candidate.get("kind")?.as_str()?.to_owned(),
                })
            })
            .collect::<Vec<_>>();
        Ok(references)
    }

    fn model_configuration(&self) -> Result<Value, ExecutionError> {
        let settings = self.rpc("settings/describe", json!({}))?;
        let registered = self.rpc("llm/listProviders", json!({}))?;
        let declared = self.rpc("llm/listConfigurableProviders", json!({}))?;
        let catalog = self.rpc("session/modelCatalog", json!({}))?;
        Ok(json!({
            "settings": settings,
            "registered": registered,
            "declared": declared,
            "catalog": catalog,
        }))
    }

    fn save_provider(&self, draft: DshProviderDraft) -> Result<String, ExecutionError> {
        let settings = self.rpc("settings/describe", json!({}))?;
        let namespace = settings
            .get("namespaces")
            .and_then(Value::as_array)
            .and_then(|namespaces| {
                namespaces
                    .iter()
                    .find(|item| item.get("ns").and_then(Value::as_str) == Some("llm-pi-ai"))
            })
            .ok_or_else(|| {
                ExecutionError::Adapter(
                    "DSH does not expose the llm-pi-ai settings namespace".into(),
                )
            })?;
        let revision = namespace.get("revision").and_then(Value::as_u64);
        let provider_id = draft
            .provider_id
            .unwrap_or_else(|| format!("magic-{}", Uuid::new_v4()));
        let credential_ref = existing_credential_ref(namespace, &provider_id)
            .unwrap_or_else(|| credential_ref_for(&provider_id));
        let models: Vec<Value> = draft
            .models
            .iter()
            .map(|model| json!({ "id": model, "name": model }))
            .collect();
        self.rpc(
            "settings/mutate",
            json!({
                "ns": "llm-pi-ai",
                "ops": [{
                    "op": "set",
                    "path": ["providers", provider_id],
                    "value": {
                        "displayName": draft.display_name,
                        "baseURL": draft.base_url,
                        "api": draft.api,
                        "apiKeyEnv": credential_ref,
                        "models": models,
                    }
                }],
                "expectedRevision": revision,
            }),
        )?;
        if let Some(api_key) = draft.api_key.filter(|key| !key.trim().is_empty()) {
            self.rpc(
                "credentials/set",
                json!({ "ref": credential_ref, "value": api_key }),
            )?;
        }
        Ok(provider_id)
    }

    fn delete_provider(&self, provider_id: &str) -> Result<(), ExecutionError> {
        if !provider_id.starts_with("magic-") {
            return Err(ExecutionError::Adapter(
                "only Magic-created providers can be removed".into(),
            ));
        }
        let settings = self.rpc("settings/describe", json!({}))?;
        let namespace = settings
            .get("namespaces")
            .and_then(Value::as_array)
            .and_then(|namespaces| {
                namespaces
                    .iter()
                    .find(|item| item.get("ns").and_then(Value::as_str) == Some("llm-pi-ai"))
            })
            .ok_or_else(|| {
                ExecutionError::Adapter(
                    "DSH does not expose the llm-pi-ai settings namespace".into(),
                )
            })?;
        let configured = namespace
            .get("value")
            .and_then(|value| value.get("providers"))
            .and_then(Value::as_object)
            .and_then(|providers| providers.get(provider_id))
            .ok_or_else(|| ExecutionError::Adapter("model provider was not found".into()))?;
        let credential_ref = configured
            .get("apiKeyEnv")
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty())
            .map(ToOwned::to_owned);
        let revision = namespace.get("revision").and_then(Value::as_u64);
        self.rpc(
            "settings/mutate",
            json!({
                "ns": "llm-pi-ai",
                "ops": [{ "op": "unset", "path": ["providers", provider_id] }],
                "expectedRevision": revision,
            }),
        )?;
        if let Some(credential_ref) = credential_ref {
            self.rpc("credentials/unset", json!({ "ref": credential_ref }))?;
        }
        Ok(())
    }

    fn discover_models(&self, draft: &DshProviderDraft) -> Result<Vec<Value>, ExecutionError> {
        let value = self.rpc(
            "llm/discoverModels",
            json!({
                "settingsNs": "llm-pi-ai",
                "request": model_discovery_request(draft),
            }),
        )?;
        value.as_array().cloned().ok_or_else(|| {
            ExecutionError::Adapter("DSH model discovery returned no model list".into())
        })
    }

    fn select_session_model(
        &self,
        session_id: &str,
        provider: &str,
        model: &str,
    ) -> Result<Value, ExecutionError> {
        self.rpc(
            "session/selectModel",
            json!({
                "request": {
                    "sessionId": session_id,
                    "provider": provider,
                    "model": model,
                }
            }),
        )
    }

    fn rpc(&self, endpoint: &str, args: Value) -> Result<Value, ExecutionError> {
        let response = self
            .agent
            .post(&format!("{}/api/{endpoint}", self.origin))
            .header("Content-Type", "application/json")
            .header("Cookie", &self.cookie)
            .send(
                json!({
                    "type": "client-request",
                    "rpcId": format!("magic-{}", Uuid::new_v4()),
                    "method": endpoint,
                    "payload": { "args": args },
                })
                .to_string(),
            )
            .map_err(|error| {
                ExecutionError::Adapter(format!("DSH {endpoint} request failed: {error}"))
            })?;
        if !response.status().is_success() {
            return Err(ExecutionError::Adapter(format!(
                "DSH {endpoint} returned HTTP {}",
                response.status()
            )));
        }
        let mut response = response;
        let body = response.body_mut().read_to_string().map_err(|error| {
            ExecutionError::Adapter(format!("read DSH {endpoint} response failed: {error}"))
        })?;
        let envelope: Value = serde_json::from_str(&body).map_err(|error| {
            ExecutionError::Adapter(format!("decode DSH {endpoint} response failed: {error}"))
        })?;
        let result = envelope.get("result").ok_or_else(|| {
            ExecutionError::Adapter(format!("DSH {endpoint} response has no result"))
        })?;
        if result.get("ok").and_then(Value::as_bool) != Some(true) {
            return Err(ExecutionError::Adapter(format!(
                "DSH {endpoint} rejected the request: {}",
                result.get("error").cloned().unwrap_or(Value::Null)
            )));
        }
        // Mutating RPCs such as credentials/set acknowledge success without
        // returning a value. Callers that need a response object validate it
        // after this boundary; an empty acknowledgement is still success.
        Ok(result.get("value").cloned().unwrap_or(Value::Null))
    }
}

fn model_discovery_request(draft: &DshProviderDraft) -> Value {
    let mut request = serde_json::Map::new();
    request.insert("baseURL".into(), Value::String(draft.base_url.clone()));
    request.insert("api".into(), Value::String(draft.api.clone()));
    if let Some(provider_id) = draft.provider_id.as_ref().filter(|id| !id.is_empty()) {
        request.insert("provider".into(), Value::String(provider_id.clone()));
    }
    if let Some(api_key) = draft.api_key.as_ref().filter(|key| !key.trim().is_empty()) {
        request.insert("apiKey".into(), Value::String(api_key.clone()));
    }
    Value::Object(request)
}

fn existing_credential_ref(namespace: &Value, provider_id: &str) -> Option<String> {
    namespace
        .get("value")?
        .get("providers")?
        .get(provider_id)?
        .get("apiKeyEnv")?
        .as_str()
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn credential_ref_for(provider_id: &str) -> String {
    let normalized: String = provider_id
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character.to_ascii_uppercase()
            } else {
                '_'
            }
        })
        .collect();
    format!("{normalized}_API_KEY")
}

fn dsh_session_job(value: &Value) -> Option<DshSessionJob> {
    Some(DshSessionJob {
        id: value.get("id")?.as_str()?.to_owned(),
        kind: value.get("kind")?.as_str()?.to_owned(),
        label: safe_text(value.get("label")?.as_str()?),
        status: value.get("status")?.as_str()?.to_owned(),
        detail: value.get("detail").and_then(Value::as_str).map(safe_text),
        started_at: value.get("startedAt")?.as_u64()?,
        finished_at: value.get("finishedAt").and_then(Value::as_u64),
    })
}

fn project_tool_activities(records: &[Value]) -> Vec<DshToolActivity> {
    let mut tools = Vec::new();
    for event in records.iter().filter_map(|record| record.get("event")) {
        match event.get("type").and_then(Value::as_str) {
            Some("tool/call") => {
                let Some(data) = event.get("data") else {
                    continue;
                };
                let (Some(call_id), Some(name)) = (
                    data.get("callId").and_then(Value::as_str),
                    data.get("name").and_then(Value::as_str),
                ) else {
                    continue;
                };
                tools.push(DshToolActivity {
                    call_id: call_id.to_owned(),
                    name: name.to_owned(),
                    status: "running".into(),
                    arguments_summary: safe_arguments(data.get("arguments")),
                    result_summary: None,
                });
            }
            Some("tool/result") => {
                let Some(data) = event.get("data") else {
                    continue;
                };
                let call_id = data
                    .get("message")
                    .and_then(|message| message.get("source"))
                    .and_then(|source| source.get("callId"))
                    .and_then(Value::as_str);
                let Some(call_id) = call_id else {
                    continue;
                };
                let Some(tool) = tools.iter_mut().rev().find(|tool| tool.call_id == call_id) else {
                    continue;
                };
                let failed = data.get("error").is_some()
                    || data
                        .get("message")
                        .and_then(|message| message.get("content"))
                        .and_then(Value::as_array)
                        .and_then(|content| content.first())
                        .and_then(|content| content.get("isError"))
                        .and_then(Value::as_bool)
                        .unwrap_or(false);
                tool.status = if failed { "failed" } else { "completed" }.into();
                tool.result_summary = Some(if failed {
                    "工具返回错误".into()
                } else {
                    "已返回结果".into()
                });
            }
            _ => {}
        }
    }
    tools
}

fn project_session_artifacts(records: &[Value]) -> Vec<DshSessionArtifact> {
    let mut artifacts = Vec::new();
    for (index, record) in records.iter().enumerate() {
        let Some(event) = record.get("event") else {
            continue;
        };
        let event_type = event
            .get("type")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let data = event.get("data").unwrap_or(&Value::Null);
        let id = record
            .get("seq")
            .and_then(Value::as_u64)
            .map(|seq| seq.to_string())
            .unwrap_or_else(|| index.to_string());
        let event_seq = record.get("seq").and_then(Value::as_u64);
        if event_type == "tool/result" {
            let call_id = data
                .get("message")
                .and_then(|message| message.get("source"))
                .and_then(|source| source.get("callId"))
                .and_then(Value::as_str)
                .filter(|call_id| !call_id.trim().is_empty())
                .map(ToOwned::to_owned);
            let Some(meta) = data.get("meta").filter(|value| value.is_object()) else {
                continue;
            };
            let Some(card) = meta.get("card").and_then(Value::as_str) else {
                continue;
            };
            match card {
                "terminal" => {
                    let output = meta
                        .get("output")
                        .and_then(Value::as_str)
                        .unwrap_or_default();
                    let exit_code = meta.get("exitCode").and_then(Value::as_i64);
                    artifacts.push(DshSessionArtifact {
                        id,
                        kind: "terminal".into(),
                        title: meta
                            .get("title")
                            .and_then(Value::as_str)
                            .unwrap_or("终端")
                            .to_owned(),
                        summary: exit_code
                            .map(|code| format!("退出码 {code}"))
                            .unwrap_or_else(|| "已返回终端输出".into()),
                        detail: safe_text(output),
                        call_id: call_id.clone(),
                        event_seq,
                    });
                }
                "diff" => {
                    let Some(paths) = project_diff_summaries(meta.get("diffs")) else {
                        // DSH's diff presentation is optional and opaque. Do
                        // not invent a change row when its typed payload is
                        // missing or malformed.
                        continue;
                    };
                    artifacts.push(DshSessionArtifact {
                        id,
                        kind: "diff".into(),
                        title: safe_text(
                            meta.get("title")
                                .and_then(Value::as_str)
                                .unwrap_or("文件变更"),
                        ),
                        summary: format!("{} 个文件变更", paths.len()),
                        // Keep the existing UI contract (an array of objects
                        // with `path`) while excluding file contents and all
                        // other raw diff fields from the adapter boundary.
                        detail: Value::Array(paths).to_string(),
                        call_id,
                        event_seq,
                    });
                }
                _ => {}
            }
        } else if event_type == "compaction/summary" {
            let Some(summary) = data
                .get("summary")
                .and_then(Value::as_str)
                .filter(|summary| !summary.trim().is_empty())
            else {
                continue;
            };
            artifacts.push(DshSessionArtifact {
                id,
                kind: "context".into(),
                title: "上下文压缩".into(),
                summary: "已生成上下文摘要".into(),
                detail: safe_text(summary),
                call_id: None,
                event_seq,
            });
        } else if let Some(seqs) = event.get("sourceEventSeqs").and_then(Value::as_array) {
            if !seqs.is_empty() && seqs.iter().all(Value::is_u64) {
                artifacts.push(DshSessionArtifact {
                    id,
                    kind: "source".into(),
                    title: "来源引用".into(),
                    summary: format!("引用 {} 个事件", seqs.len()),
                    detail: safe_event_value(event.get("sourceEventSeqs").unwrap_or(&Value::Null)),
                    call_id: None,
                    event_seq,
                });
            }
        }
    }
    artifacts
}

/// Projects DSH's typed diff card into the smallest useful review payload.
/// The frontend needs paths and a conservative change type to locate the real
/// workspace diff; source text must stay in DSH and malformed cards must not
/// become fabricated rows.
fn project_diff_summaries(value: Option<&Value>) -> Option<Vec<Value>> {
    let diffs = value?.as_array()?;
    if diffs.is_empty() {
        return None;
    }

    let mut path_order = Vec::new();
    let mut change_types = HashMap::new();
    for diff in diffs {
        let Some(diff) = diff.as_object() else {
            return None;
        };
        let Some(path) = diff.get("path").and_then(Value::as_str) else {
            return None;
        };
        let path = path.trim();
        if path.is_empty() || path.chars().any(char::is_control) {
            return None;
        }
        let Some(old_text) = diff.get("oldText") else {
            return None;
        };
        if !old_text.is_null() && !old_text.is_string() {
            return None;
        }
        if diff.get("newText").and_then(Value::as_str).is_none() {
            return None;
        }
        let change_type = match (old_text, diff.get("newText")) {
            (Value::String(old), Some(Value::String(new)))
                if !old.is_empty() && !new.is_empty() =>
            {
                "modified"
            }
            _ => "unknown",
        };
        let path = path.to_owned();
        if !change_types.contains_key(&path) {
            path_order.push(path.clone());
            change_types.insert(path, change_type);
        } else if change_type == "modified" {
            // A file may have several hunks. An insertion-style hunk alone is
            // ambiguous, but a later ordinary before/after hunk proves the
            // file was modified.
            change_types.insert(path, "modified");
        }
    }
    if path_order.is_empty() {
        return None;
    }
    Some(
        path_order
            .into_iter()
            .map(|path| {
                let change_type = change_types.get(&path).copied().unwrap_or("unknown");
                json!({ "path": path, "change_type": change_type })
            })
            .collect(),
    )
}

fn safe_event_value(value: &Value) -> String {
    safe_text(&redacted_json(value).to_string())
}

fn project_usage_stats(records: &[Value]) -> Option<DshUsageStats> {
    let mut turns = HashSet::new();
    let mut steps = HashSet::new();
    let mut input_tokens = 0;
    let mut output_tokens = 0;
    let mut cache_read_tokens = 0;
    let mut reasoning_tokens = 0;
    let mut saw_chunk_usage = false;

    for event in records.iter().filter_map(|record| record.get("event")) {
        let event_type = event
            .get("type")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let data = event.get("data").unwrap_or(&Value::Null);
        if let Some(turn) = data.get("turn").and_then(Value::as_u64) {
            if event_type == "turn/start" {
                turns.insert(turn);
            }
        }
        if let (Some(turn), Some(step)) = (
            data.get("turn").and_then(Value::as_u64),
            data.get("step").and_then(Value::as_u64),
        ) {
            if event_type == "step/start" {
                steps.insert((turn, step));
            }
        }
        let usage = if event_type == "assistant/chunk"
            && data
                .get("chunk")
                .and_then(|chunk| chunk.get("type"))
                .and_then(Value::as_str)
                == Some("usage")
        {
            saw_chunk_usage = true;
            data.get("chunk").and_then(|chunk| chunk.get("usage"))
        } else if !saw_chunk_usage && event_type == "assistant/message" {
            data.get("usage")
        } else {
            None
        };
        let Some(usage) = usage else { continue };
        input_tokens += usage
            .get("inputTokens")
            .and_then(Value::as_u64)
            .unwrap_or_default();
        output_tokens += usage
            .get("outputTokens")
            .and_then(Value::as_u64)
            .unwrap_or_default();
        cache_read_tokens += usage
            .get("cacheReadTokens")
            .and_then(Value::as_u64)
            .unwrap_or_default();
        reasoning_tokens += usage
            .get("reasoningTokens")
            .and_then(Value::as_u64)
            .unwrap_or_default();
    }

    if turns.is_empty() && steps.is_empty() && input_tokens == 0 && output_tokens == 0 {
        None
    } else {
        Some(DshUsageStats {
            turns: turns.len() as u32,
            steps: steps.len() as u32,
            input_tokens,
            output_tokens,
            cache_read_tokens,
            reasoning_tokens,
        })
    }
}

fn safe_arguments(value: Option<&Value>) -> String {
    let Some(value) = value else {
        return "无参数".into();
    };
    let value = if let Some(raw) = value.as_str() {
        serde_json::from_str(raw).unwrap_or_else(|_| Value::String(raw.to_owned()))
    } else {
        value.clone()
    };
    safe_text(&redacted_json(&value).to_string())
}

fn redacted_json(value: &Value) -> Value {
    match value {
        Value::Object(fields) => Value::Object(
            fields
                .iter()
                .map(|(key, value)| {
                    let lower = key.to_ascii_lowercase();
                    let value = if [
                        "token",
                        "key",
                        "secret",
                        "password",
                        "authorization",
                        "cookie",
                    ]
                    .iter()
                    .any(|needle| lower.contains(needle))
                    {
                        Value::String("[已隐藏]".into())
                    } else {
                        redacted_json(value)
                    };
                    (key.clone(), value)
                })
                .collect(),
        ),
        Value::Array(values) => Value::Array(values.iter().map(redacted_json).collect()),
        _ => value.clone(),
    }
}

fn safe_text(value: &str) -> String {
    const MAX_SUMMARY_CHARS: usize = 220;
    let trimmed = value.trim();
    let mut end = trimmed.len();
    let mut count = 0;
    for (index, _) in trimmed.char_indices() {
        if count == MAX_SUMMARY_CHARS {
            end = index;
            break;
        }
        count += 1;
    }
    if end < trimmed.len() {
        format!("{}...", &trimmed[..end])
    } else {
        trimmed.to_owned()
    }
}

fn observation_from_records(records: &[Value]) -> ExecutionObservation {
    let latest_end = records
        .iter()
        .filter_map(|record| record.get("event"))
        .rev()
        .find(|event| event.get("type").and_then(Value::as_str) == Some("turn/end"));
    let Some(reason) = latest_end
        .and_then(|event| event.get("data"))
        .and_then(|data| data.get("reason"))
        .and_then(|reason| reason.get("kind"))
        .and_then(Value::as_str)
    else {
        return ExecutionObservation::Running;
    };
    match reason {
        "completed" => ExecutionObservation::Terminal(AttemptStatus::Succeeded),
        "error" => ExecutionObservation::Terminal(AttemptStatus::Failed),
        "aborted" => ExecutionObservation::Terminal(AttemptStatus::Cancelled),
        _ => ExecutionObservation::Unknown,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn completed_turn_is_terminal_success() {
        let records = vec![json!({
            "type": "event",
            "event": { "type": "turn/end", "data": { "reason": { "kind": "completed" } } }
        })];
        assert_eq!(
            observation_from_records(&records),
            ExecutionObservation::Terminal(AttemptStatus::Succeeded)
        );
    }

    #[test]
    fn absent_terminal_evidence_keeps_session_running() {
        assert_eq!(observation_from_records(&[]), ExecutionObservation::Running);
    }

    #[test]
    fn usage_projection_sums_dsh_step_usage_without_double_counting_messages() {
        let records = vec![
            json!({"event": {"type": "turn/start", "data": {"turn": 1}}}),
            json!({"event": {"type": "step/start", "data": {"turn": 1, "step": 1}}}),
            json!({"event": {"type": "assistant/chunk", "data": {"turn": 1, "step": 1, "chunk": {"type": "usage", "usage": {"inputTokens": 10, "outputTokens": 4, "cacheReadTokens": 2, "reasoningTokens": 1}}}}}),
            json!({"event": {"type": "assistant/message", "data": {"usage": {"inputTokens": 10, "outputTokens": 4}}}}),
        ];
        let stats = project_usage_stats(&records).expect("usage should be projected");
        assert_eq!(stats.turns, 1);
        assert_eq!(stats.steps, 1);
        assert_eq!(stats.input_tokens, 10);
        assert_eq!(stats.output_tokens, 4);
        assert_eq!(stats.cache_read_tokens, 2);
        assert_eq!(stats.reasoning_tokens, 1);
    }

    #[test]
    fn credential_reference_is_safe_for_generated_provider_ids() {
        assert_eq!(
            credential_ref_for("magic-7ea80099-cd83"),
            "MAGIC_7EA80099_CD83_API_KEY"
        );
    }

    #[test]
    fn existing_credential_reference_is_reused() {
        let namespace = json!({
            "value": {
                "providers": {
                    "magic-provider": { "apiKeyEnv": "MAGIC_EXISTING_API_KEY" }
                }
            }
        });
        assert_eq!(
            existing_credential_ref(&namespace, "magic-provider"),
            Some("MAGIC_EXISTING_API_KEY".into())
        );
    }

    #[test]
    fn discovery_request_omits_empty_optional_wire_fields() {
        let request = model_discovery_request(&DshProviderDraft {
            provider_id: Some("magic-company".into()),
            display_name: "Company".into(),
            base_url: "https://api.example.com/v1".into(),
            api: "openai-responses".into(),
            models: Vec::new(),
            api_key: None,
        });
        assert_eq!(request["provider"], "magic-company");
        assert_eq!(request["baseURL"], "https://api.example.com/v1");
        assert!(request.get("apiKey").is_none());
    }

    #[test]
    fn projects_tool_lifecycle_without_exposing_secret_arguments() {
        let records = vec![
            json!({
                "event": {
                    "type": "tool/call",
                    "data": {
                        "callId": "call-1",
                        "name": "read",
                        "arguments": { "path": "README.md", "apiKey": "never-return-this" }
                    }
                }
            }),
            json!({
                "event": {
                    "type": "tool/result",
                    "data": {
                        "message": { "source": { "callId": "call-1" }, "content": [{ "isError": false }] }
                    }
                }
            }),
            json!({
                "event": {
                    "type": "tool/call",
                    "data": { "callId": "call-2", "name": "write", "arguments": "{}" }
                }
            }),
        ];

        assert_eq!(
            project_tool_activities(&records),
            vec![
                DshToolActivity {
                    call_id: "call-1".into(),
                    name: "read".into(),
                    status: "completed".into(),
                    arguments_summary: r#"{"apiKey":"[已隐藏]","path":"README.md"}"#.into(),
                    result_summary: Some("已返回结果".into()),
                },
                DshToolActivity {
                    call_id: "call-2".into(),
                    name: "write".into(),
                    status: "running".into(),
                    arguments_summary: "{}".into(),
                    result_summary: None,
                },
            ]
        );
    }

    #[test]
    fn projects_typed_tool_details_context_and_sources() {
        let records = vec![
            json!({
                "seq": 4,
                "event": { "type": "tool/result", "data": {
                    "meta": { "card": "terminal", "title": "运行测试", "output": "ok\n", "exitCode": 0 }
                }}
            }),
            json!({
                "seq": 5,
                "event": { "type": "tool/result", "data": {
                    "message": { "source": { "callId": "call-edit" } },
                    "meta": { "card": "diff", "title": "编辑文件", "diffs": [
                        { "path": "a.txt", "oldText": "secret-before", "newText": "secret-after" },
                        { "path": "src/lib.rs", "oldText": null, "newText": "secret-source" }
                    ] }
                }}
            }),
            json!({
                "seq": 6,
                "event": { "type": "compaction/summary", "data": { "summary": "保留最近任务" } }
            }),
            json!({
                "seq": 7,
                "event": { "type": "assistant/message", "sourceEventSeqs": [1, 2], "data": {} }
            }),
        ];
        let artifacts = project_session_artifacts(&records);
        assert_eq!(artifacts.len(), 4);
        assert_eq!(artifacts[0].kind, "terminal");
        assert_eq!(artifacts[0].summary, "退出码 0");
        assert_eq!(artifacts[0].call_id, None);
        assert_eq!(artifacts[0].event_seq, Some(4));
        assert_eq!(artifacts[1].kind, "diff");
        assert_eq!(artifacts[1].call_id.as_deref(), Some("call-edit"));
        assert_eq!(artifacts[1].event_seq, Some(5));
        assert_eq!(artifacts[1].summary, "2 个文件变更");
        assert_eq!(
            artifacts[1].detail,
            r#"[{"path":"a.txt","change_type":"modified"},{"path":"src/lib.rs","change_type":"unknown"}]"#
        );
        assert!(!artifacts[1].detail.contains("secret-before"));
        assert!(!artifacts[1].detail.contains("secret-source"));
        assert_eq!(artifacts[2].kind, "context");
        assert_eq!(artifacts[2].detail, "保留最近任务");
        assert_eq!(artifacts[3].kind, "source");
        assert_eq!(artifacts[3].summary, "引用 2 个事件");
    }

    #[test]
    fn diff_projection_is_honest_about_missing_sources_and_invalid_cards() {
        let records = vec![
            json!({
                "event": { "type": "tool/result", "data": {
                    "meta": { "card": "diff", "diffs": [
                        { "path": "src/main.rs", "oldText": "old", "newText": "new" }
                    ] }
                }}
            }),
            json!({
                "seq": 11,
                "event": { "type": "tool/result", "data": {
                    "message": { "source": { "callId": "call-invalid" } },
                    "meta": { "card": "diff", "diffs": "not-an-array" }
                }}
            }),
            json!({
                "seq": 12,
                "event": { "type": "tool/result", "data": {
                    "meta": { "card": "diff", "diffs": [
                        { "path": "", "oldText": null, "newText": "ignored" }
                    ] }
                }}
            }),
            json!({
                "seq": 13,
                "event": { "type": "compaction/summary", "data": {} }
            }),
            json!({
                "seq": 14,
                "event": { "type": "assistant/message", "sourceEventSeqs": [1, "bad"], "data": {} }
            }),
        ];

        let artifacts = project_session_artifacts(&records);
        assert_eq!(artifacts.len(), 1);
        assert_eq!(artifacts[0].call_id, None);
        assert_eq!(artifacts[0].event_seq, None);
        assert_eq!(
            artifacts[0].detail,
            r#"[{"path":"src/main.rs","change_type":"modified"}]"#
        );
    }

    #[test]
    fn diff_projection_does_not_guess_added_or_deleted_from_hunks() {
        let records = vec![json!({
            "seq": 20,
            "event": { "type": "tool/result", "data": {
                "message": { "source": { "callId": "call-ambiguous" } },
                "meta": { "card": "diff", "diffs": [
                    { "path": "new-or-overwritten.txt", "oldText": null, "newText": "content" },
                    { "path": "empty-or-deleted.txt", "oldText": "content", "newText": "" }
                ] }
            }}
        })];

        let artifacts = project_session_artifacts(&records);
        assert_eq!(artifacts.len(), 1);
        assert_eq!(
            artifacts[0].detail,
            r#"[{"path":"new-or-overwritten.txt","change_type":"unknown"},{"path":"empty-or-deleted.txt","change_type":"unknown"}]"#
        );
    }

    #[test]
    fn job_projection_requires_complete_dsh_row() {
        let job = dsh_session_job(&json!({
            "id": "job-1",
            "kind": "terminal",
            "label": "Run tests",
            "status": "completed",
            "detail": "done",
            "startedAt": 100,
            "finishedAt": 125,
        }));
        assert_eq!(
            job,
            Some(DshSessionJob {
                id: "job-1".into(),
                kind: "terminal".into(),
                label: "Run tests".into(),
                status: "completed".into(),
                detail: Some("done".into()),
                started_at: 100,
                finished_at: Some(125),
            })
        );
        assert_eq!(dsh_session_job(&json!({ "id": "job-2" })), None);
    }

    #[test]
    fn remote_id_validation_rejects_blank_values() {
        assert!(ensure_remote_id("agentId", "   ").is_err());
        assert!(ensure_remote_id("agentId", "session-1").is_ok());
    }

    #[test]
    fn approval_broker_replaces_replayed_requests_and_removes_cancelled_ones() {
        let broker = DshApprovalBroker::default();
        let request = DshApprovalRequest {
            id: "approval-1".into(),
            session_id: "session-1".into(),
            tool_name: "terminal".into(),
            call_id: Some("call-1".into()),
            reason: Some("需要执行命令".into()),
        };
        broker.upsert(PendingDshApproval {
            request: request.clone(),
            client_id: "client-old".into(),
            event_id: "approval-1".into(),
        });
        broker.upsert(PendingDshApproval {
            request,
            client_id: "client-new".into(),
            event_id: "approval-1".into(),
        });
        assert_eq!(broker.pending.lock().unwrap().len(), 1);
        assert_eq!(
            broker.pending.lock().unwrap()["approval-1"].client_id,
            "client-new"
        );
        broker.remove("approval-1");
        assert!(broker.pending.lock().unwrap().is_empty());
    }
}
