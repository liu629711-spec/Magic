---
status: agreed-baseline
date: 2026-08-30
type: product-technology-alignment
authority: architecture-meeting-input
sources:
  - docs/01-产品/PRD-01-Magic产品总览.md
  - D:/Magic/archive/product-docs-legacy/99-历史会议/会议记录-第一轮-*.md
  - D:/Magic/archive/product-docs-legacy/99-历史会议/会议记录-第二轮-*.md
  - D:/Magic/archive/product-docs-legacy/99-历史会议/会议记录-第三轮-*.md
---

# Magic 产品-技术对齐共同基线

> 本文将四位技术总监已签署的共同结论转成架构讨论入口。它不是实现方案，也不替代产品裁定或实机证据。

## 一、会议结论

四位技术总监对产品方向达成**有条件一致**：

- Magic 的产品方向可继续推进。
- OpenCode 是强执行底座，AgentCore 提供运行机制和试运行经验；两者都不直接定义 Magic 的长期产品语义。
- 在完成 F-10 前，不冻结首版数据库、API、完整状态机和开发排期。
- F-10 是当前唯一组合技术阻塞，不将后置的高级协作能力另设为阻塞。

## 二、不可混同的三层

```text
Magic 产品对象与责任账本
        | Adapter / Projection
AgentCore Interaction / Turn / Run / Journal
        | Adapter / Runtime Contract
OpenCode Session / Message / Event / Tool / Workspace
```

以下对象不得直接等同：

- OpenCode `Session` 不等于 `MagicSession` 或 `MagicTask`。
- OpenCode `AgentV2` 不等于长期 `AgentIdentity` 或 `ProjectMember`。
- AgentCore `CAPTAIN` 不等于 Magic PM。
- AgentCore worker、`RunSession`、transcript 不等于长期成员或完整项目记忆。
- Run 完成、工具成功、文件写入、SSE 断开不等于 Magic Task 成功。

## 三、首版共同范围

首版先收敛为可验证闭环：单用户、单工程、唯一当前 PM、一个 Git 主资源、一个主 Agent、少量项目成员，以及每个执行任务一个明确的 `TaskAttempt` 与执行目标。

首版必须具备的产品语义：

1. Magic 独立持有任务、责任、审批、产物、资源和副作用账本。
2. `MagicTask`、`Turn`、`TaskAttempt`、底座 Run、连接同步、审批、产物和责任使用分层状态，不能相互覆盖。
3. 代理、CEO、工程组织和计划推进是可组合但独立的维度。CEO 只在新一轮工作开始时选择，不在已执行的进程中无损切换。
4. 同一正式任务任一时刻只有一名当前责任人；同一工程任一时刻只有一名当前 PM，交接必须显式记录。
5. 协作以最小任务上下文、结果包、产物引用和受控事实访问为核心，不共享完整会话或私有记忆。
6. U-12 的三档入口只影响常规审批体验；资源边界、预算、有效期、高风险动作和系统禁止项必须独立生效。

下列内容明确后置：完整圆桌、多层 PM、跨工程写入或借调、多用户多端协同、永久 Agent，以及任意时刻无损重编排。

## 四、F-10: 唯一首版技术阻塞

在锁定 OpenCode runtime、commit/tag 与 canonical protocol/client contract 后，必须产出可重复的端到端证据，验证同一 `MagicTask` / `TaskAttempt` 在以下场景后的最终收敛：

- 断连、重连和服务进程重启；
- 重复、乱序和缺失事件；
- 重试、停止、取消和重新打开；
- 审批等待、允许、拒绝和恢复；
- 已发生的文件、工具、Git、网络或其他外部副作用。

每个实验最终必须可回答：任务状态是什么、当前责任人是谁、是否重复执行、产物来自哪里、审批状态是什么、发生了哪些副作用、下一步由谁处理。不能以“底座已结束”或“事件已收到”代替这些答案。

## 五、下一次技术方案会的输入与产出

输入：锁定的 OpenCode runtime 和版本、F-10 实验设计、Magic 对象字段草案、Adapter/Projection 边界草案。

产出：

1. OpenCode 事实输入到 Magic 状态投影的契约。
2. `TaskAttempt`、事件幂等、快照、恢复与审批的最小数据模型。
3. Git worktree、ChangeSet、MergeTask 的责任和状态边界。
4. 服务端权威状态与前端连接/同步/不确定状态的显示契约。
5. F-10 自动化验收用例和 Go/No-Go 证据模板。

## 六、证据纪律

技术文档必须分别标注：源码存在、测试资产存在、已有报告结论、AgentCore 试运行观察、Magic 产品建议、实机验证结果。前四项均不能替代 F-10 的实机收敛证据。









