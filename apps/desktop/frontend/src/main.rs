//! Magic desktop Agent workspace.
//! DSH owns sessions and transcripts; this client only renders the local
//! service's controlled proxy responses.

mod state;
mod transport;

use std::collections::{HashMap, HashSet};

use gloo::timers::callback::{Interval, Timeout};
use js_sys::Date;
use magic_frontend::api::{
    dto::{
        CreateSessionRequestBody, DiscoverModelsRequestBody, FileReferenceItem,
        RenameSessionRequestBody, SaveModelProviderRequestBody, SelectSessionModelRequestBody,
        SendSessionMessageRequestBody, SessionActivityResponse, SessionJobActivity,
        SessionListItem, SessionToolActivity, SessionUsageStats, SetModelProviderPresentationRequestBody,
        SetSessionPresentationRequestBody, SetSessionProjectRequestBody,
        ValidateDirectoryRequestBody,
    },
    error::ApiError,
};
use serde_json::{json, Value};
use wasm_bindgen_futures::spawn_local;
use web_sys::{DragEvent, HtmlInputElement, HtmlSelectElement, HtmlTextAreaElement, KeyboardEvent};
use yew::prelude::*;

use crate::{state::Loadable, transport::make_client};

#[derive(Clone, Copy, PartialEq)]
enum AppView {
    Workspace,
    Automations,
    Plugins,
}

#[derive(Clone, Copy, PartialEq)]
enum WorkspaceTool {
    Execution,
    File,
}

#[derive(Clone, Copy, PartialEq)]
enum ResizingPane {
    Left,
    Right,
}

#[derive(Clone, Copy, PartialEq)]
enum ProjectCreationStep {
    Type,
    Directory,
}

#[derive(Clone, PartialEq)]
struct HoveredSession {
    session_id: String,
    top: i32,
}

#[derive(Clone, Copy, PartialEq)]
enum ConversationMessageKind {
    User,
    Assistant,
    Reasoning,
    Context,
    Tool,
    ToolResult,
    Status,
    Error,
}

#[derive(Clone, PartialEq)]
struct ConversationMessage {
    role: String,
    text: String,
    retryable: bool,
    kind: ConversationMessageKind,
    title: String,
}

#[derive(Clone, PartialEq)]
struct ModelProviderOption {
    id: String,
    name: String,
    models: Vec<String>,
}

#[derive(Clone, PartialEq)]
struct ConfiguredProvider {
    id: String,
    name: String,
    base_url: String,
    api: String,
    models: Vec<String>,
    enabled: bool,
}

#[derive(Clone, Copy)]
struct OfficialProviderPreset {
    id: &'static str,
    name: &'static str,
    base_url: &'static str,
    api: &'static str,
}

const OFFICIAL_PROVIDER_PRESETS: [OfficialProviderPreset; 3] = [
    OfficialProviderPreset {
        id: "zai",
        name: "智谱 AI",
        base_url: "https://open.bigmodel.cn/api/paas/v4",
        api: "openai-completions",
    },
    OfficialProviderPreset {
        id: "deepseek",
        name: "DeepSeek",
        base_url: "https://api.deepseek.com",
        api: "openai-completions",
    },
    OfficialProviderPreset {
        id: "kimi",
        name: "Kimi",
        base_url: "https://api.moonshot.cn/v1",
        api: "openai-completions",
    },
];

fn model_provider_options(configuration: &Value) -> Vec<ModelProviderOption> {
    configuration
        .get("catalog")
        .and_then(|catalog| catalog.get("groups"))
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|group| {
            let id = group.get("id")?.as_str()?.to_owned();
            let name = group
                .get("name")
                .and_then(Value::as_str)
                .unwrap_or(&id)
                .to_owned();
            let models = group
                .get("models")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(|model| {
                    model
                        .get("id")
                        .and_then(Value::as_str)
                        .map(ToOwned::to_owned)
                })
                .collect();
            Some(ModelProviderOption { id, name, models })
        })
        .collect()
}

fn configured_providers(configuration: &Value) -> Vec<ConfiguredProvider> {
    let presentation = configuration
        .get("magic_provider_presentation")
        .and_then(Value::as_object);
    let Some(namespace) = configuration
        .get("settings")
        .and_then(|settings| settings.get("namespaces"))
        .and_then(Value::as_array)
        .and_then(|namespaces| {
            namespaces
                .iter()
                .find(|item| item.get("ns").and_then(Value::as_str) == Some("llm-pi-ai"))
        })
    else {
        return Vec::new();
    };
    namespace
        .get("value")
        .and_then(|value| value.get("providers"))
        .and_then(Value::as_object)
        .into_iter()
        .flatten()
        .filter_map(|(id, provider)| {
            let name = provider
                .get("displayName")
                .and_then(Value::as_str)
                .unwrap_or(id)
                .to_owned();
            let base_url = provider.get("baseURL")?.as_str()?.to_owned();
            let api = provider.get("api")?.as_str()?.to_owned();
            let models = provider
                .get("models")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(|model| {
                    model
                        .get("id")
                        .and_then(Value::as_str)
                        .map(ToOwned::to_owned)
                })
                .collect();
            let enabled = presentation
                .and_then(|entries| entries.get(id))
                .and_then(|entry| entry.get("enabled"))
                .and_then(Value::as_bool)
                .unwrap_or(true);
            Some(ConfiguredProvider {
                id: id.to_owned(),
                name,
                base_url,
                api,
                models,
                enabled,
            })
        })
        .collect()
}

fn selectable_model_provider_options(
    configuration: &Value,
    configured_providers: &[ConfiguredProvider],
) -> Vec<ModelProviderOption> {
    model_provider_options(configuration)
        .into_iter()
        .filter_map(|option| {
            configured_providers
                .iter()
                .find(|provider| provider.id == option.id)
                .filter(|provider| provider.enabled)
                .map(|_| option)
        })
        .collect()
}

fn api_error_message(error: ApiError) -> String {
    match error {
        ApiError::Status(_, message) if message.contains("did not answer with JSON") => {
            "模型地址没有返回 JSON。请检查 Base URL，通常需要填写到 /v1（例如 https://example.com/v1）。".to_owned()
        }
        ApiError::Status(_, message)
            if message.contains("no API key") || message.contains("MISSING_CREDENTIAL") =>
        {
            "没有找到该供应商的 API Key，请重新保存供应商配置。".to_owned()
        }
        ApiError::Status(_, message) if message.contains("DSH") => message,
        ApiError::Status(_, message) => message,
        ApiError::Network(_) | ApiError::Timeout => "无法连接本地服务。".to_owned(),
        ApiError::Decode(_) => "本地服务返回了无法识别的数据。".to_owned(),
    }
}

fn session_is_running(session_id: &str, statuses: &HashMap<String, Value>) -> bool {
    statuses
        .get(session_id)
        .and_then(|status| status.get("type"))
        .and_then(Value::as_str)
        .is_some_and(|kind| matches!(kind, "busy" | "retry" | "stopping"))
}

fn session_updated_at(session: &SessionListItem) -> u64 {
    session.updated_at.unwrap_or_default()
}

fn session_is_standalone(session: &SessionListItem) -> bool {
    session.standalone || session.directory.trim().is_empty() || session.title == "新会话"
}

fn session_meta(session: &SessionListItem) -> String {
    let Some(updated_at) = session.updated_at else {
        return "时间未知".to_owned();
    };

    // DSH timestamps are milliseconds. Accept seconds as well so an older
    // local instance does not render every session as a 1970s record.
    let updated_at = if updated_at < 10_000_000_000 {
        updated_at.saturating_mul(1_000)
    } else {
        updated_at
    };
    let now = Date::now().max(0.0) as u64;
    let elapsed_minutes = now.saturating_sub(updated_at) / 60_000;

    match elapsed_minutes {
        0 => "刚刚".to_owned(),
        1..=59 => format!("{elapsed_minutes} 分钟前"),
        60..=1_439 => format!("{} 小时前", elapsed_minutes / 60),
        1_440..=10_079 => format!("{} 天前", elapsed_minutes / 1_440),
        _ => "较早".to_owned(),
    }
}

fn session_directory_label(directory: &str) -> String {
    let directory = directory.trim_end_matches(['/', '\\']);
    directory
        .rsplit(['/', '\\'])
        .find(|segment| !segment.is_empty())
        .unwrap_or("未关联工作区")
        .to_owned()
}

fn sessions_share_directory(left: &str, right: &str) -> bool {
    left.trim_end_matches(['/', '\\'])
        .eq_ignore_ascii_case(right.trim_end_matches(['/', '\\']))
}

fn conversation_messages(value: Value) -> Vec<ConversationMessage> {
    let mut parsed: Vec<ConversationMessage> = Vec::new();
    for message in value.as_array().into_iter().flatten() {
        if let Some(event) = message.get("event") {
            let event_type = event.get("type").and_then(Value::as_str).unwrap_or_default();
            let data = event.get("data").unwrap_or(&Value::Null);
            let text_from_content = |value: &Value| {
                value
                    .as_array()
                    .into_iter()
                    .flatten()
                    .filter_map(|part| {
                        (part.get("type").and_then(Value::as_str) == Some("text"))
                            .then(|| part.get("text").and_then(Value::as_str))
                            .flatten()
                    })
                    .collect::<Vec<_>>()
                    .join("\n")
            };
            let entry = match event_type {
                "user/message" => {
                    let text = text_from_content(data.get("content").unwrap_or(&Value::Null));
                    let injected = data.get("source").and_then(Value::as_str).is_some_and(|source| source != "user");
                    Some((if injected { "context" } else { "user" }, text, if injected { ConversationMessageKind::Context } else { ConversationMessageKind::User }, if injected { "上下文注入" } else { "你" }, false))
                }
                "assistant/message" => {
                    let text = text_from_content(data.get("message").and_then(|m| m.get("content")).unwrap_or(&Value::Null));
                    Some(("assistant", text, ConversationMessageKind::Assistant, "Magic", false))
                }
                "assistant/chunk" => {
                    let chunk = data.get("chunk").unwrap_or(&Value::Null);
                    match chunk.get("type").and_then(Value::as_str) {
                        Some("reasoning-delta") => {
                            Some(("reasoning", chunk.get("text").and_then(Value::as_str).unwrap_or_default().to_owned(), ConversationMessageKind::Reasoning, "思考", false))
                        }
                        Some("block-end") if chunk.get("block").and_then(|block| block.get("type")).and_then(Value::as_str) == Some("reasoning") => {
                            Some(("reasoning", chunk.get("block").and_then(|block| block.get("text")).and_then(Value::as_str).unwrap_or_default().to_owned(), ConversationMessageKind::Reasoning, "思考", false))
                        }
                        _ => None,
                    }
                }
                "tool/call" => {
                    let name = data.get("name").and_then(Value::as_str).unwrap_or("工具");
                    let args = data.get("arguments").map(|value| safe_event_value(value)).unwrap_or_else(|| "无参数".into());
                    Some(("tool", format!("{name}\n{args}"), ConversationMessageKind::Tool, tool_title(name), false))
                }
                "tool/result" => {
                    let failed = data.get("error").is_some() || data.get("message").and_then(|message| message.get("content")).and_then(Value::as_array).and_then(|content| content.first()).and_then(|part| part.get("isError")).and_then(Value::as_bool).unwrap_or(false);
                    let text = text_from_content(data.get("message").and_then(|m| m.get("content")).unwrap_or(&Value::Null));
                    Some(("tool-result", if text.is_empty() { if failed { "工具返回错误".into() } else { "工具已返回结果".into() } } else { text }, ConversationMessageKind::ToolResult, if failed { "工具失败" } else { "工具结果" }, false))
                }
                "turn/start" => {
                    None
                }
                "step/start" | "step/end" => None,
                "request/context" => None,
                "turn/end" => {
                    let reason = data.get("reason").and_then(|reason| reason.get("kind")).and_then(Value::as_str).unwrap_or("completed");
                    if reason == "error" {
                        let error = data.get("reason").and_then(|reason| reason.get("error")).and_then(|error| error.get("message")).and_then(Value::as_str).unwrap_or("DSH 执行失败。").to_owned();
                        Some(("error", error, ConversationMessageKind::Error, "执行失败", true))
                    } else {
                        None
                    }
                }
                "approval/asked" | "approval/request" => Some(("status", "等待权限确认".into(), ConversationMessageKind::Status, "权限确认", false)),
                event_type if event_type.starts_with("approval/") => None,
                event_type if event_type.starts_with("permission/") => None,
                event_type if event_type.starts_with("agent-preset/") => None,
                event_type if event_type.starts_with("subagent/") => Some(("tool", format!("子代理\n{}", safe_event_value(data)), ConversationMessageKind::Tool, "子代理", false)),
                event_type if event_type.starts_with("job/") || event_type.starts_with("workflow/") => Some(("tool", format!("后台任务\n{}", safe_event_value(data)), ConversationMessageKind::Tool, "后台任务", false)),
                event_type if event_type.starts_with("goal/") || event_type.starts_with("plan/") => Some(("status", format!("{}\n{}", event_type, safe_event_value(data)), ConversationMessageKind::Status, "目标与计划", false)),
                event_type if event_type.starts_with("message-feedback/") => None,
                event_type if event_type.starts_with("terminal/") || event_type.starts_with("shell/") => {
                    Some(("tool", format!("{event_type}\n{}", safe_event_value(data)), ConversationMessageKind::Tool, "终端", false))
                }
                event_type if event_type.starts_with("fs/") || event_type.starts_with("context/") || event_type.starts_with("compaction/") => None,
                _ => None,
            };
            if let Some((role, text, kind, title, retryable)) = entry {
                if !text.trim().is_empty() && !is_internal_dsh_message(&text) {
                    // Consecutive reasoning chunks are one visible thought block.
                    if matches!(kind, ConversationMessageKind::Reasoning) {
                        if let Some(last) = parsed.last_mut() {
                            if matches!(last.kind, ConversationMessageKind::Reasoning) {
                                last.text.push_str(&text);
                                continue;
                            }
                        }
                    }
                    parsed.push(ConversationMessage { role: role.into(), text, retryable, kind, title: title.into() });
                }
            }
            continue;
        }

        let role = message.get("info").and_then(|info| info.get("role")).and_then(Value::as_str).unwrap_or_default();
        let text = message.get("parts").and_then(Value::as_array).into_iter().flatten().filter_map(|part| (part.get("type").and_then(Value::as_str) == Some("text")).then(|| part.get("text").and_then(Value::as_str)).flatten()).collect::<Vec<_>>().join("\n");
        if !text.trim().is_empty() && !is_internal_dsh_message(&text) {
            parsed.push(ConversationMessage { role: role.into(), text, retryable: false, kind: if role == "user" { ConversationMessageKind::User } else { ConversationMessageKind::Assistant }, title: if role == "user" { "你".into() } else { "Magic".into() } });
        }
    }
    let mut deduplicated = Vec::with_capacity(parsed.len());
    for message in parsed {
        if message.role == "error"
            && deduplicated.iter().any(|existing: &ConversationMessage| {
                existing.role == "error" && existing.text == message.text
            })
        {
            continue;
        }
        deduplicated.push(message);
    }
    deduplicated
}

fn safe_event_value(value: &Value) -> String {
    let parsed = if let Some(raw) = value.as_str() {
        serde_json::from_str(raw).unwrap_or_else(|_| value.clone())
    } else {
        value.clone()
    };
    let redacted = redact_event_value(&parsed);
    let text = redacted.as_str().map(ToOwned::to_owned).unwrap_or_else(|| redacted.to_string());
    let trimmed = text.trim();
    if trimmed.chars().count() > 320 {
        format!("{}…", trimmed.chars().take(320).collect::<String>())
    } else {
        trimmed.to_owned()
    }
}

fn redact_event_value(value: &Value) -> Value {
    match value {
        Value::Object(fields) => Value::Object(fields.iter().map(|(key, value)| {
            let lower = key.to_ascii_lowercase();
            let safe = if ["token", "key", "secret", "password", "authorization", "cookie"].iter().any(|needle| lower.contains(needle)) { Value::String("[已隐藏]".into()) } else { redact_event_value(value) };
            (key.clone(), safe)
        }).collect()),
        Value::Array(values) => Value::Array(values.iter().map(redact_event_value).collect()),
        _ => value.clone(),
    }
}

fn session_model_selection(value: &Value) -> Option<(String, String)> {
    value
        .as_array()?
        .iter()
        .rev()
        .filter_map(|record| record.get("event"))
        .find(|event| event.get("type").and_then(Value::as_str) == Some("model/selection"))
        .and_then(|event| {
            let data = event.get("data")?;
            Some((
                data.get("provider")?.as_str()?.to_owned(),
                data.get("model")?.as_str()?.to_owned(),
            ))
        })
}

fn is_internal_dsh_message(text: &str) -> bool {
    let text = text.trim_start();
    text.starts_with("<system-reminder>") || text.starts_with("Current runtime context.")
}

fn dsh_preset_options(value: &Loadable<Value>) -> Vec<(String, String)> {
    let mut options = match value {
        Loadable::Ready(value) => value
            .get("presets")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|preset| {
                let id = preset.get("id").and_then(Value::as_str)?.to_owned();
                let name = preset
                    .get("name")
                    .and_then(Value::as_str)
                    .or_else(|| preset.get("label").and_then(Value::as_str))
                    .unwrap_or(&id)
                    .to_owned();
                Some((id, name))
            })
            .collect::<Vec<_>>(),
        _ => Vec::new(),
    };
    if options.is_empty() {
        options.push(("standard".into(), "Standard".into()));
    }
    options
}

#[function_component(App)]
fn app() -> Html {
    let active_session_id = use_state(|| None::<String>);
    let sessions = use_state(|| Loadable::<Vec<SessionListItem>>::Loading);
    let statuses = use_state(HashMap::<String, Value>::new);
    let messages = use_state(|| Loadable::<Vec<ConversationMessage>>::Empty);
    let activity = use_state(|| Loadable::<SessionActivityResponse>::Empty);
    let dsh_plugins = use_state(|| Loadable::<Value>::Empty);
    let dsh_agent_presets = use_state(|| Loadable::<Value>::Empty);
    let file_references = use_state(|| Loadable::<Vec<FileReferenceItem>>::Empty);
    let file_reference_open = use_state(|| false);
    let hovered_session = use_state(|| None::<HoveredSession>);
    let active_view = use_state(|| AppView::Workspace);
    let left_collapsed = use_state(|| false);
    let left_width = use_state(|| 264_i32);
    let right_workspace_open = use_state(|| false);
    let right_workspace_width = use_state(|| 460_i32);
    let resizing_pane = use_state(|| None::<ResizingPane>);
    let workspace_tool = use_state(|| WorkspaceTool::Execution);
    let search_open = use_state(|| false);
    let search_query = use_state(String::new);
    let draft = use_state(String::new);
    let sending = use_state(|| false);
    let last_failed_input = use_state(|| None::<String>);
    let settings_open = use_state(|| false);
    let selected_model = use_state(|| "选择模型".to_owned());
    let selected_model_provider = use_state(|| None::<String>);
    let model_picker_open = use_state(|| false);
    let agent_preset_open = use_state(|| false);
    let selected_agent_preset = use_state(|| "standard".to_owned());
    let permission_preset_open = use_state(|| false);
    let selected_permission_preset = use_state(|| "workspace-write".to_owned());
    let active_model_provider = use_state(|| None::<String>);
    let model_configuration = use_state(|| Loadable::<Value>::Loading);
    let model_error = use_state(|| None::<String>);
    let provider_form_open = use_state(|| false);
    let editing_provider = use_state(|| None::<String>);
    let provider_name = use_state(String::new);
    let provider_name_editing = use_state(|| false);
    let provider_base_url = use_state(String::new);
    let provider_api_key = use_state(String::new);
    let provider_api_key_visible = use_state(|| false);
    let provider_api_format = use_state(|| "openai-responses".to_owned());
    let provider_model_draft = use_state(String::new);
    let provider_models = use_state(Vec::<String>::new);
    let discovered_models = use_state(Vec::<String>::new);
    let discovered_model_menu_open = use_state(|| false);
    let editing_provider_model = use_state(|| None::<String>);
    let provider_model_edit_draft = use_state(String::new);
    let provider_form_note = use_state(|| None::<String>);
    let provider_toast = use_state(|| None::<String>);
    let deleting_provider = use_state(|| None::<ConfiguredProvider>);
    let provider_editor_selection = use_state(|| None::<String>);
    let session_actions_open = use_state(|| false);
    let sidebar_session_actions = use_state(|| None::<String>);
    let rename_open = use_state(|| false);
    let rename_draft = use_state(String::new);
    let session_action_error = use_state(|| None::<String>);
    let project_expanded = use_state(|| true);
    let collapsed_workspaces = use_state(HashSet::<String>::new);
    let pinned_expanded = use_state(|| true);
    let recent_expanded = use_state(|| true);
    let selected_project_directory = use_state(|| None::<String>);
    let project_directory_dialog_open = use_state(|| false);
    let project_creation_step = use_state(|| ProjectCreationStep::Type);
    let project_directory_draft = use_state(String::new);
    let project_directory_error = use_state(|| None::<String>);

    {
        let sessions = sessions.clone();
        let statuses = statuses.clone();
        let active_session_id = active_session_id.clone();
        let messages = messages.clone();
        use_effect_with((), move |_| {
            spawn_local(async move {
                match make_client().session_list().await {
                    Ok(response) if response.items.is_empty() => {
                        messages.set(Loadable::Loading);
                        match make_client()
                            .create_session(&CreateSessionRequestBody { directory: None })
                            .await
                        {
                            Ok(created) => {
                                active_session_id.set(Some(created.session_id));
                                match make_client().session_list().await {
                                    Ok(response) => sessions.set(Loadable::Ready(response.items)),
                                    Err(error) => {
                                        sessions.set(Loadable::Failed(api_error_message(error)))
                                    }
                                }
                            }
                            Err(error) => messages.set(Loadable::Failed(api_error_message(error))),
                        }
                    }
                    Ok(mut response) => {
                        response
                            .items
                            .sort_by_key(|session| std::cmp::Reverse(session_updated_at(session)));
                        active_session_id.set(
                            response
                                .items
                                .first()
                                .map(|session| session.session_id.clone()),
                        );
                        sessions.set(Loadable::Ready(response.items));
                    }
                    Err(error) => sessions.set(Loadable::Failed(api_error_message(error))),
                }
                if let Ok(response) = make_client().session_statuses().await {
                    statuses.set(response);
                }
            });
            || ()
        });
    }

    {
        let model_configuration = model_configuration.clone();
        use_effect_with((), move |_| {
            spawn_local(async move {
                match make_client().model_configuration().await {
                    Ok(configuration) => model_configuration.set(Loadable::Ready(configuration)),
                    Err(error) => {
                        model_configuration.set(Loadable::Failed(api_error_message(error)))
                    }
                }
            });
            || ()
        });
    }

    {
        let dsh_plugins = dsh_plugins.clone();
        let dsh_agent_presets = dsh_agent_presets.clone();
        use_effect_with((), move |_| {
            spawn_local(async move {
                match make_client().dsh_plugins().await {
                    Ok(value) => dsh_plugins.set(Loadable::Ready(value)),
                    Err(error) => dsh_plugins.set(Loadable::Failed(api_error_message(error))),
                }
                match make_client().dsh_agent_presets().await {
                    Ok(value) => dsh_agent_presets.set(Loadable::Ready(value)),
                    Err(error) => dsh_agent_presets.set(Loadable::Failed(api_error_message(error))),
                }
            });
            || ()
        });
    }

    {
        let messages = messages.clone();
        let activity = activity.clone();
        let selected_model = selected_model.clone();
        let selected_model_provider = selected_model_provider.clone();
        use_effect_with((*active_session_id).clone(), move |session_id| {
            if let Some(session_id) = session_id.clone() {
                messages.set(Loadable::Loading);
                activity.set(Loadable::Loading);
                selected_model.set("选择模型".into());
                selected_model_provider.set(None);
                let activity_session_id = session_id.clone();
                let selected_model = selected_model.clone();
                let selected_model_provider = selected_model_provider.clone();
                spawn_local(async move {
                    match make_client().session_messages(&session_id).await {
                        Ok(response) => {
                            if let Some((provider, model)) = session_model_selection(&response) {
                                selected_model.set(model);
                                selected_model_provider.set(Some(provider));
                            }
                            messages.set(Loadable::Ready(conversation_messages(response)))
                        }
                        Err(error) => messages.set(Loadable::Failed(api_error_message(error))),
                    }
                });
                spawn_local(async move {
                    match make_client().session_activity(&activity_session_id).await {
                        Ok(response) => activity.set(Loadable::Ready(response)),
                        Err(error) => activity.set(Loadable::Failed(api_error_message(error))),
                    }
                });
            } else {
                messages.set(Loadable::Empty);
                activity.set(Loadable::Empty);
                selected_model.set("选择模型".into());
                selected_model_provider.set(None);
            }
            || ()
        });
    }

    let mut session_items = match &*sessions {
        Loadable::Ready(items) => items.clone(),
        Loadable::Loading | Loadable::Failed(_) | Loadable::Empty => Vec::new(),
    };
    session_items.sort_by_key(|session| std::cmp::Reverse(session_updated_at(session)));
    let selected_session = (*active_session_id).as_deref().and_then(|session_id| {
        session_items
            .iter()
            .find(|item| item.session_id == session_id)
    });
    let active_session_running = active_session_id
        .as_deref()
        .is_some_and(|session_id| session_is_running(session_id, &statuses));
    let session_title = selected_session
        .map(|session| session.title.as_str())
        .unwrap_or("新会话");
    let current_project_directory = selected_session
        .filter(|session| !session_is_standalone(session))
        .map(|session| session.directory.as_str())
        .filter(|directory| !directory.trim().is_empty())
        .or_else(|| {
            session_items
                .iter()
                .filter(|session| !session_is_standalone(session))
                .map(|session| session.directory.as_str())
                .find(|directory| !directory.trim().is_empty())
        });
    let pinned_sessions = session_items
        .iter()
        .filter(|session| session.pinned)
        .cloned()
        .collect::<Vec<_>>();
    let unpinned_sessions = session_items
        .iter()
        .filter(|session| !session.pinned)
        .cloned()
        .collect::<Vec<_>>();
    let engineering_sessions = current_project_directory
        .map(|directory| {
            unpinned_sessions
                .iter()
                .filter(|session| {
                    !session_is_standalone(session)
                        && sessions_share_directory(&session.directory, directory)
                })
                .cloned()
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let mut project_groups = Vec::<(String, Vec<SessionListItem>)>::new();
    for session in session_items.iter().filter(|session| {
        !session_is_standalone(session)
            && !session.directory.trim().is_empty()
            && current_project_directory
                .map(|directory| !sessions_share_directory(&session.directory, directory))
                .unwrap_or(true)
    }) {
        if let Some((_, sessions)) = project_groups
            .iter_mut()
            .find(|(directory, _)| sessions_share_directory(directory, &session.directory))
        {
            if !session.pinned {
                sessions.push(session.clone());
            }
        } else {
            project_groups.push((
                session.directory.clone(),
                if session.pinned {
                    Vec::new()
                } else {
                    vec![session.clone()]
                },
            ));
        }
    }
    let recent_sessions = unpinned_sessions
        .iter()
        .filter(|session| session_is_standalone(session))
        .cloned()
        .collect::<Vec<_>>();
    let mut available_project_directories = Vec::<String>::new();
    for session in session_items
        .iter()
        .filter(|session| !session_is_standalone(session) && !session.directory.trim().is_empty())
    {
        if !available_project_directories
            .iter()
            .any(|directory| sessions_share_directory(directory, &session.directory))
        {
            available_project_directories.push(session.directory.clone());
        }
    }
    if let Some(directory) = selected_project_directory.as_ref() {
        if !available_project_directories
            .iter()
            .any(|item| sessions_share_directory(item, directory))
        {
            available_project_directories.push(directory.clone());
        }
    }
    {
        let messages = messages.clone();
        let activity = activity.clone();
        let statuses = statuses.clone();
        let sessions = sessions.clone();
        let last_failed_input = last_failed_input.clone();
        let session_id = (*active_session_id).clone();
        use_effect_with(
            (session_id, active_session_running),
            move |(session_id, running)| {
                let interval = (*running)
                    .then(|| session_id.clone())
                    .flatten()
                    .map(|session_id| {
                        Interval::new(1_200, move || {
                            let session_id = session_id.clone();
                            let messages = messages.clone();
                            let activity = activity.clone();
                            let statuses = statuses.clone();
                            let sessions = sessions.clone();
                            let last_failed_input = last_failed_input.clone();
                            spawn_local(async move {
                                if let Ok(response) =
                                    make_client().session_messages(&session_id).await
                                {
                                    let parsed = conversation_messages(response);
                                    if parsed.iter().any(|message| message.role == "assistant")
                                        && !parsed.iter().any(|message| message.retryable)
                                    {
                                        last_failed_input.set(None);
                                    }
                                    messages.set(Loadable::Ready(parsed));
                                }
                                if let Ok(response) =
                                    make_client().session_activity(&session_id).await
                                {
                                    activity.set(Loadable::Ready(response));
                                }
                                if let Ok(response) = make_client().session_statuses().await {
                                    statuses.set(response);
                                }
                                if let Ok(response) = make_client().session_list().await {
                                    sessions.set(if response.items.is_empty() {
                                        Loadable::Empty
                                    } else {
                                        Loadable::Ready(response.items)
                                    });
                                }
                            });
                        })
                    });
                move || drop(interval)
            },
        );
    }

    let toggle_left = {
        let left_collapsed = left_collapsed.clone();
        Callback::from(move |_| left_collapsed.set(!*left_collapsed))
    };
    let toggle_workspace = {
        let right_workspace_open = right_workspace_open.clone();
        Callback::from(move |_| right_workspace_open.set(!*right_workspace_open))
    };
    let begin_left_resize = {
        let resizing_pane = resizing_pane.clone();
        Callback::from(move |_| resizing_pane.set(Some(ResizingPane::Left)))
    };
    let begin_right_resize = {
        let resizing_pane = resizing_pane.clone();
        Callback::from(move |_| resizing_pane.set(Some(ResizingPane::Right)))
    };
    let resize_panes = {
        let left_collapsed = left_collapsed.clone();
        let left_width = left_width.clone();
        let right_workspace_open = right_workspace_open.clone();
        let right_workspace_width = right_workspace_width.clone();
        let resizing_pane = resizing_pane.clone();
        Callback::from(move |event: MouseEvent| {
            let Some(pane) = *resizing_pane else {
                return;
            };
            match pane {
                ResizingPane::Left => {
                    let width = event.client_x();
                    if width < 160 {
                        left_collapsed.set(true);
                    } else if width < 200 {
                        left_width.set(200);
                        left_collapsed.set(false);
                    } else {
                        left_width.set(width.clamp(200, 420));
                        left_collapsed.set(false);
                    }
                }
                ResizingPane::Right => {
                    let viewport_width = web_sys::window()
                        .and_then(|window| window.inner_width().ok())
                        .and_then(|width| width.as_f64())
                        .unwrap_or(1440.0) as i32;
                    let width = viewport_width - event.client_x();
                    if width < 300 {
                        right_workspace_open.set(false);
                    } else if width < 350 {
                        right_workspace_width.set(350);
                        right_workspace_open.set(true);
                    } else {
                        right_workspace_width.set(width.clamp(350, 680));
                        right_workspace_open.set(true);
                    }
                }
            }
        })
    };
    let finish_resize = {
        let resizing_pane = resizing_pane.clone();
        Callback::from(move |_| resizing_pane.set(None))
    };
    let open_file = {
        let workspace_tool = workspace_tool.clone();
        Callback::from(move |_| workspace_tool.set(WorkspaceTool::File))
    };
    let show_execution = {
        let workspace_tool = workspace_tool.clone();
        Callback::from(move |_| workspace_tool.set(WorkspaceTool::Execution))
    };
    let on_search = {
        let search_query = search_query.clone();
        Callback::from(move |event: InputEvent| {
            let input: HtmlTextAreaElement = event.target_unchecked_into();
            search_query.set(input.value());
        })
    };
    let on_draft = {
        let draft = draft.clone();
        Callback::from(move |event: InputEvent| {
            let input: HtmlTextAreaElement = event.target_unchecked_into();
            draft.set(input.value());
        })
    };
    let open_file_references = {
        let active_session_id = active_session_id.clone();
        let file_references = file_references.clone();
        let file_reference_open = file_reference_open.clone();
        Callback::from(move |event: MouseEvent| {
            event.stop_propagation();
            let Some(session_id) = (*active_session_id).clone() else {
                return;
            };
            file_reference_open.set(true);
            file_references.set(Loadable::Loading);
            let file_references = file_references.clone();
            spawn_local(async move {
                match make_client().file_references(&session_id, "").await {
                    Ok(response) => file_references.set(if response.items.is_empty() {
                        Loadable::Empty
                    } else {
                        Loadable::Ready(response.items)
                    }),
                    Err(error) => file_references.set(Loadable::Failed(api_error_message(error))),
                }
            });
        })
    };
    let start_new_session = {
        let active_session_id = active_session_id.clone();
        let sessions = sessions.clone();
        let messages = messages.clone();
        let draft = draft.clone();
        let selected_project_directory = selected_project_directory.clone();
        Callback::from(move |_: MouseEvent| {
            let active_session_id = active_session_id.clone();
            let sessions = sessions.clone();
            let messages = messages.clone();
            let draft = draft.clone();
            let directory = (*selected_project_directory).clone();
            draft.set(String::new());
            messages.set(Loadable::Loading);
            spawn_local(async move {
                match make_client()
                    .create_session(&CreateSessionRequestBody { directory })
                    .await
                {
                    Ok(response) => {
                        active_session_id.set(Some(response.session_id));
                        if let Ok(response) = make_client().session_list().await {
                            sessions.set(if response.items.is_empty() {
                                Loadable::Empty
                            } else {
                                Loadable::Ready(response.items)
                            });
                        }
                    }
                    Err(error) => messages.set(Loadable::Failed(api_error_message(error))),
                }
            });
        })
    };
    let start_new_session_from_search = {
        let search_open = search_open.clone();
        let start_new_session = start_new_session.clone();
        Callback::from(move |event: MouseEvent| {
            search_open.set(false);
            start_new_session.emit(event);
        })
    };
    let start_session_in_directory = {
        let active_session_id = active_session_id.clone();
        let sessions = sessions.clone();
        let messages = messages.clone();
        let draft = draft.clone();
        let selected_project_directory = selected_project_directory.clone();
        Callback::from(move |directory: String| {
            let active_session_id = active_session_id.clone();
            let sessions = sessions.clone();
            let messages = messages.clone();
            let draft = draft.clone();
            let selected_project_directory = selected_project_directory.clone();
            selected_project_directory.set(Some(directory.clone()));
            draft.set(String::new());
            messages.set(Loadable::Loading);
            spawn_local(async move {
                match make_client()
                    .create_session(&CreateSessionRequestBody {
                        directory: Some(directory),
                    })
                    .await
                {
                    Ok(response) => {
                        active_session_id.set(Some(response.session_id));
                        if let Ok(response) = make_client().session_list().await {
                            sessions.set(if response.items.is_empty() {
                                Loadable::Empty
                            } else {
                                Loadable::Ready(response.items)
                            });
                        }
                    }
                    Err(error) => messages.set(Loadable::Failed(api_error_message(error))),
                }
            });
        })
    };
    let toggle_project_section = {
        let project_expanded = project_expanded.clone();
        Callback::from(move |event: MouseEvent| {
            event.stop_propagation();
            project_expanded.set(!*project_expanded);
        })
    };
    let toggle_workspace_section = {
        let collapsed_workspaces = collapsed_workspaces.clone();
        Callback::from(move |directory: String| {
            let mut collapsed = (*collapsed_workspaces).clone();
            if !collapsed.remove(&directory) {
                collapsed.insert(directory);
            }
            collapsed_workspaces.set(collapsed);
        })
    };
    let open_project_directory_dialog = {
        let project_directory_dialog_open = project_directory_dialog_open.clone();
        let project_directory_draft = project_directory_draft.clone();
        let project_directory_error = project_directory_error.clone();
        let project_creation_step = project_creation_step.clone();
        let selected_project_directory = selected_project_directory.clone();
        Callback::from(move |_| {
            project_creation_step.set(ProjectCreationStep::Type);
            project_directory_draft.set((*selected_project_directory).clone().unwrap_or_default());
            project_directory_error.set(None);
            project_directory_dialog_open.set(true);
        })
    };
    let next_project_creation_step = {
        let project_creation_step = project_creation_step.clone();
        Callback::from(move |_| project_creation_step.set(ProjectCreationStep::Directory))
    };
    let on_project_directory_draft = {
        let project_directory_draft = project_directory_draft.clone();
        Callback::from(move |event: InputEvent| {
            let input: HtmlInputElement = event.target_unchecked_into();
            project_directory_draft.set(input.value());
        })
    };
    let save_project_directory = {
        let project_directory_draft = project_directory_draft.clone();
        let project_directory_error = project_directory_error.clone();
        let project_directory_dialog_open = project_directory_dialog_open.clone();
        let selected_project_directory = selected_project_directory.clone();
        let active_session_id = active_session_id.clone();
        let sessions = sessions.clone();
        let messages = messages.clone();
        let draft = draft.clone();
        Callback::from(move |_| {
            let directory = project_directory_draft.trim().to_owned();
            if directory.is_empty() {
                project_directory_error.set(Some("请输入工作区的绝对目录。".into()));
                return;
            }
            let project_directory_error = project_directory_error.clone();
            let project_directory_dialog_open = project_directory_dialog_open.clone();
            let selected_project_directory = selected_project_directory.clone();
            let active_session_id = active_session_id.clone();
            let sessions = sessions.clone();
            let messages = messages.clone();
            let draft = draft.clone();
            spawn_local(async move {
                match make_client()
                    .validate_directory(&ValidateDirectoryRequestBody { directory })
                    .await
                {
                    Ok(directory) => {
                        let project_directory = directory.directory.clone();
                        selected_project_directory.set(Some(project_directory));
                        project_directory_error.set(None);
                        project_directory_dialog_open.set(false);
                        draft.set(String::new());
                        messages.set(Loadable::Loading);
                        let active_session_id = active_session_id.clone();
                        let sessions = sessions.clone();
                        let messages = messages.clone();
                        spawn_local(async move {
                            match make_client()
                                .create_session(&CreateSessionRequestBody {
                                    directory: Some(directory.directory),
                                })
                                .await
                            {
                                Ok(response) => {
                                    active_session_id.set(Some(response.session_id));
                                    if let Ok(response) = make_client().session_list().await {
                                        sessions.set(if response.items.is_empty() {
                                            Loadable::Empty
                                        } else {
                                            Loadable::Ready(response.items)
                                        });
                                    }
                                }
                                Err(error) => {
                                    messages.set(Loadable::Failed(api_error_message(error)))
                                }
                            }
                        });
                    }
                    Err(error) => project_directory_error.set(Some(api_error_message(error))),
                }
            });
        })
    };
    let dispatch_message = {
        let active_session_id = active_session_id.clone();
        let messages = messages.clone();
        let activity = activity.clone();
        let sessions = sessions.clone();
        let statuses = statuses.clone();
        let sending = sending.clone();
        let last_failed_input = last_failed_input.clone();
        Callback::from(move |input: String| {
            let Some(session_id) = (*active_session_id).clone() else {
                return;
            };
            if input.trim().is_empty() || *sending {
                return;
            }
            last_failed_input.set(Some(input.clone()));
            sending.set(true);
            let mut next_statuses = (*statuses).clone();
            next_statuses.insert(session_id.clone(), json!({ "type": "busy" }));
            statuses.set(next_statuses);
            let messages = messages.clone();
            let activity = activity.clone();
            let sessions = sessions.clone();
            let statuses = statuses.clone();
            let sending = sending.clone();
            let last_failed_input = last_failed_input.clone();
            spawn_local(async move {
                let result = make_client()
                    .send_session_message(
                        &session_id,
                        &SendSessionMessageRequestBody {
                            input: input.clone(),
                        },
                    )
                    .await;
                match result {
                    Ok(_) => {
                        if let Ok(response) = make_client().session_messages(&session_id).await {
                            let parsed = conversation_messages(response);
                            if parsed.iter().any(|message| message.retryable) {
                                last_failed_input.set(Some(input.clone()));
                            } else if parsed.iter().any(|message| message.role == "assistant") {
                                last_failed_input.set(None);
                            }
                            messages.set(Loadable::Ready(parsed));
                        }
                        if let Ok(response) = make_client().session_activity(&session_id).await {
                            activity.set(Loadable::Ready(response));
                        }
                        if let Ok(response) = make_client().session_list().await {
                            sessions.set(if response.items.is_empty() {
                                Loadable::Empty
                            } else {
                                Loadable::Ready(response.items)
                            });
                        }
                        if let Ok(response) = make_client().session_statuses().await {
                            statuses.set(response);
                        }
                    }
                    Err(error) => {
                        last_failed_input.set(Some(input));
                        messages.set(Loadable::Failed(api_error_message(error)));
                    }
                }
                sending.set(false);
            });
        })
    };
    let send_message = {
        let active_session_id = active_session_id.clone();
        let draft = draft.clone();
        let sending = sending.clone();
        let dispatch_message = dispatch_message.clone();
        Callback::from(move |_| {
            if active_session_id.is_none() || *sending {
                return;
            }
            let input = draft.trim().to_owned();
            if input.is_empty() {
                return;
            }
            draft.set(String::new());
            dispatch_message.emit(input);
        })
    };
    let retry_message = {
        let last_failed_input = last_failed_input.clone();
        let dispatch_message = dispatch_message.clone();
        Callback::from(move |_| {
            let Some(input) = (*last_failed_input).clone() else {
                return;
            };
            last_failed_input.set(None);
            dispatch_message.emit(input);
        })
    };
    let cancel_current_session = {
        let active_session_id = active_session_id.clone();
        let statuses = statuses.clone();
        let sending = sending.clone();
        let messages = messages.clone();
        Callback::from(move |_| {
            let Some(session_id) = (*active_session_id).clone() else {
                return;
            };
            let statuses = statuses.clone();
            let sending = sending.clone();
            let messages = messages.clone();
            let session_id_for_refresh = session_id.clone();
            let mut next_statuses = (*statuses).clone();
            next_statuses.insert(session_id.clone(), json!({ "type": "stopping" }));
            statuses.set(next_statuses);
            sending.set(false);
            spawn_local(async move {
                match make_client().cancel_session(&session_id).await {
                    Ok(_) => {
                        if let Ok(response) = make_client().session_statuses().await {
                            statuses.set(response);
                        }
                        if let Ok(response) = make_client()
                            .session_messages(&session_id_for_refresh)
                            .await
                        {
                            messages.set(Loadable::Ready(conversation_messages(response)));
                        }
                    }
                    Err(error) => messages.set(Loadable::Failed(api_error_message(error))),
                }
            });
        })
    };
    let select_session = {
        let active_session_id = active_session_id.clone();
        let last_failed_input = last_failed_input.clone();
        Callback::from(move |session_id: String| {
            last_failed_input.set(None);
            active_session_id.set(Some(session_id));
        })
    };
    let pin_session = {
        let sessions = sessions.clone();
        let hovered_session = hovered_session.clone();
        let session_action_error = session_action_error.clone();
        Callback::from(move |(session_id, pinned): (String, bool)| {
            hovered_session.set(None);
            let sessions = sessions.clone();
            let session_action_error = session_action_error.clone();
            spawn_local(async move {
                match make_client()
                    .set_session_presentation(
                        &session_id,
                        &SetSessionPresentationRequestBody { pinned },
                    )
                    .await
                {
                    Ok(()) => match make_client().session_list().await {
                        Ok(response) if response.items.is_empty() => sessions.set(Loadable::Empty),
                        Ok(response) => sessions.set(Loadable::Ready(response.items)),
                        Err(error) => session_action_error.set(Some(api_error_message(error))),
                    },
                    Err(error) => session_action_error.set(Some(api_error_message(error))),
                }
            });
        })
    };
    let assign_session_project = {
        let sessions = sessions.clone();
        let session_action_error = session_action_error.clone();
        Callback::from(move |(session_id, directory): (String, String)| {
            let sessions = sessions.clone();
            let session_action_error = session_action_error.clone();
            spawn_local(async move {
                match make_client()
                    .set_session_project(&session_id, &SetSessionProjectRequestBody { directory })
                    .await
                {
                    Ok(()) => match make_client().session_list().await {
                        Ok(response) if response.items.is_empty() => sessions.set(Loadable::Empty),
                        Ok(response) => sessions.set(Loadable::Ready(response.items)),
                        Err(error) => session_action_error.set(Some(api_error_message(error))),
                    },
                    Err(error) => session_action_error.set(Some(api_error_message(error))),
                }
            });
        })
    };
    let open_session_actions = {
        let session_actions_open = session_actions_open.clone();
        let sidebar_session_actions = sidebar_session_actions.clone();
        let session_action_error = session_action_error.clone();
        Callback::from(move |event: MouseEvent| {
            event.stop_propagation();
            session_action_error.set(None);
            sidebar_session_actions.set(None);
            session_actions_open.set(!*session_actions_open);
        })
    };
    let toggle_sidebar_session_actions = {
        let active_session_id = active_session_id.clone();
        let active_view = active_view.clone();
        let sidebar_session_actions = sidebar_session_actions.clone();
        let session_actions_open = session_actions_open.clone();
        let session_action_error = session_action_error.clone();
        Callback::from(move |session_id: String| {
            active_view.set(AppView::Workspace);
            active_session_id.set(Some(session_id.clone()));
            session_actions_open.set(false);
            session_action_error.set(None);
            if sidebar_session_actions.as_deref() == Some(session_id.as_str()) {
                sidebar_session_actions.set(None);
            } else {
                sidebar_session_actions.set(Some(session_id));
            }
        })
    };
    let open_rename = {
        let rename_open = rename_open.clone();
        let rename_draft = rename_draft.clone();
        let session_actions_open = session_actions_open.clone();
        let selected_session = selected_session.cloned();
        Callback::from(move |_| {
            let Some(session) = &selected_session else {
                return;
            };
            rename_draft.set(session.title.clone());
            session_actions_open.set(false);
            rename_open.set(true);
        })
    };
    let on_rename_draft = {
        let rename_draft = rename_draft.clone();
        Callback::from(move |event: InputEvent| {
            let input: HtmlInputElement = event.target_unchecked_into();
            rename_draft.set(input.value());
        })
    };
    let submit_rename = {
        let active_session_id = active_session_id.clone();
        let rename_draft = rename_draft.clone();
        let rename_open = rename_open.clone();
        let sessions = sessions.clone();
        let session_action_error = session_action_error.clone();
        Callback::from(move |_| {
            let Some(session_id) = (*active_session_id).clone() else {
                return;
            };
            let title = rename_draft.trim().to_owned();
            if title.is_empty() {
                session_action_error.set(Some("会话名称不能为空。".into()));
                return;
            }
            let sessions = sessions.clone();
            let rename_open = rename_open.clone();
            let session_action_error = session_action_error.clone();
            spawn_local(async move {
                match make_client()
                    .rename_session(&session_id, &RenameSessionRequestBody { title })
                    .await
                {
                    Ok(_) => match make_client().session_list().await {
                        Ok(response) if response.items.is_empty() => sessions.set(Loadable::Empty),
                        Ok(response) => {
                            sessions.set(Loadable::Ready(response.items));
                            rename_open.set(false);
                        }
                        Err(error) => session_action_error.set(Some(api_error_message(error))),
                    },
                    Err(error) => session_action_error.set(Some(api_error_message(error))),
                }
            });
        })
    };
    let fork_current_session = {
        let active_session_id = active_session_id.clone();
        let sessions = sessions.clone();
        let session_actions_open = session_actions_open.clone();
        let session_action_error = session_action_error.clone();
        Callback::from(move |_| {
            let Some(session_id) = (*active_session_id).clone() else {
                return;
            };
            let active_session_id = active_session_id.clone();
            let sessions = sessions.clone();
            let session_actions_open = session_actions_open.clone();
            let session_action_error = session_action_error.clone();
            spawn_local(async move {
                match make_client().fork_session(&session_id).await {
                    Ok(response) => {
                        active_session_id.set(Some(response.session_id));
                        session_actions_open.set(false);
                        if let Ok(response) = make_client().session_list().await {
                            sessions.set(if response.items.is_empty() {
                                Loadable::Empty
                            } else {
                                Loadable::Ready(response.items)
                            });
                        }
                    }
                    Err(error) => session_action_error.set(Some(api_error_message(error))),
                }
            });
        })
    };
    let archive_current_session = {
        let active_session_id = active_session_id.clone();
        let sessions = sessions.clone();
        let messages = messages.clone();
        let activity = activity.clone();
        let session_actions_open = session_actions_open.clone();
        let session_action_error = session_action_error.clone();
        Callback::from(move |_| {
            let Some(session_id) = (*active_session_id).clone() else {
                return;
            };
            let active_session_id = active_session_id.clone();
            let sessions = sessions.clone();
            let messages = messages.clone();
            let activity = activity.clone();
            let session_actions_open = session_actions_open.clone();
            let session_action_error = session_action_error.clone();
            spawn_local(async move {
                match make_client().archive_session(&session_id).await {
                    Ok(()) => {
                        active_session_id.set(None);
                        messages.set(Loadable::Empty);
                        activity.set(Loadable::Empty);
                        session_actions_open.set(false);
                        if let Ok(response) = make_client().session_list().await {
                            sessions.set(if response.items.is_empty() {
                                Loadable::Empty
                            } else {
                                Loadable::Ready(response.items)
                            });
                        }
                    }
                    Err(error) => session_action_error.set(Some(api_error_message(error))),
                }
            });
        })
    };
    let rename_from_sidebar = {
        let sidebar_session_actions = sidebar_session_actions.clone();
        let open_rename = open_rename.clone();
        Callback::from(move |event: MouseEvent| {
            sidebar_session_actions.set(None);
            open_rename.emit(event);
        })
    };
    let fork_from_sidebar = {
        let sidebar_session_actions = sidebar_session_actions.clone();
        let fork_current_session = fork_current_session.clone();
        Callback::from(move |event: MouseEvent| {
            sidebar_session_actions.set(None);
            fork_current_session.emit(event);
        })
    };
    let archive_from_sidebar = {
        let sidebar_session_actions = sidebar_session_actions.clone();
        let archive_current_session = archive_current_session.clone();
        Callback::from(move |event: MouseEvent| {
            sidebar_session_actions.set(None);
            archive_current_session.emit(event);
        })
    };
    let hover_session = {
        let hovered_session = hovered_session.clone();
        Callback::from(move |(session_id, top): (String, i32)| {
            hovered_session.set(Some(HoveredSession { session_id, top }));
        })
    };
    let clear_hover = {
        let hovered_session = hovered_session.clone();
        Callback::from(move |_| hovered_session.set(None))
    };
    let toggle_model_picker = {
        let model_picker_open = model_picker_open.clone();
        let active_model_provider = active_model_provider.clone();
        let agent_preset_open = agent_preset_open.clone();
        let permission_preset_open = permission_preset_open.clone();
        Callback::from(move |event: MouseEvent| {
            event.stop_propagation();
            agent_preset_open.set(false);
            permission_preset_open.set(false);
            if !*model_picker_open {
                active_model_provider.set(None);
            }
            model_picker_open.set(!*model_picker_open);
        })
    };
    let toggle_agent_preset = {
        let agent_preset_open = agent_preset_open.clone();
        let permission_preset_open = permission_preset_open.clone();
        let model_picker_open = model_picker_open.clone();
        Callback::from(move |event: MouseEvent| {
            event.stop_propagation();
            permission_preset_open.set(false);
            model_picker_open.set(false);
            agent_preset_open.set(!*agent_preset_open);
        })
    };
    let toggle_permission_preset = {
        let agent_preset_open = agent_preset_open.clone();
        let permission_preset_open = permission_preset_open.clone();
        let model_picker_open = model_picker_open.clone();
        Callback::from(move |event: MouseEvent| {
            event.stop_propagation();
            agent_preset_open.set(false);
            model_picker_open.set(false);
            permission_preset_open.set(!*permission_preset_open);
        })
    };
    let apply_agent_preset = {
        let active_session_id = active_session_id.clone();
        let selected_agent_preset = selected_agent_preset.clone();
        let agent_preset_open = agent_preset_open.clone();
        let model_error = model_error.clone();
        Callback::from(move |preset_id: String| {
            let Some(session_id) = (*active_session_id).clone() else {
                model_error.set(Some("请先新建或选择一个会话。".into()));
                return;
            };
            let selected_agent_preset = selected_agent_preset.clone();
            let agent_preset_open = agent_preset_open.clone();
            let model_error = model_error.clone();
            spawn_local(async move {
                match make_client().dsh_agent_preset_select(&session_id, &preset_id).await {
                    Ok(_) => {
                        selected_agent_preset.set(preset_id);
                        agent_preset_open.set(false);
                        model_error.set(None);
                    }
                    Err(error) => model_error.set(Some(api_error_message(error))),
                }
            });
        })
    };
    let apply_permission_preset = {
        let active_session_id = active_session_id.clone();
        let selected_permission_preset = selected_permission_preset.clone();
        let permission_preset_open = permission_preset_open.clone();
        let model_error = model_error.clone();
        Callback::from(move |preset_id: String| {
            let Some(session_id) = (*active_session_id).clone() else {
                model_error.set(Some("请先新建或选择一个会话。".into()));
                return;
            };
            let selected_permission_preset = selected_permission_preset.clone();
            let permission_preset_open = permission_preset_open.clone();
            let model_error = model_error.clone();
            spawn_local(async move {
                match make_client().dsh_permission_preset(&session_id, &preset_id).await {
                    Ok(_) => {
                        selected_permission_preset.set(preset_id);
                        permission_preset_open.set(false);
                        model_error.set(None);
                    }
                    Err(error) => model_error.set(Some(api_error_message(error))),
                }
            });
        })
    };
    let on_provider_name = {
        let provider_name = provider_name.clone();
        Callback::from(move |event: InputEvent| {
            let input: HtmlInputElement = event.target_unchecked_into();
            provider_name.set(input.value());
        })
    };
    let on_provider_base_url = {
        let provider_base_url = provider_base_url.clone();
        Callback::from(move |event: InputEvent| {
            let input: HtmlInputElement = event.target_unchecked_into();
            provider_base_url.set(input.value());
        })
    };
    let on_provider_api_key = {
        let provider_api_key = provider_api_key.clone();
        Callback::from(move |event: InputEvent| {
            let input: HtmlInputElement = event.target_unchecked_into();
            provider_api_key.set(input.value());
        })
    };
    let on_provider_api_format = {
        let provider_api_format = provider_api_format.clone();
        Callback::from(move |event: Event| {
            let input: HtmlSelectElement = event.target_unchecked_into();
            provider_api_format.set(input.value());
        })
    };
    let on_provider_model_draft = {
        let provider_model_draft = provider_model_draft.clone();
        Callback::from(move |event: InputEvent| {
            let input: HtmlInputElement = event.target_unchecked_into();
            provider_model_draft.set(input.value());
        })
    };
    let add_provider_model = {
        let provider_model_draft = provider_model_draft.clone();
        let provider_models = provider_models.clone();
        Callback::from(move |_: ()| {
            let model = provider_model_draft.trim().to_owned();
            if model.is_empty() {
                return;
            }
            let mut models = (*provider_models).clone();
            if !models.contains(&model) {
                models.push(model);
                provider_models.set(models);
            }
            provider_model_draft.set(String::new());
        })
    };
    let on_provider_model_keydown = {
        let add_provider_model = add_provider_model.clone();
        Callback::from(move |event: KeyboardEvent| {
            if event.key() == "Enter" {
                event.prevent_default();
                add_provider_model.emit(());
            }
        })
    };
    let save_provider_model_edit = {
        let editing_provider_model = editing_provider_model.clone();
        let provider_model_edit_draft = provider_model_edit_draft.clone();
        let provider_models = provider_models.clone();
        Callback::from(move |_: ()| {
            let Some(current) = (*editing_provider_model).clone() else {
                return;
            };
            let replacement = provider_model_edit_draft.trim().to_owned();
            if replacement.is_empty()
                || (*provider_models)
                    .iter()
                    .any(|model| model != &current && model == &replacement)
            {
                return;
            }
            let mut models = (*provider_models).clone();
            if let Some(model) = models.iter_mut().find(|model| **model == current) {
                *model = replacement;
                provider_models.set(models);
            }
            editing_provider_model.set(None);
            provider_model_edit_draft.set(String::new());
        })
    };
    let save_provider = {
        let provider_form_open = provider_form_open.clone();
        let editing_provider = editing_provider.clone();
        let provider_name = provider_name.clone();
        let provider_name_editing = provider_name_editing.clone();
        let provider_base_url = provider_base_url.clone();
        let provider_api_key = provider_api_key.clone();
        let provider_api_key_visible = provider_api_key_visible.clone();
        let provider_api_format = provider_api_format.clone();
        let provider_models = provider_models.clone();
        let provider_model_draft = provider_model_draft.clone();
        let discovered_models = discovered_models.clone();
        let discovered_model_menu_open = discovered_model_menu_open.clone();
        let editing_provider_model = editing_provider_model.clone();
        let provider_model_edit_draft = provider_model_edit_draft.clone();
        let active_model_provider = active_model_provider.clone();
        let model_configuration = model_configuration.clone();
        let provider_form_note = provider_form_note.clone();
        Callback::from(move |_| {
            let name = provider_name.trim().to_owned();
            if name.is_empty()
                || provider_base_url.trim().is_empty()
                || provider_models.is_empty()
                || (editing_provider.is_none() && provider_api_key.trim().is_empty())
            {
                provider_form_note.set(Some("请填写名称、地址、密钥并至少添加一个模型。".into()));
                return;
            }
            let request = SaveModelProviderRequestBody {
                provider_id: (*editing_provider).clone(),
                display_name: name,
                base_url: provider_base_url.trim().to_owned(),
                api: (*provider_api_format).clone(),
                models: (*provider_models).clone(),
                api_key: (!provider_api_key.trim().is_empty())
                    .then(|| provider_api_key.trim().to_owned()),
            };
            provider_api_key.set(String::new());
            provider_api_key_visible.set(false);
            provider_form_note.set(None);
            let provider_form_open = provider_form_open.clone();
            let provider_name = provider_name.clone();
            let provider_name_editing = provider_name_editing.clone();
            let provider_base_url = provider_base_url.clone();
            let provider_api_format = provider_api_format.clone();
            let provider_models = provider_models.clone();
            let provider_model_draft = provider_model_draft.clone();
            let discovered_models = discovered_models.clone();
            let discovered_model_menu_open = discovered_model_menu_open.clone();
            let editing_provider_model = editing_provider_model.clone();
            let provider_model_edit_draft = provider_model_edit_draft.clone();
            let editing_provider = editing_provider.clone();
            let active_model_provider = active_model_provider.clone();
            let model_configuration = model_configuration.clone();
            let provider_form_note = provider_form_note.clone();
            spawn_local(async move {
                match make_client().save_model_provider(&request).await {
                    Ok(_) => match make_client().model_configuration().await {
                        Ok(configuration) => {
                            model_configuration.set(Loadable::Ready(configuration));
                            provider_name.set(String::new());
                            provider_name_editing.set(false);
                            provider_base_url.set(String::new());
                            provider_api_format.set("openai-responses".into());
                            provider_models.set(Vec::new());
                            provider_model_draft.set(String::new());
                            discovered_models.set(Vec::new());
                            discovered_model_menu_open.set(false);
                            editing_provider_model.set(None);
                            provider_model_edit_draft.set(String::new());
                            editing_provider.set(None);
                            active_model_provider.set(None);
                            provider_form_open.set(false);
                        }
                        Err(error) => provider_form_note.set(Some(api_error_message(error))),
                    },
                    Err(error) => provider_form_note.set(Some(api_error_message(error))),
                }
            });
        })
    };
    let discover_provider_models = {
        let provider_base_url = provider_base_url.clone();
        let provider_api_format = provider_api_format.clone();
        let provider_api_key = provider_api_key.clone();
        let editing_provider = editing_provider.clone();
        let discovered_models = discovered_models.clone();
        let discovered_model_menu_open = discovered_model_menu_open.clone();
        let provider_form_note = provider_form_note.clone();
        let provider_toast = provider_toast.clone();
        Callback::from(move |_| {
            if provider_base_url.trim().is_empty() {
                provider_form_note.set(Some("输入 Base URL 后才能获取模型。".into()));
                return;
            }
            let request = DiscoverModelsRequestBody {
                provider_id: (*editing_provider).clone(),
                base_url: provider_base_url.trim().to_owned(),
                api: (*provider_api_format).clone(),
                api_key: (!provider_api_key.trim().is_empty())
                    .then(|| provider_api_key.trim().to_owned()),
            };
            provider_form_note.set(None);
            let discovered_models = discovered_models.clone();
            let discovered_model_menu_open = discovered_model_menu_open.clone();
            let provider_form_note = provider_form_note.clone();
            let provider_toast = provider_toast.clone();
            spawn_local(async move {
                match make_client().discover_models(&request).await {
                    Ok(response) => {
                        let models: Vec<String> = response
                            .models
                            .iter()
                            .filter_map(|model| {
                                model
                                    .get("id")
                                    .and_then(Value::as_str)
                                    .map(ToOwned::to_owned)
                            })
                            .collect();
                        discovered_models.set(models.clone());
                        discovered_model_menu_open.set(!models.is_empty());
                        provider_form_note
                            .set(Some(format!("已获取 {} 个可选模型。", models.len())));
                        provider_toast.set(Some(format!("获取到 {} 个模型", models.len())));
                        let provider_toast = provider_toast.clone();
                        Timeout::new(3_200, move || provider_toast.set(None)).forget();
                    }
                    Err(error) => provider_form_note.set(Some(api_error_message(error))),
                }
            });
        })
    };
    let test_provider = {
        let provider_base_url = provider_base_url.clone();
        let provider_api_format = provider_api_format.clone();
        let provider_api_key = provider_api_key.clone();
        let editing_provider = editing_provider.clone();
        let discovered_models = discovered_models.clone();
        let provider_form_note = provider_form_note.clone();
        let provider_toast = provider_toast.clone();
        Callback::from(move |model: String| {
            if provider_base_url.trim().is_empty() {
                provider_form_note.set(Some("输入 Base URL 后才能测试模型。".into()));
                return;
            }
            let request = DiscoverModelsRequestBody {
                provider_id: (*editing_provider).clone(),
                base_url: provider_base_url.trim().to_owned(),
                api: (*provider_api_format).clone(),
                api_key: (!provider_api_key.trim().is_empty())
                    .then(|| provider_api_key.trim().to_owned()),
            };
            provider_form_note.set(None);
            let discovered_models = discovered_models.clone();
            let provider_form_note = provider_form_note.clone();
            let provider_toast = provider_toast.clone();
            spawn_local(async move {
                match make_client().discover_models(&request).await {
                    Ok(response) => {
                        let models: Vec<String> = response
                            .models
                            .iter()
                            .filter_map(|entry| {
                                entry
                                    .get("id")
                                    .and_then(Value::as_str)
                                    .map(ToOwned::to_owned)
                            })
                            .collect();
                        let available = models.iter().any(|candidate| candidate == &model);
                        discovered_models.set(models);
                        if available {
                            provider_form_note.set(Some(format!("模型 {model} 连通性验证通过。")));
                            provider_toast.set(Some(format!("模型 {model} 可用")));
                            let provider_toast = provider_toast.clone();
                            Timeout::new(3_200, move || provider_toast.set(None)).forget();
                        } else {
                            provider_form_note
                                .set(Some(format!("模型 {model} 不在供应商返回的可选列表中。")));
                        }
                    }
                    Err(error) => provider_form_note.set(Some(api_error_message(error))),
                }
            });
        })
    };
    let open_new_provider = {
        let provider_form_open = provider_form_open.clone();
        let editing_provider = editing_provider.clone();
        let provider_name = provider_name.clone();
        let provider_name_editing = provider_name_editing.clone();
        let provider_base_url = provider_base_url.clone();
        let provider_api_key = provider_api_key.clone();
        let provider_api_key_visible = provider_api_key_visible.clone();
        let provider_api_format = provider_api_format.clone();
        let provider_models = provider_models.clone();
        let provider_model_draft = provider_model_draft.clone();
        let discovered_models = discovered_models.clone();
        let discovered_model_menu_open = discovered_model_menu_open.clone();
        let editing_provider_model = editing_provider_model.clone();
        let provider_model_edit_draft = provider_model_edit_draft.clone();
        let provider_form_note = provider_form_note.clone();
        let provider_editor_selection = provider_editor_selection.clone();
        Callback::from(move |_| {
            editing_provider.set(None);
            provider_name.set(String::new());
            provider_name_editing.set(false);
            provider_base_url.set(String::new());
            provider_api_key.set(String::new());
            provider_api_key_visible.set(false);
            provider_api_format.set("openai-responses".into());
            provider_models.set(Vec::new());
            provider_model_draft.set(String::new());
            discovered_models.set(Vec::new());
            discovered_model_menu_open.set(false);
            editing_provider_model.set(None);
            provider_model_edit_draft.set(String::new());
            provider_form_note.set(None);
            provider_editor_selection.set(Some("custom:new".into()));
            provider_form_open.set(true);
        })
    };
    let open_official_provider = {
        let provider_form_open = provider_form_open.clone();
        let editing_provider = editing_provider.clone();
        let provider_name = provider_name.clone();
        let provider_name_editing = provider_name_editing.clone();
        let provider_base_url = provider_base_url.clone();
        let provider_api_key = provider_api_key.clone();
        let provider_api_key_visible = provider_api_key_visible.clone();
        let provider_api_format = provider_api_format.clone();
        let provider_models = provider_models.clone();
        let provider_model_draft = provider_model_draft.clone();
        let discovered_models = discovered_models.clone();
        let discovered_model_menu_open = discovered_model_menu_open.clone();
        let editing_provider_model = editing_provider_model.clone();
        let provider_model_edit_draft = provider_model_edit_draft.clone();
        let provider_form_note = provider_form_note.clone();
        let provider_editor_selection = provider_editor_selection.clone();
        let model_configuration = model_configuration.clone();
        Callback::from(move |preset: OfficialProviderPreset| {
            let existing = match &*model_configuration {
                Loadable::Ready(configuration) => configured_providers(configuration)
                    .into_iter()
                    .find(|provider| provider.name == preset.name),
                Loadable::Loading | Loadable::Failed(_) | Loadable::Empty => None,
            };
            editing_provider.set(existing.as_ref().map(|provider| provider.id.clone()));
            provider_name.set(preset.name.into());
            provider_name_editing.set(false);
            provider_base_url.set(
                existing
                    .as_ref()
                    .map(|provider| provider.base_url.clone())
                    .unwrap_or_else(|| preset.base_url.into()),
            );
            provider_api_key.set(String::new());
            provider_api_key_visible.set(false);
            provider_api_format.set(
                existing
                    .as_ref()
                    .map(|provider| provider.api.clone())
                    .unwrap_or_else(|| preset.api.into()),
            );
            provider_models.set(
                existing
                    .as_ref()
                    .map(|provider| provider.models.clone())
                    .unwrap_or_default(),
            );
            provider_model_draft.set(String::new());
            discovered_models.set(Vec::new());
            discovered_model_menu_open.set(false);
            editing_provider_model.set(None);
            provider_model_edit_draft.set(String::new());
            provider_form_note.set(Some("填写 API Key 后获取该官方供应商的可用模型。".into()));
            provider_editor_selection.set(Some(format!("official:{}", preset.id)));
            provider_form_open.set(true);
        })
    };
    let open_configured_provider = {
        let provider_form_open = provider_form_open.clone();
        let editing_provider = editing_provider.clone();
        let provider_name = provider_name.clone();
        let provider_name_editing = provider_name_editing.clone();
        let provider_base_url = provider_base_url.clone();
        let provider_api_key = provider_api_key.clone();
        let provider_api_key_visible = provider_api_key_visible.clone();
        let provider_api_format = provider_api_format.clone();
        let provider_models = provider_models.clone();
        let provider_model_draft = provider_model_draft.clone();
        let discovered_models = discovered_models.clone();
        let discovered_model_menu_open = discovered_model_menu_open.clone();
        let editing_provider_model = editing_provider_model.clone();
        let provider_model_edit_draft = provider_model_edit_draft.clone();
        let provider_form_note = provider_form_note.clone();
        let provider_editor_selection = provider_editor_selection.clone();
        Callback::from(move |provider: ConfiguredProvider| {
            let provider_id = provider.id;
            editing_provider.set(Some(provider_id.clone()));
            provider_name.set(provider.name);
            provider_name_editing.set(false);
            provider_base_url.set(provider.base_url);
            provider_api_key.set(String::new());
            provider_api_key_visible.set(false);
            provider_api_format.set(provider.api);
            provider_models.set(provider.models);
            provider_model_draft.set(String::new());
            discovered_models.set(Vec::new());
            discovered_model_menu_open.set(false);
            editing_provider_model.set(None);
            provider_model_edit_draft.set(String::new());
            provider_form_note.set(None);
            provider_editor_selection.set(Some(format!("custom:{provider_id}")));
            provider_form_open.set(true);
        })
    };
    let confirm_provider_delete = {
        let deleting_provider = deleting_provider.clone();
        let model_configuration = model_configuration.clone();
        let provider_toast = provider_toast.clone();
        Callback::from(move |provider_id: String| {
            let deleting_provider = deleting_provider.clone();
            let model_configuration = model_configuration.clone();
            let provider_toast = provider_toast.clone();
            spawn_local(async move {
                match make_client().delete_model_provider(&provider_id).await {
                    Ok(()) => match make_client().model_configuration().await {
                        Ok(configuration) => {
                            model_configuration.set(Loadable::Ready(configuration));
                            deleting_provider.set(None);
                            provider_toast.set(Some("已移除供应商及其凭据。".into()));
                            let provider_toast = provider_toast.clone();
                            Timeout::new(3_200, move || provider_toast.set(None)).forget();
                        }
                        Err(error) => provider_toast.set(Some(api_error_message(error))),
                    },
                    Err(error) => provider_toast.set(Some(api_error_message(error))),
                }
            });
        })
    };
    let configuration_value = match &*model_configuration {
        Loadable::Ready(value) => value.clone(),
        Loadable::Loading | Loadable::Failed(_) | Loadable::Empty => Value::Null,
    };
    let configured_providers = configured_providers(&configuration_value);
    let model_provider_options =
        selectable_model_provider_options(&configuration_value, &configured_providers);
    let selected_official_provider = provider_editor_selection
        .as_ref()
        .and_then(|selection| selection.strip_prefix("official:"))
        .and_then(|id| {
            OFFICIAL_PROVIDER_PRESETS
                .iter()
                .find(|preset| preset.id == id)
        })
        .copied();
    let provider_editor_is_official = selected_official_provider.is_some();
    let selected_configured_provider = editing_provider.as_ref().and_then(|provider_id| {
        configured_providers
            .iter()
            .find(|provider| provider.id == *provider_id)
    });
    let provider_is_existing_custom =
        selected_configured_provider.is_some() && !provider_editor_is_official;
    let selected_provider_enabled = selected_configured_provider
        .map(|provider| provider.enabled)
        .unwrap_or(true);
    let active_provider_models = active_model_provider
        .as_ref()
        .and_then(|active_provider_id| {
            model_provider_options
                .iter()
                .find(|option| option.id == *active_provider_id)
                .map(|option| option.models.clone())
        });
    let active_provider_index = active_model_provider
        .as_ref()
        .and_then(|active_provider_id| {
            model_provider_options
                .iter()
                .position(|option| option.id == *active_provider_id)
        });
    let active_drawer_style = active_provider_index
        .map(|index| format!("--model-drawer-top: {}px", 7 + index * 34))
        .unwrap_or_default();
    let selected_provider_id = (*selected_model_provider).clone();
    let can_save_provider = !provider_name.trim().is_empty()
        && !provider_base_url.trim().is_empty()
        && !provider_models.is_empty()
        && (editing_provider.is_some() || !provider_api_key.trim().is_empty());
    let provider_form_title = selected_official_provider
        .map(|provider| provider.name)
        .unwrap_or("添加自定义供应商");
    let provider_form_submit = if editing_provider.is_some() {
        "保存更改"
    } else {
        "添加供应商"
    };
    let finish_inline_provider_name_edit = {
        let provider_name = provider_name.clone();
        let provider_name_editing = provider_name_editing.clone();
        Callback::from(move |_| {
            if !provider_name.trim().is_empty() {
                provider_name_editing.set(false);
            }
        })
    };
    let set_current_provider_enabled = {
        let editing_provider = editing_provider.clone();
        let model_configuration = model_configuration.clone();
        let selected_model = selected_model.clone();
        let selected_model_provider = selected_model_provider.clone();
        let provider_toast = provider_toast.clone();
        Callback::from(move |enabled: bool| {
            let Some(provider_id) = (*editing_provider).clone() else {
                return;
            };
            let model_configuration = model_configuration.clone();
            let selected_model = selected_model.clone();
            let selected_model_provider = selected_model_provider.clone();
            let provider_toast = provider_toast.clone();
            spawn_local(async move {
                match make_client()
                    .set_model_provider_enabled(
                        &provider_id,
                        &SetModelProviderPresentationRequestBody { enabled },
                    )
                    .await
                {
                    Ok(()) => match make_client().model_configuration().await {
                        Ok(configuration) => {
                            model_configuration.set(Loadable::Ready(configuration));
                            if !enabled && selected_model_provider.as_deref() == Some(&provider_id)
                            {
                                selected_model_provider.set(None);
                                selected_model.set("选择模型".into());
                            }
                            provider_toast.set(Some(if enabled {
                                "供应商已启用，可在会话中选择模型。".into()
                            } else {
                                "供应商已禁用，已从模型选择中移除。".into()
                            }));
                            let provider_toast = provider_toast.clone();
                            Timeout::new(3_200, move || provider_toast.set(None)).forget();
                        }
                        Err(error) => provider_toast.set(Some(api_error_message(error))),
                    },
                    Err(error) => provider_toast.set(Some(api_error_message(error))),
                }
            });
        })
    };
    let close_transient_surfaces = {
        let model_picker_open = model_picker_open.clone();
        let active_model_provider = active_model_provider.clone();
        let agent_preset_open = agent_preset_open.clone();
        let permission_preset_open = permission_preset_open.clone();
        let file_reference_open = file_reference_open.clone();
        let session_actions_open = session_actions_open.clone();
        let sidebar_session_actions = sidebar_session_actions.clone();
        Callback::from(move |_| {
            model_picker_open.set(false);
            active_model_provider.set(None);
            agent_preset_open.set(false);
            permission_preset_open.set(false);
            file_reference_open.set(false);
            session_actions_open.set(false);
            sidebar_session_actions.set(None);
        })
    };
    let agent_preset_options = dsh_preset_options(&dsh_agent_presets);
    let selected_agent_label = agent_preset_options
        .iter()
        .find(|(id, _)| id == &*selected_agent_preset)
        .map(|(_, name)| name.as_str())
        .unwrap_or("Standard");
    let permission_label = match selected_permission_preset.as_str() {
        "read-only" => "只读",
        "danger-full-access" => "完全访问",
        _ => "工作区可写",
    };
    html! {
        <div class={classes!("magic-shell", resizing_pane.is_some().then_some("is-resizing"))} onmousemove={resize_panes} onmouseup={finish_resize.clone()} onclick={close_transient_surfaces}>
            <header class="desktop-titlebar">
                <button class="titlebar-sidebar-toggle" aria-label="切换左侧栏" title="切换左侧栏" onclick={toggle_left}><span class="panel-toggle-glyph"></span></button>
                <div class="titlebar-drag-region"></div>
                <div class="window-controls" aria-label="窗口控制">
                    <button class="window-control" aria-label="最小化" title="最小化">{"−"}</button>
                    <button class="window-control" aria-label="最大化或还原" title="最大化或还原">{"□"}</button>
                    <button class="window-control window-close" aria-label="关闭" title="关闭">{"×"}</button>
                </div>
            </header>
            <div class="workspace">
                <aside class={classes!("left-rail", (*left_collapsed).then_some("is-collapsed"), (*resizing_pane == Some(ResizingPane::Left)).then_some("is-resizing"))} style={format!("width: {}px", if *left_collapsed { 0 } else { *left_width })}>
                    <div class="rail-header"><div class="brand-lockup"><span>{"Magic"}</span></div><div class="rail-tools"><button class="icon-button" aria-label="搜索" onclick={{ let search_open = search_open.clone(); Callback::from(move |_| search_open.set(true)) }}>{"⌕"}</button><button class="icon-button" aria-label="通知">{"◌"}</button></div></div>
                    <nav class="primary-nav" aria-label="主导航">
                        <button class="nav-row new-task-row" onclick={{ let active_view = active_view.clone(); let start_new_session = start_new_session.clone(); Callback::from(move |event: MouseEvent| { active_view.set(AppView::Workspace); start_new_session.emit(event); }) }}><span class="nav-icon">{"＋"}</span><span class="nav-label">{"新建会话"}</span><span class="shortcut-hint">{"Ctrl+N"}</span></button>
                        <button class="nav-row" onclick={{ let search_open = search_open.clone(); Callback::from(move |_| search_open.set(true)) }}><span class="nav-icon">{"⌕"}</span><span class="nav-label">{"搜索"}</span><span class="shortcut-hint">{"Ctrl+K"}</span></button>
                        <button class={classes!("nav-row", (*active_view == AppView::Automations).then_some("is-active"))} onclick={{ let active_view = active_view.clone(); Callback::from(move |_| active_view.set(AppView::Automations)) }}><span class="nav-icon">{"◴"}</span><span class="nav-label">{"自动化"}</span></button>
                        <button class={classes!("nav-row", (*active_view == AppView::Plugins).then_some("is-active"))} onclick={{ let active_view = active_view.clone(); Callback::from(move |_| active_view.set(AppView::Plugins)) }}><span class="nav-icon">{"▦"}</span><span class="nav-label">{"插件市场"}</span></button>
                    </nav>
                    <div class="rail-session-area">
                        { match &*sessions {
                            Loadable::Loading => html! { <p class="rail-state">{"正在读取会话..."}</p> },
                            Loadable::Empty => html! { <p class="rail-state">{"还没有会话"}</p> },
                            Loadable::Failed(message) => html! { <p class="rail-state rail-state-error">{message}</p> },
                            Loadable::Ready(_) => html! {
                                <>
                                    { if !pinned_sessions.is_empty() { html! {
                                        <section class="rail-session-section" aria-label="置顶会话">
                                            <button class="rail-section-label section-toggle pinned-label" aria-expanded={(*pinned_expanded).to_string()} onclick={{
                                                let pinned_expanded = pinned_expanded.clone();
                                                Callback::from(move |event: MouseEvent| {
                                                    event.stop_propagation();
                                                    pinned_expanded.set(!*pinned_expanded);
                                                })
                                            }}><span>{"置顶"}</span><span class="section-chevron">{if *pinned_expanded {"⌄"} else {"›"}}</span></button>
                                            <div class="task-list" role="list" hidden={!*pinned_expanded}>
                                                { for pinned_sessions.iter().map(|session| html! { <SidebarSessionRow session={session.clone()} active={active_session_id.as_deref() == Some(session.session_id.as_str())} running={session_is_running(&session.session_id, &statuses)} pinned={session.pinned} actions_open={sidebar_session_actions.as_deref() == Some(session.session_id.as_str())} on_select={select_session.clone()} on_pin={pin_session.clone()} on_toggle_actions={toggle_sidebar_session_actions.clone()} on_rename={rename_from_sidebar.clone()} on_fork={fork_from_sidebar.clone()} on_archive={archive_from_sidebar.clone()} on_hover={hover_session.clone()} on_leave={clear_hover.clone()} /> }) }
                                            </div>
                                        </section>
                                    } } else { html! {} } }
                                    <div class="project-area-header">
                                        <button class="project-area-selector" aria-expanded={(*project_expanded).to_string()} title="展开或收起项目" onclick={toggle_project_section.clone()}><span>{"项目"}</span><span class="project-area-chevron">{if *project_expanded {"⌄"} else {"›"}}</span></button>
                                        <div class="project-area-actions"><button class="icon-button" aria-label="项目操作" title="项目操作" onclick={open_project_directory_dialog.clone()}>{"⋯"}</button><button class="icon-button" aria-label="新建会话" title="新建会话" onclick={{
                                            let active_view = active_view.clone();
                                            let selected_project_directory = selected_project_directory.clone();
                                            let start_session_in_directory = start_session_in_directory.clone();
                                            let start_new_session = start_new_session.clone();
                                            let current_directory = current_project_directory.map(ToOwned::to_owned);
                                            Callback::from(move |event: MouseEvent| {
                                                active_view.set(AppView::Workspace);
                                                if let Some(directory) = (*selected_project_directory).clone().or_else(|| current_directory.clone()) {
                                                    start_session_in_directory.emit(directory);
                                                } else {
                                                    start_new_session.emit(event);
                                                }
                                            })
                                        }}>{"＋"}</button></div>
                                    </div>
                                    { if current_project_directory.is_some() { html! {
                                        <section class="rail-session-section" aria-label="当前工作区" hidden={!*project_expanded}>
                                            <div class="project-row project-drop-target" ondragover={Callback::from(|event: DragEvent| event.prevent_default())} ondrop={{
                                                let assign_session_project = assign_session_project.clone();
                                                let directory = current_project_directory.map(ToOwned::to_owned).unwrap_or_default();
                                                Callback::from(move |event: DragEvent| {
                                                    event.prevent_default();
                                                    if let Some(data_transfer) = event.data_transfer() {
                                                        if let Ok(session_id) = data_transfer.get_data("text/plain") {
                                                            if !session_id.trim().is_empty() {
                                                                assign_session_project.emit((session_id, directory.clone()));
                                                            }
                                                        }
                                                    }
                                                })
                                            }} onclick={{
                                                let toggle_workspace = toggle_workspace_section.clone();
                                                let directory = current_project_directory.map(ToOwned::to_owned);
                                                Callback::from(move |_| {
                                                    if let Some(directory) = directory.clone() {
                                                        toggle_workspace.emit(directory);
                                                    }
                                                })
                                            }} role="button" tabindex="0" aria-expanded={current_project_directory.map(|directory| !collapsed_workspaces.contains(directory)).unwrap_or(true).to_string()} aria-label="展开或收起工作区"><span class="folder-icon" aria-hidden="true"></span><span>{current_project_directory.map(session_directory_label).unwrap_or_default()}</span><span class="workspace-chevron">{if current_project_directory.map(|directory| collapsed_workspaces.contains(directory)).unwrap_or(false) {"›"} else {"⌄"}}</span></div>
                                            <div class="task-list session-children" role="list" hidden={current_project_directory.map(|directory| collapsed_workspaces.contains(directory)).unwrap_or(false)}>
                                                { if engineering_sessions.is_empty() { html! { <p class="rail-state workspace-empty">{"暂无聊天会话"}</p> } } else { html! { <> { for engineering_sessions.iter().map(|session| html! { <SidebarSessionRow session={session.clone()} active={active_session_id.as_deref() == Some(session.session_id.as_str())} running={session_is_running(&session.session_id, &statuses)} pinned={session.pinned} actions_open={sidebar_session_actions.as_deref() == Some(session.session_id.as_str())} on_select={select_session.clone()} on_pin={pin_session.clone()} on_toggle_actions={toggle_sidebar_session_actions.clone()} on_rename={rename_from_sidebar.clone()} on_fork={fork_from_sidebar.clone()} on_archive={archive_from_sidebar.clone()} on_hover={hover_session.clone()} on_leave={clear_hover.clone()} /> }) } </> } } }
                                            </div>
                                        </section>
                                    } } else { html! {} } }
                                    { if !project_groups.is_empty() { html! {
                                        <section class="rail-session-section" aria-label="其他工作区" hidden={!*project_expanded}>
                                            { for project_groups.iter().map(|(directory, sessions)| {
                                                let assign_session_project = assign_session_project.clone();
                                                let target_directory = directory.clone();
                                                let drop_directory = target_directory.clone();
                                                let collapsed_workspaces = collapsed_workspaces.clone();
                                                html! {
                                                <div class="project-group">
                                                    <div class="project-row project-drop-target" ondragover={Callback::from(|event: DragEvent| event.prevent_default())} ondrop={Callback::from(move |event: DragEvent| {
                                                        event.prevent_default();
                                                        if let Some(data_transfer) = event.data_transfer() {
                                                            if let Ok(session_id) = data_transfer.get_data("text/plain") {
                                                                if !session_id.trim().is_empty() {
                                                                    assign_session_project.emit((session_id, drop_directory.clone()));
                                                                }
                                                            }
                                                        }
                                                    })} onclick={{
                                                        let toggle_workspace = toggle_workspace_section.clone();
                                                        let target_directory = target_directory.clone();
                                                        Callback::from(move |_| toggle_workspace.emit(target_directory.clone()))
                                                    }} role="button" tabindex="0" aria-expanded={(!collapsed_workspaces.contains(directory)).to_string()} aria-label={format!("展开或收起 {} 工作区", session_directory_label(directory))}><span class="folder-icon" aria-hidden="true"></span><span>{session_directory_label(directory)}</span><span class="workspace-chevron">{if collapsed_workspaces.contains(directory) {"›"} else {"⌄"}}</span></div>
                                                    <div class="task-list session-children" role="list" hidden={collapsed_workspaces.contains(directory)}>
                                                        { if sessions.is_empty() { html! { <p class="rail-state workspace-empty">{"暂无聊天会话"}</p> } } else { html! { <> { for sessions.iter().map(|session| html! { <SidebarSessionRow session={session.clone()} active={active_session_id.as_deref() == Some(session.session_id.as_str())} running={session_is_running(&session.session_id, &statuses)} pinned={session.pinned} actions_open={sidebar_session_actions.as_deref() == Some(session.session_id.as_str())} on_select={select_session.clone()} on_pin={pin_session.clone()} on_toggle_actions={toggle_sidebar_session_actions.clone()} on_rename={rename_from_sidebar.clone()} on_fork={fork_from_sidebar.clone()} on_archive={archive_from_sidebar.clone()} on_hover={hover_session.clone()} on_leave={clear_hover.clone()} /> }) } </> } } }
                                                    </div>
                                                </div>
                                            } }) }
                                        </section>
                                    } } else { html! {} } }
                                    { if !recent_sessions.is_empty() { html! {
                                        <section class="rail-session-section" aria-label="最近会话">
                                            <button class="rail-section-label recent-label section-toggle" aria-expanded={(*recent_expanded).to_string()} onclick={{
                                                let recent_expanded = recent_expanded.clone();
                                                Callback::from(move |event: MouseEvent| {
                                                    event.stop_propagation();
                                                    recent_expanded.set(!*recent_expanded);
                                                })
                                            }}><span>{"最近"}</span><span class="section-chevron">{if *recent_expanded {"⌄"} else {"›"}}</span></button>
                                            <div class="task-list recent-task-list" role="list" hidden={!*recent_expanded}>
                                                { for recent_sessions.iter().map(|session| html! { <SidebarSessionRow session={session.clone()} active={active_session_id.as_deref() == Some(session.session_id.as_str())} running={session_is_running(&session.session_id, &statuses)} pinned={session.pinned} actions_open={sidebar_session_actions.as_deref() == Some(session.session_id.as_str())} on_select={select_session.clone()} on_pin={pin_session.clone()} on_toggle_actions={toggle_sidebar_session_actions.clone()} on_rename={rename_from_sidebar.clone()} on_fork={fork_from_sidebar.clone()} on_archive={archive_from_sidebar.clone()} on_hover={hover_session.clone()} on_leave={clear_hover.clone()} /> }) }
                                            </div>
                                        </section>
                                    } } else { html! {} } }
                                </>
                            },
                        } }
                    </div>
                    <div class="rail-bottom"><div class="profile-row"><span class="profile-avatar">{"M"}</span><span class="nav-label">{"本地用户"}</span><button class="icon-button profile-settings" aria-label="设置" title="设置" onclick={{ let settings_open = settings_open.clone(); Callback::from(move |_| settings_open.set(true)) }}>{"⚙"}</button></div></div>
                </aside>
                { if !*left_collapsed { html! { <div class={classes!("pane-resizer", "left-pane-resizer", (*resizing_pane == Some(ResizingPane::Left)).then_some("is-active"))} role="separator" aria-label="调整左侧栏宽度" onmousedown={begin_left_resize}></div> } } else { html! {} } }
                { if let Some(hovered) = (*hovered_session).clone() { if let Some(session) = session_items.iter().find(|session| session.session_id == hovered.session_id) { html! { <div class="session-hover-card" style={format!("top: {}px", hovered.top)}><div class="session-hover-heading"><strong>{&session.title}</strong><span>{session_meta(session)}</span></div><div class="session-hover-meta"><span class="folder-icon folder-icon-small" aria-hidden="true"></span><span>{&session.directory}</span></div><div class="session-hover-meta"><span>{"▰"}</span><span>{"在你的电脑上运行"}</span></div></div> } } else { html! {} } } else { html! {} } }
                { match *active_view {
                    AppView::Workspace => html! {
                        <div class="conversation-workspace">
                            <main class="center-pane">
                                <div class="session-toolbar"><div class="session-title"><span class="session-icon" aria-hidden="true"></span><strong>{session_title}</strong><div class="session-actions"><button class="toolbar-button" aria-label="更多操作" title="更多操作" disabled={selected_session.is_none()} onclick={open_session_actions}>{"⋯"}</button>{ if *session_actions_open { html! { <div class="session-action-menu" role="menu" onclick={Callback::from(|event: MouseEvent| event.stop_propagation())}><button role="menuitem" onclick={open_rename}>{"重命名"}</button><button role="menuitem" onclick={{ let pin_session = pin_session.clone(); let selected_session = selected_session.cloned(); Callback::from(move |_| { if let Some(session) = &selected_session { pin_session.emit((session.session_id.clone(), !session.pinned)); } }) }}>{if selected_session.is_some_and(|session| session.pinned) { "取消置顶" } else { "置顶" }}</button><button role="menuitem" onclick={fork_current_session}>{"从这里分支"}</button><button class="danger-menu-item" role="menuitem" onclick={archive_current_session}>{"归档"}</button>{ if let Some(error) = &*session_action_error { html! { <p class="session-action-error">{error}</p> } } else { html! {} } }</div> } } else { html! {} } }</div></div><div class="toolbar-actions">{ if !*right_workspace_open { html! { <button class="workspace-toggle" aria-label="打开工具工作区" title="打开工具工作区" onclick={toggle_workspace.clone()}><span class="panel-toggle-glyph"></span></button> } } else { html! {} } }</div></div>
                                <section class="session-content" aria-label="会话">
                                    { match (&*messages, selected_session) {
                                        (Loadable::Loading, _) => html! { <div class="session-state"><p>{"正在读取会话..."}</p></div> },
                                        (Loadable::Failed(message), _) => html! {
                                            <div class="session-state session-state-error"><p>{message}</p>{ if last_failed_input.is_some() { html! { <button class="secondary-button" onclick={retry_message.clone()}>{"重试"}</button> } } else { html! {} } }</div>
                                        },
                                        (Loadable::Empty, None) => html! { <div class="new-session-content"><div class="new-session-intro"><h1>{"现在要处理什么？"}</h1></div></div> },
                                        (Loadable::Empty, Some(_)) => html! { <div class="new-session-content"><div class="new-session-intro"><h1>{"现在要处理什么？"}</h1></div></div> },
                                        (Loadable::Ready(items), Some(_)) if items.is_empty() => html! { <div class="new-session-content"><div class="new-session-intro"><h1>{"现在要处理什么？"}</h1></div></div> },
                                        (Loadable::Ready(items), Some(_)) => html! {
                                            <div class="new-session-content">
                                                { if active_session_running { html! { <div class="session-running-indicator"><span class="task-spinner"></span><span>{"正在处理"}</span></div> } } else { html! {} } }
                                                { for items.iter().enumerate().map(|(index, message)| {
                                                    let live_reasoning = active_session_running
                                                        && matches!(message.kind, ConversationMessageKind::Reasoning)
                                                        && items.iter().skip(index + 1).all(|item| !matches!(item.kind, ConversationMessageKind::Reasoning));
                                                    let live_tool = active_session_running
                                                        && matches!(message.kind, ConversationMessageKind::Tool)
                                                        && items.iter().skip(index + 1).all(|item| !matches!(item.kind, ConversationMessageKind::Tool | ConversationMessageKind::ToolResult));
                                                    conversation_message(message, live_reasoning || live_tool)
                                                }) }
                                                { if let Loadable::Ready(snapshot) = &*activity {
                                                    if let Some(stats) = snapshot.stats.as_ref() {
                                                        session_usage_line(stats)
                                                    } else {
                                                        html! {}
                                                    }
                                                } else {
                                                    html! {}
                                                } }
                                                { if !active_session_running && last_failed_input.is_some() { html! { <div class="message-retry"><span>{"本次执行未完成"}</span><button class="secondary-button" onclick={retry_message.clone()}>{"重试"}</button></div> } } else { html! {} } }
                                            </div>
                                        },
                                        (Loadable::Ready(_), None) => html! { <div class="session-state"><p>{"选择会话或新建会话开始。"}</p></div> },
                                    } }
                                </section>
                                <div class="composer-wrap">
                                    <div class="composer-box">
                                        <textarea value={(*draft).clone()} oninput={on_draft} placeholder={if active_session_id.is_some() { "输入消息" } else { "新建会话后开始输入" }} aria-label="会话输入" disabled={active_session_id.is_none() || *sending} autofocus={active_session_id.is_some()} />
                                        <div class="composer-footer">
                                            <div class="composer-left"><button class="icon-button composer-icon" aria-label="引用工作区文件" title="引用工作区文件" disabled={active_session_id.is_none()} onclick={open_file_references}>{"＋"}</button>
                                                <div class="capability-picker"><button class="capability-button" aria-expanded={(*agent_preset_open).to_string()} onclick={toggle_agent_preset}><span class="capability-dot capability-dot-agent"></span><span>{format!("Agent · {}", selected_agent_label)}</span><span class="capability-chevron">{"⌄"}</span></button>{ if *agent_preset_open { html! { <div class="capability-menu" role="menu" aria-label="Agent 预设" onclick={Callback::from(|event: MouseEvent| event.stop_propagation())}><div class="capability-menu-heading">{"Agent 预设"}</div>{ for agent_preset_options.iter().map(|(id, name)| { let id = id.clone(); let id_for_click = id.clone(); let name = name.clone(); let selected = *selected_agent_preset == id; let apply_agent_preset = apply_agent_preset.clone(); html! { <button class={classes!("capability-option", selected.then_some("is-selected"))} onclick={Callback::from(move |_| apply_agent_preset.emit(id_for_click.clone()))}><span>{name}</span>{ if selected { html! { <span class="capability-check">{"✓"}</span> } } else { html! {} } }</button> } }) }</div> } } else { html! {} } }</div>
                                                <div class="capability-picker"><button class="capability-button permission-button" aria-expanded={(*permission_preset_open).to_string()} onclick={toggle_permission_preset}><span class="capability-dot capability-dot-permission"></span><span>{permission_label}</span><span class="capability-chevron">{"⌄"}</span></button>{ if *permission_preset_open { html! { <div class="capability-menu" role="menu" aria-label="权限预设" onclick={Callback::from(|event: MouseEvent| event.stop_propagation())}><div class="capability-menu-heading">{"权限预设"}</div>{ for [("read-only", "只读"), ("workspace-write", "工作区可写"), ("danger-full-access", "完全访问")].iter().map(|(id, name)| { let id = (*id).to_owned(); let id_for_click = id.clone(); let name = (*name).to_owned(); let selected = *selected_permission_preset == id; let apply_permission_preset = apply_permission_preset.clone(); html! { <button class={classes!("capability-option", selected.then_some("is-selected"))} onclick={Callback::from(move |_| apply_permission_preset.emit(id_for_click.clone()))}><span>{name}</span>{ if selected { html! { <span class="capability-check">{"✓"}</span> } } else { html! {} } }</button> } }) }</div> } } else { html! {} } }</div>
                                            </div>
                                            <div class="composer-right">
                                                <div class="model-picker">
                                                <button class="model-button model-button-active" aria-expanded={(*model_picker_open).to_string()} title="选择模型" onclick={toggle_model_picker}>{&*selected_model}<span class="model-chevron">{"⌄"}</span></button>
                                                { if *model_picker_open { html! {
                                                    <div class="model-picker-panel" role="menu" aria-label="选择模型" onclick={Callback::from(|event: MouseEvent| event.stop_propagation())}>
                                                        <div class="model-provider-list">
                                                            { for model_provider_options.iter().map(|option| {
                                                                let provider_id = option.id.clone();
                                                                let is_selected = selected_provider_id.as_ref() == Some(&option.id);
                                                                let active_model_provider = active_model_provider.clone();
                                                                html! { <button class={classes!("model-provider-row", (active_model_provider.as_deref() == Some(option.id.as_str())).then_some("is-active"))} onmouseenter={Callback::from(move |_| active_model_provider.set(Some(provider_id.clone())))}><span>{&option.name}</span><span class="provider-check">{if is_selected { "✓" } else { "" }}</span><span class="provider-chevron">{"›"}</span></button> }
                                                }) }
                                                { if !active_session_running && last_failed_input.is_some() { html! { <div class="message-retry"><span>{"本次执行未完成"}</span><button class="secondary-button" onclick={retry_message.clone()}> {"重试"}</button></div> } } else { html! {} } }
                                            </div>
                                                        { if let Some(models) = active_provider_models.as_ref() { html! {
                                                            <div class="model-drawer" style={active_drawer_style.clone()}>{ for models.iter().map(|model| {
                                                                let model_name = model.clone();
                                                                let selected_model = selected_model.clone();
                                                                let selected_model_for_click = selected_model.clone();
                                                                let selected_model_provider = selected_model_provider.clone();
                                                                let model_picker_open = model_picker_open.clone();
                                                                let model_error = model_error.clone();
                                                                let active_session_id = active_session_id.clone();
                                                                let provider_id = (*active_model_provider).clone();
                                                                html! { <button class={classes!("model-choice", (*selected_model == *model).then_some("is-selected"))} onclick={Callback::from(move |_| {
                                                                    let Some(session_id) = (*active_session_id).clone() else { model_error.set(Some("请先新建或选择一个会话。".into())); return; };
                                                                    let Some(provider) = provider_id.clone() else { return; };
                                                                    let model_name = model_name.clone();
                                                                    let selected_model = selected_model_for_click.clone();
                                                                    let selected_model_provider = selected_model_provider.clone();
                                                                    let model_picker_open = model_picker_open.clone();
                                                                    let model_error = model_error.clone();
                                                                    let request = SelectSessionModelRequestBody { provider: provider.clone(), model: model_name.clone() };
                                                                    spawn_local(async move {
                                                                        match make_client().select_session_model(&session_id, &request).await {
                                                                            Ok(_) => { selected_model.set(model_name); selected_model_provider.set(Some(provider)); model_error.set(None); model_picker_open.set(false); }
                                                                            Err(error) => model_error.set(Some(api_error_message(error))),
                                                                        }
                                                                    });
                                                                })}><span>{model}</span>{ if *selected_model == *model { html! { <span>{"✓"}</span> } } else { html! {} } }</button> }
                                                            }) }</div>
                                                        } } else { html! {} } }
                                                        <button class="manage-models" onclick={{ let model_picker_open = model_picker_open.clone(); let settings_open = settings_open.clone(); let provider_form_open = provider_form_open.clone(); Callback::from(move |_| { model_picker_open.set(false); provider_form_open.set(false); settings_open.set(true); }) }}>{"管理模型"}</button>
                                                    </div>
                                                } } else { html! {} } }
                                                </div>
                                                { if let Some(error) = (*model_error).clone() { html! { <span class="model-selection-error">{error}</span> } } else { html! {} } }
                                                { if active_session_running { html! { <button class="stop-button" aria-label="停止生成" title="停止生成" onclick={cancel_current_session}>{"■"}</button> } } else { html! { <button class="send-button" aria-label="发送" onclick={send_message} disabled={active_session_id.is_none() || draft.trim().is_empty() || *sending}>{"↑"}</button> } } }
                                            </div>
                                        </div>
                                    </div>
                                    { if *file_reference_open { html! { <div class="file-reference-menu" onclick={Callback::from(|event: MouseEvent| event.stop_propagation())}><div class="file-reference-heading"><span>{"引用工作区文件"}</span><button class="icon-button" aria-label="关闭文件引用" onclick={{ let file_reference_open = file_reference_open.clone(); Callback::from(move |_| file_reference_open.set(false)) }}>{"×"}</button></div>{ match &*file_references { Loadable::Loading => html! { <p>{"正在读取文件..."}</p> }, Loadable::Empty => html! { <p>{"当前工作区没有可引用的文件。"}</p> }, Loadable::Failed(message) => html! { <p class="file-reference-error">{message}</p> }, Loadable::Ready(items) => html! { <div>{ for items.iter().take(20).map(|item| { let draft = draft.clone(); let file_reference_open = file_reference_open.clone(); let path = item.path.clone(); let kind = item.kind.clone(); let mention = file_mention(&path, &kind); html! { <button class="file-reference-item" onclick={Callback::from(move |_| { draft.set(format!("{}{} ", *draft, mention)); file_reference_open.set(false); })}><span class="file-reference-kind">{if kind == "directory" { "▱" } else { "▤" }}</span><span>{path}</span></button> } }) }</div> } } }</div> } } else { html! {} } }
                                </div>
                            </main>
                            { if *right_workspace_open { html! { <>
                                <div class={classes!("pane-resizer", "right-pane-resizer", (*resizing_pane == Some(ResizingPane::Right)).then_some("is-active"))} role="separator" aria-label="调整工具工作区宽度" onmousedown={begin_right_resize}></div>
                                <aside class={classes!("right-workspace", (*resizing_pane == Some(ResizingPane::Right)).then_some("is-resizing"))} style={format!("width: {}px", *right_workspace_width)} aria-label="工具工作区">
                                    <div class="right-workspace-toolbar"><div class="workspace-tabs"><button class={classes!("tool-tab", (*workspace_tool == WorkspaceTool::Execution).then_some("is-active"))} onclick={show_execution.clone()}><span>{"◌"}</span><span>{"执行"}</span></button><button class={classes!("tool-tab", (*workspace_tool == WorkspaceTool::File).then_some("is-active"))} onclick={open_file.clone()}><span>{"▱"}</span><span>{"文件"}</span></button></div><button class="workspace-toggle" aria-label="关闭工具工作区" title="关闭工具工作区" onclick={toggle_workspace.clone()}><span class="panel-toggle-glyph"></span></button></div>
                                    { if *workspace_tool == WorkspaceTool::Execution { match &*activity {
                                        Loadable::Loading => html! { <div class="workspace-state">{"正在读取执行活动..."}</div> },
                                        Loadable::Failed(message) => html! { <div class="workspace-state workspace-state-error">{message}</div> },
                                        Loadable::Empty => html! { <div class="workspace-state">{"选择会话后查看执行活动。"}</div> },
                                        Loadable::Ready(snapshot) => html! { <div class="execution-workspace"><section class="execution-section"><div class="execution-section-heading"><strong>{"工具调用"}</strong><span>{format!("{} 项", snapshot.tools.len())}</span></div>{ if snapshot.tools.is_empty() { html! { <p class="workspace-empty">{"当前会话尚未调用工具。"}</p> } } else { html! { <div class="execution-list">{ for snapshot.tools.iter().map(execution_tool_row) }</div> } } }</section><section class="execution-section"><div class="execution-section-heading"><strong>{"后台任务"}</strong><span>{if snapshot.jobs_available { format!("{} 项", snapshot.jobs.len()) } else { "未接入".into() }}</span></div>{ if !snapshot.jobs_available { html! { <p class="workspace-empty">{"当前 DSH 连接未提供后台任务状态。"}</p> } } else if snapshot.jobs.is_empty() { html! { <p class="workspace-empty">{"当前会话没有后台任务。"}</p> } } else { html! { <div class="execution-list">{ for snapshot.jobs.iter().map(execution_job_row) }</div> } } }</section></div> },
                                    } } else { html! { <div class="file-preview"><div class="file-preview-path">{"当前会话 / 文件"}</div><h2>{"文件"}</h2><p>{"DSH 当前没有提供会话级文件变更清单；接入后这里只展示 DSH 返回的真实变更。"}</p></div> } } }
                                </aside>
                            </>
                            } } else { html! {} } }
                        </div>
                    },
                    AppView::Automations => html! { <main class="standalone-page"><div class="page-toolbar"><span>{"自动化"}</span><button class="primary-button">{"新建自动化"}</button></div><div class="page-content"><p class="eyebrow">{"AUTOMATIONS"}</p><h1>{"自动化"}</h1><p class="page-subtitle">{"在固定时间或外部事件发生时，启动一条新的会话或独立治理工作。"}</p></div></main> },
                    AppView::Plugins => html! { <DshPluginPage plugins={dsh_plugins.clone()} presets={dsh_agent_presets.clone()} /> },
                } }
            </div>
            { if *search_open { html! { <div class="search-backdrop" role="presentation" onclick={{ let search_open = search_open.clone(); Callback::from(move |_| search_open.set(false)) }}><div class="search-dialog" role="dialog" aria-modal="true" aria-label="搜索" onclick={Callback::from(|event: MouseEvent| event.stop_propagation())}><div class="search-input-row"><span>{"⌕"}</span><textarea value={(*search_query).clone()} oninput={on_search} placeholder="搜索会话或运行命令" aria-label="搜索会话或运行命令" autofocus=true /></div><div class="search-section"><p>{"最近会话"}</p>{ for session_items.iter().filter(|session| session.title.to_lowercase().contains(&search_query.to_lowercase())).take(5).map(|session| { let session_id = session.session_id.clone(); let title = session.title.clone(); let active_session_id = active_session_id.clone(); let search_open = search_open.clone(); html! { <button class="search-result" onclick={Callback::from(move |_| { active_session_id.set(Some(session_id.clone())); search_open.set(false); })}><span>{title}</span><span>{"会话"}</span></button> } }) }</div><div class="search-section"><p>{"快捷操作"}</p><button class="search-action" onclick={start_new_session_from_search}><span>{"＋ 新建会话"}</span><kbd>{"Ctrl+N"}</kbd></button><button class="search-action"><span>{"▱ 打开工作区"}</span><kbd>{"Ctrl+O"}</kbd></button><button class="search-action"><span>{"▤ 搜索文件"}</span><kbd>{"Ctrl+P"}</kbd></button></div><div class="search-section settings-section"><p>{"设置"}</p><button class="search-action"><span>{"⚙ 常规"}</span></button><button class="search-action"><span>{"◌ 外观"}</span></button></div></div></div> } } else { html! {} } }
            { if *rename_open { html! {
                <div class="rename-backdrop" role="presentation" onclick={{ let rename_open = rename_open.clone(); Callback::from(move |_| rename_open.set(false)) }}>
                    <section class="rename-dialog" role="dialog" aria-modal="true" aria-label="重命名会话" onclick={Callback::from(|event: MouseEvent| event.stop_propagation())}>
                        <h2>{"重命名会话"}</h2>
                        <input value={(*rename_draft).clone()} oninput={on_rename_draft} aria-label="会话名称" autofocus=true />
                        { if let Some(error) = &*session_action_error { html! { <p class="rename-error">{error}</p> } } else { html! {} } }
                        <footer><button class="secondary-button" onclick={{ let rename_open = rename_open.clone(); Callback::from(move |_| rename_open.set(false)) }}>{"取消"}</button><button class="primary-button" onclick={submit_rename}>{"保存"}</button></footer>
                    </section>
                </div>
            } } else { html! {} } }
            { if *project_directory_dialog_open { html! {
                <div class="rename-backdrop" role="presentation" onclick={{ let project_directory_dialog_open = project_directory_dialog_open.clone(); Callback::from(move |_| project_directory_dialog_open.set(false)) }}>
                    <section class="rename-dialog project-directory-dialog" role="dialog" aria-modal="true" aria-label="添加本地工作区" onclick={Callback::from(|event: MouseEvent| event.stop_propagation())}>
                        { if *project_creation_step == ProjectCreationStep::Type { html! {
                            <><h2>{"添加工作区"}</h2><p>{"工作区类型"}</p>
                            <div class="project-type-grid">
                                <button class="project-type-card is-disabled" disabled=true><span class="project-type-icon">{"◌"}</span><strong>{"云端"}</strong><small>{"无需设置即可管理想法和任务"}</small></button>
                                <button class="project-type-card is-selected" onclick={next_project_creation_step.clone()}><span class="project-type-icon">{"▱"}</span><strong>{"本地"}</strong><small>{"在你的电脑上编辑、运行和测试文件"}</small><span class="project-type-radio">{"●"}</span></button>
                                <button class="project-type-card is-disabled" disabled=true><span class="project-type-icon">{"◎"}</span><strong>{"远程"}</strong><small>{"选择已连接计算机上的文件夹"}</small></button>
                            </div>
                            <footer><button class="secondary-button" onclick={{ let project_directory_dialog_open = project_directory_dialog_open.clone(); Callback::from(move |_| project_directory_dialog_open.set(false)) }}>{"取消"}</button><button class="primary-button" onclick={next_project_creation_step}>{"下一步"}</button></footer></>
                        } } else { html! {
                            <><h2>{"选择本地工作区目录"}</h2><p>{"输入工作区的绝对目录。"}</p>
                            <input value={(*project_directory_draft).clone()} oninput={on_project_directory_draft} placeholder="D:\\Projects\\my-project" aria-label="工作区目录" autofocus=true />
                            { if let Some(error) = &*project_directory_error { html! { <p class="rename-error">{error}</p> } } else { html! {} } }
                            <footer><button class="secondary-button" onclick={{ let project_creation_step = project_creation_step.clone(); Callback::from(move |_| project_creation_step.set(ProjectCreationStep::Type)) }}>{"上一步"}</button><button class="primary-button" onclick={save_project_directory}>{"进入工作区"}</button></footer></>
                        } } }
                    </section>
                </div>
            } } else { html! {} } }
            { if *settings_open { html! {
                <div class="settings-backdrop" role="presentation" onclick={{ let settings_open = settings_open.clone(); Callback::from(move |_| settings_open.set(false)) }}>
                    <section class="settings-dialog" role="dialog" aria-modal="true" aria-label="设置" onclick={Callback::from(|event: MouseEvent| event.stop_propagation())}>
                        <header class="settings-header"><strong>{"设置"}</strong><button class="icon-button" aria-label="关闭设置" title="关闭" onclick={{ let settings_open = settings_open.clone(); Callback::from(move |_| settings_open.set(false)) }}>{"×"}</button></header>
                        <div class="settings-layout">
                            <nav class="settings-nav" aria-label="设置分类"><button>{"通用"}</button><button class="is-active">{"模型与供应商"}</button><button>{"外观"}</button></nav>
                            <main class="settings-main">
                                { if *provider_form_open { html! {
                                    <div class="provider-manager-layout">
                                        <nav class="provider-directory" aria-label="供应商列表">
                                            <p class="provider-directory-label">{"官方供应商"}</p>
                                            { for OFFICIAL_PROVIDER_PRESETS.iter().map(|preset| { let open_official_provider = open_official_provider.clone(); let selected = provider_editor_selection.as_deref() == Some(&format!("official:{}", preset.id)); let connected = configured_providers.iter().any(|provider| provider.name == preset.name); html! { <button class={classes!("provider-directory-item", selected.then_some("is-selected"))} onclick={Callback::from(move |_| open_official_provider.emit(*preset))}><span class="provider-directory-icon">{"◆"}</span><span>{preset.name}</span><i class={classes!("provider-status-dot", connected.then_some("is-connected"))}></i></button> } }) }
                                            <p class="provider-directory-label">{"自定义供应商"}</p>
                                            { for configured_providers.iter().filter(|provider| !OFFICIAL_PROVIDER_PRESETS.iter().any(|preset| preset.name == provider.name)).map(|provider| { let open_configured_provider = open_configured_provider.clone(); let selected = provider_editor_selection.as_deref() == Some(&format!("custom:{}", provider.id)); let provider_value = provider.clone(); html! { <button class={classes!("provider-directory-item", selected.then_some("is-selected"))} onclick={Callback::from(move |_| open_configured_provider.emit(provider_value.clone()))}><span class="provider-directory-icon">{"◇"}</span><span>{&provider.name}</span><i class={classes!("provider-status-dot", provider.enabled.then_some("is-connected"))}></i></button> } }) }
                                            <button class="add-provider-directory-item" onclick={open_new_provider.clone()}><span>{"＋"}</span>{"添加供应商"}</button>
                                        </nav>
                                        <div class="provider-form">
                                        <div class={classes!("provider-form-heading", (!provider_editor_is_official).then_some("custom-provider-heading"))}>
                                            <div class="provider-heading-copy">
                                                { if provider_is_existing_custom { if *provider_name_editing { html! { <div class="inline-provider-name-edit"><input value={(*provider_name).clone()} oninput={on_provider_name.clone()} onkeydown={{ let finish_inline_provider_name_edit = finish_inline_provider_name_edit.clone(); Callback::from(move |event: KeyboardEvent| { if event.key() == "Enter" { event.prevent_default(); finish_inline_provider_name_edit.emit(()); } }) }} aria-label="供应商名称" autofocus=true /><button class="icon-button" aria-label="完成名称编辑" title="完成" onclick={{ let finish_inline_provider_name_edit = finish_inline_provider_name_edit.clone(); Callback::from(move |_| finish_inline_provider_name_edit.emit(())) }}>{"✓"}</button></div> } } else { html! { <div class="provider-name-display"><h1>{(*provider_name).clone()}</h1><button class="icon-button provider-name-edit-button" aria-label="编辑供应商名称" title="编辑名称" onclick={{ let provider_name_editing = provider_name_editing.clone(); Callback::from(move |_| provider_name_editing.set(true)) }}>{"✎"}</button></div> } } } else { html! { <h1>{provider_form_title}</h1> } } }
                                                <p>{if provider_editor_is_official { "官方供应商已预设连接地址与协议，只需填写 API Key。" } else { "配置 API 端点和可在会话中使用的模型。" }}</p>
                                            </div>
                                            <div class="provider-heading-actions">
                                                { if provider_is_existing_custom { html! { <><span class={classes!("provider-enabled-badge", (!selected_provider_enabled).then_some("is-disabled"))}>{if selected_provider_enabled { "已启用" } else { "未启用" }}</span><button class="secondary-button provider-status-action" onclick={{ let set_current_provider_enabled = set_current_provider_enabled.clone(); Callback::from(move |_| set_current_provider_enabled.emit(!selected_provider_enabled)) }}>{if selected_provider_enabled { "禁用" } else { "启用" }}</button></> } } else { html! {} } }
                                                { if editing_provider.is_some() { html! { <button class="icon-button danger-icon-button" aria-label="删除供应商" title="删除供应商" onclick={{ let deleting_provider = deleting_provider.clone(); let configured_providers = configured_providers.clone(); let editing_provider = editing_provider.clone(); Callback::from(move |_| { if let Some(provider_id) = (*editing_provider).clone() { if let Some(provider) = configured_providers.iter().find(|provider| provider.id == provider_id) { deleting_provider.set(Some(provider.clone())); } } }) }}>{"⌫"}</button> } } else { html! {} } }
                                            </div>
                                        </div>
                                        { if provider_editor_is_official { html! {} } else { html! { <>{ if editing_provider.is_none() { html! { <><label class="field-label" for="provider-name">{"名称"}</label><input id="provider-name" value={(*provider_name).clone()} oninput={on_provider_name.clone()} placeholder="如：公司" aria-label="供应商名称" /></> } } else { html! {} } }<label class="field-label" for="provider-base-url">{"Base URL"}</label><input id="provider-base-url" value={(*provider_base_url).clone()} oninput={on_provider_base_url} placeholder="https://api.example.com/v1" aria-label="Base URL" /></> } } }
                                        <label class="field-label" for="provider-api-key">{"API Key"}</label><div class="secret-input-wrap"><input id="provider-api-key" type={if *provider_api_key_visible { "text" } else { "password" }} value={(*provider_api_key).clone()} oninput={on_provider_api_key} placeholder={if editing_provider.is_some() { "留空则保持现有密钥" } else { "输入 API Key" }} aria-label="API Key" /><button class="secret-visibility-button" type="button" aria-label={if *provider_api_key_visible { "隐藏 API Key" } else { "显示 API Key" }} title={if *provider_api_key_visible { "隐藏 API Key" } else { "显示 API Key" }} onclick={{ let provider_api_key_visible = provider_api_key_visible.clone(); Callback::from(move |_| provider_api_key_visible.set(!*provider_api_key_visible)) }}>{if *provider_api_key_visible { "◉" } else { "◌" }}</button></div>
                                        { if provider_editor_is_official { html! {} } else { html! { <><label class="field-label" for="provider-format">{"API 格式"}</label><select id="provider-format" aria-label="API 格式" onchange={on_provider_api_format}><option value="anthropic-messages" selected={*provider_api_format == "anthropic-messages"}>{"Anthropic Messages (/v1/messages)"}</option><option value="openai-completions" selected={*provider_api_format == "openai-completions"}>{"OpenAI Chat Completions (/v1/chat/completions)"}</option><option value="openai-responses" selected={*provider_api_format == "openai-responses"}>{"OpenAI Responses (/v1/responses)"}</option></select></> } } }
                                        <div class="form-model-list"><label class="field-label">{"模型列表"}</label>
                                            <div class="model-entry-control">
                                                <input value={(*provider_model_draft).clone()} oninput={on_provider_model_draft} onkeydown={on_provider_model_keydown} placeholder="输入模型 ID 后按 Enter，或从列表选择" aria-label="模型 ID" />
                                                <button class="model-entry-icon" type="button" aria-label="获取可用模型" title="获取可用模型" onclick={discover_provider_models}>{"⇩"}</button>
                                                <button class="model-entry-icon" type="button" aria-label="展开可用模型" title="选择可用模型" disabled={discovered_models.is_empty()} onclick={{ let discovered_model_menu_open = discovered_model_menu_open.clone(); Callback::from(move |_| discovered_model_menu_open.set(!*discovered_model_menu_open)) }}>{"⌄"}</button>
                                                { if *discovered_model_menu_open { html! { <div class="discovered-model-menu" role="listbox" aria-label="可用模型">{ for discovered_models.iter().map(|model| { let selected_model = model.clone(); let provider_models = provider_models.clone(); let provider_model_draft = provider_model_draft.clone(); let discovered_model_menu_open = discovered_model_menu_open.clone(); html! { <button role="option" onclick={Callback::from(move |_| { let mut models = (*provider_models).clone(); if !models.contains(&selected_model) { models.push(selected_model.clone()); provider_models.set(models); } provider_model_draft.set(String::new()); discovered_model_menu_open.set(false); })}>{model}</button> } }) }</div> } } else { html! {} } }
                                            </div>
                                            { if provider_models.is_empty() { html! {} } else { html! { <div class="configured-models">{ for provider_models.iter().map(|model| { let model_name = model.clone(); let edit_model_name = model.clone(); let remove_model_name = model.clone(); let is_editing = editing_provider_model.as_deref() == Some(model.as_str()); let provider_models = provider_models.clone(); let edit_model = editing_provider_model.clone(); let remove_model = editing_provider_model.clone(); let provider_model_edit_draft = provider_model_edit_draft.clone(); let remove_model_draft = provider_model_edit_draft.clone(); let save_provider_model_edit = save_provider_model_edit.clone(); let test_provider = test_provider.clone(); html! { <div class="configured-model-row">{ if is_editing { html! { <input value={(*provider_model_edit_draft).clone()} aria-label="编辑模型 ID" oninput={{ let provider_model_edit_draft = provider_model_edit_draft.clone(); Callback::from(move |event: InputEvent| { let input: HtmlInputElement = event.target_unchecked_into(); provider_model_edit_draft.set(input.value()); }) }} onkeydown={{ let save_provider_model_edit = save_provider_model_edit.clone(); Callback::from(move |event: KeyboardEvent| { if event.key() == "Enter" { event.prevent_default(); save_provider_model_edit.emit(()); } }) }} autofocus=true /> } } else { html! { <span class="configured-model-name">{model}</span> } } }<div class="model-row-actions"><button aria-label="测试模型" title="测试模型" onclick={{ let model_name = model_name.clone(); Callback::from(move |_| test_provider.emit(model_name.clone())) }}>{"⌁"}</button><button aria-label={if is_editing { "保存模型" } else { "编辑模型" }} title={if is_editing { "保存模型" } else { "编辑模型" }} onclick={if is_editing { Callback::from(move |_| save_provider_model_edit.emit(())) } else { Callback::from(move |_| { edit_model.set(Some(edit_model_name.clone())); provider_model_edit_draft.set(edit_model_name.clone()); }) }}>{if is_editing { "✓" } else { "✎" }}</button><button aria-label="删除模型" title="删除模型" onclick={Callback::from(move |_| { let mut models = (*provider_models).clone(); models.retain(|item| item != &remove_model_name); provider_models.set(models); remove_model.set(None); remove_model_draft.set(String::new()); })}>{"⌫"}</button></div></div> } }) }</div> } } }
                                        </div>
                                        <div class="provider-form-footer"><p>{(*provider_form_note).clone().unwrap_or_else(|| "至少添加一个模型后才能保存。".into())}</p><div><button class="primary-button" disabled={!can_save_provider} onclick={save_provider}>{provider_form_submit}</button></div></div>
                                        </div>
                                    </div>
                                } } else { html! {
                                    <div class="provider-manager-layout">
                                        <nav class="provider-directory" aria-label="供应商列表">
                                            <p class="provider-directory-label">{"官方供应商"}</p>
                                            { for OFFICIAL_PROVIDER_PRESETS.iter().map(|preset| { let open_official_provider = open_official_provider.clone(); let connected = configured_providers.iter().any(|provider| provider.name == preset.name); html! { <button class="provider-directory-item" onclick={Callback::from(move |_| open_official_provider.emit(*preset))}><span class="provider-directory-icon">{"◆"}</span><span>{preset.name}</span><i class={classes!("provider-status-dot", connected.then_some("is-connected"))}></i></button> } }) }
                                            <p class="provider-directory-label">{"自定义供应商"}</p>
                                            { for configured_providers.iter().filter(|provider| !OFFICIAL_PROVIDER_PRESETS.iter().any(|preset| preset.name == provider.name)).map(|provider| { let open_configured_provider = open_configured_provider.clone(); let provider_value = provider.clone(); html! { <button class="provider-directory-item" onclick={Callback::from(move |_| open_configured_provider.emit(provider_value.clone()))}><span class="provider-directory-icon">{"◇"}</span><span>{&provider.name}</span><i class={classes!("provider-status-dot", provider.enabled.then_some("is-connected"))}></i></button> } }) }
                                            <button class="add-provider-directory-item" onclick={open_new_provider.clone()}><span>{"＋"}</span>{"添加供应商"}</button>
                                        </nav>
                                        <section class="provider-empty-state"><span>{"◆"}</span><h2>{"选择供应商"}</h2><p>{"选择官方供应商快速接入，或在左侧管理已经配置的供应商。"}</p></section>
                                    </div>
                                } } }
                            </main>
                        </div>
                    </section>
                </div>
            } } else { html! {} } }
            { if let Some(provider) = (*deleting_provider).clone() { html! {
                <div class="rename-backdrop" role="presentation" onclick={{ let deleting_provider = deleting_provider.clone(); Callback::from(move |_| deleting_provider.set(None)) }}>
                    <section class="rename-dialog provider-delete-dialog" role="dialog" aria-modal="true" aria-label="删除供应商" onclick={Callback::from(|event: MouseEvent| event.stop_propagation())}>
                        <h2>{format!("删除 {}？", provider.name)}</h2>
                        <p>{"这会移除该供应商的全部模型配置和 API Key，已在会话中的历史记录不受影响。"}</p>
                        <footer><button class="secondary-button" onclick={{ let deleting_provider = deleting_provider.clone(); Callback::from(move |_| deleting_provider.set(None)) }}>{"取消"}</button><button class="primary-button danger-button" onclick={{ let confirm_provider_delete = confirm_provider_delete.clone(); let provider_id = provider.id.clone(); Callback::from(move |_| confirm_provider_delete.emit(provider_id.clone())) }}>{"删除供应商"}</button></footer>
                    </section>
                </div>
            } } else { html! {} } }
            { if let Some(message) = (*provider_toast).clone() { html! {
                <div class="model-toast" role="status"><span>{"✓"}</span><p>{message}</p></div>
            } } else { html! {} } }
        </div>
    }
}

fn first_nonempty_line(text: &str) -> String {
    text.lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .unwrap_or_default()
        .to_owned()
}

fn latest_nonempty_line(text: &str) -> String {
    text.lines()
        .rev()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .unwrap_or_default()
        .to_owned()
}

fn compact_line(text: &str, limit: usize) -> String {
    let line = text.trim();
    if line.chars().count() <= limit {
        line.to_owned()
    } else {
        format!("{}…", line.chars().take(limit.saturating_sub(1)).collect::<String>())
    }
}

fn tool_title(name: &str) -> &'static str {
    let normalized = name.to_ascii_lowercase();
    if normalized.contains("bash") || normalized.contains("shell") || normalized.contains("terminal") {
        "终端"
    } else if normalized == "read" || normalized.contains("read_file") || normalized.contains("file_read") {
        "读取文件"
    } else if normalized.contains("search") || normalized.contains("grep") || normalized.contains("glob") {
        "搜索"
    } else if normalized.contains("write") || normalized.contains("create_file") {
        "写入文件"
    } else if normalized.contains("edit") || normalized.contains("patch") {
        "修改文件"
    } else if normalized.contains("web") || normalized.contains("browser") {
        "网页"
    } else if normalized.contains("ask") || normalized.contains("question") {
        "等待你的回答"
    } else {
        "调用工具"
    }
}

fn conversation_message(message: &ConversationMessage, streaming: bool) -> Html {
    match message.kind {
        ConversationMessageKind::User => html! {
            <article class="transcript-row transcript-user">
                <div class="transcript-content">
                    <div class="transcript-meta"><span class="transcript-role">{"你"}</span><span class="transcript-meta-label">{"用户消息"}</span></div>
                    <div class="user-message-content"><p>{&message.text}</p></div>
                </div>
            </article>
        },
        ConversationMessageKind::Assistant => html! {
            <article class="transcript-row transcript-agent">
                <div class="transcript-mark agent-avatar" aria-hidden="true">{"M"}</div>
                <div class="transcript-content">
                    <div class="transcript-meta"><span class="transcript-role">{&message.title}</span><span class="transcript-meta-label">{"Agent"}</span></div>
                    <div class="assistant-copy"><p>{&message.text}</p></div>
                </div>
            </article>
        },
        ConversationMessageKind::Error => html! {
            <article class="transcript-row transcript-agent transcript-error">
                <div class="transcript-mark" aria-hidden="true">{"!"}</div>
                <div class="transcript-content">
                    <div class="transcript-meta"><span class="transcript-role">{&message.title}</span><span class="transcript-meta-label">{"需要处理"}</span></div>
                    <div class="assistant-copy"><p>{&message.text}</p></div>
                </div>
            </article>
        },
        ConversationMessageKind::Reasoning => {
            let summary = if streaming {
                compact_line(&latest_nonempty_line(&message.text), 96)
            } else {
                compact_line(&first_nonempty_line(&message.text), 96)
            };
            html! {
                <details class={classes!("transcript-event", "transcript-event-reasoning", streaming.then_some("is-running"))}>
                    <summary><span class="transcript-event-marker" aria-hidden="true">{"✦"}</span><span class="transcript-event-title">{if streaming { "思考中" } else { "已思考" }}</span><span class="transcript-event-summary" data-follow-end={streaming.to_string()}>{summary}</span>{ if streaming { html! { <span class="transcript-event-live" aria-label="正在更新"></span> } } else { html! {} } }<span class="transcript-event-chevron" aria-hidden="true">{"⌄"}</span></summary>
                    <div class="transcript-event-body"><p>{&message.text}</p></div>
                </details>
            }
        },
        ConversationMessageKind::Context => html! {
            <details class="transcript-event transcript-event-context">
                <summary><span class="transcript-event-marker" aria-hidden="true">{"↳"}</span><span class="transcript-event-title">{&message.title}</span><span class="transcript-event-summary">{"已加入本轮上下文"}</span><span class="transcript-event-chevron" aria-hidden="true">{"⌄"}</span></summary>
                <div class="transcript-event-body"><p>{&message.text}</p></div>
            </details>
        },
        ConversationMessageKind::Tool => html! {
            <details class={classes!("transcript-event", "transcript-event-tool", streaming.then_some("is-running"))}>
                <summary><span class="transcript-event-marker" aria-hidden="true">{if streaming { "◌" } else { "⌘" }}</span><span class="transcript-event-title">{&message.title}</span><span class="transcript-event-summary">{if streaming { "正在调用" } else { "查看调用详情" }}</span>{ if streaming { html! { <span class="transcript-event-live" aria-label="正在运行"></span> } } else { html! {} } }<span class="transcript-event-chevron" aria-hidden="true">{"⌄"}</span></summary>
                <div class="transcript-event-body"><pre>{&message.text}</pre></div>
            </details>
        },
        ConversationMessageKind::ToolResult => html! {
            <details class="transcript-event transcript-event-result">
                <summary><span class="transcript-event-marker" aria-hidden="true">{"✓"}</span><span class="transcript-event-title">{&message.title}</span><span class="transcript-event-summary">{"已返回结果"}</span><span class="transcript-event-chevron" aria-hidden="true">{"⌄"}</span></summary>
                <div class="transcript-event-body"><p>{&message.text}</p></div>
            </details>
        },
        ConversationMessageKind::Status => html! {
            <details class="transcript-event transcript-event-status">
                <summary><span class="transcript-event-marker" aria-hidden="true">{"•"}</span><span class="transcript-event-title">{&message.title}</span><span class="transcript-event-summary">{"状态更新"}</span><span class="transcript-event-chevron" aria-hidden="true">{"⌄"}</span></summary>
                <div class="transcript-event-body"><p>{&message.text}</p></div>
            </details>
        },
    }
}

fn file_mention(path: &str, kind: &str) -> String {
    let path = if kind == "directory" {
        format!("{path}/")
    } else {
        path.to_owned()
    };
    if path.contains(char::is_whitespace) {
        format!("@\"{path}\"")
    } else {
        format!("@{path}")
    }
}

fn execution_tool_row(tool: &SessionToolActivity) -> Html {
    let status_class = match tool.status.as_str() {
        "running" => "is-running",
        "failed" => "is-failed",
        _ => "is-completed",
    };
    let status = match tool.status.as_str() {
        "running" => "运行中",
        "failed" => "失败",
        _ => "已完成",
    };
    html! {
        <article class="execution-row">
            <div class="execution-row-heading"><span class={classes!("execution-status", status_class)}></span><strong>{&tool.name}</strong><span class="execution-row-state">{status}</span></div>
            <p class="execution-arguments">{&tool.arguments_summary}</p>
            { if let Some(summary) = &tool.result_summary { html! { <p class="execution-result">{summary}</p> } } else { html! {} } }
        </article>
    }
}

fn execution_job_row(job: &SessionJobActivity) -> Html {
    let status_class = match job.status.as_str() {
        "running" | "stopping" => "is-running",
        "failed" | "killed" => "is-failed",
        _ => "is-completed",
    };
    let status = match job.status.as_str() {
        "running" => "运行中",
        "stopping" => "正在停止",
        "failed" => "失败",
        "killed" => "已停止",
        _ => "已完成",
    };
    html! {
        <article class="execution-row">
            <div class="execution-row-heading"><span class={classes!("execution-status", status_class)}></span><strong>{&job.label}</strong><span class="execution-row-state">{status}</span></div>
            <p class="execution-job-kind">{&job.kind}</p>
            { if let Some(detail) = &job.detail { html! { <p class="execution-result">{detail}</p> } } else { html! {} } }
        </article>
    }
}

fn format_token_count(value: u64) -> String {
    match value {
        1_000_000.. => format!("{:.1}M", value as f64 / 1_000_000.0),
        1_000.. => format!("{:.1}K", value as f64 / 1_000.0),
        _ => value.to_string(),
    }
}

fn session_usage_line(stats: &SessionUsageStats) -> Html {
    html! {
        <div class="session-usage-line" aria-label="会话用量统计">
            <span>{format!("{} 回合", stats.turns)}</span>
            <span>{format!("{} 步骤", stats.steps)}</span>
            <span>{format!("输入 {} · 输出 {} tok", format_token_count(stats.input_tokens), format_token_count(stats.output_tokens))}</span>
            { if stats.cache_read_tokens > 0 { html! { <span>{format!("缓存命中 {} tok", format_token_count(stats.cache_read_tokens))}</span> } } else { html! {} } }
            { if stats.reasoning_tokens > 0 { html! { <span>{format!("推理 {} tok", format_token_count(stats.reasoning_tokens))}</span> } } else { html! {} } }
        </div>
    }
}

#[derive(Properties, PartialEq)]
struct SidebarSessionRowProps {
    session: SessionListItem,
    active: bool,
    running: bool,
    pinned: bool,
    actions_open: bool,
    on_select: Callback<String>,
    on_pin: Callback<(String, bool)>,
    on_toggle_actions: Callback<String>,
    on_rename: Callback<MouseEvent>,
    on_fork: Callback<MouseEvent>,
    on_archive: Callback<MouseEvent>,
    on_hover: Callback<(String, i32)>,
    on_leave: Callback<()>,
    #[prop_or_default]
    on_drag_start: Option<Callback<String>>,
}

#[function_component(SidebarSessionRow)]
fn sidebar_session_row(props: &SidebarSessionRowProps) -> Html {
    let session_id = props.session.session_id.clone();
    let on_hover = {
        let session_id = session_id.clone();
        let on_hover = props.on_hover.clone();
        Callback::from(move |event: MouseEvent| {
            on_hover.emit((session_id.clone(), (event.client_y() - 36).clamp(70, 540)));
        })
    };
    let on_leave = {
        let on_leave = props.on_leave.clone();
        Callback::from(move |_| on_leave.emit(()))
    };
    let on_select = {
        let session_id = session_id.clone();
        let on_select = props.on_select.clone();
        Callback::from(move |_| on_select.emit(session_id.clone()))
    };
    let on_pin = {
        let session_id = session_id.clone();
        let on_pin = props.on_pin.clone();
        let pinned = props.pinned;
        Callback::from(move |event: MouseEvent| {
            event.stop_propagation();
            on_pin.emit((session_id.clone(), !pinned));
        })
    };
    let on_more = {
        let session_id = session_id.clone();
        let on_select = props.on_select.clone();
        let on_toggle_actions = props.on_toggle_actions.clone();
        Callback::from(move |event: MouseEvent| {
            event.stop_propagation();
            on_select.emit(session_id.clone());
            on_toggle_actions.emit(session_id.clone());
        })
    };
    let meta = session_meta(&props.session);
    let on_drag_start = {
        let session_id = session_id.clone();
        let on_drag_start = props.on_drag_start.clone();
        Callback::from(move |event: DragEvent| {
            if let Some(data_transfer) = event.data_transfer() {
                let _ = data_transfer.set_data("text/plain", &session_id);
            }
            if let Some(on_drag_start) = &on_drag_start {
                on_drag_start.emit(session_id.clone());
            }
        })
    };

    html! {
        <div class={classes!("session-row", props.active.then_some("is-selected"))} role="listitem" onmouseenter={on_hover} onmouseleave={on_leave}>
            <button class="task-row" draggable="true" ondragstart={on_drag_start} onclick={on_select}>
                { if props.running { html! { <span class="task-activity task-spinner" aria-label="运行中"></span> } } else { html! { <span class="task-activity" aria-hidden="true"></span> } } }
                <span class="task-title">{&props.session.title}</span>
                <span class="task-time">{meta}</span>
            </button>
            <div class="quick-session-actions">
                <button class="quick-pin" aria-label={if props.pinned { "取消置顶" } else { "快速置顶" }} title={if props.pinned { "取消置顶" } else { "快速置顶" }} onclick={on_pin.clone()}><span class="pin-glyph"></span></button>
                <button class="quick-more" aria-label="会话操作" title="会话操作" onclick={on_more}>{"⋯"}</button>
            </div>
            { if props.actions_open { html! {
                <div class="sidebar-session-action-menu" role="menu" onclick={Callback::from(|event: MouseEvent| event.stop_propagation())}>
                    <button role="menuitem" onclick={props.on_rename.clone()}>{"重命名"}</button>
                    <button role="menuitem" onclick={on_pin.clone()}>{if props.pinned { "取消置顶" } else { "置顶" }}</button>
                    <button role="menuitem" onclick={props.on_fork.clone()}>{"从这里分支"}</button>
                    <button class="danger-menu-item" role="menuitem" onclick={props.on_archive.clone()}>{"归档"}</button>
                </div>
            } } else { html! {} } }
        </div>
    }
}

#[derive(Properties, PartialEq)]
struct DshPluginPageProps {
    plugins: UseStateHandle<Loadable<Value>>,
    presets: UseStateHandle<Loadable<Value>>,
}

fn plugin_short_name(module: &str) -> String {
    let unscoped = module.split_once('/').map(|(_, rest)| rest).unwrap_or(module);
    unscoped
        .trim_start_matches("cordis:")
        .trim_start_matches("cordis-plugin-")
        .trim_start_matches("dsh-client-")
        .trim_start_matches("dsh-host-")
        .trim_start_matches("dsh-")
        .to_owned()
}

fn plugin_matches(module: &str, entry_id: Option<&str>, query: &str) -> bool {
    query.is_empty()
        || module.to_ascii_lowercase().contains(query)
        || entry_id.unwrap_or_default().to_ascii_lowercase().contains(query)
}

#[function_component(DshPluginPage)]
fn dsh_plugin_page(props: &DshPluginPageProps) -> Html {
    let query = use_state(String::new);
    let expanded = use_state(|| None::<String>);
    let selected_preset = use_state(|| None::<String>);
    let preset_menu_open = use_state(|| false);
    let preset_group_open = use_state(|| true);
    let global_group_open = use_state(|| false);
    let normalized_query = query.trim().to_ascii_lowercase();
    let plugin_value = &*props.plugins;
    let preset_value = &*props.presets;
    let plugin_rows = match plugin_value {
        Loadable::Ready(value) => value.get("entries").and_then(Value::as_array).cloned().unwrap_or_default(),
        _ => Vec::new(),
    };
    let listed_presets = match preset_value {
        Loadable::Ready(value) => value.get("presets").and_then(Value::as_array).cloned().unwrap_or_default(),
        _ => Vec::new(),
    };
    let inventory_presets = match plugin_value {
        Loadable::Ready(value) => value.get("agentPresets").and_then(Value::as_array).cloned().unwrap_or_default(),
        _ => Vec::new(),
    };
    let preset_rows = if inventory_presets.is_empty() { listed_presets } else { inventory_presets };
    let selected_preset_row = preset_rows.iter().find(|preset| preset.get("id").and_then(Value::as_str) == selected_preset.as_deref())
        .or_else(|| preset_rows.iter().find(|preset| preset.get("isDefault").and_then(Value::as_bool) == Some(true)))
        .or_else(|| preset_rows.first());
    let preset_name = selected_preset_row.and_then(|preset| preset.get("name").and_then(Value::as_str)).unwrap_or("标准模式");
    let selected_rows = selected_preset_row.and_then(|preset| preset.get("rows")).and_then(Value::as_array).cloned().unwrap_or_default();
    let filtered_rows = selected_rows.into_iter().filter(|entry| plugin_matches(entry.get("moduleName").and_then(Value::as_str).unwrap_or_default(), entry.get("entryId").and_then(Value::as_str), &normalized_query)).collect::<Vec<_>>();
    let filtered_global = plugin_rows.into_iter().filter(|entry| plugin_matches(entry.get("moduleName").and_then(Value::as_str).unwrap_or_default(), entry.get("entryId").and_then(Value::as_str), &normalized_query)).collect::<Vec<_>>();
    let filtered_row_count = filtered_rows.len();
    let filtered_global_count = filtered_global.len();
    let no_plugin_matches = !normalized_query.is_empty() && filtered_row_count == 0 && filtered_global_count == 0;
    let on_query = {
        let query = query.clone();
        Callback::from(move |event: InputEvent| {
            let input: HtmlInputElement = event.target_unchecked_into();
            query.set(input.value());
        })
    };
    let select_preset = {
        let selected_preset = selected_preset.clone();
        let preset_menu_open = preset_menu_open.clone();
        Callback::from(move |id: String| {
            selected_preset.set(Some(id));
            preset_menu_open.set(false);
        })
    };
    let toggle_card = {
        let expanded = expanded.clone();
        Callback::from(move |key: String| expanded.set(((*expanded).as_ref() != Some(&key)).then_some(key)))
    };
    html! {
        <main class="standalone-page plugin-page">
            <div class="page-toolbar"><div class="page-tabs"><button class="page-tab">{"插件配置"}</button><button class="page-tab is-active">{"插件列表"}</button></div><div class="toolbar-actions"><button class="icon-button" aria-label="刷新插件" title="刷新插件">{"↻"}</button></div></div>
            <div class="page-content plugin-catalog">
                <div class="plugin-catalog-heading"><div><p class="eyebrow">{"DEEPSEEK HARNESS"}</p><h1>{"插件"}</h1><p class="page-subtitle">{"查看 DSH 已安装的插件，以及每个 Agent 预设实际启用的能力。"}</p><p class="plugin-source-note"><span class="plugin-source-dot" aria-hidden="true"></span>{"实时来自 DSH pluginInventory · 当前页面仅查看，安装与卸载仍由 DSH 管理"}</p></div></div>
                <label class="plugin-search"><span aria-hidden="true">{"⌕"}</span><input type="search" value={(*query).clone()} oninput={on_query} placeholder="搜索插件" aria-label="搜索插件" /></label>
                { match plugin_value { Loadable::Loading => html! { <p class="summary-muted">{"正在读取插件..."}</p> }, Loadable::Failed(error) => html! { <p class="rename-error">{error}</p> }, _ => html! {} } }
                { if selected_preset_row.is_some() { html! {
                    <section class="plugin-catalog-group" aria-label="会话插件">
                        <div class="plugin-group-heading"><button class="plugin-group-toggle" aria-expanded={(*preset_group_open).to_string()} onclick={{ let preset_group_open = preset_group_open.clone(); Callback::from(move |_| preset_group_open.set(!*preset_group_open)) }}><span class="plugin-group-chevron">{"⌄"}</span><span><strong>{"会话插件"}</strong><small>{"由 Agent 预设按会话组成"}</small></span></button><div class="plugin-group-actions"><div class="plugin-preset-picker"><button class="plugin-preset-trigger" aria-expanded={(*preset_menu_open).to_string()} onclick={{ let preset_menu_open = preset_menu_open.clone(); Callback::from(move |_| preset_menu_open.set(!*preset_menu_open)) }}>{preset_name}<span>{"⌄"}</span></button>{ if *preset_menu_open { html! { <div class="plugin-preset-menu" role="menu">{ for preset_rows.iter().map(|preset| { let id = preset.get("id").and_then(Value::as_str).unwrap_or_default().to_owned(); let name = preset.get("name").and_then(Value::as_str).unwrap_or(&id).to_owned(); let default = preset.get("isDefault").and_then(Value::as_bool).unwrap_or(false); let select_preset = select_preset.clone(); html! { <button role="menuitem" onclick={Callback::from(move |_| select_preset.emit(id.clone()))}>{name}{ if default { html! { <small>{"默认"}</small> } } else { html! {} } }</button> } }) }</div> } } else { html! {} } }</div><span class="plugin-count">{format!("{} 个", filtered_row_count)}</span></div></div>
                        { if *preset_group_open { html! { <div class="plugin-card-grid">{ for filtered_rows.into_iter().enumerate().map(|(index, entry)| { let module = entry.get("moduleName").and_then(Value::as_str).unwrap_or("未知插件").to_owned(); let entry_id = entry.get("entryId").and_then(Value::as_str).unwrap_or("").to_owned(); let enabled = entry.get("enabled").and_then(Value::as_bool).unwrap_or(false); let phase = entry.get("fiberPhase").and_then(Value::as_str).unwrap_or("未加载").to_owned(); let key = format!("preset-{index}-{module}"); let open = expanded.as_deref() == Some(key.as_str()); let toggle_card = toggle_card.clone(); let short_name = plugin_short_name(&module); html! { <article class={classes!("plugin-inventory-card", open.then_some("is-open"))}><button class="plugin-inventory-card-header" aria-expanded={open.to_string()} onclick={Callback::from(move |_| toggle_card.emit(key.clone()))}><strong title={module.clone()}>{short_name}</strong><span class="plugin-card-trailing"><span class={classes!("plugin-state-tag", enabled.then_some("is-enabled"))}>{if enabled { "已启用" } else { "已禁用" }}</span><span class="plugin-card-chevron">{"⌄"}</span></span></button>{ if open { html! { <div class="plugin-inventory-card-details"><code>{entry_id}</code><dl><div><dt>{"模块"}</dt><dd>{module}</dd></div><div><dt>{"运行状态"}</dt><dd>{phase}</dd></div></dl></div> } } else { html! {} } }</article> } }) }</div> } } else { html! {} } }
                    </section>
                } } else { html! {} } }
                <section class="plugin-catalog-group global-plugin-group" aria-label="全局插件"><div class="plugin-group-heading"><button class="plugin-group-toggle" aria-expanded={(*global_group_open).to_string()} onclick={{ let global_group_open = global_group_open.clone(); Callback::from(move |_| global_group_open.set(!*global_group_open)) }}><span class="plugin-group-chevron">{"⌄"}</span><span><strong>{"全局插件"}</strong><small>{"由 DSH 全局加载"}</small></span></button><span class="plugin-count">{format!("{} 个", filtered_global_count)}</span></div>{ if *global_group_open { html! { <div class="plugin-card-grid">{ for filtered_global.into_iter().enumerate().map(|(index, entry)| { let module = entry.get("moduleName").and_then(Value::as_str).unwrap_or("未知插件").to_owned(); let entry_id = entry.get("entryId").and_then(Value::as_str).unwrap_or("").to_owned(); let enabled = entry.get("enabled").and_then(Value::as_bool).unwrap_or(false); let phase = entry.get("fiberPhase").and_then(Value::as_str).unwrap_or("未加载").to_owned(); let key = format!("global-{index}-{module}"); let open = expanded.as_deref() == Some(key.as_str()); let toggle_card = toggle_card.clone(); let short_name = plugin_short_name(&module); html! { <article class={classes!("plugin-inventory-card", open.then_some("is-open"))}><button class="plugin-inventory-card-header" aria-expanded={open.to_string()} onclick={Callback::from(move |_| toggle_card.emit(key.clone()))}><strong title={module.clone()}>{short_name}</strong><span class="plugin-card-trailing"><span class={classes!("plugin-state-tag", enabled.then_some("is-enabled"))}>{if enabled { "已启用" } else { "已禁用" }}</span><span class="plugin-card-chevron">{"⌄"}</span></span></button>{ if open { html! { <div class="plugin-inventory-card-details"><code>{entry_id}</code><dl><div><dt>{"模块"}</dt><dd>{module}</dd></div><div><dt>{"运行状态"}</dt><dd>{phase}</dd></div></dl></div> } } else { html! {} } }</article> } }) }</div> } } else { html! {} } }</section>
                { if no_plugin_matches { html! { <p class="plugin-empty-search">{"没有匹配的插件。"}</p> } } else { html! {} } }
            </div>
        </main>
    }
}

#[cfg(test)]
mod tests {
    use super::{
        api_error_message, compact_line, configured_providers, conversation_messages,
        first_nonempty_line, latest_nonempty_line,
        tool_title,
        selectable_model_provider_options, session_model_selection, ConversationMessageKind,
    };
    use magic_frontend::api::error::ApiError;
    use serde_json::json;

    #[test]
    fn conversation_messages_reads_dsh_content_events() {
        let messages = conversation_messages(json!([
            {
                "event": {
                    "type": "user/message",
                    "data": {
                        "content": [{"type": "text", "text": "请回复：收到"}]
                    }
                }
            }
        ]));

        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].role, "user");
        assert_eq!(messages[0].text, "请回复：收到");
    }

    #[test]
    fn reasoning_summary_uses_first_line_when_settled_and_latest_line_while_streaming() {
        let text = "先检查工作区\n然后读取配置";
        assert_eq!(first_nonempty_line(text), "先检查工作区");
        assert_eq!(latest_nonempty_line(text), "然后读取配置");
        assert_eq!(compact_line("短内容", 96), "短内容");
        assert_eq!(tool_title("bash"), "终端");
        assert_eq!(tool_title("read_file"), "读取文件");
    }

    #[test]
    fn conversation_messages_surfaces_dsh_turn_errors_as_retryable_agent_messages() {
        let messages = conversation_messages(json!([
            {
                "event": {
                    "type": "turn/end",
                    "data": {
                        "reason": {
                            "kind": "error",
                            "error": {
                                "code": "MISSING_CREDENTIAL",
                                "message": "缺少模型凭据"
                            }
                        }
                    }
                }
            }
        ]));

        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].role, "error");
        assert_eq!(messages[0].text, "缺少模型凭据");
        assert!(messages[0].retryable);
    }

    #[test]
    fn conversation_messages_projects_dsh_execution_events_into_timeline_rows() {
        let messages = conversation_messages(json!([
            {"event": {"type": "turn/start", "data": {"turn": 1}}},
            {"event": {"type": "step/start", "data": {"turn": 1, "step": 1}}},
            {"event": {"type": "assistant/chunk", "data": {"chunk": {"type": "reasoning-delta", "text": "先检查"}}}},
            {"event": {"type": "tool/call", "data": {"name": "bash", "arguments": "{\"command\":\"pwd\"}"}}},
            {"event": {"type": "tool/result", "data": {"message": {"content": [{"type": "text", "text": "完成"}]}}}},
            {"event": {"type": "turn/end", "data": {"reason": {"kind": "completed"}}}}
        ]));

        assert_eq!(messages.len(), 3);
        assert!(matches!(messages[0].kind, ConversationMessageKind::Reasoning));
        assert!(matches!(messages[1].kind, ConversationMessageKind::Tool));
        assert!(messages[1].text.contains("bash"));
        assert!(matches!(messages[2].kind, ConversationMessageKind::ToolResult));
        assert!(!messages.iter().any(|message| ["回合开始", "步骤完成", "回合完成"].contains(&message.title.as_str())));
    }

    #[test]
    fn conversation_messages_hides_dsh_internal_context() {
        let messages = conversation_messages(json!([
            {
                "event": {
                    "type": "assistant/message",
                    "data": {"content": [{"type": "text", "text": "<system-reminder>internal"}]}
                }
            }
        ]));

        assert!(messages.is_empty());
    }

    #[test]
    fn api_error_message_preserves_provider_url_guidance() {
        let message = api_error_message(ApiError::Status(
            502,
            "DSH llm/discoverModels rejected the request: did not answer with JSON".into(),
        ));

        assert!(message.contains("Base URL"));
        assert!(message.contains("/v1"));
    }

    #[test]
    fn model_picker_only_lists_saved_and_enabled_providers() {
        let configuration = json!({
            "catalog": { "groups": [
                { "id": "deepseek", "name": "DeepSeek", "models": [{ "id": "deepseek-v4" }] },
                { "id": "company", "name": "公司", "models": [{ "id": "company-chat" }] }
            ] },
            "settings": { "namespaces": [{
                "ns": "llm-pi-ai",
                "value": { "providers": {
                    "company": {
                        "displayName": "公司",
                        "baseURL": "https://api.example.com/v1",
                        "api": "openai-responses",
                        "models": [{ "id": "company-chat" }]
                    }
                } }
            }] },
            "magic_provider_presentation": { "company": { "enabled": true } }
        });

        let providers = configured_providers(&configuration);
        let options = selectable_model_provider_options(&configuration, &providers);

        assert_eq!(options.len(), 1);
        assert_eq!(options[0].id, "company");
        assert_eq!(options[0].models, vec!["company-chat"]);
    }

    #[test]
    fn session_model_selection_uses_the_latest_dsh_event() {
        let selection = session_model_selection(&json!([
            { "event": { "type": "model/selection", "data": { "provider": "company", "model": "first" } } },
            { "event": { "type": "user/message", "data": {} } },
            { "event": { "type": "model/selection", "data": { "provider": "company", "model": "current" } } }
        ]));

        assert_eq!(selection, Some(("company".into(), "current".into())));
    }
}

fn main() {
    yew::Renderer::<App>::new().render();
}
