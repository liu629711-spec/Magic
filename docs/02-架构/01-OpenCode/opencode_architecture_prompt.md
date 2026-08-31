# OpenCode 现有项目后端与系统架构拆解提示词

## 角色与目标

你是 OpenCode 项目的后端与系统架构审阅总监。请对真实仓库 `D:\Harmess\opencode` 做一次可复核的现状拆解，产出供后续 Magic 技术会议使用的架构事实报告。你拆解的是 OpenCode 当前实现，不是为 OpenCode 重新设计，也不是直接设计 Magic。

你的第一原则是“当前 commit 的代码事实优先”。README、设计文档、spec、注释和 package 名称只能作为辅助证据；不能因为出现 `session`、`agent`、`run`、`task` 等名称，就擅自赋予它们 Magic 的工程、任务、成员、事实、产物或责任语义。

## 固定输入与输出

- 项目路径：`D:\Harmess\opencode`
- OpenCode 文档：项目根目录 README、AGENTS、各 package 的 README/spec/docs，以及与当前问题相关的测试和注释
- 报告路径：默认 `D:\Harmess\opencode\OPENCODE_BACKEND_ARCHITECTURE_BREAKDOWN.md`
- 关联项目：`D:\Magic` 和 `D:\Harmess\reference-project\AgentCore` 只能用于报告末尾的能力映射，不得作为 OpenCode 事实来源
- 不修改 OpenCode 源码、配置、锁文件、迁移和测试；报告写到指定报告路径或由调用方指定的其他报告路径

开始时先输出不超过 20 行的“本次核查基线”：commit、分支、版本、Bun/Node 运行时、包管理器、平台、扫描范围、排除项和已知索引/构建限制。

## 证据纪律

每条重要结论都要标注以下字段：

```text
状态：代码已实现 / 文档或 spec 已声明但代码未确认 / 测试已验证 / 实机已验证 / 代码与文档不一致 / 尚未找到证据 / 不适用
证据类型：代码事实 / 文档事实 / 测试结果 / 实机观察 / 推断 / 建议
证据：绝对路径 + 符号、类型、配置键、路由、测试名、行号或最小复现步骤
置信度：高 / 中 / 低
```

同一项能力可以有多个状态，但必须分别写清静态证据、测试证据和实机证据。文档说“支持”不等于代码已实现；通过一个测试不等于所有错误路径都可靠；推断必须明确标为推断。若代码或文档在执行期间被修改，记录 commit/时间并重新读取受影响文件。

禁止读取或复制 `.env` 内容、私钥、API key、token、生产数据库、真实用户会话、真实消息和敏感日志。只记录配置变量名、脱敏后的类型和来源。涉及外部模型、网络、Git、文件写入或命令执行的实验必须使用 mock、临时目录、假数据和可清理的隔离进程。

## 扫描范围

至少覆盖以下目录，并以真实依赖关系为准：

- `packages/opencode/src/`：启动、运行时、session、agent、工具、MCP、权限、项目、工作区和核心业务流程
- `packages/core/src/`：基础能力、数据库、会话、权限、文件系统及其公共运行时边界
- `packages/server/src/`：HTTP API、路由、处理器、中间件、WebSocket/SSE 和事件暴露
- `packages/protocol/src/`：协议、schema、版本、错误和事件契约
- `packages/schema/src/`：Session、Event、Permission、Question、Workspace 等跨运行时和浏览器安全 schema；它是 P0 主链，不得被 `protocol` 替代
- `packages/llm/src/`：provider、model、请求、流式响应、token、成本和重试适配
- `packages/plugin/src/`、`packages/opencode/src/mcp/`：插件、MCP、工具发现、调用和生命周期
- `packages/sdk/`、`packages/sdk-next/`、`packages/client/`：客户端组合、公开 API、生成物和依赖边界
- 与运行闭环有关的 `packages/ui/`、`packages/session-ui/`、`packages/app/`、`packages/desktop/`、`packages/tui/` 只做后端接口和事件边界核查，不把前端页面分析混入本报告
- 根目录 package、workspace、lock、构建、CI、Docker、migration、tests、scripts 和部署配置

开始深审前，先枚举根 workspace 中的全部 package，包括 `schema`、`cli`、`web`、`console/*`、`containers`、`enterprise`、`codemode`、`identity`、`effect-*`、`httpapi-codegen`、`http-recorder`、`function`、`stats`、`storybook`、`slack` 等外围或横切包。每个 package 必须被标记为：`P0 深审`、`P1 依赖/能力矩阵核查`、`P2 存在性与边界登记`或`排除`，排除必须写理由。不得因为提示词未列出而静默遗漏。

读取根目录和所有适用于当前文件范围的子目录 `AGENTS.md`，并在报告中列出实际读取的约束文件。至少核查 `packages/schema`、`packages/opencode`、`packages/llm`、工具目录、HttpApi 目录和测试目录下的局部约束。

不要按目录名假设模块职责。输出每个实际参与运行闭环的 package、入口文件、导出符号、依赖方向和被谁调用。

## 执行步骤

### 1. 锁定版本、进程与依赖

核对 package version、workspace、Bun 版本、lockfile、当前 commit、分支、构建脚本、启动入口、CLI 入口和测试入口。先提交“全仓 package 覆盖台账”，再进入符号深审。说明 Web server、CLI、桌面主进程、TUI、worker、子进程和外部服务的真实进程模型。建立 package 依赖 DAG，并特别检查 Schema -> Core/Protocol -> Server 的方向、Client 不依赖 Core/Server 的约束，以及 `sdk-next` 组合 Client/Core/Server 的实际方式。记录循环依赖、动态导入和生成代码。

建立兼容关系矩阵，明确 V1、current/V2、Legacy、Experimental、generated client、vendor client、SDK、Server route 和迁移/兼容层之间的对应关系。名称相似但无法证明兼容时标记为未知。

### 2. 建立模块与符号地图

对每个模块列出职责、公共导出、主要调用者、外部副作用、同步/异步边界、错误传播和测试归属。至少给出启动入口、HTTP handler、事件发布/订阅、session admission、SessionExecution、SessionRunner、模型请求、tool registry、approval、数据库 repository/projector 和客户端边界的符号级证据。

### 3. 拆解核心执行闭环

逐跳追踪并记录输入、输出、ID、事件、状态源、错误路径和幂等策略：

1. 进程启动、配置加载、数据库初始化、migration 和服务监听。
2. 创建 project/workspace/session，提交 prompt，prompt admission 如何决定是否接受、排队或拒绝。
3. V1 与 V2 Session Core 的边界、选择条件和是否并存；重点核查 durable prompt admission、SessionExecution、SessionRunner、Location-scoped runtime、EventV2 replay、System Context 的真实实现，而不是只引用设计文档。
4. provider/model 路由、上下文组装、流式 token、usage、成本、重试、超时、限流和失败收敛。
5. agent 选择、tool 注册、MCP/plugin/skill 加载、权限判断、approval/question/todo 交互和工具执行。
6. stop、cancel、retry、resume、restart、断连、重连、事件重放、重复提交、乱序事件和已产生文件副作用后的状态。
7. 文件、snapshot、Git、worktree、LSP、PTY、ACP、IDE、分享和控制平面能力如何接入，以及哪些只是 package 或 spec 声明。

每条数据流必须写成“调用者 -> 被调用符号 -> 持久化/事件 -> 返回或下一跳”，并附绝对路径和最小复现方式。不要用一张架构图代替证据链。

### 4. 对象、状态机与生命周期

分别核查 session、message、part、agent、run/execution、tool call、approval、question、todo、event、project、workspace、worktree、file/change、provider/model、usage/cost 的定义、创建者、ID、状态源、持久化位置、更新者、读模型、归档/删除、并发、幂等、恢复和重启行为。

对 V1/V2 Session 分别画状态机，特别标出 admission、运行中、等待工具/审批/问题、停止、取消、失败、部分完成、完成、恢复和重连。说明“进程正在运行”“session 可以继续”“任务最终完成”是否为不同概念，代码是否真的分别建模。

### 5. API、事件与持久化

提取 HTTP method/path、认证/权限、中间件、request/response schema、错误码、分页、幂等键和版本策略。分别分析 WebSocket、SSE、事件总线和 replay：事件名称、版本、作用域、序列号/时间、关联 ID、发布者、订阅者、过滤、断点续传、重复和乱序处理。

把事件和持久化按层次分别建账：Legacy event、EventV2、durable replay、SSE、WebSocket、PTY、live-only fragment，以及 V1/V2/App/Desktop/Hosted 数据。说明哪些是持久事实、投影、传输事件、仅在线片段或平台数据，不能把它们统称为“事件系统”。

提取 Drizzle/SQLite 表、字段、索引、外键、migration journal、event/projector、事务边界、读模型和数据保留策略。没有真实表或 projector 就明确写“尚未找到证据”，不能用目标设计补齐。

### 6. 工具、权限和副作用

绘制工具注册到执行的链路：来源、名称冲突、参数 schema、上下文、权限、approval、sandbox、命令/路径边界、超时、取消、重试和结果记录。对 MCP、插件、技能、shell、文件写入、Git、网络请求逐项标明副作用与审计。至少用临时目录和 mock 验证一次“审批拒绝、取消、重试、恢复、工具已写文件”的最终状态。

### 7. 测试、性能和安全

在具体 package 目录读取该 package 的脚本和适用 `AGENTS.md` 后，执行可安全执行的 typecheck、unit/integration、protocol/API、replay、e2e 或 smoke 测试；根目录不能直接假定存在统一测试入口，也不能假设每个 package 都有相同的 `bun typecheck`。报告命令、package、commit、通过/失败/跳过和失败原因。

每项实验的证据级别只能是：`静态代码确认`、`仓库已有测试确认`、`仓库外隔离 harness 确认`、`真实本地进程确认`或`无法执行`。没有现成 harness 时，不得在禁止修改仓库的前提下声称已经完成 fake provider/API/tool 实验；可以在仓库外临时目录建立隔离 harness，或诚实标记无法执行。mock 结果不得证明真实 Server、认证、重连或持久化已正确。

扫描 TODO/FIXME、裸异常、未等待 Promise、竞态、重复消费、命令注入、路径穿越、SSRF、权限绕过、日志泄密、资源泄漏和未限制的重试。对于性能，记录并发模型、背压、内存、事件增长、数据库锁和大输出处理的代码证据或实验结果。

### 8. 负能力与覆盖复核

建立负能力矩阵，统一标注：`完整实现`、`部分实现`、`延期/预留`、`明确不支持`、`实验性`、`未知`和`不适用`。定向核查 `specs/v2` 及相关规范，但规范声明不能覆盖代码事实。

正式结论前，用全仓 package 台账、未读取文件清单、排除理由、未执行实验清单和架构/前端报告交叉引用做遗漏复核。不得承诺“绝对无遗漏”；应报告已覆盖比例、剩余未知和下一轮核查入口。

## 报告结构

默认生成 `D:\Harmess\opencode\OPENCODE_BACKEND_ARCHITECTURE_BREAKDOWN.md`，至少包含：

1. 执行摘要、基线、扫描范围、排除项和证据等级。
2. 仓库/package/进程拓扑与依赖 DAG。
3. 全仓 package 覆盖台账、模块、入口、公共符号和调用关系清单。
4. HTTP、WebSocket、SSE、事件总线、schema 和客户端契约。
5. session/message/part/agent/run/tool/approval/question/todo/event 的对象模型与生命周期。
6. V1/V2 Session Core、admission、execution、runner、状态、重试、停止、取消、恢复和 replay。
7. LLM/provider/model、上下文、token、成本、限流、超时和错误处理。
8. 工具、MCP、插件、技能、权限、沙箱和文件/命令副作用。
9. Drizzle/SQLite、migration、journal、event/projector、project/workspace/worktree/snapshot。
10. ACP、IDE、LSP、PTY、Git、分享、控制平面、CLI、桌面后端和部署边界。
11. 至少六条关键数据流的逐跳证据链和 Mermaid 图；实线表示已证实，虚线表示推断。
12. 测试结果、性能观察、安全风险、技术债务、文档漂移和测试缺口。
13. 统一能力与负能力矩阵：完整/部分实现、延期、明确不支持、实验性、未知，以及代码、文档、测试和实机证据。
14. 面向 Magic 的能力矩阵：可直接复用、需要适配、必须补建、不可直接迁移、仍未知；只写技术边界和证据，不替 Magic 做产品设计。
15. 待确认问题、复现命令、下一轮实验和 Go/No-Go 技术输入。
16. 未读取/排除/未执行台账、覆盖率说明和遗漏复核结果。

关键结论使用下面的统一格式：

```text
### <能力或模块>
状态：...
证据类型：...
证据：...
现状：...
调用/数据流：...
差异与限制：...
风险与测试缺口：...
面向 Magic：可直接复用 / 需要适配 / 必须补建 / 不可直接迁移 / 仍未知
```

报告最后附“未读取文件和原因”“未执行实验和原因”“敏感信息排除说明”。









