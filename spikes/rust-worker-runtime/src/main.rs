use serde::Serialize;
use std::env;
use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

const DEFAULT_PORT: u16 = 45275;
const PROTOCOL_VERSION: &str = "magic-worker-v1";

#[derive(Serialize)]
struct RuntimeManifest {
    instance_id: String,
    pid: u32,
    api_addr: String,
    protocol_version: &'static str,
    instance_token: String,
    started_at_unix_ms: u128,
}

fn main() {
    let port = env::var("MAGIC_WORKER_PORT")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(DEFAULT_PORT);
    let manifest_path = env::var("MAGIC_WORKER_MANIFEST")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("magic-worker-runtime.json"));
    let token = env::var("MAGIC_WORKER_TOKEN").unwrap_or_else(|_| "spike-token".to_string());
    let lock_path = manifest_path.with_extension("lock");

    let lock = match OpenOptions::new().write(true).create_new(true).open(&lock_path) {
        Ok(file) => file,
        Err(error) => {
            eprintln!("worker already locked at {}: {error}", lock_path.display());
            process::exit(17);
        }
    };

    let started_at_unix_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock before unix epoch")
        .as_millis();
    let instance_id = format!("worker-{}-{started_at_unix_ms}", process::id());
    let api_addr = format!("127.0.0.1:{port}");
    let manifest = RuntimeManifest {
        instance_id,
        pid: process::id(),
        api_addr: api_addr.clone(),
        protocol_version: PROTOCOL_VERSION,
        instance_token: token.clone(),
        started_at_unix_ms,
    };
    write_manifest(&manifest_path, &manifest);

    let listener = match TcpListener::bind(&api_addr) {
        Ok(listener) => listener,
        Err(error) => {
            eprintln!("cannot bind {api_addr}: {error}");
            let _ = fs::remove_file(&lock_path);
            let _ = fs::remove_file(&manifest_path);
            process::exit(2);
        }
    };

    println!("worker ready at {api_addr} pid={}", process::id());
    for stream in listener.incoming().flatten() {
        let token = token.clone();
        thread::spawn(move || handle_request(stream, &token));
    }

    drop(lock);
    let _ = fs::remove_file(lock_path);
    let _ = fs::remove_file(manifest_path);
}

fn write_manifest(path: &Path, manifest: &RuntimeManifest) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).expect("create manifest directory");
    }
    let temp_path = path.with_extension("tmp");
    let body = serde_json::to_vec_pretty(manifest).expect("serialize manifest");
    fs::write(&temp_path, body).expect("write manifest temp file");
    fs::rename(temp_path, path).expect("publish manifest");
}

fn handle_request(mut stream: TcpStream, token: &str) {
    let mut request = [0_u8; 4096];
    let size = stream.read(&mut request).unwrap_or(0);
    let request = String::from_utf8_lossy(&request[..size]);
    let mut lines = request.lines();
    let request_line = lines.next().unwrap_or("");
    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or("");
    let path = parts.next().unwrap_or("/");
    let provided_token = lines
        .find_map(|line| line.strip_prefix("X-Magic-Worker-Token:").map(str::trim))
        .unwrap_or("");

    if provided_token != token {
        respond(&mut stream, 401, "{\"error\":\"unauthorized\"}");
    } else if method == "GET" && path == "/health" {
        respond(&mut stream, 200, "{\"healthy\":true,\"protocol_version\":\"magic-worker-v1\"}");
    } else {
        respond(&mut stream, 404, "{\"error\":\"not found\"}");
    }
}

fn respond(stream: &mut TcpStream, code: u16, body: &str) {
    let reason = if code == 200 { "OK" } else if code == 401 { "Unauthorized" } else { "Not Found" };
    let response = format!(
        "HTTP/1.1 {code} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(response.as_bytes());
}
