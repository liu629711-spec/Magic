# AgentCore 后端架构总监交接

## 交接范围

负责 AgentCore 运行、Journal、DAG、事件、恢复、工具和执行编排经验的事实拆解，并界定可借鉴机制与 Magic 必补服务。

## 必读材料

- `D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_BACKEND_BREAKDOWN.md`
- `D:\Harmess\Magic\docs\01-产品\会议记录-第三轮-AgentCore架构技术总监.md`
- `D:\Harmess\Magic\docs\01-产品\Magic产品系统边界与生命周期底图.md`

## 已交接结论

- Journal、DAG、事件 fold、工具审批、挂起恢复是可参考的运行机制，不是 Magic 产品对象。
- `CAPTAIN`、worker、RunSession、transcript 不能直接等同 PM、长期成员、任务或完整项目记忆。
- Magic 需独立建立任务账本、责任、PM 交接、资源/变更/合并、权限/预算/副作用和状态投影服务。

## 首要工作

1. 划分 Magic 账本、Adapter、运行证据的服务边界。
2. 提出 Task、Attempt、Run、审批、产物和责任分层的数据与恢复契约。
3. 设计 PM 交接时的冻结、在飞运行、待审批和审计记录。
4. 评审 worktree、ChangeSet、MergeTask 的协作状态机。
5. 将 AgentCore 的可迁移经验逐项标成参考、适配或不可迁移。

## 不得外推

历史试运行经验不能证明 OpenCode 当前版本的实机能力，也不能替代 F-10 证据。
