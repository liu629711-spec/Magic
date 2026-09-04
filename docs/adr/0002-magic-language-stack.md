---
status: accepted-with-validation
date: 2026-09-02
decision: rust-for-magic-owned-code-dsh-external
---

# ADR-0002：Magic V1 语言栈

## 决策

Magic 自有代码统一使用 Rust：

- Tauri 桌面层；
- 用户界面及其状态逻辑；
- 本地 API、Application、Domain、Worker 和 Recovery；
- 数据库访问与迁移工具；
- DSH Adapter、事件对账和进程管理；
- 单元、合约、集成和桌面测试。

DSH 是外部执行底座，继续以其现有 Node/TypeScript 进程运行。Rust 通过受鉴权本机 Remote API 与它通信，不把 DSH 的源码语言误写成 Magic 的语言栈。

## 理由

- 用户明确要求 Magic 自有代码统一 Rust；
- Rust 适合本地桌面、文件、进程、权限、并发和资源控制；
- 统一语言可以减少 Magic 内部跨语言边界；
- ExecutionPort 接缝保留后，未来仍可替换 DSH 或其他执行底座。

## 未冻结的实现选择

“全 Rust”不等于 Magic 可以替换外部 DSH 的 Node/TypeScript 实现。Magic 自有 UI、本地服务和业务代码统一使用 Rust；以下基础设施已通过 Spike 选定：

- UI：Yew 0.23 + Trunk + WASM（已通过运行与能力 Spike）；
- 异步运行时：Tokio；
- HTTP：Axum；
- SQLite：rusqlite `bundled`，迁移方式待正式骨架确定；
- 前端到 Rust 本地 API 的 IPC/HTTP 方式。

## 验证门槛

正式业务开发前，Rust Spike 必须至少实现一个不含业务数据的垂直链路：启动桌面窗口、渲染会话工作区、调用 Rust 本地服务、拉起 DSH、显示健康状态、关闭后重新打开并发现服务。当前验证记录见 `spikes/rust-ui-runtime/RESULTS.md`、`spikes/rust-worker-runtime/RESULTS.md` 和 `spikes/rust-ui-capabilities/RESULTS.md`，已证明基础链路、独立 Worker 生命周期和 UI 基础能力可行；真实模型和工具执行仍属于正式实现验收。

若 Rust UI 或 Rust 本地后端无法满足 V1 的界面能力、资源目标或开发维护成本，回到语言栈评审；在此之前不开始正式业务实现。
