---
status: draft
version: 1.0
date: 2026-09-02
authority: technical-design-draft
---

# Magic 后端方案 V1

## 1. 目标和边界

本方案用于单用户、单工作区、单工程的第一版闭环。Magic 是产品控制层，OpenCode V1 是执行层。Magic 不把 OpenCode Session、进程状态或实时 SSE 当作自己的 Task、Attempt 或最终状态。本地 API/Worker 的实现基础栈为 Tokio + Axum；产品状态由 SQLite 持久化。

本版支持代理和 CEO 两种工作方式，但先以单用户、单工程、一名 PM/正式成员验证闭环。CEO 模式在后端表现为对 Task/Plan/Attempt 的编排；多成员并发、复杂组织编排和自动扩编不在本版冻结。

## 2. 责任分工

| 层 | 负责 | 不负责 |
|---|---|---|
| Magic API | 产品对象、权限入口、任务状态、结果和审计 | 直接执行模型工具 |
| Task Orchestrator | 创建 Attempt、单责任人约束、派发、取消、重试和收口 | 把 OpenCode 的 idle 当作完成 |
| OpenCode V1 Adapter | 调用 session/message/prompt_async/abort、读取 message 和 sync history | 持久化 Magic 任务状态 |
| Event Reconciler | 消费实时事件、保存游标、断线补拉、去重和状态收敛 | 重新解释底层事件为产品完成 |
| Policy/Audit | 审批、资源范围、预算检查、副作用审计 | 撤销已经发生的文件、命令或外部影响 |

## 3. OpenCode V1 接入契约

适配器只依赖已验证的 V1 接口：

1. `POST /session` 创建底层 Session。
2. `POST /session/:sessionID/message` 做同步投递，或 `POST /session/:sessionID/prompt_async` 做异步投递。
3. `GET /session/:sessionID/message` 读取已落盘消息。
4. `POST /session/:sessionID/abort` 请求取消当前执行。
5. `GET /event` 接收实时事件。
6. `POST /sync/history` 按 `aggregate_id` 和 `seq` 补拉事件。

V1 `GET /event` 的 SSE 信封没有标准 `id:` 字段；Magic 不使用 `Last-Event-ID` 作为恢复机制。实时连接只负责低延迟通知，最终状态由消息读取和 history 补拉确认。

## 4. 核心服务

### 4.1 Task Service

- 创建、更新、分配、暂停、取消、归档和重新打开 Task。
- 保证每个正式 Task 同时只有一个 `current_owner_id`。
- Task `completed` 必须由结果和验收证据确认，不能由 OpenCode 请求成功代替。

Task 可以有 Plan 和子 Task。只有需要独立责任、独立交付、独立验收或独立等待时才创建子 Task；普通步骤保留为 Plan step，不额外创建 Agent。

### 4.2 Attempt Service

每次实际派发都创建新 Attempt，即使复用同一个 OpenCode Session。Attempt 保存底层绑定、输入幂等键、开始/结束时间、取消原因、错误、用量和副作用引用。

V1 没有已证实的第一方 Run 对象，因此绑定字段使用可审计引用：`opencode_session_id`、`opencode_message_id`、`opencode_process_id`（如可获得）和请求快照，而不是假设存在 `Run`。

CEO 派发成员工作包时，每个工作包仍通过同一 Attempt Service 创建和收口，CEO 只负责依赖、汇总和冲突决策，不改变 Attempt 的状态语义。

### 4.3 Event Reconciler

- 事件到达先写入 Magic event ledger，再更新派生状态。
- 按 `(source, event_id)` 去重；对 sync 事件同时校验 `(aggregate_id, seq)`。
- 每个聚合保存最后确认的 `seq`。
- SSE 断开、超时或服务重启后，使用 `/sync/history` 请求 `seq` 之后的事件。
- 无法确定中断前最终结果时，将 Attempt 标记为 `unknown_after_restart`，等待人工重试或收口。

### 4.4 Policy and Approval

OpenCode 的权限拦截可以作为底层保护，但 Magic 仍保存授权快照、目标资源、有效期和审批记录。高风险动作在 Magic 侧未获得明确授权时不得派发。

### 4.5 Recovery Worker

Recovery Worker 是独立于 Tauri 窗口的 Rust 进程。桌面层只负责启动或发现它，不能把窗口进程的存活当作 Worker 或 Attempt 的存活证明。

启动时扫描 `running`、`cancelling` 和没有终结事件的 Attempt：

- 先查询 OpenCode message 和 history；
- 能确认成功/失败/取消则收口；
- 只能确认 session 存在但无法确认执行结果则进入 `unknown_after_restart`；
- 不自动重复投递，除非用户明确选择重试。

Worker 启动和发现使用本地 runtime manifest（进程 ID、API 地址、协议版本、实例令牌和启动时间）及带令牌健康检查。独立 Worker Spike 已验证 manifest 发布、重复实例拒绝、无关桌面进程退出后继续健康，以及旧实例失效后的重新启动和发现。发现已有健康 Worker 时不得重复启动；manifest 存在但健康检查失败时，必须先确认 PID/实例身份已失效并保留证据，再进入恢复流程，不静默覆盖旧实例。Windows 允许 PID 复用，不能只用 PID 判断是否为新实例。

## 5. 状态模型

Task 和 Attempt 分离：

```text
Task: proposed -> ready -> in_progress -> awaiting_review -> completed
                         |             |                 |
                         v             v                 v
                      blocked       cancelled          failed

Attempt: created -> admitted -> running -> cancelling -> cancelled
                                  |           |
                                  v           v
                               succeeded    failed
                                  |
                                  v
                    unknown_after_restart (重启/对账无法确认时)

`unknown_after_restart` 也可以从 `admitted`、`running` 或 `cancelling` 进入；它只能依据新的消息/history/人工证据收口为成功、失败或取消。
```

`unknown_after_restart` 不是成功或失败；它表示系统需要用户决定是否基于现有证据继续、重试或人工确认。

## 6. 请求幂等

所有会产生执行的写请求必须由 Magic 生成或要求客户端提供 `idempotency_key`。数据库对 `(task_id, idempotency_key)` 建唯一约束。

- 相同 key 且请求体摘要相同：返回第一次请求的结果，不创建新 Attempt。
- 相同 key 但请求体不同：返回冲突，不执行。
- 没有 key：服务端生成 key，但客户端超时后重试不能保证语义一致，因此响应中必须返回实际 key。

OpenCode V1 的 `messageID` 只作为底层引用，不作为 Magic 幂等保证。

## 7. 关键 API（Magic 内部）

| 方法 | 路径 | 作用 |
|---|---|---|
| POST | `/api/tasks` | 创建 Task |
| GET | `/api/tasks/:id` | 获取 Task、当前 Attempt 和收口摘要 |
| POST | `/api/tasks/:id/attempts` | 创建并派发 Attempt，必须带幂等键 |
| POST | `/api/tasks/:id/plan` | 创建或更新计划步骤和依赖 |
| POST | `/api/attempts/:id/cancel` | 请求取消，不撤销已发生副作用 |
| POST | `/api/tasks/:task_id/attempts/:attempt_id/reconcile` | 主动触发消息/history 对账 |
| POST | `/api/tasks/:id/retry` | 基于用户选择创建新 Attempt |
| GET | `/api/tasks/:id/events` | 读取 Magic 事件账本，支持游标 |
| POST | `/api/approvals/:id/decision` | 批准或拒绝一次授权请求 |

所有写接口返回 `request_id`、实体 ID、当前状态和可追溯的事件序号。

## 8. 失败和重启规则

- 客户端断开不等于取消；后台 Attempt 继续由服务负责观察。
- 取消请求成功只表示已向 OpenCode 发出取消并记录结果，不表示已经撤销文件或外部副作用。
- OpenCode 服务重启后，已落盘 session/message 可读取；进程内 busy/retry 状态不作为恢复依据。
- 对账期间禁止自动重复派发，避免同一用户目标产生两次副作用。
- 所有无法确认的边界都必须显示为未知，并保留人工收口入口。

## 9. 可观测性和验收

每个 Attempt 至少记录：Magic request、OpenCode session/message 引用、首次和最后事件、输入摘要、状态变更、取消请求、错误、token/cost、审批和副作用引用。验收以数据库记录、OpenCode message、history 事件和工作区 diff 交叉确认。

## 10. 明确不做

本版不承诺 OpenCode 进程级自动接管、不实现 V2 执行器、不把 SSE 当可靠消息队列、不实现自动补偿/撤销、不实现多人并发合并和跨工程借调。

## 11. 当前实现检查点

`apps/local-service` 已提供 Axum 本地 API 的最小垂直切片：`GET /health`、`POST /api/tasks/:task_id/attempts` 和 `POST /api/tasks/:task_id/attempts/:attempt_id/reconcile`。派发、幂等和 binding 已接入 Application/SQLite；reconcile 会读取 binding、解析真实消息终态，并在证据不足时把运行中的 Attempt 收口为 `unknown_after_restart`。本机 OpenCode CLI `1.18.21` 的真实 HTTP 冒烟及可选 Rust 集成测试已验证 Magic 创建 Session、异步投递、重复请求复用和消息对账失败收口。`crates/reconciliation` 已实现外部事件写入、来源 ID/聚合序号去重和不跳过缺口的游标推进；Adapter 已能读取一次性 SSE 数据和调用 `/sync/history`，`apps/local-service` 的 Recovery Worker 会周期补拉 history 并扫描活跃 Attempt 自动执行对账。后台 SSE 长连接仍未接入。

依据：[F-10 OpenCode HTTP API](../F-10-验证记录-001-OpenCode-HttpApi.md)、[F-10 OpenCode 事件协议](../F-10-验证记录-002-OpenCode-事件协议.md)、[产品技术声明台账](../产品技术声明台账-2026-09-02.md)。
