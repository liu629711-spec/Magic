#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::{
    env, fs,
    io::{Read, Write},
    net::{Shutdown, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread,
    time::Duration,
};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

const DEFAULT_API_ADDR: &str = "127.0.0.1:45280";
const PROTOCOL_VERSION: &str = "1";
const API_TOKEN_PROPERTY: &str = "__MAGIC_API_TOKEN__";
const API_BASE_PROPERTY: &str = "__MAGIC_API_BASE__";

#[derive(Clone)]
struct RuntimeState {
    runtime: std::sync::Arc<Mutex<Runtime>>,
}

struct Runtime {
    api_addr: String,
    token: String,
    manifest_path: PathBuf,
    service: Option<Child>,
}

#[derive(Debug, Clone, Deserialize)]
struct RuntimeManifest {
    instance_id: String,
    pid: u32,
    api_addr: String,
    protocol_version: String,
    instance_token: String,
    started_at_unix_ms: u128,
}

#[derive(Debug, Clone, Serialize)]
struct RuntimeStatus {
    api_url: String,
    healthy: bool,
    protocol_version: &'static str,
    instance_id: Option<String>,
    service_pid: Option<u32>,
    started_at_unix_ms: Option<u128>,
}

#[tauri::command]
fn runtime_status(state: tauri::State<'_, RuntimeState>) -> Result<RuntimeStatus, String> {
    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "runtime state lock poisoned".to_owned())?;
    reap_exited(&mut runtime);
    let manifest = read_manifest(&runtime.manifest_path);
    Ok(RuntimeStatus {
        api_url: format!("http://{}", runtime.api_addr),
        healthy: probe_api(&runtime.api_addr, &runtime.token),
        protocol_version: PROTOCOL_VERSION,
        instance_id: manifest.as_ref().map(|value| value.instance_id.clone()),
        service_pid: runtime
            .service
            .as_ref()
            .map(Child::id)
            .or_else(|| manifest.as_ref().map(|value| value.pid)),
        started_at_unix_ms: manifest.map(|value| value.started_at_unix_ms),
    })
}

#[tauri::command]
fn shutdown_runtime(state: tauri::State<'_, RuntimeState>) -> Result<(), String> {
    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "runtime state lock poisoned".to_owned())?;
    if let Some(mut service) = runtime.service.take() {
        let _ = service.kill();
        let _ = service.wait();
    }
    Ok(())
}

fn bootstrap(app: &tauri::AppHandle) -> Result<Runtime, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("resolve Magic app data directory failed: {error}"))?;
    fs::create_dir_all(&app_data_dir)
        .map_err(|error| format!("create Magic app data directory failed: {error}"))?;
    let manifest_path = env::var_os("MAGIC_RUNTIME_MANIFEST")
        .map(PathBuf::from)
        .unwrap_or_else(|| app_data_dir.join("runtime.json"));
    let api_addr =
        env::var("MAGIC_LOCAL_SERVICE_ADDR").unwrap_or_else(|_| DEFAULT_API_ADDR.to_owned());

    if let Some(manifest) = read_manifest(&manifest_path) {
        if manifest.protocol_version == PROTOCOL_VERSION
            && !manifest.instance_token.is_empty()
            && probe_api(&manifest.api_addr, &manifest.instance_token)
        {
            return Ok(Runtime {
                api_addr: manifest.api_addr,
                token: manifest.instance_token,
                manifest_path,
                service: None,
            });
        }
    }

    let token = env::var("MAGIC_API_TOKEN")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    if !probe_api(&api_addr, &token) {
        let service = spawn_local_service(app, &app_data_dir, &api_addr, &token)?;
        wait_for_api(&api_addr, &token, Duration::from_secs(45))?;
        return Ok(Runtime {
            api_addr,
            token,
            manifest_path,
            service: Some(service),
        });
    }

    // A tokenless local preview may already be running on the development
    // port. It accepts the generated header, so reuse it without claiming a
    // production manifest identity.
    Ok(Runtime {
        api_addr,
        token: String::new(),
        manifest_path,
        service: None,
    })
}

fn spawn_local_service(
    app: &tauri::AppHandle,
    app_data_dir: &Path,
    api_addr: &str,
    token: &str,
) -> Result<Child, String> {
    let workspace_root = workspace_root();
    let binary = env::var_os("MAGIC_LOCAL_SERVICE_BIN")
        .map(PathBuf::from)
        .or_else(|| {
            app.path()
                .resource_dir()
                .ok()
                .map(|path| {
                    path.join(if cfg!(windows) {
                        "magic-local-service.exe"
                    } else {
                        "magic-local-service"
                    })
                })
                .filter(|path| path.exists())
        })
        .unwrap_or_else(|| {
            workspace_root
                .join("target")
                .join("debug")
                .join(if cfg!(windows) {
                    "magic-local-service.exe"
                } else {
                    "magic-local-service"
                })
        });
    if !binary.exists() {
        return Err(format!(
            "找不到 Magic Local Service：{}；可通过 MAGIC_LOCAL_SERVICE_BIN 指定路径",
            binary.display()
        ));
    }
    let dsh_workdir = env::var_os("MAGIC_DSH_WORKDIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            workspace_root
                .join("reference-project")
                .join("deepseek-harness")
        });
    let dsh_home = env::var_os("MAGIC_DSH_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| app_data_dir.join("dsh"));
    let manifest = app_data_dir.join("runtime.json");
    Command::new(binary)
        .current_dir(&workspace_root)
        .env("MAGIC_LOCAL_SERVICE_ADDR", api_addr)
        .env("MAGIC_API_TOKEN", token)
        .env(
            "MAGIC_API_CORS_ORIGINS",
            "tauri://localhost,http://tauri.localhost,http://127.0.0.1:1420",
        )
        .env("MAGIC_DATABASE_PATH", app_data_dir.join("magic.db"))
        .env("MAGIC_RUNTIME_MANIFEST", manifest)
        .env("MAGIC_DSH_WORKDIR", dsh_workdir)
        .env("MAGIC_DSH_HOME", dsh_home)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("无法启动 Magic Local Service：{error}"))
}

fn wait_for_api(api_addr: &str, token: &str, timeout: Duration) -> Result<(), String> {
    let started = std::time::Instant::now();
    while started.elapsed() < timeout {
        if probe_api(api_addr, token) {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(200));
    }
    Err(format!(
        "Magic Local Service 未在预期时间内健康：{api_addr}"
    ))
}

fn probe_api(api_addr: &str, token: &str) -> bool {
    let Ok(address) = api_addr.parse() else {
        return false;
    };
    let Ok(mut stream) = TcpStream::connect_timeout(&address, Duration::from_millis(300)) else {
        return false;
    };
    let authorization = if token.is_empty() {
        String::new()
    } else {
        format!("Authorization: Bearer {token}\r\n")
    };
    let request = format!(
        "GET /api/service-info HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n{authorization}\r\n"
    );
    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }
    let mut response = String::new();
    let _ = stream.read_to_string(&mut response);
    let _ = stream.shutdown(Shutdown::Both);
    response.starts_with("HTTP/1.1 200") && response.contains(PROTOCOL_VERSION)
}

fn read_manifest(path: &Path) -> Option<RuntimeManifest> {
    serde_json::from_slice(&fs::read(path).ok()?).ok()
}

fn reap_exited(runtime: &mut Runtime) {
    if runtime
        .service
        .as_mut()
        .is_some_and(|service| service.try_wait().ok().flatten().is_some())
    {
        runtime.service = None;
    }
}

fn workspace_root() -> PathBuf {
    env::var_os("MAGIC_WORKSPACE_ROOT")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("..")
                .join("..")
                .join("..")
                .canonicalize()
                .expect("resolve Magic workspace root")
        })
}

fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let runtime = bootstrap(app.handle())?;
            let token = serde_json::to_string(&runtime.token)
                .map_err(|error| format!("serialize runtime token failed: {error}"))?;
            let api_base = serde_json::to_string(&format!("http://{}", runtime.api_addr))
                .map_err(|error| format!("serialize runtime API base failed: {error}"))?;
            app.manage(RuntimeState {
                runtime: std::sync::Arc::new(Mutex::new(runtime)),
            });
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Magic")
                .inner_size(1440.0, 920.0)
                .min_inner_size(960.0, 640.0)
                .resizable(true)
                .initialization_script(&format!(
                    "window.{API_TOKEN_PROPERTY} = {token}; window.{API_BASE_PROPERTY} = {api_base};"
                ))
                .build()
                .map_err(|error| format!("create Magic window failed: {error}"))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![runtime_status, shutdown_runtime])
        .run(tauri::generate_context!())
        .expect("error while running Magic desktop");
}

fn main() {
    run();
}
