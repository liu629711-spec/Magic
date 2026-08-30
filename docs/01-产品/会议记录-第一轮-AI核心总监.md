# 第1轮正式发言

> 发言角色：Magic AI 核心总监
>
> 讨论范围：AgentCore AI runtime、CEO/worker、编排原语、上下文与记忆、工具审批、任务执行与恢复，以及它们与 Magic 产品对象的继承和重建边界。
>
> 证据口径：`[源码/测试]` 表示仓库存在对应源码或测试文件；不表示本轮已经运行测试。`[报告]` 表示 AgentCore 现状报告中的事实整理。`[产品基线]` 表示 Magic 当前文档的产品方向或待裁定事项。`[推断]` 表示不能直接作为事实的判断。`[建议]` 表示本轮技术建议。

## 一、事实与证据

### 1. 已实现并有静态验证证据

1. **AgentCore 已形成一次复杂任务的运行时闭环。**

   `[源码/测试]` `D:\Harmess\reference-project\AgentCore\apps\server\agentcore\runtime\runs\types.py` 定义 `RunKind.CAPTAIN`、`RunKind.AGENT` 和 `RunPhase`；`runtime\runs\plan.py`、`runtime\runs\wave.py`、`runtime\runs\scheduler.py` 实现计划、依赖和调度；`apps\server\tests\test_runs_wave.py`、`tests\delegate\test_execute.py` 等提供静态测试证据。

   `[报告]` `D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_AI_CORE_BREAKDOWN.md` 第 1、4、5、6 节将主链概括为 `Interaction -> Turn -> CAPTAIN Run -> DelegateTool/RunPlan -> WaveScheduler -> AGENT Run -> Journal/SSE -> TurnOutcome`。

   `[结论]` 这证明了 AgentCore 的执行编排能力已经存在；没有证明它已经具备 Magic 的长期组织和产品责任模型。

2. **CEO/CAPTAIN 与 worker/AGENT 的运行时边界已经实现。**

   `[源码/测试]` `D:\Harmess\reference-project\AgentCore\apps\server\agentcore\runtime\runs\types.py`、`runs\executor\captain.py`、`runs\executor\agent.py`、`tools\builtin\delegate\tool.py`；相关测试包括 `apps\server\tests\test_captain_loop_seed.py`、`tests\delegate\test_execute.py`。

   `[报告]` 第 3 节确认：CAPTAIN 是会话/回合中的 CEO runtime role，AGENT 是由 `RunSpec` 描述的执行节点；worker 没有独立 Agent entity。

   `[结论]` CAPTAIN 可以承担一次任务的协调和收口，AGENT 可以承担局部执行，但二者都不能直接被命名为 Magic PM、会话成员或项目成员。

3. **delegate、replan、ask_user、debate、escalate 已有具体运行时路径。**

   `[源码/测试]` `tools\builtin\delegate\`、`runtime\delegate\`、`tools\builtin\ask_user\`、`runtime\debate\`、`tools\builtin\escalate.py`；相关测试包括 `apps\server\tests\delegate\test_supervised.py`、`test_graph_append.py`、`test_pending_interactions.py`、`test_debate_moderator.py`、`test_ceo_arbitrate_escalate.py`。

   `[报告]` 第 5、10 节确认：`delegate` 是非终态委派，`replan` 主要作用于受监督计划边界，`ask_user` 是可恢复交互，`debate` 复用普通 DAG/Run，`escalate` 是结构化升级信号。

   `[结论]` 这些能力可以作为 Magic 的执行机制候选，但不会自动创建 Magic 工程、PM、长期成员或产品任务。

4. **DAG 和 WaveScheduler 是连续依赖调度，不是严格波次屏障。**

   `[源码/测试]` `D:\Harmess\reference-project\AgentCore\apps\server\agentcore\runtime\runs\plan.py`、`runs\wave.py` 中的 `RunPlan.waves` 和 `WaveScheduler`；证据包括 `apps\server\tests\test_runs_wave.py`、`tests\delegate\test_consumer_deps.py`。

   `[报告]` 第 6 节指出，`RunPlan.waves()` 是拓扑分层和校验视图；调度器在依赖满足后连续启动后继节点。同层其他节点未完成时，后继不必等待。

   `[建议]` Magic 可以继承该调度机制，但产品任务状态、当前责任人和 PM 计划仍必须由 Magic 自己维护。

5. **ReAct、LoopController、finish_guard 和降级机制已有实现，但不是绝对硬闸。**

   `[源码/测试]` `runtime\engine\react.py`、`runtime\loop_controller\__init__.py`、`runtime\verify.py`、`runtime\engine\round.py`、`runtime\delegate\drive_finalize.py`；证据包括 `test_engine_react_paths.py`、`test_loop_controller.py`、`test_engine_finish_guard.py`、`test_delegate_completion.py`。

   `[报告]` 第 7 节确认，部分规则表现为 warning、shadow observation、structured gap 或有限 rework，不能保证模型永远不会过早结束。

   `[结论]` Magic 不应把 AgentCore 的 finish guard 宣传成产品任务绝对成功保证。

6. **Interaction / Turn / Run 三层、Journal、SSE、挂起和恢复已有实现。**

   `[源码/测试]` `runtime\interaction.py`、`runtime\turn\`、`runtime\runs\`、`runtime\journal\`、`runtime\events\`、`runtime\pipeline\resume\`；证据包括 `test_pending_interactions.py`、`test_turn_journal.py`、`test_resume_ask_user.py`、`test_resume_rehydrate.py`、`test_attach_cursor_replay.py`。

   `[报告]` 第 11、12、13 节确认：暂停主要由 Interaction、TurnOutcome 和恢复管线表达，`RunPhase` 没有 `PAUSED`；Journal 是执行事实，SSE 是实时投影。

   `[结论]` 这些可以作为 Magic 的底层运行证据机制，但不应直接成为 Magic 任务、成员或最终状态的权威来源。

7. **上下文、记忆、工具审批、沙箱、handoff、NoteWall 和证据 ledger 已有局部能力。**

   `[源码/测试]` `runtime\context\`、`memory\`、`runtime\approvals.py`、`tools\sandbox\`、`runtime\runs\notewall.py`、`runtime\debate\evidence_ledger.py`；对应测试覆盖 `test_context_assembler.py`、`test_memory_injection.py`、`test_approvals.py`、`test_notewall.py`、`test_debate_evidence.py`。

   `[报告]` 第 8、9、10 节已区分渐进披露、记忆 scope、审批、Subprocess/gVisor、便签生命周期、交接和证据。

   `[限制]` Approval 当前明确是 in-process/single-worker；SubprocessSandbox 不等于 gVisor；NoteWall 不等于项目事实账本；记忆 scope 不等于工程长期记忆。

### 2. 仅设计或需要 Magic 补建

1. `[产品基线]` Magic 将代理方式和 CEO 方式定义为两个平等的会话工作方式，将非工程工作和工程组织定义为长期组织维度。见 `D:\Harmess\Magic\docs\01-产品\Magic产品一页纸.md` 第三、四节和 `Magic最终产品裁定与技术会议输入.md` 第三节。

2. `[产品基线]` 临时执行 Agent、会话成员、项目成员、会话主 Agent、PM、长期 Agent 身份和运行实例必须分离。见 `D:\Harmess\Magic\docs\01-产品\Magic产品系统边界与生命周期底图.md` 第一至第四节。

3. `[产品基线]` 会话成员可以在同一会话的多个任务中复用，项目成员可以在同一工程的多个会话和任务中复用；但会话成员转项目成员的迁移范围仍列为 U-07 待用户裁定。

4. `[产品基线]` Magic 任务账本、共享事实账本、工程 PM、成员关系、产物登记和产品权限必须独立于底座运行对象。其最终权威关系仍涉及 U-01、U-03、U-08、U-09、U-11、U-12。

### 3. 未知或不能由 AgentCore 推导

1. `[未知]` AgentCore 审计不能确认 Magic 所依赖的 OpenCode 当前版本、实际依赖关系和原生能力。AgentCore 报告第 1.1 节只确认 OpenAI-compatible provider，未确认 OpenCode runtime 依赖。OpenCode 必须由底座负责人实机核查。

2. `[未知]` AgentCore 没有证据证明一个稳定 Agent 身份可以绑定多个 Magic 会话、多个工程任务或多个底座 session。

3. `[未知]` AgentCore 本地 approval、lease、resume 和 replay 测试不能证明跨进程、跨主机和崩溃后的唯一性、幂等性和无损恢复。

4. `[未知]` AgentCore 的 `execution_detached` 在后端 durable 定义与桌面 hydrate 行为之间存在不一致；不能把断连后最终收敛作为已经闭合的产品事实。

5. `[未知]` AgentCore 的 memory scope、NoteWall 和 handoff 不能直接推导出 Magic 的项目共享事实、长期成员私有记忆和权限继承规则。

## 二、对 Magic 产品基线的修正或澄清

1. **修正 OpenCode 与 AgentCore 的关系表述。**

   `[产品基线]` Magic 一页纸写明 Magic 建立在 OpenCode 之上；`Magic最终产品裁定与技术会议输入.md` 第七节也要求锁定 OpenCode 版本并实机核查。`[报告/源码]` AgentCore 现状报告只能确认自身 runtime 和 OpenAI-compatible provider，不能证明 AgentCore 就是 OpenCode 底座，也不能证明 OpenCode 具有 AgentCore 的全部能力。`[建议]` 在 OpenCode 证据矩阵完成前，只能说“Magic 计划以 OpenCode 为底座，能力仍待核查”。

2. **明确“会话成员可复用”不是 AgentCore 已继承能力。**

   `[源码/测试]` AgentCore 的 `continue_from_run_id` 位于 `runtime\delegate\continuation.py`，依赖可续 transcript；`CANCELLED/SKIPPED` 则要走 `replaces_run_id` 的冷接替，证据见 `apps\server\tests\test_continuation.py`。`[报告]` 第 10 节明确这是执行现场或责任链续派。`[产品建议]` Magic 应把会话成员复用标为“Magic 必须补建并首版验证”，不能把 transcript 续写叫作成员复用。

3. **明确“工程成员长期复用”当前没有底座事实支持。**

   `[源码/测试]` AgentCore 没有工程、PM、项目成员关系或工程级身份目录；`RunSpec` 的 role、task、tools 和 target desk 不能替代这些对象。`[产品基线]` Magic 生命周期底图第一、二、六节要求工程成员有长期关系、归属、停用和历史。`[建议]` Magic 必须自己建立 `AgentIdentity`、`ProjectMember`、成员生命周期和工程权限。

4. **禁止把 CAPTAIN 直接映射成 Magic PM。**

   `[源码/测试]` `RunKind.CAPTAIN` 是当前执行中的 CAPTAIN Run，负责本回合的理解、委派、协调和收口。`[产品基线]` Magic PM 是工程级长期协调责任，负责跨任务计划、项目级依赖、风险和成员交接。`[推断]` CAPTAIN 可以作为某次 PM 工作的底层运行载体，但不应成为 PM 对象本身。

5. **Magic 任务状态必须与 AgentCore Run 状态分开。**

   `[产品基线]` Magic 已明确任务状态和运行实例状态分离。`[报告]` AgentCore 第 11 节明确 `RunPhase.COMPLETED` 不代表 Turn 成功、交付被接受或 Magic 任务完成。`[建议]` Magic 任务账本应拥有唯一产品状态；底座 Journal、SSE 和 Run 只提供执行证据和尝试结果。

6. **补充 structured gap、partial 和 degraded 的产品映射。**

   `[源码/测试]` AgentCore 允许运行成功但携带 structured gap，finish guard 也可能触发有限 rework 或 degraded 收口。`[产品基线]` Magic 禁止把失败、部分完成、等待、停止和取消包装为成功。`[建议]` 必须定义 `RunOutcome -> Magic TaskState -> ArtifactAcceptance` 的映射，不能由前端文本或单个成功字段猜测。

7. **收紧断连、恢复和“连续性”的承诺。**

   `[源码/测试]` AgentCore 已有本地 Journal、lease、resume、attach/replay；但 `runtime\approvals.py` 是进程级审批，`execution_detached` 在 `apps\desktop\src\renderer\stores\execution\store.ts` 的 hydrate 语义尚未闭合。`[产品基线]` Magic 也明确不承诺任意执行中的无损切换。`[建议]` 首版只承诺经场景验证的恢复范围，并展示不可迁移的审批、排队输入、工具状态和外部副作用。

8. **用户直达成员需要 Magic 任务和 PM 协议，不能从 handoff 自然推出。**

   `[产品基线]` 用户直达工程成员产生的工作必须进入工程任务账本，PM 必须知情，冲突时要能暂停和重排。`[源码/测试]` AgentCore 的 handoff、NoteWall 和 coordination 解决的是运行协作，不包含 Magic 的工程入账、PM 通知和产品级冲突裁定。`[建议]` 将其作为独立首版场景验证，不宣称 AgentCore 已支持。

## 三、与另外三位总监的接口问题

### 1. 产品经理

- `[依赖对象]` Magic 的长期产品语义。
- `[需要证据/裁定]` 请裁定 U-01、U-03、U-07、U-11、U-12：任务账本是否为产品状态真相源；会话成员转项目成员迁移哪些历史、记忆和权限；PM 是否唯一；用户直达成员与 PM 计划冲突时如何处理；哪些成本和外部副作用需要逐次确认。
- `[阻塞原因]` AI 核心可以说明 AgentCore 的执行能力和限制，但不能替用户决定长期身份、责任、权限、记忆和默认行为。

### 2. OpenCode 底座/系统边界负责人

- `[依赖对象]` OpenCode 的锁定版本、扩展点和真实运行行为。
- `[需要证据]` 提供 commit/tag、依赖清单和最小可复现场景：会话创建/继续/历史，子 Agent 创建与复用，取消，跨进程恢复，审批钩子，事件 ID/重放，成本字段，工作区隔离和权限失败。
- `[特别问题]` 必须说明“复用”的对象究竟是底座 session、运行上下文、transcript、模型配置，还是稳定 Agent 身份；不能只回答“支持 Agent”。

### 3. 架构与前端契约负责人

- `[依赖对象]` Magic 产品对象到运行时对象的映射和跨端状态契约。
- `[需要证据]` 架构负责人提供 `AgentIdentity/SessionMember/ProjectMember/PM/Task/Turn/Run` 映射、Task Ledger 与 Journal 的权威关系、责任转移、租约、幂等和副作用处理。
- `[需要证据]` 前端负责人提供任务状态、成员关系状态、运行状态、产物状态和 pending interaction 的消费边界；不得用 `RunPhase.COMPLETED`、`message_end` 或 `execution_detached` 直接代表 Magic 任务完成。
- `[阻塞原因]` 如果架构直接采用 AgentCore `Run` 作为 Magic 成员或任务，或者前端把多层状态压扁为一个枚举，后续会出现身份、责任、恢复和交付状态混乱。

## 四、首版 Go/No-Go 门槛与阻塞产品问题

### Go 条件

1. `[源码/测试]` 可以把 AgentCore 的 `delegate`、DAG、ReAct、Journal、SSE、handoff、基础审批、上下文装配和本地恢复作为执行机制候选。
2. `[产品建议]` 首版采用 Magic Adapter，把 Magic 任务和身份映射到底座 Run；底座对象不直接暴露给用户，也不直接成为产品权威状态。
3. `[产品基线]` 首版范围可以从单用户、单工程、一名 PM、2 至 4 名成员和一个主工作区开始，但这些是验证约束，不是永久上限。
4. `[验证门槛]` 必须完成代理调用临时 Agent、会话成员跨任务复用、单次 CEO 后回退代理、PM 派工、用户直达成员、成员转工程成员、断连恢复、停止副作用和 PM 交接等场景。

### No-Go 条件

1. `[事实边界]` OpenCode 版本和首版关键能力仍处于“仍未知”时，不冻结技术方案。
2. `[事实边界]` 不允许 `Run == AgentIdentity`、`CAPTAIN == Project PM`、`worker == SessionMember/ProjectMember`、`folder == Project`。
3. `[事实边界]` 不允许把 transcript、NoteWall、共享文件或 memory scope 直接当作项目长期记忆或共享事实账本。
4. `[事实边界]` 不允许把本地 approval/resume/replay 测试宣传为跨进程生产级 exactly-once 或无损恢复。
5. `[产品基线]` 不允许把 detached、partial、gap、failed、cancelled 或未验收产物映射成成功。
6. `[产品基线]` 首版明确不做跨工程成员调用、永久在线 Agent、复杂多组织权限、完整圆桌和任意无损模式切换。

### 当前阻塞产品问题

- `[待用户裁定]` U-01：任务、任务会话、回合、运行实例的正式基数关系。
- `[待用户裁定]` U-03：Magic Task Ledger 是否为最终产品状态真相源。
- `[待用户裁定]` U-07：会话成员转项目成员的历史、记忆、权限和归属迁移边界。
- `[待用户裁定]` U-11：PM 唯一性、PM 交接和在飞任务责任。
- `[待用户裁定]` U-12：成本、付费、发布、删除、部署及其他外部副作用的确认粒度。
- `[待技术核查]` OpenCode 是否具备稳定的 session、sub-agent、cancel、resume、approval、event 和 permission 能力。

## 五、首版必须做、可延后、明确不做

### 首版必须做

1. `[产品建议]` 建立 Magic 自己的 `AgentIdentity`、`SessionMember`、`ProjectMember`、PM 关系和成员生命周期。
2. `[产品建议]` 建立独立 Task Ledger，记录唯一当前责任人、任务状态、运行尝试、交付、事实引用和外部副作用。
3. `[技术建议]` 通过 Adapter 绑定 AgentCore/OpenCode Run；保留 `RunKind`、`RunPhase`、`TurnOutcome`、Interaction 和 Journal 的层级，不改名继承为 Magic 对象。
4. `[首版验证]` 验证同一会话成员跨任务复用，以及同一工程成员跨会话复用；明确它们不是同一能力。
5. `[首版验证]` 验证会话成员转项目成员时身份、历史、记忆、权限、任务归属和撤销边界。
6. `[首版验证]` 验证唯一当前责任人、成员直达、PM 知情、显式 handoff、失败/部分完成/等待/停止/取消和最终状态收敛。
7. `[底座验证]` 锁定 OpenCode 版本，完成产品基线中的 OpenCode 能力矩阵和 S-01 至 S-12 场景。
8. `[安全验证]` 完成审批、沙箱、目录权限、取消副作用、断连、重复事件、重启、恢复和多实例租约实验。

### 可以延后

- `[产品基线]` 多层 PM、跨工程成员直接调用、成员市场、跨项目永久职业身份和复杂多组织治理。
- `[产品基线]` 永久在线 Agent、长期自治扩张、远程 MCP、完整圆桌辩论和 AI Town 与主运行时的身份/记忆/账单互通。
- `[技术建议]` 任意执行中的无损代理/CEO 切换，以及在证据不足时对 exactly-once 作产品承诺。

### 明确不做

- `[事实边界]` 不把临时 worker 自动升级为会话成员或项目成员。
- `[事实边界]` 不把一次 `delegate` 自动升级为工程或 PM。
- `[事实边界]` 不把 CAPTAIN 直接持久化为 PM，不把 worker 直接持久化为成员。
- `[事实边界]` 不把 transcript 直接当长期记忆，不把 NoteWall 直接当共享事实账本。
- `[事实边界]` 不把文件夹、工作区、target desk 或共享文件直接当工程和成员归属。
- `[事实边界]` 不把 SSE、Journal、底座 Run 或运行结束直接暴露为 Magic 用户对象和产品最终状态。
- `[事实边界]` 不把 OpenCode 或 AgentCore 尚未验证的能力写成首版承诺。
