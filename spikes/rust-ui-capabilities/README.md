# Magic Rust UI 能力 Spike

该 Spike 用 Yew 0.23 编译一个最小能力页面，覆盖任务列表、长日志、Markdown 文本解析、Diff 计算、键盘事件、ARIA 标记和错误状态。它不代表最终视觉设计，也不包含 Magic 业务代码。

## 验证

```text
cargo check --target wasm32-unknown-unknown
```

## 解释

任务列表在 Spike 中使用固定窗口渲染 50 行来模拟虚拟列表的边界；正式版本仍需选择经过验证的虚拟列表组件或实现窗口化数据源。终端和代码编辑器通常需要 WebView 中的成熟 JavaScript 内核，通过窄的 Rust/WASM 绑定接入；这不改变 Magic 自有业务代码使用 Rust 的决定，但需要单独做集成验收。

