//! 幂等键与 request_hash 派生（冻结口径）。
//!
//! 依据《前端契约确认清单 2026-09-02》B-5 与 FZ-5（2026-09-03 冻结）：
//! - 派发接口：`idempotency_key` 与 `request_hash` 同口径，
//!   `SHA-256(UTF-8(task_id + U+001F + 十进制 attempt_no + U+001F + input + U+001F + directory))`，
//!   空 directory 用空串；摘要为小写十六进制。
//! - 非派发写接口（cancel/resolve/complete/plan）：`request_hash` =
//!   `SHA-256(排除 idempotency_key 与 request_hash 后的规范化请求体)`；
//!   规范化 = 对象键字典序排序、无空白、数组顺序保留。
//! 服务端仅做相等比较（`crates/application/src/lib.rs:76-77`），口径只需客户端内部一致；
//! 派发键确定性派生使崩溃后重发安全（方案 §6.4），无需前端持久化。

use sha2::{Digest, Sha256};

const UNIT_SEPARATOR: char = '\u{1F}';

/// 派发接口的确定性幂等键（B-5）：崩溃恢复重发时派生同一键，服务端按唯一约束复用既有 Attempt。
pub fn dispatch_idempotency_key(
    task_id: &str,
    attempt_no: u32,
    input: &str,
    directory: Option<&str>,
) -> String {
    hash_utf8(&dispatch_canonical_input(task_id, attempt_no, input, directory))
}

/// 派发接口的 request_hash：与幂等键同一冻结口径（B-5）。
pub fn dispatch_request_hash(
    task_id: &str,
    attempt_no: u32,
    input: &str,
    directory: Option<&str>,
) -> String {
    dispatch_idempotency_key(task_id, attempt_no, input, directory)
}

/// FZ-5：非派发写接口的 request_hash。
/// 输入必须是 JSON 对象（字段集按各接口 §6.2 契约），否则返回 None。
pub fn non_dispatch_request_hash(body: &serde_json::Value) -> Option<String> {
    let object = body.as_object()?;
    let mut canonical = serde_json::Map::new();
    for (key, value) in object {
        if key == "idempotency_key" || key == "request_hash" {
            continue;
        }
        canonical.insert(key.clone(), value.clone());
    }
    // serde_json 默认 Map 为 BTreeMap：键字典序排序；to_string 为紧凑输出（无空白）。
    Some(hash_utf8(&serde_json::Value::Object(canonical).to_string()))
}

/// 一次用户意图的新幂等键（方案 §6.4：UUIDv4，意图生命周期内不变）。
/// 仅在 `rng` feature 下提供（Yew/WASM 构建开启）；宿主单测覆盖确定性派生逻辑。
#[cfg(feature = "rng")]
pub fn new_intent_idempotency_key() -> String {
    uuid::Uuid::new_v4().to_string()
}

/// 一次派发尝试的新 attempt_id（方案 §7：UUIDv4，一次派发尝试内不变）。
#[cfg(feature = "rng")]
pub fn new_attempt_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn dispatch_canonical_input(task_id: &str, attempt_no: u32, input: &str, directory: Option<&str>) -> String {
    format!(
        "{task_id}{UNIT_SEPARATOR}{attempt_no}{UNIT_SEPARATOR}{input}{UNIT_SEPARATOR}{}",
        directory.unwrap_or("")
    )
}

fn hash_utf8(input: &str) -> String {
    let digest = Sha256::digest(input.as_bytes());
    let mut hex = String::with_capacity(digest.len() * 2);
    for byte in digest {
        use std::fmt::Write as _;
        let _ = write!(hex, "{byte:02x}");
    }
    hex
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    // 权威向量由 Node crypto 生成（2026-09-03，UTF-8 字节级一致）。
    const DISPATCH_FULL_DIR: &str =
        "b914dc3771f828aaec9bd9c8f842e8db233abfa327fdc40825ecd1253ed67b3f";
    const DISPATCH_EMPTY_DIR: &str =
        "b8a65ddb9d37e1c206088ca97a78a28061813c0662cb785e5ea6d4f1e38a9bd3";
    // sha256('{"evidence_refs":["a","b"],"reason":"x","result":"failed"}')（键字典序、无空白）
    const NON_DISPATCH_SORTED: &str =
        "23f73d938afe73860a06254455d48ca8f8f720b27e41597a87e4cce342f3b359";

    #[test]
    fn dispatch_derivation_matches_frozen_formula() {
        assert_eq!(
            dispatch_idempotency_key("task-1", 1, "do work", Some("C:/Magic")),
            DISPATCH_FULL_DIR
        );
        assert_eq!(
            dispatch_request_hash("task-1", 1, "do work", Some("C:/Magic")),
            DISPATCH_FULL_DIR
        );
    }

    #[test]
    fn empty_directory_hashes_as_empty_string() {
        assert_eq!(
            dispatch_idempotency_key("task-1", 1, "do work", None),
            DISPATCH_EMPTY_DIR
        );
        assert_eq!(
            dispatch_idempotency_key("task-1", 1, "do work", Some("")),
            DISPATCH_EMPTY_DIR
        );
    }

    #[test]
    fn crash_recovery_redispatch_reuses_derived_key() {
        let first = dispatch_idempotency_key("task-9", 3, "重试输入", Some("D:/Harmess"));
        let again = dispatch_idempotency_key("task-9", 3, "重试输入", Some("D:/Harmess"));
        assert_eq!(first, again);
        // 语义字段任一处不同必须产生新键
        assert_ne!(
            first,
            dispatch_idempotency_key("task-9", 4, "重试输入", Some("D:/Harmess"))
        );
        assert_ne!(
            first,
            dispatch_idempotency_key("task-9", 3, "改了输入", Some("D:/Harmess"))
        );
        assert_ne!(
            first,
            dispatch_idempotency_key("task-9", 3, "重试输入", Some("D:/Other"))
        );
    }

    #[test]
    fn non_dispatch_hash_is_canonical_and_excludes_envelope() {
        // 信封字段（idempotency_key/request_hash）与键序不影响摘要
        let with_envelope = json!({
            "idempotency_key": "k-1",
            "request_hash": "stale",
            "result": "failed",
            "reason": "x",
            "evidence_refs": ["a", "b"]
        });
        let bare = json!({"evidence_refs": ["a", "b"], "result": "failed", "reason": "x"});
        assert_eq!(
            non_dispatch_request_hash(&with_envelope),
            Some(NON_DISPATCH_SORTED.to_string())
        );
        assert_eq!(
            non_dispatch_request_hash(&bare),
            Some(NON_DISPATCH_SORTED.to_string())
        );
        // 数组顺序保留（FZ-5）
        let swapped = json!({"evidence_refs": ["b", "a"], "reason": "x", "result": "failed"});
        assert_ne!(
            non_dispatch_request_hash(&swapped),
            Some(NON_DISPATCH_SORTED.to_string())
        );
        // 嵌套对象同样按键排序规范化
        let nested = json!({"plan": {"steps": ["a"], "version": 2}, "reason": "x"});
        let nested_reordered = json!({"reason": "x", "plan": {"version": 2, "steps": ["a"]}});
        assert_eq!(
            non_dispatch_request_hash(&nested),
            non_dispatch_request_hash(&nested_reordered)
        );
        // 非对象请求体无法规范化
        assert_eq!(non_dispatch_request_hash(&json!("bare")), None);
    }
}
