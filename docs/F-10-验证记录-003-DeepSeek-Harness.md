---
status: partial
date: 2026-09-02
scope: f10-t08-deepseek-harness
authority: technical-evidence-record
---

# F-10 验证记录 003：DeepSeek Harness

## 1. 目的

按与 OpenCode 相同的可靠性关注点验证 DeepSeek Harness：标准进程入口、会话输入、持久化、事件通知、断点跟随、服务关闭和进程重启后的会话行为。本记录只证明本次参考提交和本次运行结果，不证明 Magic 已完成接入。

## 2. 源码事实

- SDK 应用通过 `dsh --profile sdk` 启动 stdio JSON-RPC 服务，见 `reference-project/deepseek-harness/packages/bundle/sdk-app/src/index.ts:38-61`。
- SDK 协议当前只有 `initialize`、`session/prompt`、`shutdown` 三类请求；事件和状态由服务端通知，见 `reference-project/deepseek-harness/packages/sdk/protocol/src/types.ts:106-119`。
- SDK 服务收到 `session/prompt` 时调用 `getOrCreateSession`，再对新 Agent 调用 `ctx.agents.create`；该路径没有调用 `resume`，见 `reference-project/deepseek-harness/packages/sdk/server/src/server.ts:176-192`、`258-275`。
- JSONL 持久化后端提供 `create`、`append`、`load`、`inspect`、`readFrom`，见 `reference-project/deepseek-harness/packages/session/session-persistence-jsonl/src/index.ts:131-217`。
- Session Controller 的 `follow` 先发送快照，再按连续序号发送后续事件，见 `reference-project/deepseek-harness/packages/api/session-controller/src/history.ts:100-170`。
- SDK 服务文档明确列出当前协议没有逐会话关闭或提示词取消方法，见 `reference-project/deepseek-harness/packages/sdk/server/README.zh.md:118-125`。

## 3. 执行环境

| 项目 | 值 |
| --- | --- |
| 参考版本 | `@deepseek-ai/dsh-root 0.1.2-alpha.4` |
| 运行平台 | Windows；Node `v24.15.0` |
| 构建 | `pnpm run build`，通过；生成 host/client 运行产物 |
| 模型 | 本地 HTTP SSE 模型替身，不访问真实 DeepSeek API |
| 隔离 | 临时 `DSH_HOME`、临时会话目录、`DSH_TELEMETRY_DISABLED=1` |

## 4. 结果

| 场景 | 结果 | 证据 |
| --- | --- | --- |
| SDK 进程启动与握手 | 通过 | `keyless-smoke.e2e.ts`：5/5 通过；`initialize` 返回 `deepseek-harness-sdk-runtime` |
| 异步提示词入队与事件 | 通过 | 同一测试确认 `session/prompt` 返回 `messageId`，并收到 `session.event` 的 `turn/end` |
| 关闭与会话落盘 | 通过 | 同一测试确认 `shutdown` 返回空结果，且 `.jsonl.zstd` 文件可读取并含 `session` 头 |
| JSONL 读取/追加/重开 | 通过 | `session-persistence-jsonl/tests/jsonl.spec.ts`：164/164 通过 |
| 事件快照、连续跟随、分页 | 通过 | `session-history-journal.host.spec.ts`、`controller.host.spec.ts`、`session-cold.host.spec.ts`：32/32 通过 |
| 进程重启后复用同一 `sessionId` | **不通过** | 首个进程正常完成并关闭；第二个进程初始化成功，`session/prompt` 先返回新的 `messageId`，随后 `turn/end` 报 `session "restart-demo" already has a persisted log on disk that does not match this live session (id collision)` |
| SDK 逐提示词取消 | 未提供 | SDK 请求类型没有 cancel 方法；文档将其列为当前限制 |
| Windows 硬崩溃恢复 | 未执行 | Harness 的语义硬崩溃测试在 Windows 使用 `describe.skipIf(process.platform === 'win32')`，见 `packages/session/session-checkpoint-policy/tests/crash-recovery.e2e.ts:87` |

## 5. 结论

1. DeepSeek Harness 的持久化和事件读取基础比 OpenCode V1 更完整：已有 JSONL 持久化、按序事件日志、历史分页和快照后跟随机制。
2. 当前 SDK 入口不能直接作为 Magic 的“重启可恢复执行服务”。它会把相同 `sessionId` 当作新的内存 Agent 创建，和旧日志发生 ID 冲突；因此 `sessionId` 不能直接等同于 Magic 的可恢复 Attempt。
3. 当前 SDK 协议没有取消方法。Magic 若需要取消，必须扩展 Harness 适配层/协议，或改用能直接操作 Agent 的 Host API；不能在现有 SDK 协议上假设该能力存在。
4. 本轮证明了“可落盘、可读、可跟随”，但没有证明 Windows 硬崩溃恢复，也没有证明 Magic 任务与 Harness 会话的正式绑定模型。T-06/T-07 继续保持未完成，不冻结正式底座选型。

## 6. 对 Magic 的建议

下一步不是直接把 SDK 接到产品，而是先做一个薄适配实验：启动一个长期 Harness Host，使用 Session Controller 的 `create`、`prompt`、`cancel`（若由 Host 适配层提供）和 `follow`，并由 Magic 保存自己的 `taskId`、`attemptId`、Harness `sessionId`、最后确认事件序号和状态未知标记。若必须采用进程外 SDK，则先补齐“恢复已有会话”和“取消提示词”两个协议能力，再进入第一版实现。
