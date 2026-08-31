# 第1轮正式发言

## 一、事实与证据

### 1. 已实现：源码静态确认

- OpenCode 当前存在两种不同的 server runtime：
  - `D:\Harmess\opencode\packages\opencode\src\cli\cmd\serve.ts` 的 `opencode serve`，以及同一 server 模块承载的 `web`，进入完整应用监听器。
  - `D:\Harmess\opencode\packages\cli\src\commands\handlers\serve.ts` 的独立 CLI `serve`，进入 `@opencode-ai/server/routes.createRoutes(password)`。
- 完整应用监听器由 `D:\Harmess\opencode\packages\opencode\src\server\routes\instance\httpapi\server.ts` 装配，包含 Root、Legacy/实验路由、V2 `/api/*`、PTY WebSocket、`/doc` 和 UI fallback。
- 独立 V2 监听器由 `D:\Harmess\opencode\packages\server\src\routes.ts` 装配，主要提供 V2 `/api/*`，并通过 `openapiPath: "/openapi.json"` 显式暴露 OpenAPI。
- 完整应用的文档入口是受认证保护的 `/doc`，不能把它和独立 V2 server 的 `/openapi.json` 混为一个入口。
- OpenCode 同时存在 V1 Session 和 V2 Session Core，当前属于迁移共存状态。
- V2 已有 durable prompt admission、`session_input`、EventV2 sequence、projector、replay，以及进程内 Session 执行协调。
- `SessionRunCoordinator` 能保证同一 Session 在当前进程内串行，不同 Session 可以并行；它不是跨进程或集群调度器。
- Event 流至少分为 `/event`、`/api/event`、`/global/event` 和 `/api/session/:sessionID/event`。它们的过滤、队列、背压、历史和断线语义不同。
- shell、文件、Git、MCP、插件、LSP、PTY 和 Provider 工具都可能跨越宿主机或外部服务信任边界。

主要源码证据：

- `D:\Harmess\opencode\packages\opencode\src\server\routes\instance\httpapi\api.ts`
- `D:\Harmess\opencode\packages\opencode\src\server\routes\instance\httpapi\server.ts`
- `D:\Harmess\opencode\packages\server\src\routes.ts`
- `D:\Harmess\opencode\packages\core\src\event.ts`
- `D:\Harmess\opencode\packages\core\src\session.ts`
- `D:\Harmess\opencode\packages\core\src\session\execution\local.ts`
- `D:\Harmess\opencode\packages\core\src\session\run-coordinator.ts`
- `D:\Harmess\opencode\packages\core\src\session\runner\llm.ts`

### 2. 已验证：仓库测试确认

- Desktop 相关测试通过 5 项。
- Console server-action 测试通过 3 项。

这些测试不证明 OpenCode 后端、V2 Session、Provider、MCP、SSE、PTY 或跨进程恢复已经通过端到端验证。OpenCode 后端真实监听、真实 Provider、真实 MCP、完整 SSE 重连和跨进程恢复本轮没有实机测试。

### 3. 仅设计：Magic 产品文档确认

依据：

- `D:\Magic\docs\01-产品\\00-项目管理\\产品基线.md`
- `D:\Magic\docs\01-产品\\00-项目管理\\项目总控.md`
- `D:\Magic\docs\01-产品\\90-支撑材料\\Magic产品系统边界与生命周期底图.md`
- `D:\Magic\docs\01-产品\\90-支撑材料\\技术会议议题与裁定表.md`

Magic 当前已经形成的产品设计包括：

- Magic 任务账本作为产品状态真相源的推荐方向。
- OpenCode 事件作为运行证据，而不是 Magic 最终任务状态。
- 任务状态与运行实例状态分离。
- 每个正式任务必须有唯一当前责任人。
- 代理方式与 CEO 方式是会话工作方式；工程是长期组织形态。
- 临时 Agent、会话成员、项目成员、PM、会话主 Agent 和运行实例必须分开。
- 用户确认、权限、成本、事实、产物和副作用需要独立边界。

这些是 Magic 的产品方向或候选设计，不是 OpenCode 已经提供的能力。

### 4. 未知：不能对外承诺

- 进程重启后是否能够恢复原 Provider 工作，而不仅是恢复历史和投影。
- 跨进程 EventV2 owner claim 是否安全；当前 `claim` 不是 CAS、租约或 fencing token。
- Provider 已执行后发生断连、崩溃或重试时是否会重复执行。
- Permission/Question pending 状态在进程重启后是否能够可靠恢复。
- 文件、Git、网络和外部服务副作用是否具备回滚或补偿机制。
- Magic Task、RunAttempt、OpenCode Session、prompt 和 event 的最终一对多关系。
- 真实 HTTP、SSE、PTY WebSocket、MCP、Provider、生产认证和部署边界。
- OpenCode 内部 API、插件 API 和 V1/V2 协议在未来版本中的稳定性。

报告证据：`D:\Harmess\opencode\OPENCODE_BACKEND_ARCHITECTURE_BREAKDOWN.md` 第 4、5、6、7、8、11、14、15、16 章。CodeGraph 当前未初始化，因此本次不能宣称完成全符号图证明。

## 二、对 Magic 产品基线的修正或澄清

### 1. Magic 任务账本必须从建议变成技术硬约束

- **源码/测试证据：** OpenCode 的 Session、Message、Part 和 Event 主要描述底座执行与投影；`SessionExecutionLocal` 的 active Fiber 和 Map 是进程内状态。没有 OpenCode 后端端到端测试证明它能承担 Magic 产品状态。
- **报告证据：** 报告第 5、6、12、15 章明确指出 OpenCode Session 不能直接等同 Magic Task。
- **产品建议：** 明确建立 `Magic Task -> Magic RunAttempt -> OpenCode Session/prompt/event` 的适配关系。每次重试、移交或重新执行都应有可追踪的 RunAttempt。
- **推断：** 如果没有 Magic 自己的任务和运行实例，重连、重试和责任移交会出现多个互相冲突的状态。

### 2. “继续任务”不能默认解释为“恢复原运行”

- **源码/测试证据：** 当前源码没有完整的启动扫描 pending `session_input` 并恢复 Provider continuation 的证据；本轮也没有执行进程重启实验。
- **报告证据：** 报告第 15.6 章明确区分持久事实/投影恢复与 Provider 工作恢复。
- **产品建议：** 首版优先采用“恢复任务事实和已有产物，创建新的运行实例”语义，并向用户说明可能重新执行的步骤。
- **推断：** 如果产品直接写“恢复原任务”，用户可能误以为中断前的外部调用不会重复。

### 3. 执行中启用 CEO 不应承诺无损切换

- **源码/测试证据：** interrupt 主要作用于当前进程所有权链；工具副作用不会由 Session event 自动撤销；无真实移交实验。
- **报告证据：** 报告第 6、8、11、15 章把无损移交列为未知或风险。
- **产品建议：** 首版只支持完成当前运行、停止并保留结果、或在稳定边界创建新的运行实例。
- **推断：** 任意时刻强行重编排可能造成重复工具执行、审批丢失、输入丢失和责任漂移。

### 4. 唯一责任人必须由 Magic 自己维护

- **源码/测试证据：** OpenCode 可以处理 prompt、steer、queue 和多个协作事件，但没有 Magic 的产品责任模型；无责任收敛端到端测试。
- **报告证据：** 报告第 5、6、15 章指出 OpenCode 的 Session 执行协调不能替代 Magic 责任闭环。
- **产品建议：** Magic 独立保存当前任务责任人、PM、成员、责任移交原因、时间和历史。
- **推断：** 不能因为某个 OpenCode Session 正在运行，就自动把 Magic 任务责任交给它。

### 5. OpenCode Permission 不是 Magic 的完整权限系统

- **源码/测试证据：** `providerExecuted` 工具可能绕过本地 registry；插件工具可以直接调用 `execute`；shell、MCP 和插件可能拥有宿主或外部网络权限；本轮未做越权和副作用实验。
- **报告证据：** 报告第 7、8、11、15 章区分了 provider-side execution、local side effect 和 Magic 授权层。
- **产品建议：** Magic 权限至少应表达主体、资源、动作、范围、时效、预算、副作用等级和授权来源。
- **推断：** 仅复用 OpenCode approval 无法覆盖组织 RBAC、工程范围、预算、审批留痕和副作用补偿。

### 6. 共享文件不能自动变成共享事实

- **源码/测试证据：** OpenCode 能共享 Project、Workspace、文件和运行上下文，但没有 Magic 的版本化共享事实账本；并发文件冲突本轮未实测。
- **报告证据：** 报告第 5、13、15 章明确文件、摘要、消息和共享事实不能直接互换。
- **产品建议：** Magic 独立保存事实的来源、版本、状态、确认者、争议、撤销和影响范围。
- **推断：** 自动把 Agent 输出、聊天摘要或文件内容提升为项目共识，会让错误事实扩散。

### 7. 版本、运行时和扩展点必须先锁定

- **源码/测试证据：** 当前报告基线为 OpenCode `1.18.23`、commit `5f5ea53afb2630227ead917f1a0ddf784c33150c`；App 还存在 vendored `@opencode-ai/client 1.17.13-v2`，而 workspace 另有当前 SDK。没有完成升级回归实验。
- **报告证据：** 报告第 4、12、15 章记录 V1/V2、generated client 和 SDK 漂移风险。
- **产品建议：** 首版锁定 commit、依赖、server runtime、API contract、生成客户端和升级策略。
- **推断：** 不锁版本就冻结 Magic 数据模型，会把底座迁移成本转化为产品返工。

## 三、与另外三位总监的接口问题

### 与产品经理

我需要产品经理裁定：

- Magic 任务账本是否正式成为唯一产品状态真相源。
- 重试是否创建新的 RunAttempt。
- 重启后是恢复原运行，还是恢复任务后创建新运行。
- 执行中切换 CEO 的允许边界。
- 哪些文件、网络、付费、删除和发布动作必须逐次确认。
- U-01 至 U-12 中哪些议题必须在首版开发冻结前完成裁定。

我可以提供 OpenCode 的能力和限制，但不能替产品决定上述语义。

### 与 Nash

请 Nash 提供：

- 用户看到“等待、停止、部分完成、失败、恢复”时的最小表达。
- 用户是否需要看到 Session、Event、Tool 等底层概念。
- 实时事件与最终任务状态在界面上的区别。
- 进程重启后重新运行时，产品如何诚实解释重复和未完成步骤。

依据：OpenCode 的 `/api/event` 是 live stream，不能默认当作完整历史；四种事件流也不能由一个统一的连接状态代表。

### 与 Tesla

请 Tesla 提供：

- 任务责任人失败、停止和移交时的收口规则。
- 用户直达成员是否必然创建 Magic 任务。
- PM 如何获知直达任务对工程目标、资源和交付的影响。
- 并发修改同一文件时的最终责任人。
- 任务失败但产物存在时的最终状态。

依据：OpenCode 的 Session coordinator 只处理当前进程执行，不处理 Magic 的跨任务责任、预算和工程治理。

## 四、首版 Go/No-Go 门槛与阻塞产品问题

### Go 门槛

首版开发冻结前必须满足：

1. OpenCode commit、依赖和选用的 server runtime 已锁定。
2. 明确选择完整应用监听器还是独立 V2 监听器，不能把两套路由和文档契约混用。
3. Magic 已有独立的 Task、RunAttempt、责任人、产物和最终状态记录。
4. 已验证重复请求、停止、重试、断连和事件重复后的最终收敛。
5. 已验证 Permission、文件、Git、MCP、Provider 工具和外部网络边界。
6. 已明确任务状态与运行状态的映射规则。
7. 至少完成一个真实端到端工程场景。
8. 所有首版关键能力不再处于“仍未知”。

### No-Go 门槛

以下任一项存在，我反对冻结技术方案：

- 直接把 OpenCode Session 当 Magic Task。
- 直接把 OpenCode Event 当 Magic 最终状态。
- 把 `SessionExecutionLocal` 当集群调度器。
- 承诺任意时刻无损切换代理/CEO。
- 没有 Magic 自己的运行实例和重试记录。
- 没有文件、网络、Git、付费和 Provider 副作用策略。
- 把 Permission/Approval 当作完整组织权限系统。
- 未验证恢复，却对外宣称“可恢复”。

### 阻塞产品问题

- 任务与运行实例是否严格一对多？
- 重试是否产生新的运行实例？
- 运行失败后任务是否仍可继续？
- 重启后产品展示“恢复”还是“重新执行”？
- 用户直达成员是否必须进入工程任务账本？
- PM 是否首版唯一？
- 文件冲突和外部副作用由谁最终负责？

## 五、首版必须做、可延后、明确不做

### 必须做

- 建立 Magic Task、RunAttempt、责任人、最终状态和产物登记。
- 建立 OpenCode Adapter，隔离 V1/V2、Session、Event、Client 和版本变化。
- 明确选择一种 server runtime，并针对该 runtime 建立契约测试。
- 将 OpenCode Event 作为运行证据，不作为 Magic 产品最终状态。
- 支持单用户、单工程、一个主工作区、一名 PM 和少量成员的闭环。
- 验证 prompt admission、重复请求、停止、重试、断连、恢复和事件重复。
- 验证文件、Git、shell、MCP、Provider 工具和权限边界。
- 对每个任务形成唯一、诚实、可解释的最终状态。

### 可延后

- 跨工程成员。
- 多层 PM 和无限嵌套团队。
- 永久在线 Agent。
- 跨进程 Session 执行迁移。
- 自动团队扩张。
- 复杂事实仲裁。
- 任意执行中模式切换。
- Provider-executed 工具的统一治理。
- 多组织权限继承和复杂成本结算。

### 明确不做

- 不把 OpenCode Session 直接命名为 Magic Task。
- 不把 OpenCode Agent 直接当作 Magic 长期身份。
- 不把文件夹直接当作工程。
- 不把 OpenCode SSE 实时流当作可靠事件账本。
- 不把工具 approval 当作事务回滚。
- 不以 Agent 数量、耗时或任务复杂度自动触发 CEO 或建立工程。
- 不把断连、进程退出或运行结束自动解释为任务成功。

我的首轮技术结论是：

```text
OpenCode 作为执行底座：有条件 Go
OpenCode 直接作为 Magic 产品状态层：No-Go
OpenCode 直接作为 Magic 任务模型：No-Go
未完成恢复、权限和副作用验证前冻结方案：No-Go
```

补充反对意见：产品、前端、协作或基础设施任何领域，如果把 OpenCode 的 `session`、`run`、`event`、`workspace`、`permission` 或 `agent` 直接当作 Magic 同名对象，我会要求退回重新定义。名称相同不代表权威归属、生命周期、权限、责任和恢复语义相同。





