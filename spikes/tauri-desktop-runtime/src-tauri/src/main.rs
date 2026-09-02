#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::io::{Read, Write};
use std::net::{Shutdown, TcpStream};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

const MAGIC_PORT: u16 = 45173;
const OPENCODE_PORT: u16 = 45174;

struct Processes(Mutex<ProcessState>);

struct ProcessState {
    magic: Option<Child>,
    opencode: Option<Child>,
}

#[derive(Default, Serialize)]
struct RuntimeStatus {
    magic_url: String,
    magic_healthy: bool,
    opencode_url: String,
    opencode_healthy: bool,
    magic_pid: Option<u32>,
    opencode_pid: Option<u32>,
}

#[tauri::command]
fn bootstrap(state: tauri::State<'_, Processes>) -> Result<RuntimeStatus, String> {
    let mut processes = state.0.lock().map_err(|_| "process state lock poisoned")?;
    reap_exited(&mut processes);

    if !health(MAGIC_PORT, "/health") {
        processes.magic = Some(spawn_magic()?);
    }
    wait_for_health(MAGIC_PORT, "/health")?;

    if !health(OPENCODE_PORT, "/global/health") {
        processes.opencode = Some(spawn_opencode()?);
    }
    wait_for_health(OPENCODE_PORT, "/global/health")?;

    Ok(status(&processes))
}

#[tauri::command]
fn stop_processes(state: tauri::State<'_, Processes>) -> Result<(), String> {
    let mut processes = state.0.lock().map_err(|_| "process state lock poisoned")?;
    if let Some(mut child) = processes.magic.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    if let Some(mut child) = processes.opencode.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    Ok(())
}

fn status(processes: &ProcessState) -> RuntimeStatus {
    RuntimeStatus {
        magic_url: format!("http://127.0.0.1:{MAGIC_PORT}"),
        magic_healthy: health(MAGIC_PORT, "/health"),
        opencode_url: format!("http://127.0.0.1:{OPENCODE_PORT}"),
        opencode_healthy: health(OPENCODE_PORT, "/global/health"),
        magic_pid: processes.magic.as_ref().map(Child::id),
        opencode_pid: processes.opencode.as_ref().map(Child::id),
    }
}

fn reap_exited(processes: &mut ProcessState) {
    for child in [&mut processes.magic, &mut processes.opencode] {
        if child.as_mut().is_some_and(|process| process.try_wait().ok().flatten().is_some()) {
            *child = None;
        }
    }
}

fn spawn_magic() -> Result<Child, String> {
    let root = spike_root();
    Command::new(bun())
        .arg("run")
        .arg("service.ts")
        .current_dir(root)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("无法启动 Magic 本地服务：{error}"))
}

fn spawn_opencode() -> Result<Child, String> {
    let root = workspace_root();
    let opencode_dir = root.join("reference-project").join("opencode").join("packages").join("opencode");
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

fn wait_for_health(port: u16, path: &str) -> Result<(), String> {
    for _ in 0..50 {
        if health(port, path) {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(100));
    }
    Err(format!("服务未在预期时间内健康：127.0.0.1:{port}{path}"))
}

fn health(port: u16, path: &str) -> bool {
    let address = format!("127.0.0.1:{port}");
    let Ok(mut stream) = TcpStream::connect_timeout(&address.parse().unwrap(), Duration::from_millis(250)) else {
        return false;
    };
    let request = format!("GET {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n");
    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }
    let mut response = String::new();
    let _ = stream.read_to_string(&mut response);
    let _ = stream.shutdown(Shutdown::Both);
    response.starts_with("HTTP/1.1 200") && (path != "/global/health" || response.contains("\"healthy\":true"))
}

fn bun() -> String {
    std::env::var("MAGIC_SPIKE_BUN").unwrap_or_else(|_| "bun".to_string())
}

fn spike_root() -> PathBuf {
    std::env::var("MAGIC_SPIKE_ROOT").map(PathBuf::from).unwrap_or_else(|_| workspace_root().join("spikes").join("tauri-desktop-runtime"))
}

fn workspace_root() -> PathBuf {
    std::env::var("MAGIC_WORKSPACE_ROOT").map(PathBuf::from).unwrap_or_else(|_| {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("..").join("..").canonicalize().unwrap()
    })
}

fn run() {
    tauri::Builder::default()
        .manage(Processes(Mutex::new(ProcessState { magic: None, opencode: None })))
        .invoke_handler(tauri::generate_handler![bootstrap, stop_processes])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}

fn main() {
    run();
}
