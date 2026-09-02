# Magic Rust Worker Runtime Spike

这是独立于 Tauri 窗口的最小 Rust Worker 验证。它只验证进程生命周期、runtime manifest、健康检查和单实例锁，不包含 Task、Attempt、数据库或产品业务代码。

## 运行

```text
cargo run --manifest-path spikes/rust-worker-runtime/Cargo.toml
```

环境变量：

- `MAGIC_WORKER_PORT`：监听端口，默认 `45275`。
- `MAGIC_WORKER_MANIFEST`：运行清单路径，默认当前目录的 `magic-worker-runtime.json`。
- `MAGIC_WORKER_TOKEN`：健康检查令牌，默认仅用于 Spike 的 `spike-token`。

健康检查必须带 `X-Magic-Worker-Token` 请求头。manifest 和 `.lock` 文件应放在应用数据目录；生产版本还需要 supervisor、崩溃恢复和数据库对账。

