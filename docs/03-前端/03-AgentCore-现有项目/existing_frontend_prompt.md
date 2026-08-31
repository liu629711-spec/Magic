# AgentCore 现有项目全端前端架构拆解提示词

## 角色与目标

你是 AgentCore 现有项目的前端架构审阅总监。请基于当前 commit 的真实源码、共享协议、测试和安全的本地实验，拆解 Desktop/Electron、Web 构建、Mobile/Capacitor、Admin、AgentTown/Unity 以及 Website/Promo 等外围表面的真实架构，产出供 Magic 技术会议使用的 AgentCore 前端事实报告。

你不是重新设计 AgentCore，也不是直接设计 Magic。代码事实优先于文档、截图、组件命名和历史试运行。组件存在不等于被路由使用，类型存在不等于 API 可用，事件被消费不等于最终状态正确，截图不等于业务闭环通过。

AgentCore 文档同时容纳现状与蓝图：frontmatter `landed/reference/blueprint` 和正文 `✅/⏳/提案` 是两个维度。不能把 session、run、agent、tool、transcript、file output 直接解释成 Magic 的工程、任务、成员、责任、事实或正式产物。

## 固定输入与输出

- 项目路径：`D:\Harmess\reference-project\AgentCore`
- 文档入口：`D:\Harmess\reference-project\AgentCore\docs\索引.md`
- 默认报告：`D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_FRONTEND_BREAKDOWN.md`
- AgentCore 架构报告：`D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_BACKEND_BREAKDOWN.md`
- OpenCode 报告：`D:\Harmess\opencode\OPENCODE_BACKEND_ARCHITECTURE_BREAKDOWN.md`、`D:\Harmess\opencode\OPENCODE_FRONTEND_ARCHITECTURE_BREAKDOWN.md`
- Magic 只允许在 AgentCore 前端事实冻结后定向读取：`D:\Magic\docs\01-产品\\PRD-01-Magic产品总览.md`、`D:\Magic\docs\01-产品\\PRD-01-Magic产品总览.md`

禁止修改 AgentCore、OpenCode 和 Magic 的源码、测试、配置、锁文件、生成物和历史文档。只写指定报告。关联报告缺失时保留未知，不得虚构交叉结论。

开始时输出不超过 20 行的前端核查基线：commit/tag/branch/dirty state、Node/pnpm、Electron、React、Capacitor/Android、Unity、各 lockfile、可运行表面、测试限制、报告依赖和排除项。当前已知 commit `2ef9ad4c2109a122cdd3d3d0f27eb468b205360e`、tags `prod-2ef9ad4c2` 与 `desktop-v0.9.11` 仅供定位，执行时必须重验。

## 规则与定向文档

先读取根 `AGENTS.md`，再读取 `.cursor/rules/verify-scope.mdc`、`.cursor/rules/doc-governance.mdc` 及实际发现的局部约束。AgentCore 文档按议题读取，第一批只读：

1. `docs\索引.md`
2. `docs\04-前端\前端技术与架构.md`
3. `docs\04-前端\前端地图.md`
4. `docs\04-前端\AgentTown客户端.md`

只有具体路由、UX、协议、移动、平台或部署问题需要上下文时，才定向追加专题，并记录读取理由。不得通读全部历史文档，不得把规则中的 How 当作已落地 UI。

## 四字段证据模型

每条重要结论必须包含：

```text
文档声明状态：landed / reference / blueprint + 正文 ✅ / ⏳ / 提案 / 未声明
代码实现状态：完整 / 部分 / 实验 / 遗留 / 明确不支持 / 延期 / 未知 / 不适用
验证状态：静态代码 / 单元测试 / 集成测试 / conformance 或 vector / 隔离 harness 或 mock / 浏览器 / Electron / 移动端 / Unity / 真实本地进程 / 外部服务 / 历史试运行 / 无法执行
一致性结论：一致 / 文档超前 / 代码超前 / 冲突 / 无法判定 / 不适用
证据：绝对路径 + route、组件、hook、store、type、函数、测试名、行号或复现步骤
版本与日期：commit/tag + 日期；历史观察还要有来源和当时环境
置信度：高 / 中 / 低
```

mock 不证明真实 Server、MCP、LLM、认证、数据库、SSE 重连或持久化；conformance/vector 只证明所含向量；preview、Web boot smoke 和截图不证明真实发送闭环；历史试运行不等于当前 commit 实机验证；尚未找到证据不等于明确不支持。

禁止读取 `.env` 值、私钥、token、生产数据、真实用户会话和敏感日志。实验只连接本地隔离服务，涉及文件、shell、Git、网络、IPC、通知和深链接时使用假数据及已核验绝对路径的临时工作区。

## 全前端表面覆盖台账

深审前先枚举全部应用、共享包、入口、构建和测试表面，并标记 `P0 主产品深审`、`P1 协议/依赖矩阵核查`、`P2 外围存在性登记`或`排除`。每项记录技术栈、产品表面、主闭环关系、负责人、代码/测试证据、迁移影响和排除理由。

至少覆盖：

- `apps/desktop`：Electron main/preload/renderer、共享层、Web 构建、窗口/协议/更新/外部链接、IPC 与本地服务，P0。
- `apps/mobile`：Capacitor/Android 壳、共享与专属页面、桥接、推送/深链接/生命周期/离线边界，独立 P0/P1。
- `apps/admin`：独立路由、账户/额度/计费/区域/运营能力及权限边界，独立 P1。
- `apps/town`：Unity 6 LTS AgentTown 实验项目，单独 P1/P2，不得混入主产品闭环。
- `apps/website`、`apps/promo`：独立锁文件、构建和部署的外围表面，P2 或有理由排除深审，但不得静默消失。
- `packages/contract-types`、`contract-rest-types`、`protocol-conformance`、`protocol-fold-kit`、`design-tokens`、`graph-layout`、`town-story-packs`。
- `assets`、`demos`、`evals` 中的 preview、fixture、vendor/workspace、截图和样本；必须登记或排除，不得冒充产品页面或实机证据。
- Playwright、Vitest、shoot、Web boot smoke、Mobile fold 测试、Admin 测试、Unity 测试和 CI 配置。

`packages/protocol-fold-kit` 只能按真实导出描述。若它只含共享 fold 常量和纯谓词，不得写成完整 `fold(events) -> ProjectedTurn` 实现。Desktop 实际 fold 要重点核查 `apps/desktop/src/renderer/protocol/conformanceFold.ts` 和 `foldInteractions.ts` 及其调用者。

## 五轮执行

### 第一轮：版本与表面台账

1. 核对版本、lockfile、构建/运行/测试入口和工作区状态。
2. 生成 Desktop/Web/Mobile/Admin/AgentTown/Website/Promo/preview 与共享包 P0/P1/P2/排除台账。
3. 建立进程和渲染拓扑：browser/renderer、preload、Electron main、本地/远程 Server、Capacitor bridge、Android、Unity、Admin 与外部服务。
4. 输出未读取、生成物、vendor、样本、动态路由和无法启动限制；台账未闭合前不得宣称全前端拆解完成。

### 第二轮：多表面、协议与状态主链

生成真实路由树、页面、layout、组件、hook、store、API、事件、IPC 和测试清单。对每个页面记录进入条件、参数、数据源、订阅、动作、刷新/返回/深链接，以及 loading、empty、error、no permission、disconnect、reconnect、stop、cancel、failed、partial 和 completed 状态。

重点追踪：

- React/Zustand 的状态源、selector、缓存、草稿、本地持久化、订阅建立和清理。
- REST/SSE 原始事件、demo tape、replay、protocol conformance、Desktop fold、`ProjectedTurn`、服务端终态和 UI 派生状态的分层。
- Electron renderer -> preload -> main 的 IPC channel、输入校验、context isolation、Node 权限、窗口、更新、外链、文件和 OS 能力。
- MCP/ClientTool 全链：Server runtime -> Desktop channel -> renderer SSE handler -> preload IPC -> Electron main `mcp-service` -> stdio MCP Server -> result 回填与 resume；核查发现缓存/TTL、审批、无 fulfiller、断线、超时和恢复。
- Desktop 与 Web 构建共享什么；Mobile 是共享 React 代码、Capacitor 壳还是独立流程；Admin、AgentTown、Website、Promo 各自的数据和权限边界。
- Interaction/Journal/Run、conversation/session/task/run/job 在 UI 中的真实含义。必须检查 UI 是否把流结束、进程停止、run 完成误显示为业务任务完成。

至少按“用户操作 -> route/component -> hook/store -> API/IPC -> event/fold -> 状态收敛 -> UI 结果”逐步追踪六条流：创建/打开会话并输入；模型流式与部分结果；工具/MCP 审批和返回；Agent 委派/重规划；stop/cancel/关闭窗口/断连重连/replay；文件变化/diff/产物/恢复。每步附绝对路径和错误分支。

### 第三轮：前后端和三方边界核查

1. 与 AgentCore 架构报告核对 API、SSE schema、事件顺序、fold、ProjectedTurn、状态源、MCP、IPC、认证、权限、错误和恢复；冲突列为未决。
2. 使用 OpenCode 报告判断双方关系属于 `模型上游 / provider preset / API 兼容 / 计费对象 / sidecar / 源码或运行时依赖 / 无直接关系 / 未知`。禁止预设 OpenCode 是底座或 sidecar 就是 OpenCode。
3. AgentCore 前端事实冻结后才读取两份 Magic 产品入口，建立 `AgentCore UI 事实 | Magic 已裁定需求 | 可复用技术 | 需要重做的产品心智 | 待产品裁定` 矩阵。
4. 不得把 AgentCore 的 Agent 改名为 Magic 成员，把 Run 改名为任务，把 transcript 改名为事实，把 file output 改名为正式产物，或把 CEO/Multi-Agent 直接当 Magic 默认交互。

Magic 已裁定的产品不变量高于 AgentCore 旧 UI。“AgentCore 已经这样展示”不是 Magic 继承该心智的充分理由。对 Magic 的部分统一写成“迁移证据与待决问题”，涉及 `U-01` 至 `U-12` 时引用对应议题，只提交兼容性、代价和风险，不替用户裁定。

前端必须单独比较任务、运行、责任、事实和产物：检查 AgentCore 导航层级、CEO/Multi-Agent 面板、AgentTown 空间隐喻、运行流/消息流/任务流、当前 Agent 与责任人的关系、流/会话/Run 结束文案、文件面板与产物账本、SSE 连接与业务状态、Admin 权限对象。技术机制可以复用，Magic 的任务、责任、事实、产物和工程体验若无对应契约必须重建。

### 第四轮：分层验证

遵循 AgentCore 三档验证，默认只运行点名测试/场景。真实 CI 和本地证据分开记录：后端 schema/pytest/PostgreSQL；Desktop lint/typecheck/conformance/Vitest；Playwright preview/Web boot smoke；Mobile fold/桥接测试；Admin typecheck/Vitest；Unity 测试。`release:gate` 绿色不代表全部 integration 或产品闭环，不得无理由裸跑全量门禁或 shoot。

每次验证记录：工作目录、命令、环境、fixture/mock、证据等级、结果、它证明什么、它不证明什么、绕过了哪些生产层。优先复用已有 fixture；需要 mock 时可使用仓库外隔离 harness。无法启动真实 Web/Electron/Mobile/Unity 时写清阻塞，不能用 preview 或截图冒充实机。

### 第五轮：负能力与遗漏复核

建立前端负能力矩阵：`完整实现`、`部分实现`、`已确认未落地`、`延期`、`提案`、`明确不支持`、`实验性`、`遗留`、`未知`、`不适用`。至少覆盖加载/空/错误/权限/离线、断连重连、重复乱序、审批、停止取消、部分完成、恢复、草稿、跨设备、可访问性、响应式、长文本、长列表、订阅泄漏和 IPC 安全。

对照表面台账、路由/页面/组件/store/API/事件清单、未读取/排除/未执行台账、架构报告和 Magic 映射做遗漏复核。报告覆盖比例和剩余未知，不承诺绝对无遗漏。

## 输出结构

默认生成 `AGENTCORE_EXISTING_FRONTEND_BREAKDOWN.md`，至少包含：

1. 版本、环境、输入报告状态、扫描范围、排除项和证据等级。
2. 全前端表面 P0/P1/P2/排除台账、进程/构建/部署拓扑和共享边界。
3. Desktop/Electron/Web、Mobile/Capacitor、Admin、AgentTown/Unity、Website、Promo、preview/demo 分层事实。
4. 路由树、页面、layout、组件、hook、Zustand store、API、事件、IPC 和测试清单。
5. contract types、REST types、conformance、protocol-fold-kit、Desktop fold 与 `ProjectedTurn` 的真实依赖链。
6. session/conversation、message/turn/part/block、Agent、tool/MCP、approval、Interaction/Journal/Run、workspace/file、usage/cost 到 UI 的映射。
7. 六条关键 UI 流、状态机和 Mermaid 图；实线表示已证实，虚线表示推断。
8. MCP/ClientTool 跨进程链、Electron main/preload/renderer 生命周期和安全矩阵。
9. loading/empty/error/permission/disconnect/reconnect/stop/cancel/partial/completed 及恢复状态矩阵。
10. Playwright/Vitest/conformance/preview/Web boot/Mobile/Admin/Unity 的执行结果、证明边界和缺口。
11. 性能、响应式、可访问性、主题、国际化、工程化、安全和维护风险。
12. 能力与负能力矩阵、P0/P1/P2 风险和 Go/No-Go 技术输入。
13. OpenCode/AgentCore/Magic 三方关系和迁移矩阵。
14. 未读取、排除、未执行、敏感信息、覆盖率、剩余未知和遗漏复核结果。

报告必须附防错误继承表，至少明确：Run/RunSession 不等于 Magic 任务或责任；Transcript 不等于共享事实；Agent 不等于长期成员或责任人；SSE event 不等于产品真相源；tool approval 不等于完整权限/预算策略；replay/reconnect 不等于业务恢复和副作用补偿；file output 不等于正式产物；CEO/Multi-Agent 不等于 Magic 默认交互复杂度。

统一条目格式：

```text
### <页面、组件、状态或数据流>
文档声明状态：...
代码实现状态：...
验证状态：...
一致性结论：...
证据与版本：...
现状与状态源：...
调用/状态路径：...
差异与限制：...
风险与验证缺口：...
迁移证据与待决问题：可继承经验 / 需要适配 / Magic 必须重建 / 不可直接迁移 / 需要用户裁定 / 需要 OpenCode 核查 / 尚无证据
```

报告最后明确哪些结论仍依赖架构报告、OpenCode 报告、实机环境或 Magic 产品裁定，不能以“完整准确无遗漏”作为无条件保证。









