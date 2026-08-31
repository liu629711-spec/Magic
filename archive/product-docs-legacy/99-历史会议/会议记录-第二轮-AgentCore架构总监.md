# 第2轮正式交叉质询

> 发言角色：Magic AgentCore 项目架构技术总监
>
> 讨论范围：AgentCore 运行时、Magic 后端对象、任务账本、责任、持久化、恢复、幂等和底座适配边界。
>
> 阅读记录：
> - `D:\Magic\docs\01-产品\99-历史会议\会议记录-第一轮-AI核心总监.md`
> - `D:\Magic\docs\01-产品\99-历史会议\会议记录-第一轮-AgentCore架构总监.md`
> - `D:\Magic\docs\01-产品\99-历史会议\会议记录-第一轮-OpenCode架构总监.md`
> - `D:\Magic\docs\01-产品\99-历史会议\会议记录-第一轮-OpenCode前端总监.md`
> - `D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_BACKEND_BREAKDOWN.md`
>
> 证据规则：`[源码]` 是当前仓库代码；`[测试]` 是测试源码存在但不代表本轮通过；`[报告]` 是已有架构报告整理；`[产品]` 是 Magic 产品基线；`[建议]` 是本轮技术建议；`[推断]` 是不能直接当事实的判断。

## 一、事实与证据

### 1. 对三份第一轮记录的共同事实确认

我同意 AI 核心总监、OpenCode 架构总监和 OpenCode 前端总监的一个共同判断：底座执行对象不能直接升级为 Magic 产品对象。

- `[源码/报告]` AgentCore 当前可以确认 `Conversation`、`Message`、`Turn`、`Run`、`RunSession`、`PausedTurn`、`CAPTAIN`、`AGENT`、Journal、SSE、MCP、Sidecar 和多类工具。
- `[源码/报告]` OpenCode 记录可以确认 session、message、part、child session、permission、event、V1/V2 reducer 和客户端生成物，但不能因此证明它拥有 Magic 的 Task、PM、ProjectMember 或共享事实账本。
- `[产品]` Magic 生命周期底图把工程、任务、回合、运行实例、Agent 身份、会话成员、项目成员、PM、事实、产物和权限分开。
- `[建议]` 后续所有映射都必须经过 Magic Adapter 和 Task Ledger，禁止用同名字段直接映射。

### 2. 我补充的 AgentCore 后端边界

- `[源码]` AgentCore 的 `RunKind.CAPTAIN` 和 `RunKind.AGENT` 是执行角色；`CAPTAIN` 负责一次运行中的协调，不能直接视为长期 PM。
- `[源码]` Journal 主键为 `(turn_id, band, seq)`；`EventSink`、Replay、Fold 和 SSE 分层，SSE 断连不会自动取消执行。
- `[源码]` `PausedTurnRepository.claim()` 使用 `DELETE ... RETURNING`，`claim_expired()` 使用条件 `UPDATE ... RETURNING`，这是数据库 claim 机制，不是外部副作用 exactly-once。
- `[源码]` AgentCore 的 MCP 链路经过 `McpDynamicTool -> DesktopClientChannel -> InteractionRegistry -> FulfillerHub -> fulfill SSE -> Electron main -> stdio MCP -> resolve`，Sidecar 还有自己的 fulfill hub。
- `[源码]` `userData/mcp-servers.json` 当前未发现完整 command allowlist；本地 `command/args/env` 可能启动任意本地进程。
- `[源码/报告]` primary 和 telemetry 是不同连接池；成本 outbox、workspace 文件、数据库事务和实时发布之间不是天然同一原子事务。
- `[限制]` 本轮没有运行 pytest，也没有连接真实 PostgreSQL、Redis、S3、OpenCode、MCP、LLM、Browser 或 gVisor。

## 二、对 Magic 产品基线的修正或澄清

### C1. 产品方向 Go 与首版开发冻结 No-Go 是否拆开

**结论：有条件同意拆成两个门槛。**

- `[对方观点]` OpenCode 架构总监第一轮主张：Magic 产品方向可以 Go，但在 OpenCode 版本、Task/RunAttempt、恢复、权限和副作用验证完成前，首版开发冻结 No-Go。AI 核心总监也主张产品方向成立，但首版技术方案不能过早冻结。
- `[我的判断]` 这个拆分是正确的。产品方向 Go 只说明“产品问题值得做”；开发冻结 Go 才说明“对象、状态、责任和底座能力足够明确，可以锁数据库和接口”。两者混成一个门槛，会产生两种错误：要么因为底座未知而否定产品方向，要么因为产品方向成立而提前冻结实现。
- `[源码/报告]` AgentCore 的恢复、MCP、Journal 和工具能力虽有静态实现与测试定义，但尚未经过真实外部依赖和多进程验证；因此不能把静态存在当开发冻结证据。
- `[可执行修订]` 采用两道门：
  1. **方向 Go**：Magic 仍坚持代理/CEO、非工程/工程组织、任务账本和唯一责任人等产品不变量。
  2. **首版冻结 Go**：只要求首版范围内的对象、状态、责任、OpenCode 运行时、恢复、幂等和副作用边界被验证。
- `[灰度可带风险]` 可以带入受控灰度的风险：单 worker、单用户、单工程、有限成员、有限工具、明确人工介入的恢复，以及不承诺 exactly-once 的非关键副作用。
- `[必须阻塞]` 必须阻塞冻结的未知：Task 与 Attempt 的基数、唯一责任人、任务最终状态、运行重试语义、OpenCode 选用 runtime、权限边界、数据恢复和外部副作用记录。
- `[不应阻塞方向]` 多层 PM、跨工程成员、成员市场、完整圆桌、多 worker 和长期自治不应阻塞产品方向，也不应成为首版冻结前的必要范围。

### C2. OpenCode 两种 server runtime、V1/V2 共存与 client artifact 漂移

**结论：有条件同意首版先选定一种 runtime 和版本。**

- `[对方观点]` OpenCode 架构总监指出存在两种 server runtime、V1/V2 共存、generated client 与显式 vendor client 版本漂移，建议首版锁 commit、依赖、runtime、API contract 和生成客户端。OpenCode 前端总监也记录了 OpenCode `1.18.23` 与 App 显式 vendor client `1.17.13-v2` 的不等价风险。
- `[我的判断]` 这是首版开发冻结的硬门槛，但不是要求 Magic 永久只支持一种 runtime。首版如果把两种 runtime 的路由、事件和 client 混在一个 Magic 状态模型里，恢复和事件语义必然不可控。
- `[证据边界]` 这些是 OpenCode 侧记录的源码和版本证据，不等于 AgentCore 已经证明了哪一种 runtime 最适合 Magic；仍需要底座负责人给出版本和实机结果。
- `[可执行修订]` 首版建立 `OpenCodeAdapter`，内部只选择一个明确的 runtime profile。Adapter 负责隔离：session 创建、run 启动、event 转换、permission、cancel、resume、artifact 和错误映射。
- `[必须禁止]` 不允许在 Magic 产品层暴露 V1/V2、server runtime 或 vendor client 版本；不允许两个 runtime 同时写同一套产品状态而没有版本化事件契约。
- `[灰度策略]` 可以并行搭建第二 runtime 的适配测试，但不能让它进入首版生产路径。升级必须经过双读/回放/恢复/副作用回归，不能仅升级 npm 或 generated client。

### C3. Magic Task、TaskAttempt、Magic Session、OpenCode Session、Turn、Run 的基数关系

**结论：有条件同意“任务一对多运行”，反对首版开放任意多对多。**

- `[对方观点]` OpenCode 前端总监要求冻结 Magic session、task、turn、OpenCode session 的基数；OpenCode 架构总监建议 Magic Task 与 RunAttempt 分离，并不把 OpenCode Session 直接当 Task。
- `[最小可实现关系]` 首版采用：

```text
Magic Project 1 -> N Magic Task
Magic Task 1 -> N TaskAttempt
Magic Task 1 -> N Magic Turn
TaskAttempt 1 -> 1 selected OpenCode Session
TaskAttempt 1 -> 1 AgentCore Turn
AgentCore Turn 1 -> N AgentCore Run
Magic Session 1 -> N Magic Task
Magic Session 0..N -> 1..N OpenCode Session mappings
```

- `[源码/报告]` AgentCore 的一个 Turn 可以包含 CAPTAIN、AGENT、delegate 和多个 Run；因此把 Turn、Run 和 Task 压成一层会丢失执行拓扑。
- `[建议]` 首版把“一个 Attempt 使用一个主要 OpenCode Session”作为默认关系。需要继续时可以创建新的 Attempt，并通过 `replaces_attempt_id`、上下文快照和证据引用保持连续。
- `[首版不开放]` 不开放任意一个 OpenCode Session 跨工程共享；不开放一个底座 Session 同时成为多个 Magic Task 的无边界写入源；不开放通过 session name 推导长期 Agent 身份；不开放任意 Task/Session/Run 的多对多产品关系。
- `[产品待裁定]` 一个任务是否允许跨多个 Magic Session、子任务是否必须有独立 TaskSession，仍需产品经理裁定 U-01。

### C4. 代理/CEO 与非工程/工程组织两个维度

**结论：同意必须是两个独立维度，并且需要不同产品对象。**

- `[对方观点]` AI 核心总监强调代理和 CEO 是平等会话工作方式；OpenCode 前端总监要求“当前任务切换”和“会话默认”分开。
- `[产品事实]` Magic 产品一页纸明确：代理/CEO 是会话工作方式，非工程/工程是长期组织形态。
- `[源码事实]` AgentCore `CAPTAIN` 是一次运行的编排角色，不能作为工程组织对象。
- `[可执行修订]` 技术层分为：
  - `WorkMode`: 当前任务使用代理或 CEO。
  - `SessionDefault`: 后续任务默认方式。
  - `ProjectOrganization`: 工程、PM、成员和工程任务。
  - `TaskAttempt`: 具体执行尝试。
- `[首版规则]` “本次使用 CEO”不能修改会话默认；“修改会话默认”不能追溯修改旧任务；“建立工程”必须经过明确确认。
- `[条件同意]` 执行中切换只允许在稳定边界完成：当前运行结束、显式停止并保留结果，或等待不可中断副作用结束。不承诺任意时刻无损切换。

### C5. 普通代理主 Agent、CEO、PM、项目成员、临时 worker 的唯一责任

**结论：同意唯一当前责任人，但反对把执行角色直接当责任主体。**

- `[对方观点]` AI 核心总监认为 CAPTAIN 可以承担一次任务的协调和收口，AGENT 只能承担局部执行；OpenCode 前端总监要求补充父子任务责任展示。
- `[我的修正]` “承担一次运行收口”不等于“成为 Magic 任务责任人”。CAPTAIN 是运行角色；Magic 当前责任人必须是 Magic 账本中的主体关系。
- `[建议规则]`：
  - 普通代理任务：会话主 Agent 或被指定的 Magic Agent 身份负责用户侧收口。
  - 单次 CEO：CAPTAIN 负责该 Attempt 的编排；Magic 当前责任人仍由任务账本指定。
  - 工程成员任务：被派发成员承担该任务责任。
  - PM：负责工程计划、依赖、项目级风险和汇总，不自动负责每个成员任务。
  - 临时 worker：只负责运行中的局部步骤，不获得长期成员身份。
- `[用户直达成员]` 用户直达工程成员时必须创建或关联 Magic Task；默认由接受任务的成员承担任务责任，影响工程目标、预算、文件或交付时通知 PM。
- `[成员失败]` 成员失败不会自动把责任转给 PM。PM 可以重新派发、移交或关闭任务，但必须留下责任变更记录。
- `[必须记录]` 责任移交至少记录原责任人、新责任人、原因、时间、已完成结果、未完成事项、在飞 Attempt、审批和已发生副作用。

### C6. 任务、运行、连接、审批、产物和事实状态是否分层

**结论：同意必须分层；有条件同意首版只落地最小状态集合。**

- `[对方观点]` OpenCode 前端总监列出 session status、generation、permission/question、PTY 和 query cache；AI 核心总监强调 `RunPhase`、`TurnOutcome`、`FinishReason` 不是同一状态。两者都反对用单一枚举压平全部状态。
- `[源码/报告]` AgentCore 已经实际存在 Journal/Run/Turn/Interaction/SSE/approval/settlement 多层语义；`ProjectedTurn.status`、`outcome` 和 `finishReason` 也不是同一维度。
- `[首版最小落地]` 至少需要：
  - Task：`draft/runnable/running/waiting/blocked/partially_completed/completed/failed/cancelled/archived`。
  - TaskAttempt：`created/queued/running/waiting/stopping/stopped/succeeded/failed/cancelled/recovered`。
  - Connection：`connected/reconnecting/disconnected/sync_gap`。
  - Approval：`required/pending/approved/denied/expired/cancelled`。
  - Artifact：`created/changed/verified/accepted/rejected/archived`。
  - Fact：`candidate/confirmed/disputed/revoked/superseded`。
- `[产品建议]` 这些状态必须有各自的来源和更新时间，不能让前端从 SSE 文本猜状态。
- `[可后延]` 首版可以延后细粒度 worker phase、完整工具阶段状态、复杂事实影响图和高级同步诊断，但不能延后任务/Attempt/责任人/副作用的基本状态。

### C7. 共享事实、记忆、transcript、NoteWall、文件和产物

**结论：同意严格分层；首版对会话成员转项目成员采取“新关系、默认不迁移”。**

- `[对方观点]` AI 核心总监指出 NoteWall 不等于项目事实，记忆 scope 不等于工程长期记忆；OpenCode 前端总监指出文件和运行事件也不能自动成为 Magic 事实。
- `[源码/报告]` AgentCore 的 RunSession 是 worker transcript snapshot；memory、NoteWall、debate evidence ledger 和 workspace 文件各有运行或资源语义，没有足够证据替代 Magic 共享事实账本。
- `[边界]`：
  - transcript：某次运行或 Agent 的上下文记录。
  - memory：按 scope 复用的记忆材料。
  - NoteWall：协作过程中的便签或中间协调信息。
  - file/artifact：文件或产物证据，必须另有验收状态。
  - shared fact：Magic 的有来源、可争议、可撤销、可版本化项目事实。
- `[首版建议]` 会话成员转项目成员时新建 `ProjectMember` 关系；历史任务、transcript、记忆、权限和产物不自动整体迁移，只能逐项选择并记录来源。
- `[必须保留]` 私有记忆不能因为成员加入工程自动公开；加入工程也不能自动获得旧会话所有权限。
- `[推断]` 默认全量迁移会造成权限扩大、错误事实扩散和跨会话隐私泄露，因此首版应采取显式迁移。

### C8. 前端默认体验与后端状态诚实性

**结论：有条件同意“自然工作台”方向，但后端不能为了自然体验隐藏关键责任和失败信息。**

- `[对方观点]` OpenCode 前端总监主张默认展示目标、进度、责任、结果，折叠细节；Nash/体验方向强调减少用户管理负担，不要把产品做成管理后台。
- `[我的判断]` 我同意默认不展开完整 DAG、所有 token、所有工具日志和内部 session；但不同意把等待、失败、责任人、同步缺口、已发生副作用折叠到用户找不到。
- `[可执行修订]` 默认显示：当前任务状态、当前责任人、下一步、是否等待用户、最新结果、产物状态、失败/部分完成、外部副作用摘要。高级视图再展开 Run、Journal、工具参数、DAG 和完整事件。
- `[后端契约]` 前端只能消费 Magic Task Ledger 的任务状态，同时通过关联 ID 查看 AgentCore/OpenCode 运行证据；不能直接从 `idle`、`ended`、`message_end` 或 `execution_detached` 判断任务完成。
- `[产品建议]` “自然”应理解为用户不需要管理编排细节，不是系统可以隐藏责任和风险。

### C9. 首版端到端场景、延后范围和验收证据

**结论：同意首版收窄范围，但不同意只做静态 happy path。**

- `[对方观点]` 三位总监都建议单用户、单工程、少量成员，并延后多层 PM、跨工程、完整圆桌和多端复杂协作。
- `[首版必须验证]`：
  1. 代理调用临时 Agent，结束后不产生长期成员。
  2. 同一会话成员跨任务复用，新会话不能越权调用。
  3. PM 派发成员任务，成员失败或部分完成仍真实呈现。
  4. 用户直达工程成员，任务入账、PM 知情、冲突可处理。
  5. 单次 CEO 不改变会话默认方式。
  6. 执行中停止或切换，已有副作用和责任清楚。
  7. 会话成员转项目成员，历史/记忆/权限不静默扩大。
  8. 断线、重复事件、服务重启、恢复和重试后任务最终状态一致。
  9. 文件、Git、MCP、付费和网络副作用有审计与幂等/补偿结果。
- `[明确延后]` 完整圆桌、多层 PM、跨工程成员、无限嵌套团队、永久在线 Agent、多端多人权限和复杂记忆共享。
- `[验收证据]` 必须同时有：版本/配置、请求与事件样本、数据库状态、责任变更、产物 hash 或版本、外部副作用记录、重启/重试前后对照和 collected/passed/failed/skipped/timeout 结果。仅截图、单元测试文件存在或绿色 demo tape 不够。

### C10. 对其他三位仍然过于绝对、过度谨慎或越界观点的质询

**结论：我质询三类表述，但不是否定他们的核心方向。**

1. **对“所有未知都必须阻塞首版”的过度谨慎。**
   - `[对方观点]` OpenCode 架构总监倾向于“所有首版关键能力不再处于仍未知”后才 Go。
   - `[我的反对]` 如果把所有未知都算硬阻塞，多层 PM、跨工程、TUI、复杂长期记忆等非首版能力会拖住首版。
   - `[替代表述]` 只有影响首版任务账本、责任、状态、恢复、权限、关键副作用和选定 OpenCode runtime 的未知才阻塞冻结；其余未知进入受控灰度或后续扩展门槛。

2. **对“CAPTAIN 可以承担任务收口”的对象混淆风险。**
   - `[对方观点]` AI 核心总监认为 CAPTAIN 可以承担一次任务的协调和收口。
   - `[我的澄清]` 如果“任务”指 AgentCore 一次运行，完全同意；如果“任务”指 Magic Task，则必须由 Magic 责任人和 Task Ledger 收口。
   - `[替代表述]` CAPTAIN 负责一次 Attempt 的运行编排和运行结果汇总；Magic 当前责任人负责产品任务最终收口。

3. **对“前端可以把底座状态适配成用户状态”的越权风险。**
   - `[对方观点]` OpenCode 前端总监已经要求 Magic facade，但仍大量围绕 session、permission、event 和 reducer 设计前端映射。
   - `[我的质询]` 前端可以消费映射后的 Magic 状态，但不能自行定义 Task 完成、责任转移或产物验收语义。
   - `[替代表述]` 后端 Task Ledger 输出稳定产品状态；前端只负责呈现和交互，底座事件作为可追溯证据展示。

## 三、统一结论草案与唯一阻塞项

### 1. 我愿意接受的统一结论草案

> Magic 产品方向可以 Go，但首版开发冻结必须拆成独立门槛。首版采用单用户、单工程、单 PM、少量成员、单主工作区和一种锁定版本的 OpenCode runtime。Magic 自己拥有 Task Ledger、AgentIdentity、ProjectMember、PM、Task、TaskAttempt、Artifact、Fact、Permission 和 SideEffect 等产品层对象；OpenCode Session、AgentCore Turn/Run、Journal、SSE、Replay、MCP 和工具结果作为底座执行证据。首版只在稳定边界处理代理/CEO切换和责任移交，不承诺任意时刻无损切换，也不承诺所有外部副作用 exactly-once。任务状态、运行状态、连接状态、审批状态、产物状态和事实状态分层，最终由 Magic 任务账本形成唯一、可解释、可恢复的产品状态。多层 PM、跨工程成员、完整圆桌、永久在线 Agent、多 worker 横向扩展和复杂记忆共享延后。

### 2. 我仍保留的唯一阻塞项

**OpenCode 首版 runtime、版本和恢复/事件契约尚未由实机证据锁定。**

这一个阻塞项会连带影响 Adapter、TaskAttempt 映射、事件幂等、审批恢复、取消语义和数据库字段设计。在 OpenCode 负责人提供 commit、runtime 选择、client artifact 版本、事件样本、断线/重启/恢复实验和失败边界之前，我不接受首版后端开发冻结；但不阻塞 Magic 产品方向继续收敛，也不阻塞建立与底座无关的 Task Ledger 产品模型。

等待第三轮共同签署





