---
status: draft-p0
owner: AgentCore 后端架构技术总监
approval: five-party
---

# Magic 最小执行与收敛契约 v0

## 权威与冲突规则

产品裁定高于全部技术文档。《首版生产拓扑与底座锁定 ADR》、本执行与收敛契约、《F-10 与首次开发准入验收规范》在各自适用范围内并列构成 P0 技术基线；版本化 schema、状态表、fixture、事件映射和 evidence manifest 由对应主文档明确引用并以 hash 固定，属于规范性组成部分。

三份 P0 或其规范性附件发生冲突时，不按隐含优先级猜测，First Development 保持 No-Go，直到五方完成修订与重新签署。

Magic 账本与 Projection 持有产品真相；OpenCode 事件、Session、Run、Permission、Tool 和资源状态是不可改写证据。

## 最小关系

```text
MagicTask 1-N TaskAttempt
TaskAttempt 1-1 RootExecutionBinding
RootExecutionBinding 1-1 canonical OpenCode Session（首切片候选）
TaskAttempt 1-N runtime/tool/approval/resource evidence
```

重试创建新 Attempt；底座结束、文件存在或 SSE 断开不能关闭 MagicTask。

技术验证切片和首次正式产品切片必须使用版本化 `ContextEnvelope` 与不可变 `TaskResultPacket`。`TaskResultPacket.status_proposal` 只能建议状态，不能直接关闭任务。

每个正式任务必须记录唯一 `acceptance_authority_id`。首切片中，PM 派发的成员任务由当前 PM 验收；用户发起的根任务或工程交付由用户验收。成员任务与根任务分别形成唯一终态，任何一方的验收都不能改写另一任务的历史。

## 必须分层的状态

Task、TaskAttempt/Run、Connection、Sync/Completeness、Approval、Artifact、ChangeSet、SideEffect、Responsibility 和 PM 状态分别维护。

同步缺口使用 `sync_unknown/gap/reconciling/manual_reconciliation_required` 等明确状态，保留最后已知事实、责任人和下一步。

## 规范性附件待补

- ID、event envelope、snapshot、cursor、幂等与 reconciliation schema；
- `ContextEnvelope v0` 与 `TaskResultPacket v0`；
- Projection ReadModel 与前端禁止推导矩阵；
- `SideEffectIntent`、receipt、外部核对、人工补偿和审计 schema；
- PM 唯一性、HandoverRecord、待接管和不自动迁移责任的不变量；
- Resource、worktree、Artifact、ChangeSet、MergeTask 和合并责任边界。

Git worktree 由 Magic Resource/Git Adapter 创建、登记并绑定 base commit。无法确认的非幂等副作用不得自动重试。
