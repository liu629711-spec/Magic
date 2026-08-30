# 新任 AI 核心总监交接阅读确认

## 已读文件

已按要求完成以下文件的顺序阅读：

1. `D:\Harmess\Magic\docs\00-交接\README.md`
2. `D:\Harmess\Magic\docs\00-交接\05-AI核心总监交接.md`
3. `D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_AI_CORE_BREAKDOWN.md`
4. `D:\Harmess\Magic\docs\01-产品\Magic最终产品裁定与技术会议输入.md`
5. `D:\Harmess\Magic\docs\02-架构\02-Magic-目标项目\PRODUCT_TECH_ALIGNMENT_BASELINE.md`

## 我确认的三项事实

1. Magic 的产品语义必须独立于底座对象：`MagicTask`、`TaskAttempt`、`AgentIdentity`、成员关系、责任、事实、产物、权限和副作用由 Magic 持有；OpenCode、AgentCore 的 Session、Run、事件和工具结果只能作为绑定或不可改写的运行事实，不能直接当作 Magic 用户对象。

2. 任务责任和运行状态必须分层。正式任务任一时刻只有一名当前责任人，任务必须形成唯一、可解释的最终状态；`Run` 完成、工具成功、文件写入或 SSE 断开都不能单独推导 Magic 任务成功。AgentCore 中的 `Interaction`、`Turn`、`Run` 也是不同层次，暂停、取消、断连和完成不能压成一个状态。

3. AgentCore 材料确认的运行主链是 `Interaction -> Turn -> CAPTAIN/AGENT Run -> delegate/RunPlan -> WaveScheduler -> Journal/SSE -> TurnOutcome`。其现状报告采用源码、文档和测试资产的静态核对口径，明确没有把测试文件存在等同于测试通过；`WaveScheduler` 是连续事件驱动调度，`waves()` 不是严格 barrier，且部分治理、恢复和交付约束并非绝对硬保证。

## 仍未知的两项

1. OpenCode 的锁定 runtime、commit/tag、canonical protocol/client contract，以及会话、子 Agent、事件、审批、恢复、工作区和副作用能力的真实版本边界与限制仍未知；当前材料没有提供相应的实机核查证据。

2. F-10 所要求的端到端最终收敛是否成立仍未知，尤其是断连、进程重启、重复或乱序事件、重试、停止、审批恢复与已发生外部副作用组合之后，是否能准确回答任务状态、责任人、重复执行、产物来源、审批状态和副作用清单。生产级跨进程租约、事件总线、沙箱隔离和外部副作用幂等性也未由现有材料实测证明。

## 我理解的 F-10 AI 运行责任

AI 核心侧负责把一次 `TaskAttempt` 的 AI 运行语义做成可观察、可恢复、可审计的事实链：构建最小任务上下文，执行 Agent/CEO 的模型与工具调用，正确处理委派、结果回传、停止、重试、审批等待、恢复和失败降级，并记录上下文、工具、模型、产物、审批和副作用相关事实。

AI 核心侧必须保证模型不会把缺失证据、部分交付、等待、停止、取消、断连或已发生副作用伪装成成功；必须区分 canonical Journal 与模型 projection，并为重复、乱序、缺失事件和恢复提供可验证的幂等与收敛证据。Magic 任务账本和当前责任人仍负责产品任务的权威状态与最终责任，AI 运行层不替代这一职责。

以上是责任理解，不是已完成能力声明。本次交接阅读未进行 OpenCode 实机核查，也未运行 AgentCore 的测试套件或 F-10 实验。

## 接任后的首个工作项

牵头建立 F-10 的 AI 核心侧最小可复现实验包：先锁定 OpenCode runtime、commit/tag 与 canonical protocol/client contract，再为同一 `MagicTask` / `TaskAttempt` 定义断连、重启、事件异常、重试、停止、审批恢复和外部副作用场景的实验矩阵、证据字段、验收标准与 Go/No-Go 判定；在证据完成前，不冻结首版数据库、API、完整状态机或开发排期。
