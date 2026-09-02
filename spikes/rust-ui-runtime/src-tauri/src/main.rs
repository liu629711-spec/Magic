#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

const MAGIC_PORT: u16 = 45175;
const OPENCODE_PORT: u16 = 45176;

struct RuntimeState {
    opencode: Mutex<Option<Child>>,
}

#[derive(Serialize)]
struct Status {
    magic_healthy: bool,
    opencode_healthy: bool,
    opencode_pid: Option<u32>,
}

fn main() {
    let state = Arc::new(RuntimeState { opencode: Mutex::new(None) });
    let server_state = Arc::clone(&state);
    thread::spawn(move || run_local_service(server_state));

    tauri::Builder::default()
        .manage(state)
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}

fn run_local_service(state: Arc<RuntimeState>) {
    let listener = TcpListener::bind(("127.0.0.1", MAGIC_PORT)).expect("bind Rust local service");
    for stream in listener.incoming().flatten() {
        let state = Arc::clone(&state);
        thread::spawn(move || handle_request(stream, state));
    }
}

fn handle_request(mut stream: TcpStream, state: Arc<RuntimeState>) {
    let mut request = [0_u8; 4096];
    let size = stream.read(&mut request).unwrap_or(0);
    let request = String::from_utf8_lossy(&request[..size]);
    let path = request.lines().next().and_then(|line| line.split_whitespace().nth(1)).unwrap_or("/");

    if path == "/bootstrap" {
        let mut process = state.opencode.lock().expect("OpenCode state lock");
        if !health(OPENCODE_PORT, "/global/health") {
            *process = spawn_opencode().ok();
            let _ = wait_for_health(OPENCODE_PORT, "/global/health");
        }
        let status = Status {
            magic_healthy: true,
            opencode_healthy: health(OPENCODE_PORT, "/global/health"),
            opencode_pid: process.as_ref().map(Child::id),
        };
        let body = serde_json::to_string(&status).expect("serialize status");
        respond(&mut stream, 200, &body);
        return;
    }

    respond(&mut stream, 404, "{\"error\":\"not found\"}");
}

fn respond(stream: &mut TcpStream, code: u16, body: &str) {
    let response = format!(
        "HTTP/1.1 {code} OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(response.as_bytes());
}

fn spawn_opencode() -> Result<Child, String> {
    let opencode_dir = workspace_root().join("reference-project").join("opencode").join("packages").join("opencode");
    Command::new(bun())
        .arg("run")
        .arg("--conditions=browser")
        .arg("./src/index.ts")
        .arg("serve")
        .arg("--hostname")
        .arg("127.0.0.1")
        .arg("--port")
        .arg(OPENCODE_PORT.to_string())
        .current_dir(opencode_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("无法启动 OpenCode V1：{error}"))
}

fn wait_for_health(port: u16, path: &str) -> bool {
    for _ in 0..50 {
        if health(port, path) { return true; }
        thread::sleep(Duration::from_millis(100));
    }
    false
}

fn health(port: u16, path: &str) -> bool {
    let address = format!("127.0.0.1:{port}");
    let Ok(mut stream) = TcpStream::connect_timeout(&address.parse().unwrap(), Duration::from_millis(250)) else { return false; };
    let request = format!("GET {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n");
    if stream.write_all(request.as_bytes()).is_err() { return false; }
    let mut response = String::new();
    let _ = stream.read_to_string(&mut response);
    response.starts_with("HTTP/1.1 200") && (path != "/global/health" || response.contains("\"healthy\":true"))
}

fn bun() -> String {
    std::env::var("MAGIC_SPIKE_BUN").unwrap_or_else(|_| "bun".to_string())
}

fn workspace_root() -> PathBuf {
    std::env::var("MAGIC_WORKSPACE_ROOT").map(PathBuf::from).unwrap_or_else(|_| {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("..").join("..").canonicalize().unwrap()
    })
}
