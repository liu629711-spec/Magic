# 第3轮共同签署

> 发言角色：Magic OpenCode 项目架构技术总监
>
> 签署范围：只审查共同签署稿 F-01 至 F-10，以及它们对 OpenCode 底座、Magic 产品对象和首版冻结的技术含义。
>
> 证据口径：`[源码/报告]` 表示 OpenCode 仓库源码或 `OPENCODE_BACKEND_ARCHITECTURE_BREAKDOWN.md` 的已定位证据；`[会议记录]` 表示其他总监第一、二轮的观点；`[产品边界]` 表示产品文件中的方向或待裁定项；`[建议]` 表示本总监的签署条件；`[推断]` 不作为 OpenCode 已具备能力。

## 一、逐条签署

### F-01 产品方向与开发门槛

**签署：接受。**

`[会议记录]` AI 核心总监第二轮要求把产品方向 Go 与首版开发冻结 Go 分开；AgentCore 总监和前端总监也都同意只有影响首版契约的未知才阻塞冻结。该条准确吸收了四方共识。

`[源码/报告]` OpenCode 当前仍是 Legacy V1 与 EventV2/V2 Session Core 并存的迁移态系统，且两种 server runtime 的路由、文档和兼容边界不同（`D:\Harmess\opencode\OPENCODE_BACKEND_ARCHITECTURE_BREAKDOWN.md` 第 1、4、15.1-15.4 节）。因此，runtime、client contract、任务映射、恢复和副作用语义确实属于冻结前必须闭合的未知；TUI、复杂圆桌、多层 PM 等不属于同一层风险。

`[建议]` “受控灰度”必须有单独标签、feature flag、单用户/单工程范围和 `unsupported`/`degraded` 状态。未知能力不能仅因为隐藏在 UI 后面就被当成已支持。

**阻塞判断：** F-01 本身不是阻塞；其中列出的首版契约未知会由 F-10 形成唯一技术阻塞。

### F-02 产品对象和底座边界

**签署：接受。**

`[会议记录]` AgentCore 总监明确反对 `Run == Magic Task`，AI 核心总监反对把 CAPTAIN/AGENT 运行对象直接变成长期身份，前端总监反对把 OpenCode 同名对象直接暴露为 Magic 对象。本条把这些边界正式化，是必要的。

`[源码/报告]` OpenCode 的 `Session` 是对话/执行上下文；`SessionExecutionLocal` 是进程内执行协调器；`EventV2` 是持久事件和投影链；tool、permission、filesystem 与 provider 还跨越不同副作用边界。报告第 5、8、10、15.6-15.7 节没有发现任何可以直接提供 Magic `ProjectMember`、PM、最终任务状态或完整授权模型的证据。

`[建议]` `RootExecutionBinding`、事件 envelope 和审计记录中应保存底座类型、runtime、commit、protocol/client 版本、底座 ID 和映射状态。若不存在稳定底座 ID，必须标记 synthetic，不得伪装成稳定身份。

**阻塞判断：** 该边界是冻结前不变量，但不是额外阻塞项；其可重复收敛证据归入 F-10。

### F-03 最小对象关系

**签署：有条件接受。**

`[会议记录]` AgentCore 总监要求把 Run 放在执行层；AI 核心总监建议 `MagicTask 1-N TaskAttempt`；前端总监指出基数会直接影响路由、缓存、事件归属和恢复。本条的方向正确，也正确禁止共享底座 Session、跨工程迁移和 child session 冒充 Magic 子任务。

`[源码/报告]` OpenCode 代码能确认 Session、prompt admission、message/part、EventV2、当前进程内 runner 和 child execution 的关系，但不能证明 OpenCode Session 与 MagicSession 一对一，也不能证明每个运行都有可跨重启使用的稳定 Run ID。`SessionInput.admit` 返回 admitted 不等于 provider 已执行；`SessionRunCoordinator` 的 active 状态是进程本地；报告第 5、6、10.2-10.5、15.6 节均把这些列为边界。

`[签署条件]` 首版关系必须落成以下更严格的解释：

```text
MagicSession 1-N MagicTask
MagicTask 1-N Turn
MagicTask 1-N TaskAttempt
TaskAttempt 1-1 RootExecutionBinding
RootExecutionBinding 1-1 canonical OpenCode Session（有稳定 ID 时）
TaskAttempt 1-N 底座子运行/事件证据
```

`Turn` 是 Magic 输入和产品响应记录，不等于 OpenCode message、provider turn 或 AgentCore Run；每个执行型 Turn 必须有一个主 Task，派生任务显式入账。若底座没有稳定 Session/Run ID，synthetic binding 只能表示“本次适配关联”，不能承诺跨重启恢复。一个 Attempt 内不得切换 canonical runtime 或混写两套事件语义。

`[建议]` 共同稿中的“一个 Attempt 可包含一个根执行和多个 AgentCore/OpenCode 子运行”应在实现上改成“多个底座执行证据”，除非实际依赖和实验已证明 AgentCore 与 OpenCode 的父子关系；当前报告没有这种证明。

**阻塞判断：** 正式关系必须在冻结前确定；底座 ID、事件归属和恢复能否支撑它属于 F-10 的唯一阻塞，不另设阻塞。

### F-04 两个组合维度与切换

**签署：接受。**

`[会议记录]` 前端总监主张把任务级切换和会话默认级切换分开；AI 核心、AgentCore 和本总监均反对 `CAPTAIN == PM`，也反对 CEO 自动变成工程或长期成员。本条对两个维度的拆分是正确的。

`[源码/报告]` OpenCode 有 agent、model、session、child lineage 和执行操作，但没有 Magic CEO、PM、工程组织或长期成员语义。报告第 5、6、15.6 节还表明 interrupt 只作用于当前进程所有权链，不能外推成任意时刻无损切换。

`[建议]` 执行中切换的稳定边界至少包括：当前运行自然结束、显式停止并保存结果，或完成不可中断的副作用/审批处理。新 Attempt 必须记录旧 Attempt、上下文摘要、责任人、审批、已发生副作用和不可迁移内容。普通代理或工程成员调用辅助 Agent 不应自动改变会话默认或建立长期成员。

**阻塞判断：** 不承诺任意无损切换即可继续受控原型；若首版宣称支持切换，F-10 必须覆盖停止、审批和副作用后的收敛。

### F-05 责任和收口

**签署：接受。**

`[会议记录]` 三位总监都同意正式任务任一时刻只有一名 Magic 当前责任人，同时区分会话主 Agent、CAPTAIN、PM、项目成员和临时 worker。AI 核心总监补充了“计划责任”和“执行责任”并列而不互相覆盖；本条已经吸收这一点。

`[源码/报告]` OpenCode 的 Session coordinator 只协调当前进程的运行，不提供 Magic 跨任务责任、PM 交接或责任转移。OpenCode child session、Run、tool event 只能提供执行关系证据，不能自动成为责任人。

`[建议]` 责任移交记录至少包含原因、操作者、时间、旧责任人、新责任人、未完成事项、审批和副作用。成员失败、停止或下级 Run 失败不能自动改变 Magic 当前责任人；用户直达成员必须创建或关联 Magic Task，影响工程时通知 PM，但不因此把 PM 自动变成任务责任人。

**阻塞判断：** 责任唯一性和移交记录是冻结前不变量；不构成 F-10 之外的独立阻塞。

### F-06 分层状态

**签署：有条件接受。**

`[会议记录]` AgentCore 总监要求区分 Task、Attempt、Run、责任、产物和最终状态；前端总监要求连接、同步、审批和副作用可见；AI 核心总监补充 `partial`、`degraded` 和 `structured gap` 不能变成成功。本条方向正确。

`[源码/报告]` OpenCode 同时存在 session `idle/busy/retry`、EventV2 sequence/replay、permission/question pending、PTY live stream、V1/V2 reducer 和 query cache。报告第 4.2、5.1、6、10.5、15.5-15.6 节明确指出：SSE/live stream 不等于 durable replay，Run/Session 状态不等于 Magic Task 最终状态，审批拒绝也不撤销已经发生的外部副作用。

`[签署条件]` 实现时不得写成 `TaskAttempt/Run` 一个合并对象。至少要区分：

- `TaskState`：产品工作是否完成、部分完成、失败、停止、取消或仍需介入；
- `TaskAttemptState`：一次尝试是否创建、排队、执行、等待审批、暂停、完成、失败、中断或需恢复；
- `RunState`：底座运行证据，不直接决定 TaskState；
- `Connection/SyncState`：在线、重连、断开、同步缺口、状态未知；
- `ApprovalState`、`ArtifactState`、`FactState`、`ResponsibilityState`：各自独立、带时间和来源。

`waiting` 应表达产品仍等待外部输入、审批或依赖；`paused` 应表达 Attempt 被明确暂停或冻结，二者不能只靠同一个底层 idle/busy 值推导。若首版不开放共享 Fact 或成员迁移，相关状态可以是明确禁用/不支持，而不是伪造完整能力。

**阻塞判断：** 状态语义和收敛规则是冻结前不变量；全部状态的复杂 UI 展示不是阻塞。真实状态收敛证据归入 F-10。

### F-07 事实、记忆和迁移

**签署：有条件接受。**

`[会议记录]` AI 核心和 AgentCore 总监都指出 NoteWall、memory scope、transcript 不是共享事实账本；前端总监指出文件写入不等于产物验收；本总监指出共享文件不能自动成为共享事实。本条的分层和“默认不迁移、逐项确认”是技术安全上正确的默认。

`[源码/报告]` OpenCode Session/message/part、文件/snapshot、permission 和事件只证明底层材料或操作存在；报告第 8、10.4、15.6-15.7 节没有证明 Magic 事实确认、撤销、长期身份迁移或跨边界权限迁移已经由 OpenCode 提供。

`[签署条件]` 共同稿中“该迁移策略在 U-07 未由用户裁定前属于技术安全默认”必须保留，不能在回写后变成已完成的产品政策。技术实现应创建新的 `ProjectMember` 关系，保留原 `SessionMember` 历史；默认不复制私有 memory、完整 transcript、NoteWall 或全部权限，只迁移用户逐项确认的摘要、任务、已接受产物或已确认事实，并保存来源、版本、操作者、时间和撤销路径。飞行中的 Attempt 不做静默身份迁移。

**阻塞判断：** 若首版承诺成员迁移、事实撤销或权限迁移，则对应场景必须进入首版验收并受 F-10 约束；若产品把它们明确排除，可以后延，不能反过来成为所有普通代理路径的阻塞。

### F-08 自然工作台的前端契约

**签署：接受。**

`[会议记录]` 前端总监要求责任、失败、等待、审批、产物和副作用可见；AI 核心总监要求后端提供结构化消费契约；本总监反对默认展示完整管理后台。本条在自然体验与技术诚实之间取得了正确平衡。

`[源码/报告]` OpenCode App 的工作区、timeline、review 和 terminal 结构可以作为信息组织参考，但现有 session 状态、事件 reducer 和工具日志不能直接充当 Magic 产品状态。报告第 4、5、8、14、15.5 节支持这一证据边界。

`[建议]` 默认展示目标、当前责任人、任务阶段/最终状态、需要用户介入的事项、最近产物及验收状态；异常时提高连接/同步、审批、失败、部分完成和副作用的显著性。原始 SSE、底层 Session/Run ID、完整工具日志、全量 Agent 图和 transcript 默认折叠，但必须可追溯展开。前端只能消费 Magic 状态投影，不能直接用 OpenCode reducer 或最后一条事件覆盖它。

**阻塞判断：** 这是前端消费契约，不是独立阻塞；契约所需字段的来源和收敛仍受 F-10 约束。

### F-09 首版验收和延后

**签署：有条件接受。**

`[会议记录]` 四方都反对用 Agent 数量、页面数量或“测试文件存在”作为验收。AgentCore 总监要求真实失败/恢复和副作用证据，前端总监要求快照、durable/live 事件与同步缺口可观察，AI 核心总监要求成员、PM、事实和用户直达场景。本条的场景验收方向正确。

`[源码/报告]` OpenCode 报告第 15.8-15.10 节明确列出未执行的真实 provider、MCP、文件副作用、断连/重连、跨进程恢复和完整 HTTP/SSE/WebSocket 实验；这些不能被静态路由或单元测试替代。

`[签署条件]` “若首版承诺对应能力，必须验证”是本条的关键限定，必须在回写时保留。首版范围若包含同会话成员复用、CEO 回归、PM 派工、用户直达、成员迁移、事实撤销或 PM 交接，就必须验证相应 S 场景；若产品将某能力列为延后，则该能力须在产品界面和发布说明中明确为未支持，不能暗含承诺，也不能把它作为本轮唯一技术阻塞之外的冻结条件。

验收记录至少应有：OpenCode commit/runtime/client artifact、请求和事件样本、protocol version、event ID/sequence/cursor、Magic Task/Attempt/Turn 快照、底座 Session/Run ID 或 synthetic 标记、责任变更、产物来源、审批结果、已发生副作用和失败结果。对重复/乱序/断连/重启的实验，要记录最终状态而非只记录连接是否恢复。

**阻塞判断：** 首版承诺的场景是冻结门槛；未纳入首版的复杂圆桌、多层 PM、跨工程、多用户多端、永久 Agent 和任意无损切换不阻塞。所有底座收敛缺口统一归入 F-10。

### F-10 首版冻结前唯一技术阻塞

**签署：接受。**

`[会议记录]` AI 核心、AgentCore 和前端总监第二轮都把底座契约、事件幂等、恢复、停止、审批和副作用收敛视为冻结前核心门槛；本总监第二轮也保留了同一唯一阻塞项。本条没有把未纳入首版的高级能力错误升级为阻塞。

`[源码/报告]` OpenCode 报告第 15.1、15.4、15.5、15.6、15.7、15.9 节证明必须先区分 runtime 和文档入口，并验证 V1/V2/client 漂移、EventV2 replay、进程本地 execution、permission/question、providerExecuted 工具和文件/网络副作用。具体而言：

- `opencode serve/web` 通过 `packages/opencode/src/server/server.ts` 进入完整应用监听器，包含 Root、实验/Legacy、`/api`、`/doc`、UI fallback 和 WebSocket；其 `serverRoutes` 没有设置 `openapiPath`，不能把 `/openapi.json` 当作它的文档入口。
- 独立 CLI `serve` 通过 `packages/cli/src/commands/handlers/serve.ts` 调用 `@opencode-ai/server/routes.createRoutes(password)`，主要提供 V2 `/api/*`，并由 `packages/server/src/routes.ts` 显式设置 `/openapi.json`；它不是完整应用的 UI/Legacy `/doc` 监听器。
- EventV2 的 durable event、projector、live PubSub、SSE 和 Session history 是不同层次；`SessionExecutionLocal` 是当前进程协调器，不是跨进程任务调度器。
- permission/approval 只能决定是否进入部分执行链，不能证明已发生的 shell、文件、Git、MCP、网络或 provider-side 副作用已经撤销。

`[签署条件]` F-10 的“可重复端到端收敛证据”应至少在锁定的 runtime、commit、canonical protocol/client artifact 下覆盖：断连、进程重启、重复/乱序/缺失事件、重试、停止、审批等待/拒绝/允许，以及 provider 或本地工具已经产生副作用后的最终状态。证据不需要虚构 exactly-once；必须明确哪些操作幂等、哪些操作可能重复、哪些只能人工补偿，并能回答“最终谁负责、任务是什么状态、产物是什么、外部副作用发生了什么”。

**阻塞判断：真正阻塞。** 在该证据完成前，不冻结首版数据库 schema、API、完整状态机和开发排期；可以继续产品裁定、Adapter 原型和明确标记的受控灰度。除此之外，本总监不再提出第二个独立技术阻塞。

## 二、对共同结论的总体签署

### 签署状态：有条件一致

我接受 F-01 至 F-10 的总体方向，但“有条件一致”不是无条件通过，条件集中在以下四点：

1. OpenCode 两种 server runtime 必须在产品和部署层选定一个 canonical listener；允许隔离 Adapter 做已知兼容读取，但不能在一个 Attempt 内混用两套写入和事件语义。
2. Magic 对象与底座对象必须保持独立，尤其不能把 OpenCode Session/Run/Event、AgentCore Run、transcript、NoteWall、folder/workspace 直接当成 Magic 身份、任务、事实或权限。
3. F-07 的迁移策略在 U-07 裁定前只能称为技术安全默认；F-09 的场景必须按首版实际承诺范围裁剪，未做能力必须显式标记为不支持。
4. F-10 是唯一真正技术阻塞；其余对象、状态、UI 和迁移问题要么进入 F-10 的验收链，要么在产品明确排除后延后，不应被拆成额外阻塞。

### 我仍保留的唯一阻塞项

**锁定 OpenCode runtime、commit/tag、canonical protocol/client contract 后，完成 Magic TaskAttempt 在断连、重启、重复/乱序事件、重试、停止、审批和已发生副作用组合场景下的可重复最终收敛证据。**

这里的“收敛”不是声称所有外部操作 exactly-once 或可回滚，而是必须可审计地知道：事件是否被重复处理、Attempt 是否重试、任务最终状态是什么、责任人是谁、产物来自哪里、审批处于什么状态、哪些外部副作用已经发生以及下一步需要谁处理。

## 三、是否同意回写三份正式产品文档

**有条件同意回写**《Magic最终产品裁定与技术会议输入.md》《Magic产品系统边界与生命周期底图.md》和《技术会议议题与裁定表.md》，但只允许按下面的边界回写：

- 回写 F-01 的“双门槛”和 F-10 的唯一阻塞，不把产品方向 Go 写成首版技术已 Go；
- 回写两种 listener、`/doc` 与 `/openapi.json` 的明确区别，不能把两套运行时、V1/V2 或 client artifact 写成已经等价；
- 回写 Magic 对象与 OpenCode/AgentCore 底座对象的非同一性，以及 `Task`、`TaskAttempt`、`Turn`、`RootExecutionBinding` 的首版候选关系，并标注“需 F-10 实机证据确认”；
- 回写分层状态、责任唯一性、审批/副作用和事实/记忆边界；
- 回写 F-09 时保留“以首版承诺范围为条件”，不能把延后能力包装成已支持；
- 保留 U-07 等产品待裁定项的状态，不把本记录的技术安全默认改写成用户最终政策。

本次不直接修改上述正式文档。回写完成后仍应由主持人和产品负责人检查产品裁定、技术事实、实机验证结果三类文字是否分栏，避免把报告建议写成当前 OpenCode 已实现能力。

等待主持人汇总
