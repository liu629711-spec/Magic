---
status: accepted-with-validation
date: 2026-09-02
decision: rust-for-magic-owned-code-opencode-external
---

# ADR-0002：Magic V1 语言栈

## 决策

Magic 自有代码统一使用 Rust：

- Tauri 桌面层；
- 用户界面及其状态逻辑；
- 本地 API、Application、Domain、Worker 和 Recovery；
- 数据库访问与迁移工具；
- OpenCode V1 Adapter、事件对账和进程管理；
- 单元、合约、集成和桌面测试。

OpenCode V1 是外部执行底座，继续以其现有 Bun/TypeScript 进程运行。Rust 通过已验证的 HTTP/API 与它通信，不把 OpenCode 的源码语言误写成 Magic 的语言栈。

## 理由

- 用户明确要求 Magic 自有代码统一 Rust；
- Rust 适合本地桌面、文件、进程、权限、并发和资源控制；
- 统一语言可以减少 Magic 内部跨语言边界；
- OpenCode Adapter 接缝保留后，未来仍可替换 OpenCode V2 或 DeepSeek Harness。

## 未冻结的实现选择

“全 Rust”不等于 Magic 可以替换外部 OpenCode V1 的 Bun/TypeScript 实现。Magic 自有 UI、本地服务和业务代码统一使用 Rust；以下基础设施已通过 Spike 选定：

- UI：Yew 0.23 + Trunk + WASM（已通过运行与能力 Spike）；
- 异步运行时：Tokio；
- HTTP：Axum；
- SQLite：rusqlite `bundled`，迁移方式待正式骨架确定；
- 前端到 Rust 本地 API 的 IPC/HTTP 方式。

## 验证门槛

正式业务开发前，Rust Spike 必须至少实现一个不含业务数据的垂直链路：启动桌面窗口、渲染任务列表假数据、调用 Rust 本地服务、拉起/发现 OpenCode V1、显示健康状态、关闭后重新打开并发现服务。当前验证记录见 `spikes/rust-ui-runtime/RESULTS.md`、`spikes/rust-worker-runtime/RESULTS.md` 和 `spikes/rust-ui-capabilities/RESULTS.md`，已证明基础链路、独立 Worker 生命周期和 UI 基础能力可行；真实任务和编辑器/终端集成仍属于正式实现验收。

若 Rust UI 或 Rust 本地后端无法满足 V1 的界面能力、资源目标或开发维护成本，回到语言栈评审；在此之前不开始正式业务实现。
