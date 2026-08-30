# 第三轮共同签署

## 对 F-01 至 F-10 的逐条签署

### F-01 产品方向与开发门槛

**有条件接受。**

条件：产品方向 Go 与首版开发冻结必须是两道门槛。只有影响首版产品对象、任务责任、状态收敛、权限、副作用、选定 OpenCode runtime/client contract 或恢复语义的未知，才阻塞首版冻结。TUI、复杂圆桌、多层 PM、跨工程、多用户多端和永久 Agent 等非首版能力可以进入后续或受控灰度，但不得包装成已支持能力。

### F-02 产品对象和底座边界

**接受。**

Magic 必须独立持有 `AgentIdentity`、`SessionMember`、`ProjectMember`、`PM`、`MagicSession`、`MagicTask`、`TaskAttempt`、`Turn`、`Artifact`、`Fact`、`Permission`、`SideEffect` 和产品最终状态。OpenCode/AgentCore 的 session、run、event、agent、journal、SSE、transcript、NoteWall、folder 和 workspace 只能作为绑定对象或执行证据。除非有实际依赖和运行证据，不得声称 AgentCore 与 OpenCode 的关系已经确认。

### F-03 最小对象关系

**有条件接受。**

条件：首版采用以下最小关系：

```text
MagicSession 1-N MagicTask
MagicTask 1-N Turn
MagicTask 1-N TaskAttempt
TaskAttempt 1-1 RootExecutionBinding
RootExecutionBinding 1-1 canonical OpenCode Session（若有稳定 ID）
一个 Attempt 可包含一个根执行和多个 AgentCore/OpenCode 子运行
```

若底座没有稳定 ID，Magic 可以建立 synthetic binding，但必须保存 request ID、event cursor 和底座 session 信息，不能伪装成稳定运行 ID。首版不开放 MagicSession 共享 OpenCode Session、跨工程共享底座 Session/身份、任意 Task 跨 Session 动态迁移、child session 直接冒充 Magic 子任务，或把 Run 等同 Task/身份。

### F-04 两个组合维度与切换

**接受。**

代理/CEO 是会话工作方式，非工程/工程组织是长期组织形态，不能合并成一个 `mode` 枚举。当前任务选择、会话默认和工程默认必须分开存储。建立工程、长期成员、权限扩大和跨边界记忆必须显式确认。执行中切换只在稳定边界处理；必要时建立新的 `TaskAttempt`，记录上下文、责任、审批和副作用，不承诺任意时刻无损切换。

### F-05 责任和收口

**接受。**

正式任务和正式子任务任一时刻只有一名 Magic 当前责任人。普通代理由会话主 Agent 对用户侧收口；单次 CEO 中 CAPTAIN 只负责 Attempt 内编排；工程成员负责被派发任务；PM 负责工程计划、依赖、风险和项目汇总；临时 worker 只负责局部运行。用户直达工程成员必须入账，成员承担新任务责任，PM 获知工程影响。失败、停止和下级失败不自动转移责任，显式移交必须记录原因、时间、结果、未完成事项、审批和副作用。

### F-06 分层状态

**接受。**

Task、TaskAttempt/Run、Connection/Sync、Approval、Artifact、Fact 和 Responsibility 必须独立。不能用 `idle/busy/ended`、`RunPhase`、tool success、文件存在、SSE 断开或最后一条事件推导 Magic Task 成功。首版至少落地任务、Attempt、连接同步、审批、产物和事实的最小正常与异常状态，并让等待、失败、部分完成、停止、取消、同步缺口和已发生副作用可见且可解释。

### F-07 事实、记忆和迁移

**有条件接受。**

条件：会话成员转项目成员默认只创建新的 `ProjectMember` 关系，不自动迁移完整 transcript、私有 memory、NoteWall 或全部权限。只有用户逐项确认的事实、已接受产物、摘要、任务或角色信息才可迁移，并保留来源、版本、操作者、时间和撤销路径。该策略是技术安全默认，U-07 未完成用户裁定前不冒充最终产品政策。

### F-08 自然工作台的前端契约

**有条件接受。**

条件：默认显示目标、当前责任人、任务阶段/最终状态、需要用户介入的事项、最近产物及验收状态；异常时提升连接/同步、审批、失败、部分完成和已发生副作用。原始 SSE、完整工具日志、底层 Session/Run ID、全量 Agent 图和 transcript 默认折叠。前端只能消费 Magic 产品状态投影，不能直接把 OpenCode reducer 或底座事件当作产品状态。

### F-09 首版验收和延后

**有条件接受。**

条件：首版只承诺单用户、单工程、单 PM、少量成员、主工作区和明确的 OpenCode runtime。凡是纳入首版承诺的能力，必须用端到端场景验证临时 worker、成员复用、CEO 切换、PM 派工、用户直达成员、停止、副作用、事实争议/撤销、并发文件冲突、断连、重复/乱序事件、重启、恢复、重试、权限审计和 PM 交接。完整圆桌、多层 PM、跨工程、多用户多端权限、永久 Agent、复杂事实自动仲裁和任意无损切换延后，不能成为首版暗含承诺。

### F-10 首版冻结前唯一技术阻塞

**接受。**

该阻塞是一个组合阻塞：选定 OpenCode runtime/commit/client contract 后，必须完成 Magic TaskAttempt 在断连、进程重启、重复/乱序事件、重试、停止、审批和已发生外部副作用组合场景下的可重复端到端收敛证据。它同时覆盖 Task/Attempt 映射、事件幂等、恢复、权限和副作用记录。完成前可以继续产品设计、底座适配原型和受控灰度，但不能冻结首版数据库、API、完整状态机和开发排期。

## 签署状态

**有条件一致。**

四方可以接受共同签署稿作为产品和技术继续收敛的共同基线，但首版开发冻结必须满足 F-10 组合阻塞，且 F-01、F-03、F-07、F-08、F-09 中的条件必须写入实现和验收范围。这里的“一致”不代表 OpenCode 能力、生产恢复或外部副作用已经通过实机验证。

## 我仍保留的唯一阻塞项

**一个组合阻塞：在锁定 OpenCode runtime、commit 和 client contract 后，Magic Task/TaskAttempt 与底座 Session/Run 的映射，以及断连、重启、重复/乱序事件、重试、停止、审批和已发生副作用后的最终收敛，尚未完成可重复的端到端证据。**

这不是产品方向阻塞，也不阻塞产品模型、Adapter 原型和受控灰度；它阻塞首版数据库、API、事件模型、完整状态机和开发排期冻结。

## 是否同意回写正式产品文档

**有条件同意。**

同意将 F-01 至 F-10 的共同结论回写到：

- `D:\Harmess\Magic\docs\01-产品\Magic最终产品裁定与技术会议输入.md`
- `D:\Harmess\Magic\docs\01-产品\Magic产品系统边界与生命周期底图.md`
- `D:\Harmess\Magic\docs\01-产品\技术会议议题与裁定表.md`

回写条件：保留“产品方向 Go、首版冻结有条件 Go”的区分；保留 F-10 组合阻塞；保留所有未验证项和证据等级；明确 Magic Task Ledger 是产品状态真相源，OpenCode/AgentCore 只提供运行证据；不得把延后能力写成已支持，也不得把静态源码或测试文件存在写成生产实机验证。
