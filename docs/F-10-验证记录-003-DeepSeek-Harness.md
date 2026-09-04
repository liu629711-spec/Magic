---
status: verified
date: 2026-09-04
scope: dsh-v1-magic-adapter
authority: technical-evidence-record
---

# DSH 验证记录

## 结论

DeepSeek Harness（DSH）已选为 Magic 的当前执行底座。Magic 保持自有 UI 和 Rust Local Service；Local Service 受控启动隔离 DSH，并通过其本机受鉴权 Remote API 管理会话。

## 已验证

- DSH Bundle/Profile 可加载 Magic 外部插件，并访问 `workspaceRegistry`、`sessionController` 和 `sessions`。
- DSH 可创建并持久化真实 Workspace 和 Session。
- Magic 可通过 `session/list`、`session/create`、`session/prompt`、`session/cancel` 调用本机 DSH Remote API。
- DSH 输出一次性 launch URL。Magic 只在进程内交换为 Cookie；launch token 不写入 SQLite、日志或 API。
- Magic 可经 `/api/remote.mux` 的 `session/follow` 获得每会话 snapshot 和持久日志。
- `turn/end`：`completed`、`error`、`aborted` 分别映射为 Attempt 成功、失败、取消；其他原因保守视为未知。
- Magic Local Service 已真实启动 DSH，并验证空会话列表、创建会话、列表回读和 `idle` 状态。
- 已验证 DSH Remote 的 `settings/describe`、`llm/listProviders`、`llm/listConfigurableProviders` 与 `session/modelCatalog`：当前实例返回可写设置、14 个设置命名空间、40 个可配置供应商声明与当前可路由模型目录。

可重复验证脚本：`spikes/dsh-magic-poc/run-validation.ps1`。详细样机结果：`spikes/dsh-magic-poc/RESULTS.md`。

## 当前限制

- DSH 仍处于 developer preview；版本必须固定，升级前必须回归验证。
- `session/follow` 是 per-session journal，不是全局可续传事件队列；后台全局 history 补拉尚未实现。
- Magic 设置页已接入 DSH 的模型配置与凭据写入接口，但尚未使用用户的真实凭据验证“保存配置 -> 选择模型 -> 发起真实 Agent 回合”。
- 真实模型、工具执行、取消、重启恢复和 UI 对账仍需端到端验证。

## 产品边界

DSH 提供 Agent 能力。Magic 提供 Codex 风格桌面体验、会话分组、工程/项目元数据、工作区、插件产品体验、交付物和治理。Magic 不嵌入 DSH Web UI，也不复制 DSH transcript。
