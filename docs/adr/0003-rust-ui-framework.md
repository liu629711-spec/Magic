---
status: accepted
date: 2026-09-02
decision: yew-wasm
---

# ADR-0003：Magic V1 Rust UI 框架

## 当前决定

将 **Yew 0.23 + Trunk + `wasm32-unknown-unknown`** 作为 Magic V1 UI 路线：Rust UI 编译为 WASM，嵌入 Tauri 的系统 WebView。

## 证据

- Yew 0.23 在当前 Windows 环境实际编译通过；
- Trunk 0.21.14 实际生成 WASM、JavaScript 胶水和 CSS 资源；
- 生成的 WASM 约 311 KB，JavaScript 胶水约 31 KB；
- Yew 页面已嵌入 Tauri Release 并通过 Rust 本地接口读取状态；
- 能力 Spike 已在 WASM 目标下通过任务列表、长日志、Markdown、Diff、键盘和无障碍状态编译检查（`spikes/rust-ui-capabilities/RESULTS.md`）；
- Dioxus 当前 crates.io 最新版本为 `0.8.0-alpha.1`；Leptos 当前为 `0.9.0-beta`，本轮没有同等构建和运行证据，且不是切换 V1 的必要条件。

## 选择理由

- 当前稳定版本和构建链路已有直接证据；
- CSR + Trunk 与 Tauri WebView 的边界简单；
- Magic 的产品状态、事件和 API 契约可以继续由 Rust 类型定义；
- 不需要在首版引入 Rust 服务端渲染或 fullstack 同构复杂度。

## 后续 UI 验收

正式实现仍需用真实假数据测量任务列表虚拟化、代码编辑器/终端嵌入、实时事件流、未知状态卡、离线状态和端到端内存。若出现不可接受的组件缺口，再单独提出框架复评。

## 资源结论

Rust UI 的小资源体积不等于整个 Agent 小资源占用。性能验收必须以桌面、Rust 服务、Worker、DSH、工具进程和日志渲染的总进程组为准；DSH 的真实负载内存仍待测量。
