//! OpenCode V1 HTTP adapter for the verified session HTTP API.

use magic_domain::{AttemptId, AttemptStatus};
use magic_execution_port::{
    EventSource, ExecutionError, ExecutionEvent, ExecutionHistoryEvent, ExecutionObservation,
    ExecutionPort, ExecutionReceipt, ExecutionSession,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};

pub struct OpenCodeV1Adapter {
    base_url: String,
    agent: ureq::Agent,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
pub struct OpenCodeSession {
    pub id: String,
}

/// OpenCode-owned session metadata used by Magic's conversation list.
///
/// This is decoded only while proxying an OpenCode response; Magic does not
/// persist a copy of it.
#[derive(Clone, Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OpenCodeSessionInfo {
    pub id: String,
    pub title: String,
    pub directory: String,
    #[serde(default)]
    pub parent_id: Option<String>,
    #[serde(default)]
    pub time: Value,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
pub struct OpenCodeEvent {
    pub id: String,
    #[serde(rename = "type")]
    pub event_type: String,
    #[serde(default)]
    pub properties: Value,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
pub struct OpenCodeHistoryEvent {
    pub id: String,
    pub aggregate_id: String,
    pub seq: u64,
    #[serde(rename = "type")]
    pub event_type: String,
    pub data: Value,
}

impl OpenCodeV1Adapter {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into().trim_end_matches('/').to_string(),
            agent: ureq::Agent::new_with_defaults(),
        }
    }

    pub fn health(&self) -> Result<bool, ExecutionError> {
        let value: Value = self.request("GET", "/global/health", None)?;
        Ok(value
            .get("healthy")
            .and_then(Value::as_bool)
            .unwrap_or(false))
    }

    pub fn create_session(
        &self,
        directory: Option<&str>,
    ) -> Result<OpenCodeSession, ExecutionError> {
        let path = directory
            .map(|value| format!("/session?directory={}", urlencoding::encode(value)))
            .unwrap_or_else(|| "/session".into());
        let value = self.request("POST", &path, Some(json!({})))?;
        serde_json::from_value(value)
            .map_err(|error| ExecutionError::Adapter(format!("invalid session response: {error}")))
    }

    pub fn prompt_async(
        &self,
        session_id: &str,
        input: &str,
    ) -> Result<ExecutionReceipt, ExecutionError> {
        let body = json!({ "parts": [{ "type": "text", "text": input }] });
        let value = self.request(
            "POST",
            &format!("/session/{session_id}/prompt_async"),
            Some(body),
        )?;
        Ok(ExecutionReceipt {
            message_id: value
                .get("id")
                .or_else(|| value.get("messageID"))
                .or_else(|| value.get("message_id"))
                .and_then(Value::as_str)
                .map(ToOwned::to_owned),
        })
    }

    pub fn sessions(&self) -> Result<Vec<OpenCodeSessionInfo>, ExecutionError> {
        let value = self.request("GET", "/session", None)?;
        serde_json::from_value(value).map_err(|error| {
            ExecutionError::Adapter(format!("invalid session list response: {error}"))
        })
    }

    pub fn session_statuses(&self) -> Result<HashMap<String, Value>, ExecutionError> {
        let value = self.request("GET", "/session/status", None)?;
        serde_json::from_value(value).map_err(|error| {
            ExecutionError::Adapter(format!("invalid session status response: {error}"))
        })
    }

    pub fn messages(&self, session_id: &str) -> Result<Vec<Value>, ExecutionError> {
        let value = self.request("GET", &format!("/session/{session_id}/message"), None)?;
        serde_json::from_value(value)
            .map_err(|error| ExecutionError::Adapter(format!("invalid messages response: {error}")))
    }

    pub fn terminal_status(&self, session_id: &str) -> Result<AttemptStatus, ExecutionError> {
        let messages = self.messages(session_id)?;
        Ok(match observation_from_messages(&messages) {
            ExecutionObservation::Terminal(status) => status,
            ExecutionObservation::Running | ExecutionObservation::Unknown => {
                AttemptStatus::UnknownAfterRestart
            }
        })
    }

    pub fn abort(&self, session_id: &str) -> Result<bool, ExecutionError> {
        let value = self.request("POST", &format!("/session/{session_id}/abort"), None)?;
        value
            .as_bool()
            .ok_or_else(|| ExecutionError::Adapter("invalid abort response".into()))
    }

    pub fn sync_history(
        &self,
        known_sequences: &HashMap<String, u64>,
    ) -> Result<Vec<OpenCodeHistoryEvent>, ExecutionError> {
        let value = self.request(
            "POST",
            "/sync/history",
            Some(serde_json::to_value(known_sequences).map_err(|error| {
                ExecutionError::Adapter(format!("encode sync history request failed: {error}"))
            })?),
        )?;
        serde_json::from_value(value).map_err(|error| {
            ExecutionError::Adapter(format!("invalid sync history response: {error}"))
        })
    }

    pub fn events(&self, max_events: usize) -> Result<Vec<OpenCodeEvent>, ExecutionError> {
        let url = format!("{}/event", self.base_url);
        let response = self
            .agent
            .get(&url)
            .header("Accept", "text/event-stream")
            .call()
            .map_err(|error| {
                ExecutionError::Adapter(format!("OpenCode event request failed: {error}"))
            })?;
        if !response.status().is_success() {
            return Err(ExecutionError::Adapter(format!(
                "OpenCode returned HTTP {}",
                response.status()
            )));
        }
        let reader = BufReader::new(response.into_parts().1.into_reader());
        let mut events = Vec::new();
        for line in reader.lines() {
            let line = line.map_err(|error| {
                ExecutionError::Adapter(format!("read OpenCode event stream failed: {error}"))
            })?;
            let Some(payload) = line.strip_prefix("data:") else {
                continue;
            };
            events.push(serde_json::from_str(payload.trim()).map_err(|error| {
                ExecutionError::Adapter(format!("invalid OpenCode event payload: {error}"))
            })?);
            if events.len() >= max_events {
                break;
            }
        }
        Ok(events)
    }

    fn request(
        &self,
        method: &str,
        path: &str,
        body: Option<Value>,
    ) -> Result<Value, ExecutionError> {
        let url = format!("{}{path}", self.base_url);
        let result = match (method, body) {
            ("GET", None) => self.agent.get(&url).call(),
            ("POST", Some(body)) => self
                .agent
                .post(&url)
                .header("Content-Type", "application/json")
                .send(body.to_string()),
            ("POST", None) => self.agent.post(&url).send_empty(),
            _ => {
                return Err(ExecutionError::Adapter(format!(
                    "unsupported OpenCode method {method}"
                )))
            }
        };
        let mut response = result.map_err(|error| {
            ExecutionError::Adapter(format!("OpenCode request failed: {error}"))
        })?;
        if !response.status().is_success() {
            return Err(ExecutionError::Adapter(format!(
                "OpenCode returned HTTP {}",
                response.status()
            )));
        }
        let text = response.body_mut().read_to_string().map_err(|error| {
            ExecutionError::Adapter(format!("read OpenCode response failed: {error}"))
        })?;
        if text.trim().is_empty() {
            return Ok(Value::Null);
        }
        serde_json::from_str(&text).map_err(|error| {
            ExecutionError::Adapter(format!("parse OpenCode response failed: {error}"))
        })
    }
}

impl ExecutionPort for OpenCodeV1Adapter {
    fn adapter_name(&self) -> &'static str {
        "opencode-v1"
    }

    fn create_session(&self, directory: Option<&str>) -> Result<ExecutionSession, ExecutionError> {
        self.create_session(directory)
            .map(|session| ExecutionSession { id: session.id })
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
        self.abort(session_id).map(|_| ())
    }

    fn reconcile(
        &self,
        _attempt_id: &AttemptId,
        session_id: &str,
    ) -> Result<ExecutionObservation, ExecutionError> {
        let messages = self.messages(session_id)?;
        Ok(observation_from_messages(&messages))
    }
}

/// FZ-1 observation semantics: a readable session without terminal evidence is
/// Running (the session is alive); only explicit evidence closes an Attempt and
/// only a failed read (transport error, session gone) surfaces as `Err`.
fn observation_from_messages(messages: &[Value]) -> ExecutionObservation {
    let assistant = messages
        .iter()
        .filter_map(|message| message.get("info"))
        .filter(|info| info.get("role").and_then(Value::as_str) == Some("assistant"))
        .last();
    let Some(info) = assistant else {
        return ExecutionObservation::Running;
    };
    if let Some(error) = info.get("error") {
        return if error.get("name").and_then(Value::as_str) == Some("MessageAbortedError") {
            ExecutionObservation::Terminal(AttemptStatus::Cancelled)
        } else {
            ExecutionObservation::Terminal(AttemptStatus::Failed)
        };
    }
    let finished = info
        .get("finish")
        .and_then(Value::as_str)
        .is_some_and(|finish| !finish.is_empty());
    let completed = info
        .get("time")
        .and_then(|time| time.get("completed"))
        .and_then(Value::as_u64)
        .is_some();
    if finished && completed {
        ExecutionObservation::Terminal(AttemptStatus::Succeeded)
    } else {
        ExecutionObservation::Running
    }
}

impl EventSource for OpenCodeV1Adapter {
    fn aggregate_type(&self) -> &'static str {
        "opencode"
    }

    fn event_source_name(&self) -> &'static str {
        "opencode-v1"
    }

    fn read_events(&self, max_events: usize) -> Result<Vec<ExecutionEvent>, ExecutionError> {
        self.events(max_events).map(|events| {
            events
                .into_iter()
                .map(|event| ExecutionEvent {
                    aggregate_id: event
                        .properties
                        .get("aggregateID")
                        .or_else(|| event.properties.get("aggregate_id"))
                        .and_then(Value::as_str)
                        .map(ToOwned::to_owned),
                    seq: event.properties.get("seq").and_then(Value::as_u64),
                    data_json: event.properties.to_string(),
                    id: event.id,
                    event_type: event.event_type,
                })
                .collect()
        })
    }

    fn sync_history(
        &self,
        known_sequences: &HashMap<String, u64>,
    ) -> Result<Vec<ExecutionHistoryEvent>, ExecutionError> {
        self.sync_history(known_sequences).map(|events| {
            events
                .into_iter()
                .map(|event| ExecutionHistoryEvent {
                    id: event.id,
                    aggregate_id: event.aggregate_id,
                    seq: event.seq,
                    event_type: event.event_type,
                    data_json: event.data.to_string(),
                })
                .collect()
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::thread;

    fn mock_server(response_body: &'static str) -> (String, thread::JoinHandle<String>) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = format!("http://{}", listener.local_addr().unwrap());
        let handle = thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut request = Vec::new();
            let mut chunk = [0_u8; 1024];
            loop {
                let size = stream.read(&mut chunk).unwrap();
                if size == 0 {
                    break;
                }
                request.extend_from_slice(&chunk[..size]);
                let text = String::from_utf8_lossy(&request);
                let Some(header_end) = text.find("\r\n\r\n") else {
                    continue;
                };
                let content_length = text
                    .lines()
                    .find_map(|line| {
                        line.split_once(':').and_then(|(name, value)| {
                            (name.eq_ignore_ascii_case("content-length"))
                                .then(|| value.trim().parse::<usize>().ok())
                                .flatten()
                        })
                    })
                    .unwrap_or(0);
                if request.len() >= header_end + 4 + content_length {
                    break;
                }
            }
            let request = String::from_utf8_lossy(&request).to_string();
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                response_body.len(), response_body
            );
            stream.write_all(response.as_bytes()).unwrap();
            request
        });
        (address, handle)
    }

    #[test]
    fn verified_v1_routes_use_expected_methods_and_payloads() {
        let (url, create_request) = mock_server(r#"{"id":"session-1"}"#);
        let adapter = OpenCodeV1Adapter::new(url);
        assert_eq!(
            adapter.create_session(None).unwrap(),
            OpenCodeSession {
                id: "session-1".into()
            }
        );
        let create_request = create_request.join().unwrap();
        assert!(create_request.starts_with("POST /session HTTP/1.1"));

        let (url, directory_request) = mock_server(r#"{"id":"session-2"}"#);
        let adapter = OpenCodeV1Adapter::new(url);
        adapter.create_session(Some("C:/Magic Space")).unwrap();
        let directory_request = directory_request.join().unwrap();
        assert!(
            directory_request.starts_with("POST /session?directory=C%3A%2FMagic%20Space HTTP/1.1")
        );

        let (url, prompt_request) = mock_server("");
        let adapter = OpenCodeV1Adapter::new(url);
        adapter.prompt_async("session-1", "hello").unwrap();
        let prompt_request = prompt_request.join().unwrap();
        assert!(prompt_request.starts_with("POST /session/session-1/prompt_async HTTP/1.1"));
        assert!(prompt_request.contains("hello"));

        let (url, messages_request) = mock_server("[]");
        let adapter = OpenCodeV1Adapter::new(url);
        assert!(adapter.messages("session-1").unwrap().is_empty());
        assert!(messages_request
            .join()
            .unwrap()
            .starts_with("GET /session/session-1/message HTTP/1.1"));

        let (url, abort_request) = mock_server("true");
        let adapter = OpenCodeV1Adapter::new(url);
        assert!(adapter.abort("session-1").unwrap());
        assert!(abort_request
            .join()
            .unwrap()
            .starts_with("POST /session/session-1/abort HTTP/1.1"));

        let (url, sessions_request) = mock_server(
            r#"[{"id":"session-1","title":"Conversation","directory":"D:/Harmess","slug":"x","projectID":"p","version":"v","time":{"created":1,"updated":2}}]"#,
        );
        let adapter = OpenCodeV1Adapter::new(url);
        assert_eq!(adapter.sessions().unwrap()[0].title, "Conversation");
        assert!(sessions_request
            .join()
            .unwrap()
            .starts_with("GET /session HTTP/1.1"));

        let (url, status_request) = mock_server(r#"{"session-1":{"type":"busy"}}"#);
        let adapter = OpenCodeV1Adapter::new(url);
        assert_eq!(
            adapter.session_statuses().unwrap()["session-1"]["type"],
            "busy"
        );
        assert!(status_request
            .join()
            .unwrap()
            .starts_with("GET /session/status HTTP/1.1"));
    }

    #[test]
    fn sync_history_uses_known_sequence_map_and_parses_events() {
        let (url, history_request) = mock_server(
            r#"[{"id":"event-2","aggregate_id":"attempt-1","seq":2,"type":"session.updated","data":{}}]"#,
        );
        let adapter = OpenCodeV1Adapter::new(url);
        let known = HashMap::from([(String::from("attempt-1"), 1_u64)]);
        let events = adapter.sync_history(&known).unwrap();
        assert_eq!(events[0].seq, 2);
        let request = history_request.join().unwrap();
        assert!(request.starts_with("POST /sync/history HTTP/1.1"));
        assert!(request.contains("attempt-1"));
    }

    #[test]
    fn event_stream_parses_data_lines_without_relying_on_sse_id_envelope() {
        let (url, _) = mock_server(
            r#"data: {"id":"event-1","type":"server.connected","properties":{}}

data: {"id":"event-2","type":"server.heartbeat","properties":{}}
"#,
        );
        let adapter = OpenCodeV1Adapter::new(url);
        let events = adapter.events(2).unwrap();
        assert_eq!(events.len(), 2);
        assert_eq!(events[0].id, "event-1");
        assert_eq!(events[1].event_type, "server.heartbeat");
    }

    #[test]
    fn observation_requires_explicit_finished_message_evidence() {
        let success = vec![json!({
            "info": {
                "role": "assistant",
                "finish": "stop",
                "time": { "completed": 42 }
            }
        })];
        assert_eq!(
            observation_from_messages(&success),
            ExecutionObservation::Terminal(AttemptStatus::Succeeded)
        );

        let failed = vec![json!({
            "info": {
                "role": "assistant",
                "finish": "error",
                "error": { "name": "UnknownError", "data": { "message": "boom" } }
            }
        })];
        assert_eq!(
            observation_from_messages(&failed),
            ExecutionObservation::Terminal(AttemptStatus::Failed)
        );

        let cancelled = vec![json!({
            "info": {
                "role": "assistant",
                "finish": "error",
                "error": { "name": "MessageAbortedError", "data": { "message": "Aborted" } }
            }
        })];
        assert_eq!(
            observation_from_messages(&cancelled),
            ExecutionObservation::Terminal(AttemptStatus::Cancelled)
        );

        let running = vec![json!({ "info": { "role": "assistant" } })];
        assert_eq!(
            observation_from_messages(&running),
            ExecutionObservation::Running
        );

        assert_eq!(
            observation_from_messages(&[]),
            ExecutionObservation::Running
        );
    }
}
