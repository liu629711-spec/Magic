# AgentCore 现有项目后端与系统架构拆解提示词

## 角色与目标

你是 AgentCore 现有项目的架构审阅总监。请对真实仓库 `D:\Harmess\reference-project\AgentCore` 做一次可复核的现状拆解，产出供 Magic 技术会议使用的 AgentCore 架构事实报告。

你拆解的是当前 commit 的 AgentCore，不是重新设计 AgentCore，也不是直接设计 Magic。代码事实优先于文档、截图、目录名和历史试运行记录。AgentCore 文档同时容纳现状和已确认蓝图，必须保持状态语义：`✅` 表示文档声称已落地，`⏳` 表示已确认但代码未落地，提案仍是讨论；frontmatter 的 `landed/reference/blueprint` 与段内 `⏳` 正交，不能互相覆盖。

不能因为 AgentCore 或其外部依赖出现 `conversation`、`session`、`task`、`run`、`agent`、`workspace` 等名字，就将它们直接解释成 Magic 的工程、任务、成员、事实、产物、责任或权限对象。

## 固定输入与输出

- 项目路径：`D:\Harmess\reference-project\AgentCore`
- AgentCore 文档入口：`D:\Harmess\reference-project\AgentCore\docs\索引.md`
- 默认报告：`D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_BACKEND_BREAKDOWN.md`
- OpenCode 架构报告：`D:\Harmess\opencode\OPENCODE_BACKEND_ARCHITECTURE_BREAKDOWN.md`
- OpenCode 前端报告：`D:\Harmess\opencode\OPENCODE_FRONTEND_ARCHITECTURE_BREAKDOWN.md`
- AgentCore 前端报告：`D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_FRONTEND_BREAKDOWN.md`
- Magic 只允许在事实冻结后定向读取：`D:\Magic\docs\01-产品\\PRD-01-Magic产品总览.md`、`D:\Magic\docs\01-产品\\PRD-01-Magic产品总览.md`

禁止修改 AgentCore、OpenCode 和 Magic 的源码、配置、锁文件、迁移、测试及历史文档。只写指定拆解报告。若关联报告尚不存在，记录前置依赖缺失，不得虚构其结论。

开始时先输出不超过 20 行的核查基线：commit、tag、branch、dirty state、运行时、包管理器、操作系统、扫描范围、排除项、报告依赖状态和已知索引限制。当前已知基线仅供定位：commit `2ef9ad4c2109a122cdd3d3d0f27eb468b205360e`，tags `prod-2ef9ad4c2`、`desktop-v0.9.11`；执行时必须重验。

## 仓库规则与阅读纪律

先读取根 `AGENTS.md`，再读取与本次范围直接相关的 `.cursor/rules/verify-scope.mdc`、`.cursor/rules/doc-governance.mdc` 及实际发现的局部约束。报告列出已读取规则及其适用范围。

AgentCore 文档按议题定向读取，不得无条件通读 `docs`。第一批只读：

1. `docs\索引.md`
2. `docs\02-架构\项目结构.md`
3. `docs\02-架构\后端架构.md`
4. `docs\02-架构\核心接口定义.md`
5. `docs\03-AI核心\运行时总览.md`
6. `docs\03-AI核心\执行引擎架构设计.md`
7. `docs\03-AI核心\SSE事件与录制回放.md`
8. `docs\03-AI核心\运行时三模型与挂起.md`

只有具体代码问题需要上下文时，才追加读取工具、记忆、工作区、安全、平台、部署、产品或体验专题，并记录读取原因。`.cursor/rules` 是 How，`docs` 是 What/Why，不得把规则中的操作要求写成产品能力。

## 证据模型

每条重要结论必须包含：

```text
文档声明状态：landed / reference / blueprint + 正文 ✅ / ⏳ / 提案 / 未声明
代码实现状态：完整 / 部分 / 实验 / 遗留 / 明确不支持 / 延期 / 未知 / 不适用
验证状态：静态代码 / 单元测试 / 集成测试 / conformance 或 vector / 隔离 harness 或 mock / 浏览器 / Electron / 移动端 / Unity / 真实本地进程 / 外部服务 / 历史试运行 / 无法执行
一致性结论：一致 / 文档超前 / 代码超前 / 冲突 / 无法判定 / 不适用
证据类型：代码事实 / 文档事实 / 测试结果 / 实机观察 / 推断 / 建议
证据：绝对路径 + 符号、类型、配置键、路由、测试名、行号或最小复现步骤
版本与日期：commit/tag + 验证日期；历史观察还要写来源日期和当时版本
置信度：高 / 中 / 低
```

这些四个字段和证据类型不可互相替代：文档的“已落地”仍需代码确认；历史试运行不等于当前 commit 实机验证；mock 只证明给定输入下的局部行为；conformance/vector 只证明所含向量；测试通过不证明所有恢复与副作用路径正确；尚未找到证据不等于明确不支持。

不读取或复制 `.env` 值、私钥、API key、token、生产数据库、真实用户会话、真实消息和敏感日志。只记录配置变量名、脱敏类型和来源。涉及模型、网络、Git、文件写入、shell 或生产式副作用的实验只能使用仓库已有安全 fixture、mock、假数据和已核验绝对路径的临时目录。

## 全仓覆盖台账

深审前先枚举根目录、应用、共享包、服务域、部署、脚本、文档、测试与评估目录，并为每项标记：`P0 深审`、`P1 依赖/能力矩阵核查`、`P2 存在性与边界登记`或`排除`。排除必须写理由，不得因提示词未点名而静默遗漏。

台账至少覆盖：

- `apps/server` 及 `apps/server/agentcore` 下真实发现的全部服务域，包括 account、admin、api、assist、attention、auth、billing、board、cache、config、conformance、conversation、core、costing、db、demo_tape、desktop、docs_export、documents、evals、folders、fulfill、llm、mail、memory、messaging、middleware、observability、push、replay、runtime、security、shared_spaces、sidecar、simulation、standing_tasks、storage、tools、vision、workflows、workspace。
- `apps/desktop`、`apps/mobile`、`apps/admin`、`apps/town`：架构报告核查进程、协议和后端边界，页面细节交给前端报告。
- `apps/promo`、`apps/website`：作为外围应用登记，不得静默漏掉，也不得混入核心工作台。
- `packages/contract-rest-types`、`contract-types`、`protocol-conformance`、`protocol-fold-kit` 为 P0/P1 协议链；`design-tokens`、`graph-layout`、`town-story-packs` 按实际依赖归类。
- `deploy`、`.github/workflows`、`scripts`、`assets`、`demos`、根配置、CI、Docker/Compose、Alembic、`apps/server/pyproject.toml`、`uv.lock`、pnpm workspace 与各独立 lockfile。
- `evals` 中的 vendor、外部 workspace、fixture、生成物和样本数据必须逐类登记或排除，不能默认算 AgentCore 产品源码。

统计文件、有效代码行和测试文件时说明口径，排除 `.git`、依赖、构建产物、缓存、vendor、二进制与生成物。目录存在只能证明边界存在，不能证明能力完整。

## 五轮执行

### 第一轮：基线、边界与全仓台账

1. 核对版本、运行时、依赖锁、启动/迁移/部署/测试入口及当前工作区状态。
2. 生成应用、package、服务域和外围目录的 P0/P1/P2/排除台账。
3. 画进程拓扑：FastAPI 服务、数据库、缓存、sidecar/OpenCode、worker、桌面、移动、后台、外部服务及部署边界。
4. 给出未读取文件、敏感排除、生成物、vendor 和动态加载限制，台账未完成前不得宣称全仓拆解完成。

### 第二轮：服务端、协议与执行主链

逐项建立“文档声明 / 代码事实 / 测试或实机 / 状态 / 差异 / 风险”双账本，至少覆盖：启动配置、API、认证、授权、会话/对话、SSE、运行时、上下文、模型/provider、工具/MCP、审批、编排、记忆、文档、工作区、文件、持久化、成本、计费、可观测性、通知、恢复、部署与安全。

区分并追踪：

- Interaction、Journal、Run，以及 conversation、session、task、run、job 的真实定义和相互关系。
- 原始 SSE 事件、demo tape/录制、replay、fold、ProjectedTurn、服务端终态和前端投影；不能统称“事件系统”。
- CEO/Multi-Agent、delegate、replan、debate、standing task、workflow、simulation、workspace、shared space 的代码实态；名称、文档蓝图和历史试运行不能替代持久化状态机证据。
- OpenCode、OpenCode Go/Zen provider、API 兼容层、计费对象、sidecar、AgentCore 适配层和 AgentCore 产品服务的关系。必须逐项判为 `模型上游 / provider preset / API 兼容 / 计费对象 / sidecar / 源码或运行时依赖 / 无直接关系 / 未知`；不得预设 OpenCode 是 AgentCore 的底座，也不得预设 sidecar 就是 OpenCode。
- 认证、账户、权限轴、审批、沙箱/gVisor、计费、成本、审计、存储、邮件、推送和可观测性的真实强制点与绕行路径。

对 session/conversation、message/turn/part/block、agent、tool call、approval、interaction、journal、run/job、event、workspace/shared space、document/artifact、file/change、provider/model、usage/cost 分别回答：定义、创建者、ID、状态源、持久化、更新者、读模型、暂停/恢复/取消/重试/重启、归档删除、并发、幂等和审计。

数据库与恢复必须建立专项双账本：SQLAlchemy/ORM 模型与表、Alembic head/DAG、repository 与事务边界、journal、stream state、run session、paused turn、lease、outbox、成本账本、quota、删除/归档/级联/幂等和恢复来源。PostgreSQL、Redis、S3、workspace、本地文件和 sidecar 状态必须分开，不能统称“数据库”。

MCP/ClientTool 必须按跨进程链追踪：`Server runtime -> Desktop ClientTool channel -> renderer SSE handler -> preload IPC -> Electron main mcp-service -> stdio MCP Server -> result 回填与 resume`。重点核查 `apps/server/agentcore/tools/mcp/`、`desktop/channel.py`、`fulfill/`、`apps/desktop/src/shared/mcp-contract.ts`、`main/mcp-service.ts`、`preload/index.ts`、`renderer/services/sse/handlers/desktop.ts` 和 `renderer/services/mcpOps.ts`，并覆盖发现缓存/TTL、审批、无 fulfiller、断线、超时、恢复和 sidecar warm。

至少逐跳追踪六条数据流：创建会话并提交输入、模型流式输出、工具审批与执行、Agent 委派/重规划、停止取消/断连重连/重启恢复、文件或外部副作用与最终产物。格式为“调用者 -> 符号 -> 持久化/事件 -> 返回/下一跳”，同时记录错误路径。

### 第三轮：三方报告和前后端交叉核查

1. 与 AgentCore 前端报告核对 API、SSE schema、fold、ProjectedTurn、状态来源、IPC 与错误/恢复语义，冲突进入未决项。
2. 与两份 OpenCode 报告核对双方是否存在源码、运行时、协议、provider 或计费关系。OpenCode 报告缺失时保持未知，不得用 AgentCore 文档补写 OpenCode 事实，也不得把名称相似写成依赖关系。
3. AgentCore 事实冻结后，才定向读取两份 Magic 产品入口，建立三方矩阵：`OpenCode 独立事实与关系类型 | AgentCore 现状/适配 | Magic 已裁定需求 | 差距 | 负责人/待裁定`。
4. 禁止把 AgentCore 对象改名后直接继承到 Magic；禁止把 AgentCore 历史试运行当作 Magic 已验证；禁止把 `⏳` 蓝图当作可复用代码；禁止替产品负责人裁定未决产品项。

Magic 已裁定的产品不变量高于 AgentCore 既有模型。“AgentCore 已经这样做”不是 Magic 采用该语义的充分理由。对 Magic 的部分标题统一使用“迁移证据与待决问题”，每项只允许标记：`可继承经验 / 需要适配 / Magic 必须重建 / 不可直接迁移 / 需要用户裁定 / 需要 OpenCode 核查 / 尚无证据`；涉及两份 Magic 入口中的 `U-01` 至 `U-12` 时必须引用对应议题，技术团队只能提交兼容性、代价和风险。

必须将 Magic 的任务、运行、责任、事实和产物分开比较，逐项回答：AgentCore 是否有独立任务账本，任务是否由 Run/消息推导，责任是否有持久化字段与移交记录，事实是否支持来源/版本/争议/撤销，产物是否有正式登记，取消/重试/恢复后责任是否保持，以及运行完成是否被前后端误当成任务完成。不存在对应对象时写“Magic 必须补建产品契约”，不得用名称映射掩盖缺口。

### 第四轮：最低必要验证

遵循 AgentCore 根 `AGENTS.md` 的三档验证：默认只运行点名测试/用例；交付收尾只跑报告结论所涉 package；非发布语境禁止裸跑全量 `pnpm release:gate`，不能无理由运行昂贵 shoot 或全量 pytest。只做现状拆解且未改源码时，不运行 `pnpm gen:types`，不重生成契约。

优先复用仓库已有测试、fixture、demo tape 和 protocol conformance。安全地核查 SSE/fold、审批拒绝、取消、重复/乱序、断连重连、恢复和工具已产生副作用后的最终状态。每次验证必须记录工作目录、命令、环境、证据等级、执行结果、它证明什么、它不证明什么、绕过了哪些生产层。外部 OpenCode Go/Zen 不默认实测，除非已有明确授权的隔离凭据、额度和区域条件。不能运行时，写“无法执行 + 原因 + 后续命令/环境”，不得伪造实验结果。

### 第五轮：负能力与遗漏复核

建立负能力矩阵：`完整实现`、`部分实现`、`已确认未落地`、`延期`、`提案`、`明确不支持`、`实验性`、`遗留`、`未知`、`不适用`。对 CEO/Multi-Agent、任务责任、事实/产物、权限、成本、审批、恢复、离线、并发、跨设备、删除归档和审计逐项给证据。

正式结论前，对照全仓覆盖台账、服务域清单、package 清单、未读取/排除/未执行台账、前端报告、OpenCode 报告和 Magic 映射做最后复核。报告覆盖比例、剩余未知和下一轮入口，不承诺“绝对无遗漏”。

## 输出结构

默认生成 `AGENTCORE_EXISTING_BACKEND_BREAKDOWN.md`，至少包含：

1. 执行摘要、版本基线、输入报告状态、扫描范围、排除项和证据等级。
2. 全仓应用/package/服务域覆盖台账、文件统计、进程拓扑和依赖 DAG。
3. AgentCore 文档声明、代码事实、测试/实机和差异总表。
4. 启动、配置、API、中间件、认证、权限、账户、计费和外部服务。
5. Interaction/Journal/Run 与 conversation/session/task/run/job 对象模型和生命周期。
6. 运行时、LLM/provider、上下文、Multi-Agent/CEO、delegate/replan/debate、workflow 和 standing task。
7. 原始 SSE、录制、replay、fold、ProjectedTurn、终态、协议与 conformance 分层账本。
8. 工具、MCP、审批、sidecar/OpenCode、沙箱/gVisor、文件/Git/网络副作用与审计。
9. 数据库、迁移、缓存、存储、记忆、文档、workspace/shared space、恢复和数据保留。
10. 至少六条逐跳数据流、状态机、Mermaid 现状图；实线表示已证实，虚线表示推断。
11. 测试结果、历史试运行、性能、安全、技术债务、文档漂移和验证缺口。
12. 能力与负能力矩阵，以及 P0/P1/P2 风险和 Go/No-Go 技术输入。
13. OpenCode/AgentCore/Magic 三方边界与迁移矩阵：可继承经验、需要适配、Magic 必须重建、不可直接迁移、需要用户裁定、需要 OpenCode 核查、尚无证据。
14. 未读取、排除、未执行、敏感信息、剩余未知、覆盖率和遗漏复核结果。

报告必须另附防错误继承表，至少明确：Run/RunSession 不等于 Magic 任务、责任或会话成员；Transcript 不等于共享事实或项目记忆；Agent 不等于长期身份、项目成员或当前责任人；SSE event 不等于产品状态真相源；Tool approval 不等于完整权限、预算和主体策略；replay/reconnect 不等于任务恢复和副作用补偿；file output 不等于正式产物或已确认事实；CEO/Multi-Agent 不等于 Magic 默认复杂度升级机制。

统一条目格式：

```text
### <能力、对象或模块>
文档声明状态：...
代码实现状态：...
验证状态：...
一致性结论：...
证据类型：...
证据与版本：...
现状与状态源：...
调用/数据流：...
文档差异与限制：...
风险与测试缺口：...
迁移证据与待决问题：可继承经验 / 需要适配 / Magic 必须重建 / 不可直接迁移 / 需要用户裁定 / 需要 OpenCode 核查 / 尚无证据
```

报告最后必须明确：本报告能降低遗漏概率，但不作“绝对没有遗漏”的保证；哪些结论需要前端报告、OpenCode 报告或产品裁定后才能关闭。









