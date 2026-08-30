# 第3轮共同签署

> 发言角色：Magic OpenCode 项目前端技术总监
>
> 本轮性质：共同签署轮。以下判断逐项区分源码/测试证据、报告证据、产品建议和推断，不把未纳入首版的能力变成首版阻塞。
>
> 依据文件：
> - `D:\Harmess\Magic\docs\01-产品\会议记录-第一轮-AI核心总监.md`
> - `D:\Harmess\Magic\docs\01-产品\会议记录-第一轮-AgentCore架构总监.md`
> - `D:\Harmess\Magic\docs\01-产品\会议记录-第一轮-OpenCode架构总监.md`
> - `D:\Harmess\Magic\docs\01-产品\会议记录-第一轮-OpenCode前端总监.md`
> - `D:\Harmess\Magic\docs\01-产品\会议记录-第二轮-AI核心总监.md`
> - `D:\Harmess\Magic\docs\01-产品\会议记录-第二轮-AgentCore架构总监.md`
> - `D:\Harmess\Magic\docs\01-产品\会议记录-第二轮-OpenCode架构总监.md`
> - `D:\Harmess\Magic\docs\01-产品\会议记录-第二轮-OpenCode前端总监.md`

## F-01 产品方向与开发门槛

**签署意见：接受。**

对方观点：共同签署稿将产品方向 Go 与首版开发冻结拆成两个门槛；AgentCore 架构总监第二轮提出单用户、单工程、单 worker 的 Conditional Go，OpenCode 架构总监要求 runtime、TaskAttempt、事件和恢复证据完成后才冻结。

源码/测试证据：OpenCode App 已有 query、SSE、V1/V2 reducer、permission/question dock、timeline 和 optimistic rollback，但 `D:\Harmess\opencode\OPENCODE_FRONTEND_ARCHITECTURE_BREAKDOWN.md` 第 12、15、16 节记录 Web、Electron、断连、重启、重复/乱序事件和 PTY 尚未实机验证。已有测试资产不等于本轮全部通过。

报告证据：OpenCode 前端报告第 13、15、16 节；`D:\Harmess\Magic\docs\01-产品\技术会议议题与裁定表.md` 第二、五节已经区分产品方向、开发冻结和能力未知。

产品建议：未知分为两类。影响首版对象、任务责任、状态收敛、权限/副作用、选定 runtime/client contract 和恢复语义的未知必须阻塞冻结；TUI、复杂圆桌、多层 PM、跨工程、多用户多端和永久 Agent 等若明确不进入首版，可以后延或在隔离灰度中验证。

推断：受控灰度只能在能力已知且界面显式显示限制时进行。未知能力不能被隐藏成“正常完成”，也不能因为页面能够打开就宣称支持。

## F-02 产品对象和底座边界

**签署意见：接受。**

对方观点：AI 核心总监反对 `CAPTAIN == Project PM`、`worker == SessionMember/ProjectMember`；AgentCore 架构总监反对 `Run == Task`；OpenCode 架构总监反对把 OpenCode Session/Event 直接当 Magic Task/状态。

源码/测试证据：OpenCode 前端实际消费 session、message、part、child session、event 和 status；`D:\Harmess\opencode\packages\app\src\context\server-session-v2-reducer.ts` 能聚合执行事件，但没有 Magic 工程、长期身份、责任和事实账本。AgentCore 第一轮记录也明确 Run 是执行节点，RunSession 是执行现场。

报告证据：OpenCode 前端报告第 6、7、13、14 节；三位总监第一、二轮记录均将底座对象定位为绑定或证据，而非 Magic 产品对象。

产品建议：Magic 持有 `AgentIdentity`、`SessionMember`、`ProjectMember`、`PM`、`MagicSession`、`MagicTask`、`TaskAttempt`、`Turn`、`Artifact`、`Fact`、`Permission`、`SideEffect` 和产品最终状态。OpenCode/AgentCore 对象只通过 Adapter 关联，用户界面默认使用 Magic 名称。

推断：不能把 AgentCore 与 OpenCode 的关系写成已证实事实。必须由实际依赖、锁定版本和运行证据确认；这一条是事实边界，不是对底座能力的否定。

## F-03 最小对象关系

**签署意见：有条件接受。**

对方观点：AgentCore 架构总监建议 `Run -> TaskAttempt`；OpenCode 架构总监建议 `Magic Task -> Magic RunAttempt -> OpenCode Session/prompt/event`；前两轮都要求区分 Task ID、Attempt ID、Turn ID 和 Run ID。

源码/测试证据：OpenCode 的 session 页面和 lineage 可表达父子执行关系，但不能证明产品任务关系；全局事件和 session history 的回放边界也尚未实机确认。见 `D:\Harmess\opencode\packages\app\src\pages\session\session-lineage.tsx`、`D:\Harmess\opencode\packages\opencode\src\server\routes\instance\httpapi\handlers\event.ts:25-99`。

产品建议：接受以下首版最小关系：

```text
MagicSession 1 ---- N MagicTask
MagicTask    1 ---- N Turn
MagicTask    1 ---- N TaskAttempt
TaskAttempt  1 ---- 1 RootExecutionBinding
RootExecutionBinding 1 ---- 1 canonical OpenCode Session（首版限制）
TaskAttempt 1 ---- 1 root execution + N child runs（内部关系）
```

共同签署稿写成“一个 canonical OpenCode Session”可以接受，但需要补充：若底座存在稳定 Run ID，RootExecutionBinding 再关联该 Run；若不存在，Magic 必须建立 synthetic binding，并保存 request ID、session ID、event cursor 和来源。不能把 synthetic binding 宣称成底座稳定 Run。

首版不开放 MagicSession 共享 OpenCode Session、跨工程共享底座 Session/身份、任意 Task 跨 Session 动态迁移、child session 直接冒充 Magic 子任务，或 Run 等同 Task/身份。每个执行型 Turn 关联一个主 Task，派生子任务必须显式入账。

推断：这是可实现的产品关系建议，不是当前 OpenCode 已经具备的事实。正式冻结前仍需 runtime 实验验证。

## F-04 两个组合维度与切换

**签署意见：接受。**

对方观点：AI 核心总监指出 CAPTAIN 是一次执行中的 CEO runtime role；三位总监均反对 CEO/CAPTAIN 自动等于 PM，且共同稿明确代理/CEO 与非工程/工程组织不能合并为一个 mode 枚举。

产品建议：`workStyle`、当前任务覆盖值、会话默认值和工程默认值分开存储；工程组织是长期对象。建立工程、长期成员、权限扩大和跨边界记忆必须显式确认。修改会话默认值只影响未来任务，执行中切换必须创建 handoff/TaskAttempt 记录。

前端建议：模式选择器必须明确“仅本次任务”或“后续会话默认”；工程上下文单独显示。切换确认展示当前运行、排队输入、待审批项、已产生副作用和不可迁移内容。

源码/测试证据：OpenCode 有 agent/model/session 操作和 child lineage，但没有 Magic 代理/CEO 作用域、工程组织或长期成员关系。推断：共同稿的技术落地必须通过 Magic facade，不能直接把 OpenCode 的 agent selector 作为 Magic 模式选择器。

## F-05 责任和收口

**签署意见：接受。**

对方观点：共同稿将普通代理任务交给会话主 Agent、Attempt 内编排交给 CAPTAIN、工程成员任务交给项目成员、计划和汇总交给 PM；AI 核心和两位架构总监均反对 CAPTAIN 直接持久化为 PM。

源码/测试证据：OpenCode session status、child session 和 tool lifecycle 只能证明执行关系，没有 Magic 责任转移和跨任务收口证据。AgentCore 的 CAPTAIN/AGENT 也只是运行时角色。

产品建议：接受以下唯一责任人规则：普通代理任务由会话主 Agent 收口；单次 CEO 中 CAPTAIN 只负责 Attempt 内编排，会话主 Agent负责产品任务收口；工程成员任务由被派发成员负责，PM 负责计划、依赖、风险和工程汇总；临时 worker 不获得长期 Magic 责任。用户直达成员时，新任务入账，成员承担任务责任，PM 获知工程影响。

失败、停止或下级运行失败不能自动改变责任；显式移交必须记录原因、时间、已有结果、未完成事项、待审批项和副作用。UI 必须分别展示当前责任人、PM/协调人和运行实例执行者。

推断：成员失败后 PM 可以发起重派或移交，但不能通过汇总把成员失败改写成成功。

## F-06 分层状态

**签署意见：接受。**

对方观点：AI 核心总监要求映射 `structured gap`、`partial`、`degraded`；AgentCore 和 OpenCode 架构总监都要求 Task、RunAttempt、连接、权限和副作用分层；前端第二轮提出不能共用一个 badge。

源码/测试证据：OpenCode 同时存在 `idle/busy/retry`、SSE generation、permission/question pending、PTY 状态、V1/V2 reducer 和 query cache。`D:\Harmess\opencode\packages\app\src\context\server-session-v2-reducer.ts` 的 tool/step/text lifecycle 不能替代 Magic Task 状态。

产品建议：接受共同稿的六层状态。首版最小落地如下：

- Task：草拟、可执行、执行中、等待、部分完成、完成、失败、停止、取消、归档。
- TaskAttempt/Run：创建、排队、执行、等待审批、暂停、完成、失败、中断、需恢复。
- Connection/Sync：已连接、重连中、已断开、同步缺口、状态未知。
- Approval：待确认、已允许、已拒绝、已过期/失效。
- Artifact：草稿、待验收、已接受、验证失败、被替代、已归档。
- Fact：候选、已确认、受争议、已撤销/废弃；若首版不支持事实功能，必须显式禁用。

共同稿将 `Responsibility` 列为独立状态维度，我接受其独立建模，但建议产品表现为责任关系和转移历史，不把“责任”硬塞进与 Task 相同的状态枚举。失败、等待、部分完成、停止、取消、同步缺口和副作用必须可见且可解释。

推断：完整底层 tool 状态、token/cost 细节和全量事实影响图可以延后展示，但只要首版涉及对应能力，就不能丢失其来源和未知状态。

## F-07 事实、记忆和迁移

**签署意见：有条件接受。**

对方观点：AI 核心总监和 AgentCore 架构总监明确 NoteWall 不等于项目事实账本、memory scope 不等于工程长期记忆；OpenCode 架构总监明确共享文件不能自动成为共享事实；共同稿采用默认不自动迁移。

源码/测试证据：OpenCode session/message/part 和 AgentCore transcript、memory、NoteWall 只能证明材料或运行记录存在，不能证明 Magic 事实权威、工程归属或长期身份。

产品建议：transcript 是会话证据；memory 是有范围的检索材料；NoteWall 是协作便签；文件是工作区资源；Artifact 是有来源和验收关系的交付登记；Fact 是有来源、版本、范围、确认者和争议/撤销状态的产品对象。

会话成员转项目成员默认创建新的 `ProjectMember` 关系，不自动迁移完整 transcript、私有 memory、NoteWall 或全部权限。用户逐项确认后，才迁移已确认事实、已接受产物、指定任务、摘要或角色信息，并保留来源、版本、操作者、时间和撤销路径；在飞 Attempt 不做静默身份迁移。

条件：F-07 明确写出“该策略在 U-07 未裁定前属于技术安全默认，不是最终产品政策”，我接受。若后续产品裁定改变迁移范围，必须同步修改迁移预览、审计记录和撤销流程，不能只改文案。

## F-08 自然工作台的前端契约

**签署意见：接受。**

对方观点：Nash/自然体验方向要求降低管理负担；其他总监要求责任、失败、等待和副作用不能被隐藏；共同稿区分默认显示和用户主动展开。

源码/报告证据：OpenCode App 的 Home -> draft -> session 工作区、timeline、dock、review 和 terminal 可复用，报告第 4、5、8、14 节有源码和测试资产证据。但 `idle/busy/retry`、tool success、stream ended 不能作为 Magic Task 完成证明。

产品建议：默认显示目标、当前责任人、任务阶段/最终状态、需要用户介入的事项、最近产物及验收状态；异常时提升连接/同步、审批、失败、部分完成和已发生副作用。原始 SSE、完整工具日志、底层 Session/Run ID、全量 Agent 图、复杂 DAG 和完整 transcript 默认折叠，审计时可以展开。

前端实现建议：普通代理任务首屏不出现团队管理面板；CEO 视图按用户选择或任务需要展开；工程总览仅在工程上下文出现。错误统一回答“发生了什么、影响什么、现在能做什么”。断连显示同步状态，不直接显示失败；已写文件、已执行命令和外部副作用必须可追踪。

推断：这是工作台而不是后台的边界，不意味着牺牲可解释性。默认折叠只能降低噪声，不能删除证据。

## F-09 首版验收和延后

**签署意见：有条件接受。**

对方观点：AgentCore 架构总监提出单用户、单工程、单 worker Conditional Go；OpenCode 架构总监要求 runtime、TaskAttempt、事件、停止、重试、断连、恢复、权限和副作用证据；AI 核心总监要求验证成员复用、用户直达、PM 交接和停止副作用。

源码/测试证据：OpenCode 仓库有大量 E2E、transport、review、permission 和性能测试资产，但本轮实际只取得有限测试通过结果，不能把测试文件存在写成端到端通过。报告第 12、16 节明确了该限制。

产品建议：若首版承诺对应能力，必须真实验证临时 worker 不产生长期身份、同会话成员复用、新会话越权失败、单次 CEO 回退、PM 派工及成员失败/部分完成、用户直达入账、稳定边界切换/停止、副作用记录、选择性成员迁移、事实争议/撤销、并发文件冲突、断连/重复/乱序/重启/恢复/重试收敛、权限审计和 PM 交接。

验收证据必须包含版本、runtime、请求/事件样本、Magic 状态快照、Attempt/底座 ID、责任变更、产物来源、外部副作用和失败结果；自动化 contract test 与真实浏览器观察必须区分。截图只能证明视觉结果，不能证明状态收敛或责任唯一。

有条件部分：完整成员迁移、事实撤销、PM 交接和并发冲突如果被正式排除在首版承诺外，可以不阻塞首版，但必须在产品范围中明确标为暂不支持。完整圆桌、多层 PM、跨工程成员、多用户多端权限、永久 Agent、复杂事实自动仲裁和任意无损切换明确延后。

## F-10 首版冻结前唯一技术阻塞

**签署意见：有条件接受。**

对方观点：共同稿将唯一阻塞收敛为“选定 runtime/commit/client contract 后，验证 TaskAttempt 在断连、进程重启、重复/乱序事件、重试、停止、审批和外部副作用组合场景下的可重复端到端收敛”。三位总监第二轮均把任务/运行映射、恢复、权限和副作用列为冻结条件。

源码/测试证据：OpenCode App 的 `server-sdk.tsx` 有 AbortController、reconnect、generation 和 current/legacy 兼容；`handlers/event.ts` 的全局 SSE 不等于完整 durable replay。AgentCore 有 Journal、resume、attach/replay，但本轮记录明确没有跨进程生产级 exactly-once 证据。

报告证据：OpenCode 前端报告第 6、8、13、15、16 节；OpenCode 架构报告和 AgentCore 架构报告第二轮的 Go/No-Go 条件。

产品建议：接受 F-10 作为唯一阻塞项，但把“可重复端到端收敛”定义为可验收命题：同一输入和同一故障注入条件下，Magic Task 最终状态、当前责任人、Attempt 列表、审批状态、产物来源和副作用记录一致；重复/乱序事件不能产生第二个产品结论；无法恢复的部分必须进入显式 `needs_recovery`/`sync_gap`，不能静默完成。

推断：可以在该阻塞项解决前继续产品设计、Adapter 原型和受控灰度，但不应冻结首版数据库、API、完整状态机和开发排期。该阻塞同时包含产品映射和底座验证，不应被拆成多个互相逃逸的“非阻塞小问题”。

## 签署状态

**有条件一致。**

我接受 F-01、F-02、F-04、F-05、F-06、F-08 的共同签署文本；有条件接受 F-03、F-07、F-09、F-10，条件是保留 synthetic binding、U-07 技术安全默认、首版范围排除规则和可重复收敛验收定义。对 F-03 的条件不改变共同稿最小关系，只要求在底座稳定 ID 不存在时不伪造稳定 Run。

## 仍保留的唯一阻塞项

**在选定 OpenCode runtime/commit/client contract 后，尚未完成 Magic Task/TaskAttempt 与 OpenCode Session/Run 的正式绑定，以及断连、重启、重复/乱序事件、重试、停止、审批和已发生副作用组合场景下的可重复最终收敛证据。**

这也是我保留的唯一阻塞项。其余未纳入首版的能力不构成首版冻结阻塞，但不得被包装成已支持。

## 是否同意回写正式文档

**有条件同意回写。**

我同意将 F-01 至 F-10 的共同结论回写到：

- `D:\Harmess\Magic\docs\01-产品\Magic最终产品裁定与技术会议输入.md`
- `D:\Harmess\Magic\docs\01-产品\Magic产品系统边界与生命周期底图.md`
- `D:\Harmess\Magic\docs\01-产品\技术会议议题与裁定表.md`

回写条件：正式文档必须保留“产品方向 Go 与开发冻结 No-Go 分离”“F-07 在 U-07 裁定前是技术安全默认”“F-03 的底座稳定 ID/synthetic binding 条件”“F-09 未纳入首版的能力不构成阻塞”以及 F-10 的唯一阻塞定义。回写不得把源码静态证据、测试资产或 AgentCore 能力写成 OpenCode 实机验证结果；不得把共同签署稿中的技术建议误写成已经完成的实现。

等待主持人汇总，不中断。
