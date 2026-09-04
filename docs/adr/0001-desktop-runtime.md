---
status: accepted-with-validation
date: 2026-09-02
decision: tauri-rust-shell-with-rust-ui-and-local-service
---

# ADR-0001：Magic V1 桌面运行时

## 决策

Magic V1 使用 Tauri 作为桌面壳，并采用全 Rust 的 Magic 自有代码：

```text
Rust UI                   用户界面
Rust + Tauri              桌面层与系统桥接
Rust                      Magic 本地 API/Worker
Rust                      DSH Adapter
DeepSeek Harness (DSH)    外部执行底座子进程（Node/TypeScript）
```

“前端”在本 ADR 中指用户看到的界面，使用 Yew 0.23 + Trunk 编译为 WASM；Rust/Tauri 同时负责桌面窗口、权限、进程和生命周期。数据库和本地服务基础栈由 ADR-0005 单独决定。

## 背景

Magic 是本地桌面 Agent。它需要本地持久化任务状态、管理 DSH 子进程、处理关闭/重开后的对账，并希望控制安装体积和运行资源。DSH 的 Profile/Bundle 扩展和受鉴权本机 Remote API 已完成样机验证；Magic 的桌面壳保持独立选择。

## 选择理由

- Tauri 的桌面壳资源开销通常低于 Electron，符合本地 Agent 对体积和内存的关注；
- Rust 统一 Magic 自有代码的语言、类型和并发模型；
- Rust Adapter 通过 DSH 受鉴权本机 Remote API 接入；DSH 启动令牌仅用于进程内 Cookie 交换，绝不写入 Magic 存储或 API；
- Rust/Tauri 通过受限命令和能力配置提供桌面系统桥接，渲染层不直接访问文件系统或执行任意命令；
- Magic 的领域模型、Application、ExecutionPort 和 PersistencePort 不依赖 Tauri，未来可替换桌面壳或执行底座。

## 代价与未决技术点

Rust UI 技术上可行，但会放弃 React/TypeScript 的界面生态，并增加首版 UI 建设和维护成本。Yew 的基础能力已通过 Spike；终端和代码编辑器仍需在实现阶段做 WebView 集成验收。数据库、HTTP 框架和异步运行时已分别由 ADR-0005 选定。

当前没有足够证据表明全 Rust 能显著降低整个 Magic 的运行内存，因为本地后端、DSH、工具进程和文件索引仍然是主要开销来源。

## 验证门槛

在搭建业务模块前完成 Spike，并记录同一环境下的：

1. Rust UI 的冷启动时间、空闲内存和基础组件可用性；
2. Rust 本地 API/Worker 与 DSH Adapter 的启动和通信；
3. 单任务和并发任务内存、CPU 与 UI 响应；
4. 关闭窗口、重新打开、恢复和对账结果；
5. Tauri 能力配置、IPC 白名单和渲染层越权测试；
6. DSH 固定版本的打包、Profile/Bundle 注入和启动可靠性。

若实测不能满足 V1 的资源或生命周期要求，回到桌面运行时评审，不进入业务实现。

基础 Tauri 结果见 `spikes/tauri-desktop-runtime/RESULTS.md`，全 Rust UI/本地服务结果见 `spikes/rust-ui-runtime/RESULTS.md`。后者确认了窗口与 Worker 必须分离，因此尚未覆盖正式 Worker supervisor、真实模型请求、长时间运行和并发任务，ADR 保持 `accepted-with-validation`。
