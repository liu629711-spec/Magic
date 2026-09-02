use magic_execution_opencode_v1::OpenCodeV1Adapter;
use std::fs;
use std::net::TcpListener;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::thread;
use std::time::Duration;

fn start_opencode(root: &PathBuf, port: u16) -> Child {
    let binary = std::env::var_os("MAGIC_OPENCODE_BIN")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            #[cfg(windows)]
            {
                std::env::var_os("APPDATA")
                    .map(PathBuf::from)
                    .unwrap_or_default()
                    .join("npm/node_modules/opencode-ai/bin/opencode.exe")
            }
            #[cfg(not(windows))]
            {
                PathBuf::from("opencode")
            }
        });
    Command::new(binary)
        .args(["serve", "--hostname=127.0.0.1", &format!("--port={port}")])
        .current_dir(root)
        .env("OPENCODE_DISABLE_PROJECT_CONFIG", "1")
        .env("OPENCODE_DISABLE_SHARE", "true")
        .env("OPENCODE_DB", root.join("opencode.db"))
        .env("XDG_DATA_HOME", root.join("data"))
        .env("XDG_CONFIG_HOME", root.join("config"))
        .env("XDG_STATE_HOME", root.join("state"))
        .env("XDG_CACHE_HOME", root.join("cache"))
        .spawn()
        .expect("MAGIC_REAL_OPENCODE=1 requires opencode on PATH")
}

#[test]
fn real_v1_session_and_message_routes_smoke() {
    if std::env::var("MAGIC_REAL_OPENCODE").as_deref() != Ok("1") {
        return;
    }
    let root = std::env::temp_dir().join(format!("magic-opencode-real-{}", std::process::id()));
    fs::create_dir_all(&root).unwrap();
    let port = TcpListener::bind(("127.0.0.1", 0))
        .unwrap()
        .local_addr()
        .unwrap()
        .port();
    let mut process = start_opencode(&root, port);
    let adapter = OpenCodeV1Adapter::new(format!("http://127.0.0.1:{port}"));
    let ready = (0..40).any(|_| {
        if adapter.health().unwrap_or(false) {
            true
        } else {
            thread::sleep(Duration::from_millis(250));
            false
        }
    });
    assert!(ready, "OpenCode did not become healthy");
    let session = adapter
        .create_session(Some(root.to_str().unwrap()))
        .unwrap();
    let _receipt = adapter
        .prompt_async(&session.id, "Return one short sentence.")
        .unwrap();
    let _ = adapter.messages(&session.id).unwrap();
    assert!(adapter.abort(&session.id).unwrap());
    process.kill().unwrap();
    process.wait().unwrap();
}
