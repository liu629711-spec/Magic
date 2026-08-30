---
status: reviewed
version: 0.2
purpose: OpenCode 与 AgentCore 常用能力的继承、适配和防遗漏盘点
authority: product-inventory-reviewed-technical
evidence_note: 本文基于现有源码、测试、架构报告和产品文档整理；源码或测试存在不等于本轮实机验证通过。
---

# OpenCode 与 AgentCore 常用能力盘点

## 一、目的

Magic 建立在 OpenCode 之上，同时吸收 AgentCore 已经试运行过的 AI 协作经验。重构时不能只设计代理、CEO 和工程三个产品入口，还必须保留用户每天依赖的基础能力。

本文回答四个问题：

1. OpenCode 和 AgentCore 已经具备或曾经验证过哪些常用能力。
2. 这些能力在 Magic 中是原样继承、底座适配、Magic 新增、明确后置还是仍待核查。
3. 代理、CEO、工程和计划推进是否都能正常使用这些能力。
4. 哪些能力如果遗漏，会直接破坏用户体验或产品可信度。

本文是主盘点清单，已完成 OpenCode 后端与运行时、OpenCode 前端、AgentCore 编排与运行治理、AgentCore AI 核心四个领域的技术总监复核。本次复核确认的是盘点范围和边界，不代表所有能力已经在 Magic 首选版本中完成实机验证。

## 二、证据与分类

### 2.1 主要资料

- OpenCode 后端报告：`D:\Harmess\opencode\OPENCODE_BACKEND_ARCHITECTURE_BREAKDOWN.md`
- OpenCode 前端报告：`D:\Harmess\opencode\OPENCODE_FRONTEND_ARCHITECTURE_BREAKDOWN.md`
- AgentCore 后端报告：`D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_BACKEND_BREAKDOWN.md`
- AgentCore 前端报告：`D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_FRONTEND_BREAKDOWN.md`
- AgentCore AI 核心报告：`D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_AI_CORE_BREAKDOWN.md`
- Magic 产品准则：`D:\Harmess\Magic\docs\01-产品\产品经理工作准则.md`
- Magic 产品底图：`D:\Harmess\Magic\docs\01-产品\Magic产品系统边界与生命周期底图.md`

### 2.2 证据等级

| 等级 | 含义 |
|---|---|
| 源码 | 当前代码树存在相关实现或入口 |
| 测试 | 存在单元、集成、浏览器或协议测试；不等于生产实机通过 |
| 报告 | 已有架构拆解报告记录了能力或限制 |
| 试运行 | AgentCore 旧产品曾在明确范围内使用过 |
| 实机待核查 | 仍需在锁定版本和真实环境中验证 |
| 未知 | 现有材料不足，不能作产品承诺 |

### 2.3 Magic 处理方式

| 分类 | 处理原则 |
|---|---|
| 原样继承 | 保留用户熟悉的核心行为，只做 UI 或协议适配 |
| Magic 适配 | 复用底座能力，但映射到 Magic 的任务、计划、责任、产物或权限对象 |
| Magic 新增 | 底座没有等价能力，由 Magic 建立产品对象和规则 |
| 明确后置 | 产品裁定暂不进入首版，并明确标记不支持 |
| 待核查 | 不得把源码、文档或名称当成已验证能力 |

## 三、常用能力总表

说明：模式列中的“共同”表示代理、CEO、工程和计划推进都必须可用；CEO/工程的额外组织能力不会取代共同基础能力。

| ID | 常用能力与用户价值 | OpenCode 当前证据 | AgentCore 当前证据 | Magic 处理 | 模式覆盖 | 遗漏后果 |
|---|---|---|---|---|---|---|
| C-01 | 直接输入目标并开始工作 | Session composer、prompt、session 路由；源码/报告 | ReAct 主循环、Interaction、Turn；源码/报告/试运行 | 原样继承 | 共同 | 用户不能自然开始工作 |
| C-02 | 多回合连续对话 | Session、message、part、history | Interaction、Turn Journal、Run | 原样继承并建立 `MagicSession`/`MagicTurn` 映射 | 共同 | 每轮都要重新解释目标 |
| C-03 | 流式输出和实时反馈 | SSE、事件 reducer、live sync | SSE、运行事件、Journal 投影 | 适配为 Magic 事件投影，保留底层证据 | 共同 | 用户以为 Agent 卡住或已结束 |
| C-04 | 会话创建、切换、归档和历史 | App session 页面、server session、history | RunSession、Interaction 历史；具体跨端边界待核查 | 原样继承基础行为，Magic 会话独立于底座 Session | 共同 | 工作无法连续、历史丢失 |
| C-05 | 计划模式 | `packages/opencode/src/tool/plan.ts`、`plan-enter.txt`、`plan-exit.txt`、`session/prompt/plan-mode.txt`；源码 | 计划、ReAct、finish guard、replan 相关能力；报告/源码 | Magic 适配为任务级 Plan；不等于 CEO 或工程 | 共同 | 长任务一次性黑盒完成，用户失去方向感 |
| C-06 | Todo/步骤清单 | `packages/opencode/src/tool/todo.ts`、`packages/opencode/src/session/todo.ts`、`session-todo-dock.tsx`、`session-todo.test.ts` | 任务进度、Journal 和结构化执行；报告/源码 | Magic 适配；轻量步骤不自动成为子任务 | 共同 | 用户看不到当前做到哪一步 |
| C-07 | 计划实时进度 | Todo 状态 `pending/in_progress/completed/cancelled` 和 Todo dock | Turn/Run 事件、structured gap、partial/degraded | 由任务计划投影展示已完成、当前、下一步和阻塞 | 共同 | 进度信息滞后或不可信 |
| C-08 | 模型和 Provider 选择 | Provider、model、model dialog、LLM package | Provider、模型调用和上下文装配 | 原样继承底层选择，Magic 记录有效配置和成本来源 | 共同 | 用户无法控制质量、成本和模型 |
| C-09 | 工具注册与调用 | Tool registry、tool schema、tool output | Tool、Skill、MCP、delegate 等原语 | 适配；工具结果是运行证据，不直接等于任务完成 | 共同 | Agent 只能聊天不能完成工作 |
| C-10 | 文件读取、目录浏览和搜索 | read、glob、grep、file tree、workspace | 文件工具、工作区上下文 | 原样继承并绑定 Magic 工作区/工程边界 | 共同 | 无法理解或定位项目 |
| C-11 | 文件编辑和补丁 | edit、write、apply_patch、snapshot | 文件修改和工具副作用 | 原样继承；登记产物、来源和副作用 | 共同 | 无法实际交付代码 |
| C-12 | Shell、PTY 和命令执行 | shell、PTY、terminal、command output | subprocess、sandbox、tool execution | 原样继承底层执行，适配审批、权限和副作用登记 | 共同 | 无法安装、构建、测试或运行项目 |
| C-13 | Git、Diff、Review、Revert | Git status/diff、review、revert、snapshot | 文件快照和交付证据；Git 能力需映射核查 | 原样继承基础查看和恢复，Magic 登记结果 | 共同 | 用户无法审查和撤销修改 |
| C-14 | LSP、诊断和代码导航 | LSP、diagnostics、editor integration | 代码工具能力；具体底座映射待核查 | 适配，不把诊断直接当验收通过 | 共同 | 修复和理解代码的效率下降 |
| C-15 | MCP、Plugin、Skill 和扩展 | MCP、plugin、skill、registry、permission | MCP、Skill、工具扩展、provider | 原样继承能力，Magic 增加范围和权限边界 | 共同 | 用户现有工具生态断裂 |
| C-16 | 权限审批 | permission provider、permission dock、server permission | approval、lease、sandbox；部分进程级限制 | 适配为 Magic 权限/审批，保留底座拦截 | 共同 | 越权或无法安全执行 |
| C-17 | Agent 向用户提问 | question tool、question dock、request list | ask_user、Interaction、挂起/resume | 原样继承交互，映射为等待用户状态 | 共同 | Agent 在不确定时乱猜或卡死 |
| C-18 | 停止、取消和中断 | session abort、stop、cancel 相关 API/UI | cancel、lease、run interruption | 原样继承；不能假装撤销已发生副作用 | 共同 | 用户无法控制运行和成本 |
| C-19 | 重试和再次执行 | retry、session prompt、tool retry；语义需核查 | replan、续派、失败降级 | Magic 为同一任务建立新 Attempt，保留旧结果 | 共同 | 重试覆盖历史或重复副作用 |
| C-20 | 暂停与继续 | 部分暂停语义；跨进程恢复待核查 | suspend、resume、checkpoint、Journal | 适配为 Attempt/任务等待；能力范围必须实机验证 | 共同 | 长任务中断后只能从头开始 |
| C-21 | 断连与重连 | SSE/live sync、connection state、retry | execution detached、attach/replay；跨进程边界待核查 | Magic 维护 Connection/Sync 状态，不把断连当完成 | 共同 | 用户误以为任务完成或重复执行 |
| C-22 | 崩溃恢复和进程重启 | 运行本地性、恢复限制在报告中标注 | Journal、resume、replay 测试；生产级语义待核查 | 首版受控承诺，纳入 F-10 验收 | 共同 | 数据、责任和副作用无法解释 |
| C-23 | 事件顺序、幂等和回放 | EventV2、sequence、replay、SSE | Journal、event fold、录制回放 | Magic 建立事件游标和幂等投影 | 共同 | 任务状态出现多个版本 |
| C-24 | 错误、失败、部分完成和降级 | error parts、tool failure、connection error | structured gap、partial、degraded、failure guard | 适配为诚实状态，不把异常包装成功 | 共同 | 用户无法判断结果是否可信 |
| C-25 | 上下文装配、截断和压缩 | message/part、context 受底座限制；需核查 | context assembler、压缩、工具输出清理 | 适配为会话/任务上下文，不泄露不应共享的记忆 | 共同 | 长对话失忆或成本失控 |
| C-26 | 私有记忆与上下文复用 | OpenCode 基础 session history；长期记忆非等价能力 | memory scope、注入、长期上下文 | Magic 新建有范围记忆，默认不跨会话或工程泄露 | 共同 | Agent 每次失去经验或越权共享 |
| C-27 | 临时子 Agent | child session/task/tool；不等于长期身份 | worker、delegate、CAPTAIN/AGENT Run | 原样继承调用能力，Magic 标记临时参与者 | 代理/CEO/工程 | 代理能力被削弱或临时 Agent 被误当成员 |
| C-28 | 会话成员复用 | 底座 child/session 复用语义待核查 | 同人续派、RunSession；试运行经验 | Magic 适配为 `SessionMember`，仅当前会话可复用 | 代理/CEO | 同一会话重复建立相同角色 |
| C-29 | CEO 委派和结果汇总 | OpenCode 有 task/child/session 运行能力，但无 Magic CEO 语义 | delegate、DAG、CAPTAIN、汇报 | Magic 新增组织与责任层 | CEO，可嵌入工程 | 无法形成可见的团队协作 |
| C-30 | 任务拆解、依赖和重规划 | 底层 task/child lineage；不是产品任务图 | DAG、WaveScheduler、replan、依赖 | Magic 适配为任务/计划/依赖关系 | CEO/工程/计划 | 任务顺序错误或阻塞不可见 |
| C-31 | 工程 PM 和长期成员 | 无等价底座产品对象 | 可提供编排机制，但无 Magic 工程语义 | Magic 新增 `Project`、`PM`、`ProjectMember` | 工程 | 无法形成长期项目组织 |
| C-32 | 任务责任、派发、交付和依赖 | Session/Run 只能提供运行证据 | Run/Journal 只能提供执行证据 | Magic 新增任务账本和五类关系 | 共同，工程增强 | 用户不知道谁负责、结果给谁 |
| C-33 | 产物登记、验收和来源 | 文件、diff、tool output | 产物传递、证据和交付；需边界映射 | Magic 新增 `Artifact` 登记，文件仍是资源事实 | 共同 | 文件存在却无法判断是否交付 |
| C-34 | 事实、证据和共享信息 | reference、文件和消息来源 | evidence ledger、NoteWall、结构化证据 | Magic 新增版本化 Fact；不把 NoteWall 当事实账本 | CEO/工程 | 错误结论扩散且无法追溯 |
| C-35 | 辩论、质询和圆桌 | 无等价 Magic 圆桌；底层可运行多个 Agent | debate、evidence、主持人、双产物 | 后置或按需适配，不影响普通代理 | CEO/工程 | 复杂决策缺少审查，但不应拖累小任务 |
| C-36 | 成本、用量和预算提示 | Provider/model/tool usage；完整字段需核查 | 成本和预算边界；证据需核查 | Magic 适配计量并在高成本操作前提示 | 共同，工程增强 | CEO/工程成本不可控 |
| C-37 | 通知、后台运行和用户回到现场 | App notifications、visibility、connection retry | 后台执行、SSE、恢复；跨端待核查 | 适配为任务通知和待介入事项 | 共同 | 用户离开页面后不知道结果 |
| C-38 | 工作区、目录和资源边界 | project/workspace/location、external directory | workspace/context、sandbox | Magic 保持工作区、文件夹、工程分离 | 共同，工程增强 | 文件、权限和工程归属混乱 |
| C-39 | 多端和响应式工作台 | App、Desktop、TUI、Web 入口和 responsive UI | Desktop、Mobile、Unity 等资产；范围需核查 | 继承核心能力，首版锁定承诺端 | 共同 | 不同端体验和状态不一致 |
| C-40 | 可访问性、快捷键和渐进披露 | keyboard、dock、dialog、timeline、ARIA；需前端复核 | 前端报告和既有 UX 经验 | 原样继承基础可用性，Magic 默认隐藏底层复杂度但不隐藏风险 | 共同 | 高频用户效率低，界面变成管理后台 |
| C-41 | 审计、来源和可追溯历史 | events、messages、parts、snapshots | Journal、Turn、evidence ledger | Magic 为任务、责任、产物、审批和副作用建立来源 | 共同 | 出错后无法解释发生了什么 |
| C-42 | 版本、能力降级和不支持提示 | V1/V2、client artifact、runtime 差异 | 运行时和协议边界；报告已有风险 | 首版必须锁版本，未知能力显式 `unsupported/degraded` | 共同 | 用户把兼容失败误认为任务失败或成功 |
| C-43 | 输入接收、排队、去重和并发冲突 | prompt admission、queue/steer、Session coordinator；版本和边界需核查 | Interaction/Turn/Run、lease 和连续调度；并发语义需核查 | Magic 为任务输入建立幂等键、顺序和冲突策略，不把重复输入静默执行两次 | 共同，CEO/工程增强 | 重复扣费、重复写文件或任务顺序错乱 |
| C-44 | 底座运行时、协议和客户端版本兼容 | 完整应用 runtime、独立 V2 runtime、V1/V2/Legacy、generated client 并存 | 与 OpenCode 的实际依赖关系未证实 | Magic 适配层锁定 canonical runtime、协议和 client artifact，升级必须有兼容测试 | 共同 | 同一功能在不同端表现不一致，问题无法定位 |
| C-45 | 事件持久化、投影、游标和缺口修复 | EventV2 durable event、projector、PubSub、SSE 是不同层；部分 replay 语义待实机验证 | Journal、Fold、Replay、SSE 分层；跨进程和多 worker 语义待核查 | Magic 使用查询快照 + durable evidence + live event + gap repair，投影必须幂等 | 共同 | 断线后状态缺失、重复展示或误判最终结果 |
| C-46 | 外部副作用、幂等、补偿和冲突 | 文件、Shell、Git、MCP、网络和 Provider 工具均可能产生副作用 | crash redrive、写类工具和外部系统的 exactly-once 未证实 | Magic 记录副作用、幂等键、已发生结果和补偿状态；停止不承诺自动回滚 | 共同，CEO/工程增强 | 用户以为取消成功，实际文件、Git 或外部操作已发生 |
| C-47 | 运行输入与成员身份分离 | child session、agent、task、run 只提供底层执行或 lineage | worker/RunSpec、CAPTAIN/AGENT、continue transcript 不等于长期身份 | Magic 新增 `AgentIdentity`、`SessionMember`、`ProjectMember`，并定义其复用范围 | 代理/CEO/工程 | 临时 worker 被误当长期成员，跨会话越权或记忆泄露 |
| C-48 | 直达成员、责任移交和并发交付收口 | 无等价的 Magic 责任与工程账本 | handoff、delegate、Journal 只能提供执行证据 | Magic 将直达成员任务纳入账本，显式记录责任人、移交、冲突、产物验收和 PM 通知 | CEO/工程，可嵌入代理 | 工程总览缺任务、无人收口或并发修改被静默覆盖 |
| C-49 | 底层审批、组织授权、预算和高权限扩展 | permission/question/tool registry；provider-executed、插件和 MCP 的统一拦截需核查 | approval、sandbox、MCP、lease；部分限制为进程级 | Magic 适配为主体、资源、动作、范围、时效、成本、副作用等级和授权来源，并单独审计 | 共同，工程增强 | 工具可见不等于可执行，成员权限越界或成本失控 |
| C-50 | 任务最终收口、结构化缺口和交付验收 | `idle`、`ended`、tool success、文件写入只说明底层事实 | `success` 可伴随 structured gap；`partial/degraded/paused/error` 需要产品映射 | Magic 由责任层依据目标、验收条件、产物、事实和未完成项收口 | 共同，CEO/工程增强 | 运行结束被错误包装成任务成功 |

## 四、计划能力的继承结论

OpenCode 当前已有两种相关能力：

1. **Plan agent 流程**：复杂任务可以进入 plan agent，计划完成后再询问是否切换 build agent。
2. **Todo 清单流程**：Agent 可以维护当前会话的结构化步骤，并在前端实时显示进度。

Magic 应继承这两个体验，但不应直接把它们当成 Magic 产品对象：

```text
OpenCode Plan/Todo
        ↓ Adapter
Magic Plan / PlanStep
        ↓ 可选升级
MagicTask / MagicSubtask / TaskAttempt
```

升级规则：计划步骤只用于理解和推进时保持轻量；需要独立责任人、独立交付/验收、独立等待/重试/暂停、跨成员依赖或单独追踪时，才升级为正式子任务。

计划能力在三种工作方式中都必须存在：

- 代理模式：主 Agent 可以自动计划并连续执行，不建立团队。
- CEO 模式：计划可转化为派发、依赖、汇报和综合交付。
- 工程模式：PM 维护项目计划，成员任务拥有自己的计划和责任。

## 五、不得丢失的共同基础体验

无论用户选择代理、CEO、工程，以下能力都属于共同底线：

1. 直接交代目标，不先填写团队表单。
2. 多回合连续对话和流式反馈。
3. 长任务计划、Todo、步骤进度和下一步提示。
4. 文件读取、搜索、编辑、命令执行、测试和真实交付。
5. 权限审批、用户提问、停止、取消、重试和恢复。
6. Diff、Review、Revert、错误解释和失败结果展示。
7. 会话历史、上下文连续性、模型选择和工具扩展。
8. 连接断开、同步缺口、后台运行和重新进入后的诚实状态。
9. 临时 Agent 辅助、结果汇总和不重复执行。
10. 产物来源、测试结果、验收状态和已发生副作用。

CEO 在此基础上增加团队治理；工程在此基础上增加长期组织；计划推进在三者之中都可使用。任何增强模式都不能以删除共同基础体验为代价。

## 六、当前确认、待核查和禁止推断

### 6.1 当前可以确认

- OpenCode 当前代码树存在 Plan、Plan Exit、Todo 工具和 Todo 前端面板。
- OpenCode 当前代码树存在会话、消息、工具、权限、问题、事件、文件、终端和多种前端工作区能力。
- AgentCore 既有报告记录了编排、DAG、ReAct、Journal、暂停恢复、记忆、审批、协作和证据能力。
- Magic 已确认计划推进是任务级能力，不是第三种组织模式。
- 四位技术总监已完成本轮复核，均同意本文作为“防遗漏盘点基线”；但均不同意在版本、恢复、权限、副作用和对象映射未完成实机核查前，将本文视为开发冻结基线。

### 6.2 必须继续核查

- OpenCode 选定 runtime、commit/tag、client artifact 和 canonical protocol。
- Plan agent、Todo、session、task、run 与 Magic 对象的准确映射。
- 断连、进程重启、重复/乱序事件、重试、停止、审批和外部副作用后的最终收敛。
- OpenCode 与 AgentCore 的真实依赖关系，不能仅凭两个项目都出现 Agent、Run 或 Task 名称推断。
- 真实 Provider、MCP、文件副作用、跨进程恢复、权限和多端行为。
- 代理、CEO、工程中计划步骤与正式子任务的事件、权限、责任和成本契约。
- OpenCode 完整应用 runtime 与独立 V2 runtime 的首版选择，以及 V1/V2、generated client 和 vendored client 的兼容矩阵。
- AgentCore 的恢复、审批、MCP 和 detached 语义是否能跨进程、跨 worker、跨桌面端稳定成立。
- 输入 admission、重复 prompt、steer/queue、事件重复/乱序、投影幂等和外部副作用补偿。

### 6.3 禁止推断

- 有 `plan.ts` 不等于 Magic 已有跨模式计划账本。
- 有 Todo UI 不等于有长期工程任务管理。
- 有 child session 不等于有会话成员、项目成员或长期 Agent 身份。
- 有 Run completed 不等于产品任务完成。
- 有测试文件不等于生产实机验证通过。
- 有底座工具不等于 Magic 已经拥有对应的权限、责任、产物和审计边界。

## 七、首版能力验收建议

首版至少验证以下场景：

1. 短任务直接完成，不强行展示复杂计划。
2. 长任务自动展示计划，按步骤推进，用户能看到当前步骤和下一步。
3. 代理任务使用 Todo，不因此建立 CEO 或工程。
4. 代理任务临时启用 CEO，原计划、产物、责任和运行记录连续。
5. CEO 子任务运行结束但验收失败，父任务不会被错误标记为完成。
6. 工程 PM 派发任务，成员能使用自己的计划，成员失败不会自动转移责任。
7. 计划步骤失败时产生新的 Attempt，旧 Attempt、结果和副作用保留。
8. 计划等待用户输入、审批或依赖时，任务明确显示等待对象和解除条件。
9. 断连、重连、进程重启、重复/乱序事件后，计划、任务、Attempt 和责任最终一致。
10. 外部文件变化或测试失败时，Magic 展示差异和证据，不静默覆盖事实。
11. 用户停止计划后，已完成步骤、在飞运行和已发生副作用仍可追溯。
12. 代理、CEO、工程三种入口都保留流式输出、工具调用、审批、错误提示和真实交付能力。

## 八、技术总监复核表

### 8.1 本轮复核已完成

四位技术总监均已阅读主盘点及其负责领域的技术材料，并返回了正式复核意见。复核记录和结论来源如下：

| 领域 | 复核结论 | 主要修正 |
|---|---|---|
| OpenCode 后端与运行时 | 同意作为防遗漏基线，不同意直接冻结实现 | 锁定 runtime/protocol；补充 admission、EventV2 投影、V1/V2 兼容、权限、恢复和副作用实机验证 |
| OpenCode 前端 | 同意作为防遗漏基线，不同意把 UI/测试资产当端到端验证 | 补充断连/重连、同步缺口、任务账本与 reducer 边界、用户直达成员、状态分层和可访问性 |
| AgentCore 编排与运行治理 | 同意作为防遗漏基线，不同意把 Run/RunSession/CAPTAIN 当 Magic 对象 | 补充 TaskAttempt、责任人、恢复/重试、幂等、副作用、组织权限和跨进程边界 |
| AgentCore AI 核心 | 同意作为防遗漏基线，不同意把 worker/CAPTAIN/续派当长期成员 | 补充 AgentIdentity/SessionMember/ProjectMember、structured gap、成员复用边界和 CEO/PM 区分 |

本轮复核的完整正式发言保留在技术总监任务记录中；后续如发生版本变化，必须按新版本重新复核，不得沿用本表的静态结论。

### 8.2 后续复核标准

四位技术总监复核本文时必须逐项回答：

- 是否确实覆盖自己负责领域的常用能力、源码和技术文档。
- 哪些条目的证据等级写高了，哪些其实只是蓝图或提案。
- 哪些能力在 OpenCode 和 AgentCore 中重复、冲突或语义不同。
- 哪些能力是当前用户已经习惯、首版不能静默删除的。
- 哪些能力需要 Magic 适配，不能直接复用底座对象。
- 代理、CEO、工程和计划推进是否都有清晰覆盖或明确后置。
- 是否遗漏了错误、停止、恢复、审批、成本、权限、产物和外部副作用。
- 是否存在与 F-10 组合技术阻塞冲突的首版承诺。
- 是否应新增能力条目、拆分现有条目或降低证据等级。
- 是否同意本文作为后续产品、架构、前端和开发冻结的防遗漏基线。

当前状态：本文已标记为 `reviewed`，可作为产品、架构、前端和开发会议的防遗漏输入；它仍不是首版开发冻结批准。首版冻结还必须完成版本锁定、对象映射裁定、权限与副作用方案，以及第七节列出的端到端验证。
