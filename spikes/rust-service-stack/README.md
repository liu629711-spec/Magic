# Magic Rust Service Stack Spike

该 Spike 只验证 Rust 本地服务的基础技术组合：Tokio 异步运行时、Axum HTTP 路由和 rusqlite（bundled SQLite）。不包含 Magic 业务模型或正式数据库表。

## 验证

```text
cargo check
```

## 当前建议

- Tokio：统一 Worker、HTTP 和后台恢复任务的异步运行时；
- Axum：本地 API 的路由和请求处理；
- rusqlite + bundled SQLite：本地单用户应用的数据库驱动，明确控制 SQLite 版本；通过受控 blocking 边界访问数据库，并启用 WAL。

