# 第1轮正式发言

> 发言角色：Magic AgentCore 项目架构技术总监
>
> 发言范围：Magic 后端对象、持久化、任务账本、责任、恢复、幂等及 AgentCore 适配边界。
>
> 证据规则：源码事实、测试源码证据、产品基线、架构报告和推断必须分开。测试文件存在不等于本次测试通过，文档设计也不等于代码已经实现。

## 一、事实与证据

### 1. 已实现的 AgentCore 后端能力

#### 1.1 对话和 Agent 执行

- **源码事实**：AgentCore 有 `Conversation`、`Message`、`Turn`、`Run`、`RunSession`、`PausedTurn`、`StandingTaskRun` 等执行对象。
- **源码路径**：
  - `D:\Harmess\reference-project\AgentCore\apps\server\agentcore\conversation`
  - `D:\Harmess\reference-project\AgentCore\apps\server\agentcore\runtime`
  - `D:\Harmess\reference-project\AgentCore\apps\server\agentcore\api\routes\conversations`
- **源码事实**：`RunKind` 主要有 `CAPTAIN` 与 `AGENT`。CEO 是根 `CAPTAIN Run`，子 Agent、delegate 和 debate 节点是 `AGENT Run`。
- **报告证据**：`D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_BACKEND_BREAKDOWN.md` 第 8、9、10 节。
- **架构判断**：这些对象支撑“让 Agent 执行一次工作”，不等于 Magic 的长期任务、工程、项目成员或 PM。

#### 1.2 Journal、SSE、Replay 和 Fold

- **源码事实**：执行事实写入 `turn_journal`；`EventSink` 把事件发送给实时订阅者；SSE 负责传输；Replay 根据 Journal 重建观察视图；Fold/`ProjectedTurn` 是派生投影。
- **关键源码事实**：`TurnJournalRow` 的主键为 `(turn_id, band, seq)`。`live` 区域可以按规则重写，`overflow` 区域用于暂停后的追加事实。
- **报告证据**：正式后端报告第 11 节、第 14 节流 B/C、第 15 节。
- **产品边界**：Magic 任务账本必须独立存在，不能把 SSE、Replay 或 ProjectedTurn 直接当任务真相。

#### 1.3 暂停、恢复、租约和崩溃重跑

- **源码事实**：数据库存在 `turn_leases`、`paused_turns`、`paused_turn_outcomes`、`turn_stream_state` 等对象。
- **源码事实**：`PausedTurnRepository.claim()` 使用 `DELETE ... RETURNING`；暂停帧 claim 和 outcome 写入使用同一事务，并发 resume 只有一个成功。`claim_expired()` 使用条件 `UPDATE ... RETURNING` 抢占过期或孤儿 lease。
- **报告证据**：正式后端报告第 8.4、13.1、14 节流 H。
- **限制**：crash redrive 可能重新执行 in-flight worker；写类工具的完整幂等键尚未完成。
- **架构判断**：AgentCore 提供的是可恢复执行尝试，不是所有文件、Git、MCP、网络副作用的 exactly-once 保证。

#### 1.4 工具和本机执行

- **源码事实**：后端包含文件、Git、Web、Browser、Package、Shell、MCP、ClientTool、approval 和 sandbox 路径。
- **MCP 事实**：调用链为：

```text
McpDynamicTool
-> DesktopClientChannel
-> InteractionRegistry
-> FulfillerHub
-> fulfill SSE
-> renderer/preload
-> Electron main
-> stdio MCP
-> resolve/resume
```

- **源码路径**：
  - `D:\Harmess\reference-project\AgentCore\apps\server\agentcore\tools\mcp`
  - `D:\Harmess\reference-project\AgentCore\apps\server\agentcore\fulfill`
  - `D:\Harmess\reference-project\AgentCore\apps\desktop\src\main\mcp-service.ts`
- **高风险源码事实**：`userData/mcp-servers.json` 可配置本地 `command`、`args`、`env`，当前取证未发现完整 command allowlist。
- **架构判断**：工具审批、Electron IPC 和 Sidecar 都是底层执行边界，不能直接充当 Magic 的主体、范围、预算和责任模型。

#### 1.5 数据库、存储和成本

- **源码事实**：AgentCore 使用 PostgreSQL、Redis、文件系统、S3/StorageProvider、workspace snapshot、memory、audit 和 cost outbox。
- **源码事实**：primary 与 telemetry 使用不同 engine/session pool，但这不是跨 pool 的原子事务保证。
- **源码事实**：`StorageProvider` 管理 snapshot/version/restore，不负责所有实时 workspace 文件写入；cloud workspace 和 local/sidecar workspace 的执行位置不同。
- **源码事实**：cost 链路包含 `CostCall`、`CostEvent`、`CostLedgerOutbox`，outbox 是 at-least-once，使用 `call_id/run_id` 做幂等；cost finalize 和 outbox drain 不在同一事务。
- **报告证据**：正式后端报告第 7、13 节。
- **已发现待验证问题**：`cost_ledger_outbox.conversation_id` 在历史迁移和当前 ORM 中的 nullable 定义不一致，需要 live schema gate 确认。

### 2. 已验证、但不能扩大解释的证据

- **测试源码证据**：已有 Journal/replay、paused/resume、MCP origin、workspace traversal、SSRF、cost outbox、memory、sandbox、Git 等测试定义。
- **验证限制**：当前环境没有可用 pytest 入口；本轮没有连接真实 PostgreSQL、Redis、S3、LLM、MCP、浏览器、gVisor 或 OpenCode。
- **因此不能说**：AgentCore 已经通过生产验收、跨进程恢复验收、多 worker 验收或所有外部副作用幂等验收。

### 3. 仅设计或尚未建立的 Magic 能力

- **产品文档设计**：Magic 任务账本、工程、PM、项目成员、长期 Agent 身份、共享事实账本、正式产物登记和任务统一最终状态。
- **产品文档证据**：
  - `D:\Magic\docs\01-产品\\00-项目管理\\项目总控.md`
  - `D:\Magic\docs\01-产品\\90-支撑材料\\Magic产品系统边界与生命周期底图.md`
  - `D:\Magic\docs\01-产品\\90-支撑材料\\技术会议议题与裁定表.md`
- **明确边界**：Magic 任务可以拥有多个运行实例；一个运行实例结束不自动代表任务完成。
- **架构判断**：Magic 必须新建产品语义和权威状态，不是把 AgentCore 的表名换一层名字。

### 4. 未知事项

- OpenCode 当前锁定版本到底提供哪些 session、run、agent、event、tool、cancel 和 recovery 能力。
- OpenCode 对断线、进程重启、重复事件和外部副作用的真实行为。
- AgentCore 在多 API worker 下的 lease、SSE、approval、MCP、IM 和 live registry 行为。
- 生产数据库实际 schema 是否与 ORM 和迁移完全一致。
- 外部 MCP、Git、Browser、网络和 package 操作是否满足 Magic 首版需要的幂等或补偿要求。

## 二、对 Magic 产品基线的修正或澄清

### 1. 强烈反对把 AgentCore `Run` 当作 Magic `Task`

- **源码事实**：`Run` 是一次执行节点；`RunSession` 是 worker transcript 现场。
- **报告证据**：正式后端报告第 8、20 节已经明确说明二者不是 Magic 任务或长期身份。
- **产品建议**：Magic 建立独立 `Task`，并用 `TaskAttempt` 映射一次执行尝试。
- **推断**：如果不分开，重试、恢复、模式切换和责任移交后会出现多个冲突的任务结果。

### 2. 强烈反对把 Run 成功等同于任务成功

- **源码事实**：AgentCore 可以得到 `ok`、`partial`、`paused`、`error` 等结果。
- **产品建议**：任务最终状态由 Magic 任务账本和当前责任人收口。
- **推断**：模型回答成功、文件写入成功或 Run 完成，都不能单独说明用户目标已经完成。

### 3. Magic 任务账本必须是产品状态真相源

- **产品基线**：Magic 产品文档已经把任务账本定位为产品状态真相。
- **源码事实**：AgentCore 当前没有可证实的 Magic 任务账本。
- **技术建议**：AgentCore Journal、OpenCode 事件和工具结果全部作为运行证据，由 Magic 进行任务状态收敛。
- **推断**：没有这个账本，断线、重试、进程重启和多人协作之后无法得到一个统一状态。

### 4. 必须把 approval 拆成两层

- **源码事实**：AgentCore approval 主要解决一次运行中的动作是否继续，热状态主要存在进程内。
- **产品建议**：Magic 授权层必须记录主体、资源、动作、范围、有效期、预算和授权来源。
- **推断**：一次底层 approval 不能自动变成项目成员的长期权限。

### 5. 恢复不能被宣传成副作用回滚

- **源码事实**：crash redrive 可能重新执行未确认完成的 worker；取消也不能撤销已经写入的文件、Git ref 或网络动作。
- **报告证据**：正式后端报告第 12、15、18 节。
- **产品建议**：Magic 必须展示已发生的副作用，并提供补偿、人工处理或确认状态。

### 6. Sidecar 不能被直接解释成 OpenCode

- **源码事实**：当前可以确认 Electron、Python Sidecar、AgentCore runtime 之间的链路。
- **未知**：没有 OpenCode 后端报告，也没有足够实机证据证明 Sidecar 就是 OpenCode runtime。
- **技术要求**：锁定 OpenCode 版本后，实测 session、run、event、tool、cancel 和 recovery，再决定适配方式。

### 7. CEO 不能自动等于 PM

- **源码事实**：AgentCore CEO 主要是一次执行中的 `CAPTAIN Run`。
- **产品基线**：Magic PM 是长期工程中的协调责任关系。
- **产品建议**：CEO 可以负责一次执行收口，PM 负责工程级计划、依赖、风险和汇总，二者必须分开。

### 8. Workspace 不能直接等于工程

- **源码事实**：workspace 主要解决文件、路径、锁、快照和存储。
- **产品基线**：工程还包含目标、成员、PM、任务和共享事实。
- **推断**：共享目录不代表共享身份、共享记忆、共享权限或工程关系。

## 三、与另外三位总监的接口问题

### 1. 与产品责任、任务和共享事实总监

请提供并确认：

- Task、Subtask、TaskSession、Turn、Run 的正式层级。
- 每个任务唯一当前责任人的规则。
- 责任移交时，如何处理在飞运行、审批、文件和外部副作用。
- 任务、事实、产物和运行实例的正式状态。
- 事实被争议或撤销后，受影响任务如何重新评估。

**阻塞原因**：没有这些定义，无法冻结任务表、状态机、任务 API 和恢复接口。

### 2. 与产品体验和管理负担总监

请提供真实场景验收标准：

- 用户是否必须观看完整协作过程。
- 用户如何知道当前谁负责、做到哪一步、结果在哪里。
- 部分完成、等待、停止和失败如何呈现。
- 用户直达成员后，PM 如何知道并判断计划影响。
- 用户停止后，已经发生的文件和外部副作用如何展示。

**阻塞原因**：不能用 Agent 数量、页面数量或事件数量替代真实用户价值。

### 3. 与 OpenCode/系统边界总监

请提供锁定版本和实机证据：

- OpenCode session、run、agent、event 的真实定义。
- 事件 ID、顺序、重复和丢失行为。
- 断线、暂停、恢复、进程重启和取消行为。
- 工具权限、workspace 边界和外部副作用行为。
- AgentCore 与 OpenCode 的实际调用、适配和计费关系。

**阻塞原因**：不能根据 `agent`、`session`、`sidecar` 等名称进行对象映射。

### 4. 共同接口契约

Magic 至少需要建立以下关联：

```text
Magic Task
  -> TaskAttempt
  -> Magic/底座 Run 映射
  -> Journal/Event evidence
  -> Artifact/Fact/SideEffect record
  -> Task final settlement
```

关联必须能回溯，但底座的状态不能反向静默修改 Magic 的任务责任和最终状态。

## 四、首版 Go/No-Go 门槛与阻塞产品问题

### 1. No-Go 门槛

以下任何一项没有方案，都不建议冻结首版后端：

1. 没有独立 Magic 任务账本。
2. 任务没有唯一当前责任人。
3. 任务状态和运行实例状态混在一起。
4. 没有区分 Task ID、TaskAttempt ID、Turn ID、Run ID。
5. 没有明确暂停、恢复、停止、取消、重试和重开语义。
6. 没有记录文件、Git、MCP、网络和付费等外部副作用。
7. 没有写类动作的幂等、去重或补偿机制。
8. 没有锁定 OpenCode 版本和实际能力证据。
9. 没有断线、重复事件、进程重启和恢复后的最终收敛测试。

### 2. Conditional Go

在上述产品契约明确后，可以先做单用户、单工程、单 worker 的受控闭环：

- 一名 PM；
- 2 至 4 名项目成员；
- 一个主 workspace；
- 每个任务只有一名当前责任人；
- 文件、Git、MCP、网络和预算权限明确；
- 不承诺多 worker 一致性和所有副作用 exactly-once；
- 真实展示失败、等待、取消、部分完成和已有副作用。

### 3. 当前阻塞的产品问题

优先解决 Magic 技术会议中的：

- U-01：任务、子任务、任务会话、回合、运行实例的层级。
- U-02：不同工作方式下的当前责任人。
- U-03：Magic 任务账本是否是唯一产品状态真相源。
- U-05：执行中切换代理/CEO 如何处理旧运行。
- U-06：用户直达成员和 PM 的优先级。
- U-08：共享事实的确认、争议和撤销。
- U-09：权限、成本和默认值的继承。
- U-12：哪些外部副作用必须逐次确认。

## 五、首版必须做、可延后、明确不做

### 1. 必须做

- 建立 Magic 独立任务账本。
- 建立 Task、TaskAttempt、责任人、产物、事实、授权和副作用记录。
- 把 AgentCore Run 映射成 TaskAttempt，而不是 Task。
- 建立 Magic 任务账本与 AgentCore Journal 之间的适配层。
- 记录责任移交、恢复、重试、取消和失败收口。
- 建立任务最终状态收口规则。
- 对文件、Git、MCP、网络和付费动作建立幂等、去重或补偿策略。
- 验证断线、重复事件、进程重启、暂停恢复和恢复后收敛。
- 将底层工具 approval 与 Magic 产品授权分成两层。
- 锁定 OpenCode 版本并完成首版能力实机核查。

### 2. 可以延后

- 多层 PM。
- 多工程成员共享。
- 无限嵌套 CEO。
- 自动扩张团队。
- 全量长期记忆共享。
- 成员市场。
- 复杂多人协作权限。
- 永久在线 Agent。
- 多 worker 横向扩展。
- 完整圆桌辩论系统。

### 3. 明确不做

- 不把 AgentCore `Run` 当 Magic 任务。
- 不把 `Conversation` 当工程。
- 不把 `RunSession` 当长期 Agent 身份。
- 不把 SSE 当产品真相。
- 不把 Replay 当副作用恢复。
- 不把 Sidecar 当 OpenCode。
- 不把文件生成直接当正式产物验收。
- 不把 CEO 自动当 PM。
- 不把一次 approval 当长期授权。
- 不把取消描述成已经发生副作用的自动回滚。
- 不因任务复杂、耗时长或 Agent 数量多，就自动建立工程或切换 CEO。

我的首版立场是：**先建立 Magic 自己的任务、责任、事实、产物和授权层，再通过适配器使用 AgentCore 的执行能力；在产品 U-01 至 U-12 和 OpenCode 实机核查完成前，不冻结完整数据库、API、权限和恢复方案。**





