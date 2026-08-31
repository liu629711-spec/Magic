# 第2轮交叉质询回应

> 发言角色：Magic OpenCode 架构技术总监
>
> 本轮依据：
> - `D:\Magic\docs\01-产品\99-历史会议\会议记录-第一轮-AI核心总监.md`
> - `D:\Magic\docs\01-产品\99-历史会议\会议记录-第一轮-AgentCore架构总监.md`
> - `D:\Magic\docs\01-产品\99-历史会议\会议记录-第一轮-OpenCode架构总监.md`
> - `D:\Magic\docs\01-产品\99-历史会议\会议记录-第一轮-OpenCode前端总监.md`
> - `D:\Harmess\opencode\OPENCODE_BACKEND_ARCHITECTURE_BREAKDOWN.md`
>
> 证据标签：`[源码/测试]` 表示源码或测试资产存在，不表示本轮实测通过；`[报告]` 表示架构报告中的整理；`[产品基线]` 表示 Magic 已确认方向或待裁定项；`[建议]` 表示本轮技术建议；`[推断]` 表示需要验证的后果。

## C1. 产品方向 Go 与首版开发冻结 No-Go 是否拆成两个门槛

**结论：有条件同意。必须拆成两个门槛。**

- `[对方观点]` AI 核心总监和 OpenCode 前端总监都提出“Magic 产品方向 Go，但首版开发冻结 No-Go”；AgentCore 架构总监则列出“没有独立任务账本、没有责任人、没有恢复和副作用方案就不冻结”。
- `[源码/测试]` OpenCode 当前有 V1/V2 Session、EventV2、进程内 coordinator 和工具链，但没有证明它已经提供 Magic Task、稳定 RunAttempt、跨进程恢复和副作用补偿。真实 OpenCode 后端、Provider、MCP 和跨进程测试仍未完成。
- `[报告]` `D:\Harmess\opencode\OPENCODE_BACKEND_ARCHITECTURE_BREAKDOWN.md` 第 11、12、14、15、16 章已经把“静态代码存在”和“实机验证”分开。
- `[产品建议]` 门槛一是产品方向门槛：Magic 的两个维度、任务责任、状态分层和底座适配方向成立，可以继续设计。门槛二是开发冻结门槛：首版关键路径必须有版本、方案、负责人、验收标准和可重复证据。
- `[建议]` 可以带入受控灰度的风险包括 UI 信息折叠、非关键性能上界、非首版扩展工具和高级协作视图。不能带入灰度的未知包括任务最终状态收敛、重启/重复事件处理、权限边界、外部副作用和责任移交。
- `[推断]` 如果把产品方向 Go 误读成技术冻结 Go，会把底座未知转移成用户承诺；如果把所有未知都当成产品方向 No-Go，又会阻止在明确边界内做验证。

可执行修订：技术会议台账增加 `产品方向状态`、`首版开发状态`、`灰度风险` 三列；同一能力可以“产品方向 Go、首版冻结 No-Go、灰度暂不开放”。

## C2. 两种 server runtime、V1/V2 共存和 client artifact 漂移

**结论：有条件同意“首版必须选定一种运行时和版本”；不同意把另一套运行时完全抹掉。**

- `[对方观点]` AI 核心总监要求 OpenCode 版本实机核查；AgentCore 架构总监要求提供 session、子 Agent、cancel、resume、approval 和 event 的真实证据；前端总监要求锁定 client artifact、协议版本和生成链。
- `[源码/测试]` `D:\Harmess\opencode\packages\opencode\src\cli\cmd\serve.ts` 进入完整应用监听器，包含 Legacy、V2、`/doc`、UI fallback 和 WebSocket；`D:\Harmess\opencode\packages\cli\src\commands\handlers\serve.ts` 进入 `@opencode-ai/server/routes.createRoutes(password)`，主要提供 V2 `/api/*` 和 `/openapi.json`。
- `[源码/测试]` 当前基线为 OpenCode `1.18.23`、commit `5f5ea53afb2630227ead917f1a0ddf784c33150c`；App 还存在 vendored `@opencode-ai/client 1.17.13-v2`，与 workspace SDK 存在漂移可能。
- `[建议]` Magic 首版必须选择一条主 runtime、锁定 commit/依赖/client artifact，并通过 Adapter 隔离路由、Schema、Event、错误和版本变化。Adapter 可以在迁移期读取另一套协议，但不能把两套路由树和文档契约混成一个运行时。
- `[建议]` 我倾向先对独立 V2 runtime 做 PoC，因为它的 API surface 较小且 `/openapi.json` 明确；但这不是直接选定结论，必须先证明它覆盖首版需要的执行、工具、MCP、权限和 Location 能力。若能力不足，完整应用 runtime 也不能被当作“自动补齐”，而要重新验收其 Legacy/实验边界。
- `[推断]` 不锁 runtime 会导致同一路径在不同监听器返回不同 schema、认证和事件语义；不锁 client artifact 会导致前端把类型通过误认为协议兼容。

可执行修订：在能力矩阵中增加 `运行时入口`、`API surface`、`client artifact`、`认证方式` 和 `升级回归命令`，没有这些字段的“原生满足”不生效。

## C3. Magic Task、TaskAttempt、Magic Session、OpenCode Session、Turn、Run 的正式基数关系

**结论：有条件同意各位要求尽快冻结基数；首版采用保守的最小关系。**

- `[对方观点]` 前端总监认为基数关系会直接影响路由、缓存、事件归属和恢复；AgentCore 总监反对 `Run == AgentIdentity`，并要求区分 Conversation、Turn、Run；AI 核心总监也指出 CAPTAIN/AGENT 是运行时对象，不是 Magic 长期身份。
- `[源码/测试]` OpenCode 真实对象主要是 Session、Message、Part、SessionInput、Event、Execution 和 tool event；没有 Magic Task、TaskAttempt 或长期 Agent identity。AgentCore 的 `Run`、`RunSession` 和 `CAPTAIN/AGENT` 也主要描述执行尝试。
- `[产品基线]` Magic 底图已经把任务、回合、运行实例和会话拆开；最终裁定把任务账本作为产品状态真相源列为 U-03。

我建议首版采用以下最小关系：

```text
MagicSession 1 --- N MagicTurn
MagicSession 1 --- N MagicTask
MagicTask 1 --- N TaskAttempt
TaskAttempt 1 --- 1 OpenCodeSessionBinding
OpenCodeSessionBinding 1 --- N OpenCode prompt/message/event
AgentIdentity 1 --- N TaskAttempt
```

- `MagicSession` 是用户连续工作的产品容器，不等于 OpenCode Session。
- `MagicTask` 是有目标、责任人和最终状态的产品责任单元。
- `TaskAttempt` 是一次实际执行尝试；任务尚未执行时可以没有 Attempt，重试或移交通常产生新 Attempt。
- `OpenCodeSessionBinding` 是 Adapter 关系，不是 Magic 用户对象。首版先限制一个 Attempt 绑定一个 OpenCode Session；未来如需多个底座 Session，通过 Adapter 扩展，不改变 Magic Task 语义。
- `MagicTurn` 是 Magic 的输入/响应记录，可以引用 Task 和 Attempt，但不直接等于 provider turn、OpenCode message 或 Event。
- `AgentIdentity` 与 Attempt 是参与者和执行尝试的关系，不能由 OpenCode Run 反向创建长期身份。

首版不开放：一个 Attempt 同时绑定多个 OpenCode Session、跨工程复用底座 Session、把 parent/child Session 直接变成 Magic 子任务、把 provider turn 直接变成 Magic Turn、把 Run 直接持久化成 Agent 身份。

可执行修订：把上述关系写入技术会议台账；所有 OpenCode 对象只允许出现在“底座绑定”或“运行证据”列，不允许出现在 Magic 产品权威对象列。

## C4. 代理/CEO 与非工程/工程组织两个维度

**结论：同意，必须拆成不同产品对象和不同技术作用域。**

- `[对方观点]` AI 核心总监指出 CAPTAIN 只能作为一次执行中的协调角色，不能直接映射 PM；前端总监要求把“当前任务切换”和“会话默认方式”拆开；AgentCore 总监指出工程成员长期复用不是底座现成事实。
- `[源码/测试]` OpenCode 有 agent/model/session 操作，但没有 Magic 的代理方式、CEO 方式、工程、PM 或项目成员语义。`SessionExecutionLocal` 只负责当前进程执行。
- `[产品基线]` Magic 一页纸把“代理/CEO”定义为会话工作方式，把“非工程/工程组织”定义为长期组织形态。
- `[建议]` 技术上至少需要三个不同对象：`TaskModeSelection`（当前任务一次性选择）、`SessionDefaultMode`（后续任务默认值）、`ProjectOrganization`（工程、PM、成员和治理）。工程对象不能由一次模式切换自动创建。
- `[建议]` 执行中切换不应修改历史任务模式。它应产生显式 handoff 或新的 TaskAttempt，并记录原运行、已有结果、排队输入、审批和副作用。
- `[推断]` 如果用一个“切换模式”字段覆盖三者，用户会误以为一次 CEO 选择永久改变会话和工程；底层也会混淆运行参数与长期关系。

## C5. 普通代理、CEO/CAPTAIN、PM、项目成员和临时 worker 的责任

**结论：同意“唯一当前责任人”，但补充父子任务和用户直达规则。**

- `[对方观点]` AI 核心总监明确“CAPTAIN 不能直接成为 Magic PM”；AgentCore 总监认为 PM 负责工程计划而不是每个成员任务；前端总监要求补充父子任务收口规则。
- `[源码/测试]` OpenCode 的 Session、prompt、steer、queue 和 Execution 可以表达执行协作，但不表达 Magic 的唯一责任人、PM、成员交接或工程计划。
- `[产品基线]` Magic 要求正式任务任一时刻只有一名当前责任人，PM 负责工程级计划、依赖和风险，不自动成为所有成员任务的执行责任人。

首版建议：

| 角色 | 责任 |
|---|---|
| 普通代理主 Agent | 当前普通任务的产品收口责任人 |
| CEO/CAPTAIN | 当前任务的协调和汇报运行角色，不是长期 PM |
| PM | 工程计划、依赖、项目风险和项目级汇总 |
| 项目成员 | 被明确分派任务的执行责任人 |
| 临时 worker | 局部执行参与者，不获得长期身份 |
| Magic Task owner | 最终唯一当前责任人，由 Magic 账本保存 |

用户直达工程成员时：新工作必须进入工程任务账本，默认由接受任务的成员负责；如果影响工程目标、预算、资源、文件或交付，PM 必须知情并判断计划影响，但不能静默取消原任务。成员失败时，成员仍是失败任务的当前责任人，直到用户或 PM 显式移交；PM 负责项目层面的响应，不自动改写成员失败为成功。

可执行修订：为父任务增加“汇总责任人”和为子任务增加“执行责任人”两个字段；父任务不能因为子任务正在运行而自动变成完成。

## C6. 任务、运行、连接、审批、产物和事实状态是否分层

**结论：同意必须分层；不同意首版一次性实现所有高级状态。**

- `[对方观点]` 前端总监要求至少展示任务状态、运行状态、连接状态、审批状态、同步缺口和副作用；AI 核心总监指出 structured gap、partial、degraded 不能映射为成功；AgentCore 总监反对 Run 完成等同任务完成。
- `[源码/测试]` OpenCode 同时有 Session status、Execution 状态、SSE 连接、Permission/Question pending、PTY 状态、Event replay 和文件/工具结果；这些状态不是同一个枚举。本轮没有完成断连、重启和重复事件实测。
- `[报告]` OpenCode 报告第 5、6、7、8、11、15 章已经区分底座状态、实时事件、持久投影和外部副作用。

首版最小状态：

- `TaskState`：draft、ready、active、waiting、partially_completed、succeeded、failed、stopped、cancelled、archived。
- `AttemptState`：created、queued、running、waiting、succeeded、failed、stopped、unknown。
- `ConnectionState`：connected、disconnected、degraded、resync_required。
- `ApprovalState`：not_required、pending、approved、denied、expired、unknown。
- `ArtifactState`：produced、under_review、accepted、rejected、superseded。
- `FactState`：首版若暂不开放共享事实，可只保存来源引用；一旦开放，至少需要 candidate、confirmed、disputed、revoked。

这些状态必须有映射规则，但不能由 `idle`、`ended`、`RunPhase.COMPLETED`、tool success、文件存在或 SSE 断开直接推断 Task 成功。

可执行修订：前端默认消费 Magic 状态快照，底座状态仅作为 evidence；每个状态变更记录来源 Event/Attempt 和是否经过验收。

## C7. 共享事实、记忆、transcript、NoteWall、文件/产物及成员迁移

**结论：同意必须分开；首版默认不做隐式迁移。**

- `[对方观点]` AI 核心总监指出 transcript 续写不能叫成员复用，NoteWall 不等于事实账本；AgentCore 总监指出 memory scope、NoteWall 和 handoff 不能直接推导 Magic 的长期记忆；前端总监要求事实来源和产物验收可见。
- `[源码/测试]` OpenCode 的历史、文件、tool output 和 Session projection 是底座证据，不是 Magic 共享事实账本；并发文件冲突、事实撤销和成员迁移本轮未实测。
- `[产品基线]` Magic 已区分共享事实、私有记忆、文件、产物和 transcript，并把 U-07 列为成员迁移待裁定。

首版会话成员转项目成员时：

1. 创建新的 `ProjectMember` 关系，不把原会话关系静默升级。
2. 原会话、历史任务、transcript 和私有记忆继续保留原归属。
3. 只有用户明确确认的角色模板、摘要、事实或产物才能复制或引用。
4. 权限必须重新授予，不能因成员身份转换自动扩大。
5. 迁移记录必须保留来源、操作者、时间和未迁移内容。

`NoteWall` 可以作为协作材料，不能直接成为项目事实；文件可以作为产物或事实来源，不能自动成为共识；transcript 可以支持运行恢复或上下文引用，不能自动成为长期记忆。

## C8. 前端默认体验：自然工作台与诚实状态

**结论：有条件同意前端总监的“状态必须可见”；反对默认展示完整管理后台。**

- `[对方观点]` 前端总监要求首版展示工程总览、任务账本、责任人、审批、产物、事实来源和同步缺口；Nash 方向需要减少用户管理负担；AI 核心总监要求用户无需理解内部编排。
- `[源码/测试]` OpenCode App 已有 timeline、permission dock、question dock、terminal、review、query/store 和 V1/V2 reducer，但这些组件存在不等于 Magic 状态契约成立；全量 Web/Electron/TUI 和断连行为没有本轮验证。
- `[产品建议]` 默认只展示：用户目标、当前责任人、任务状态、最新有效结果、阻塞/审批、产物入口和必要的连接/同步警告。
- `[产品建议]` 默认折叠：原始 Event timeline、全部 child run、模型 token 明细、原始 tool log、底层 OpenCode route 名称和复杂 DAG；用户主动展开或发生争议时再展示。
- `[产品建议]` 以下内容不能折叠成普通成功：等待审批、失败、部分完成、断连、同步缺口、已发生不可撤销副作用和责任移交。
- `[推断]` 如果前端把底座的 `busy/idle/retry/ended` 直接呈现为 Magic 任务状态，界面会自然但不可信；如果把所有事件默认展开，用户又会重新承担 AgentCore 式编排管理负担。

可执行修订：前端和后端共同定义 Magic 状态投影 API；UI 不直接依赖 OpenCode reducer 的枚举作为产品契约。

## C9. 首版端到端验证、延后范围与验收证据

**结论：同意核心场景必须验证；有条件同意把高级协作明确延后。**

首版必须验证：

1. 普通代理调用临时 worker，任务完成后不产生长期成员。
2. 单次 CEO/CAPTAIN 协作完成后，任务责任和默认工作方式仍可解释。
3. PM 派发成员任务，成员失败、部分完成和产生产物时，责任与最终状态正确。
4. 用户直达成员产生任务，任务入账、PM 知情、冲突和优先级可解释。
5. 重复 prompt、重复 Event、断连、重试和进程重启后，Task/Attempt 最终状态收敛。
6. Permission 拒绝、shell/文件副作用、取消和失败后的文件/产物状态可追溯。
7. 同一文件的并发修改、产物验收和失败回退边界可解释。
8. 选择的 OpenCode runtime 在锁定 commit 下完成真实 API、事件、Provider 和工具最小闭环。

验收证据必须包括：固定 commit 和依赖清单、可重复命令或 harness、请求/响应或事件样本、数据库/任务账本快照、重启前后对比、最终状态映射、失败和副作用记录。测试文件存在不能代替这些证据。

首版明确延后：完整圆桌、多层 PM、跨工程成员、永久在线 Agent、复杂多组织权限、跨进程任意迁移、多端多人协作和任意无损模式切换。它们可以作为扩展门槛，不应阻塞单用户单工程的受控验证，但也不能在首版宣传为已具备。

## C10. 对其他三位仍然过于绝对或越界的观点

**结论：有条件反对两处表述，并接受其背后的风险判断。**

### 1. 对 AI 核心总监“会话成员跨任务复用和成员转工程成员必须首版验证”的修正

- `[对方观点]` AI 核心总监在首版必须做清单中把会话成员跨任务复用、成员转工程成员和相关迁移场景全部列为首版验证门槛。
- `[理由]` 这对“首版要验证长期工程成员”是合理的，但对所有 Magic 首版路径过于绝对。OpenCode 没有稳定的长期成员身份，强行把成员迁移设为平台级冻结门槛，会让普通代理闭环也被一个尚未选定的组织扩展阻塞。
- `[建议]` 改成：如果首版范围包含会话成员或项目成员复用，则必须验证对应迁移；普通代理最小闭环只必须证明临时 worker 不产生长期身份。成员迁移应是工程首版的条件门槛，不是所有产品方向的统一门槛。

### 2. 对前端总监“事件层必须采用查询快照 + durable 事件 + live 事件 + 缺口修复”的修正

- `[对方观点]` 前端总监把四层事件方案列为首版必须做。
- `[理由]` 可靠最终状态的目标我同意，但“通用缺口修复服务”不是唯一实现。OpenCode 的 `/api/event` 是 bounded live stream，Session history 与 live stream 也不是同一个表面；Magic 可以在重连时重新读取权威任务快照，并用幂等 Event/Attempt 记录收敛，不必首版就实现复杂的通用事件缺口协议。
- `[建议]` 首版硬要求应改成：权威快照、事件幂等、重连后重新同步、可发现同步缺口和最终状态收敛。通用 cursor replay、跨服务 gap repair 和高性能 live fan-out 可以后延。

我不接受任何把 OpenCode `Run` 直接等同 Magic Agent 身份、把 CAPTAIN 直接等同 PM、把文件直接等同事实、或把底座 approval 直接等同组织权限的表述。这些不是保守偏好，而是对象权威和生命周期不同造成的硬边界。

## 统一结论草案

1. Magic 产品方向 **Go**；首版开发冻结采用独立技术门槛，不因方向成立而自动通过。
2. 首版锁定一个 OpenCode runtime、一个 commit、一个 client artifact 和一套 Adapter 契约；两套 runtime 可以作为迁移材料存在，但不能混用语义。
3. Magic 自己拥有 Task、TaskAttempt、责任人、最终状态、产物、事实和权限账本；OpenCode Session、Run、Event 和工具结果只能作为底座绑定或运行证据。
4. 首版采用 `MagicTask 1-N TaskAttempt`，每个 Attempt 暂限制绑定一个 OpenCode Session；Magic Session、Magic Turn、Agent identity 和底座对象保持独立。
5. 代理/CEO 是任务或会话工作方式；非工程/工程是长期组织形态；当前任务选择、会话默认和工程成员关系不能由一个字段代替。
6. 任务、Attempt、连接、审批、产物和事实状态分层；任何底座 `idle`、`ended`、Run 完成或文件存在都不能单独生成 Magic Task 成功。
7. 首版允许受控范围内验证普通代理、单次 CEO、PM、少量项目成员、责任移交和真实交付；完整圆桌、多层 PM、跨工程、永久 Agent、多人多端和任意无损切换延后。
8. 所有能力以“原生满足、适配后满足、Magic 需补建、当前不支持、仍未知”登记；测试资产不能代替实机证据。

## 我仍保留的唯一阻塞项

**在锁定 OpenCode runtime/commit 后，Magic `TaskAttempt` 在断连、进程重启、重复事件、重试和已发生外部副作用的组合场景下，尚未有可重复的端到端最终收敛证据。**

这是一个阻塞项，而不是五个独立阻塞项：版本、事件幂等、恢复、权限和副作用验证都属于证明这个 TaskAttempt 收敛性质所需的证据。只要首版关键路径仍无法回答“失败或重启后到底留下什么、谁负责、是否会重复执行、最终任务状态是什么”，我不建议冻结 Magic 首版后端方案。

等待第三轮共同签署





