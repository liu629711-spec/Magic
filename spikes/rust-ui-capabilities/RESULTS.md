# Rust UI 能力 Spike 结果

日期：2026-09-02

## 结论

Yew 0.23 在 `wasm32-unknown-unknown` 目标下通过能力编译检查，能够承载 Magic V1 的基础界面状态：任务列表数据、长日志节点、Markdown 解析、Diff 计算、键盘事件、ARIA 标记和错误状态。结合 `spikes/rust-ui-runtime` 的 Trunk + Tauri 实际构建证据，Yew 可以作为 V1 Rust UI 框架冻结。

## 验证结果

命令：`cargo check --target wasm32-unknown-unknown`

| 能力 | 结果 |
|---|---|
| 任务列表数据和状态卡 | 通过 |
| 50 行窗口化渲染边界 | 通过 |
| 10,000 行长日志节点生成 | 通过 |
| Markdown 文本解析（pulldown-cmark） | 通过 |
| Diff 变化计算（similar） | 通过 |
| 键盘上下移动事件 | 通过 |
| `aria-current` 和 `role=alert` 状态标记 | 通过 |
| Rust/WASM 目标编译 | 通过 |

## 边界

Spike 只验证 Rust/WASM 组件和数据能力，不代表最终视觉设计或性能预算。长列表正式实现必须使用窗口化/虚拟列表，不能把全部历史日志一次性挂载。终端和代码编辑器应优先集成成熟内核（通常是 WebView JavaScript 内核）并通过窄绑定接入；Magic 自有控制层、状态和业务代码仍保持 Rust，内核集成需在 E2E 阶段单独验收。

