# Magic V1 Rust 工作区骨架

这是正式业务实现前的最小工作区。`crates/domain` 已包含 Task/Attempt 状态规则，`application` 已串起幂等派发，`persistence` 已提供 SQLite 事务和事件账本最小实现，`execution-opencode-v1` 已提供 V1 HTTP Adapter；`apps/local-service` 是独立 Worker/API 进程入口。完整数据库迁移、Worker 对账和产品界面仍在后续阶段。

桌面 Tauri/Yew 工程继续在 `spikes/rust-ui-runtime` 验证目录中迭代，待本骨架接入 typed contracts 后再迁入 `apps/desktop`。
