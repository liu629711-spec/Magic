---
status: draft
version: 1.0
date: 2026-09-02
authority: technical-design-draft
---

# Magic 数据库设计 V1

## 1. 设计原则

数据库保存 Magic 的产品事实和审计事实；DSH 持有会话与日志，Magic 只保存必要的底层绑定和产品扩展元数据。所有时间使用 UTC；所有状态变更写入不可变事件表，再维护当前状态投影。

第一版采用关系模型，数据库引擎冻结为 SQLite，Rust 驱动使用 rusqlite `bundled`。字段类型仍使用逻辑类型描述，具体 SQL 方言、迁移文件和索引实现由正式骨架确定。

## 2. 核心表

### `workspace`

| 字段 | 说明 |
|---|---|
| `id` PK | Magic 工作区 ID |
| `root_path` | 工作区根目录 |
| `status` | `active`/`archived` |
| `created_at`, `updated_at` | 时间 |

### `project`

| 字段 | 说明 |
|---|---|
| `id` PK | 工程 ID |
| `workspace_id` FK | 所属工作区 |
| `name`, `goal` | 工程名称和目标 |
| `status` | `proposed`/`confirmed`/`active`/`paused`/`archived` |
| `pm_member_id` FK nullable | 当前唯一 PM |
| `created_at`, `updated_at` | 时间 |

### `resource`

记录 Git 仓库、worktree、文件目录或外部资源。字段：`id`、`project_id`、`kind`、`uri`、`scope_json`、`status`、`version_ref`、`created_at`、`updated_at`。

### `magic_session`

记录 Magic 产品层会话元数据，不等同于 DSH Session。字段：`id`、`workspace_id`、`project_id` nullable、`mode`（`agent`/`ceo`）、`primary_member_id` nullable、`status`、`title`、`created_at`、`updated_at`、`archived_at` nullable。

### `task_session`

连接会话和任务：`task_id`、`session_id`、`relation`（`primary`/`member`/`review`）、`created_at`。唯一约束为 `(task_id, session_id, relation)`。

### `member`

记录 Magic 工程成员关系，不等同于底座 Agent。字段：`id`、`project_id`、`kind`（`pm`/`member`/`temporary`）、`display_name`、`role_snapshot_json`、`permission_snapshot_json`、`status`、时间字段。

数据库约束：同一 `project_id` 同时最多一个 active PM。

### `task`

字段：`id`、`project_id`、`parent_task_id` nullable、`title`、`goal`、`acceptance_json`、`current_owner_id`、`status`、`priority`、`created_at`、`updated_at`、`completed_at`。

数据库约束：正式 Task 必须有一个当前责任人；删除采用归档，不物理删除。

### `plan_step`

记录任务内普通计划步骤：`id`、`task_id`、`parent_step_id` nullable、`title`、`description`、`position`、`status`、`owner_id` nullable、`depends_on_json`、`acceptance_json`、时间字段。计划步骤完成不自动完成 Task。

### `task_dependency`

记录正式任务依赖：`task_id`、`depends_on_task_id`、`kind`（`blocks`/`relates`）、`created_at`。唯一约束为 `(task_id, depends_on_task_id, kind)`，禁止自依赖。

### `task_attempt`

每次实际执行一行。字段：`id`、`task_id`、`attempt_no`、`status`、`requested_by`、`input_json`、`input_hash`、`idempotency_key`、`started_at`、`finished_at`、`cancel_reason`、`error_json`、`unknown_reason`、时间字段。

唯一约束：`(task_id, attempt_no)`、`(task_id, idempotency_key)`。

### `attempt_binding`

保存底层引用而不是假设的 Run：`id`、`attempt_id`、`adapter`（当前为 `dsh-v1`）、`session_id`、`message_id` nullable、`process_id` nullable、`binding_json`、`created_at`、`released_at`。

同一个 Attempt 可以有多个底层引用，但同一时刻只允许一个 active binding。

### `idempotency_request`

字段：`id`、`scope_type`、`scope_id`、`idempotency_key`、`request_hash`、`response_json`、`entity_type`、`entity_id`、`created_at`、`expires_at` nullable。

唯一约束：`(scope_type, scope_id, idempotency_key)`。请求 hash 不同必须返回冲突。

## 3. 事件和恢复表

### `event_ledger`

不可变事件账本。字段：`id`、`aggregate_type`、`aggregate_id`、`seq`、`event_type`、`source`、`source_event_id` nullable、`payload_json`、`occurred_at`、`received_at`。

唯一约束：`(aggregate_type, aggregate_id, seq)`；若存在来源 ID，再约束 `(source, source_event_id)`。写入冲突视为重复事件，不重复更新投影。

### `event_cursor`

字段：`aggregate_type`、`aggregate_id`、`last_confirmed_seq`、`last_received_at`、`connection_state`、`updated_at`。唯一键为 `(aggregate_type, aggregate_id)`。

### `reconciliation_run`

记录一次对账：`id`、`attempt_id`、`trigger`（`startup`/`disconnect`/`manual`/`timer`）、`from_seq`、`to_seq`、`result`、`details_json`、`started_at`、`finished_at`。

## 4.1 项目知识表

### `fact`

记录项目可复用事实和版本：`id`、`project_id`、`content`、`source_json`、`scope_json`、`status`（`candidate`/`confirmed`/`disputed`/`revoked`/`obsolete`）、`version`、`confirmed_by` nullable、`created_at`、`updated_at`、`revoked_at` nullable。事实更新采用新版本，不覆盖旧记录。

## 5. 治理和交付表

- `approval_request`：动作、资源范围、风险、状态、授权者、有效期和底层 request 引用。
- `usage_record`：Attempt、provider/model、input/output/reasoning/cache token、cost、原始 usage JSON。
- `side_effect`：文件写入、命令、网络或发布动作，记录目标、授权、结果、可逆性和 Attempt。
- `artifact`：产物 URI、类型、摘要、校验值、验收状态和来源 Attempt。
- `changeset`：worktree、分支、diff 摘要、冲突状态和合并责任人。
- `audit_log`：主体、动作、对象、前后状态、原因、request ID 和时间；只追加不更新。

## 6. 投影和事务边界

一次状态变化在同一事务中完成：

1. 校验幂等键、责任人和权限快照。
2. 插入 `event_ledger`。
3. 更新 `task` 或 `task_attempt` 当前投影。
4. 插入 `audit_log`，必要时插入 usage/side_effect/artifact 引用。
5. 提交后异步通知前端。

实时通知发送失败不能回滚已提交事件；客户端通过事件游标重新读取。

## 7. 重启扫描

服务启动后查询 `task_attempt.status in ('admitted','running','cancelling')` 的行，逐一创建 `reconciliation_run`。对账成功后才允许进入终态；否则更新为 `unknown_after_restart` 并记录原因。启动扫描不得直接创建新的 Attempt。

## 8. 查询索引

- `task(project_id, status, updated_at)`
- `task_attempt(task_id, status, started_at)`
- `attempt_binding(session_id)`
- `event_ledger(aggregate_type, aggregate_id, seq)`
- `event_cursor(aggregate_type, aggregate_id)`
- `approval_request(status, project_id)`
- `audit_log(object_type, object_id, created_at)`

## 9. 数据保留和删除

Task、Attempt、事件、审批、费用、副作用和审计记录默认保留；用户删除工作区时先软删除并保留审计引用。DSH 原始日志不复制进 Magic；不能删除 Magic 对 Attempt 状态判断所需的摘要、来源 ID 和事件序号。

## 10. 尚未冻结的实现选择

迁移工具、事件 JSON 的具体 schema、认证主体模型、费用币种和多用户授权暂不在本版冻结。SQLite 引擎和 rusqlite 驱动已由 ADR-0005 冻结；其余选择不影响上述逻辑约束，需在正式实现仓库中确认。

## 11. 当前实现检查点

`crates/persistence` 已完成最小 SQLite Adapter：创建 `task_attempt`、`attempt_binding`、`event_ledger` 和 `event_cursor` 表，使用事务同时追加状态事件和更新 Attempt 投影，并由唯一约束拒绝同一 Task 的重复幂等键。派发时保存 DSH adapter、session ID 和可获得的 message ID；外部事件支持按来源事件 ID 及聚合序号去重。DSH 当前的持久日志是 per-session journal，后台全局 history 补拉尚未实现。该实现还不是完整迁移集，其他表会按应用用例逐步加入。
