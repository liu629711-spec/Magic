# AgentCore 现有项目前端拆解工具助手

本工具助手与 `existing_frontend_prompt.md` 同时使用，服务于 `D:\Harmess\reference-project\AgentCore` 的全前端表面取证、协议链分析、安全实验和报告验收。工具输出是证据，不是产品结论。

## 1. 安全和写入边界

- 只读 AgentCore、关联拆解报告和经允许的两份 Magic 产品入口；不修改源码、测试、配置、锁文件、生成物和历史文档。
- 唯一默认写入是 `D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_FRONTEND_BREAKDOWN.md`。
- 不读取 `.env` 值、私钥、token、生产数据、真实用户会话或敏感日志。
- 浏览器、Electron、Mobile 和 Unity 实验只使用本地隔离服务、假账号和临时工作区；文件、shell、Git、网络、通知、深链接和 IPC 输入必须无害且可清理。
- 不以按钮、组件、类型、截图、preview 或 boot smoke 推断真实后端闭环。

## 2. 静态分析工具

| 目标 | 首选动作 | 输出 |
|---|---|---|
| 全表面边界 | `rg --files`、package/lock/构建/部署扫描，按应用和共享包分组 | P0/P1/P2/排除台账 |
| 路由和组件 | CodeGraph/TypeScript AST 提取 route、component、JSX、export/import 和引用者 | 路由树、组件依赖、孤立入口 |
| 状态 | 提取 Zustand store/selector、hook、context、cache、persist、draft 和 reducer/fold | 状态源、读写者、生命周期 |
| 数据链 | 追踪 REST client、SSE handler、contract type、fold、IPC 和 bridge | 页面到 Server/main/OS 的调用链 |
| Electron | main/preload/renderer 的 channel、handler、暴露 API、窗口、更新和外链 | IPC 白名单、输入校验和安全矩阵 |
| Mobile | Capacitor plugin/bridge、Android 配置、生命周期、推送、深链接和网络 | 共享/专属边界与平台风险 |
| Unity | scene、script、network/client、story pack、构建和测试 | AgentTown 实验边界和依赖 |
| 质量 | 订阅清理、异步竞态、长列表、危险 HTML、外链、IPC、焦点、ARIA | 性能、安全、可访问性风险 |

结构关系优先使用 CodeGraph/AST，字面量、文案、注释和日志再用文本搜索。索引未初始化或待同步时按项目规则处理，不把陈旧结果写成当前事实。

## 3. 表面台账模板

```text
应用/package/入口：
技术栈与 lockfile：
产品表面：Desktop / Web / Mobile / Admin / AgentTown / Website / Promo / preview/demo / 共享包
主闭环关系：
归类：P0 主产品深审 / P1 协议或依赖核查 / P2 外围登记 / 排除
路由/组件/数据入口：
代码证据与测试证据：
适用 AGENTS/rules：
排除或限制理由：
Magic 迁移影响：
未决项：
```

台账必须逐项包括 `apps/desktop`、`mobile`、`admin`、`town`、`website`、`promo`，全部 `packages`，以及 `assets/demos/evals` 内 preview、fixture、vendor、workspace 和样本。

## 4. 证据等级

统一使用：

1. `静态代码确认`
2. `仓库已有测试确认`，注明 unit/integration/conformance/vector
3. `仓库外隔离 harness 或 mock 确认`
4. `真实本地浏览器确认`
5. `真实 Electron 确认`
6. `真实移动端或模拟器确认`
7. `真实 Unity 确认`
8. `真实本地进程确认`
9. `外部服务确认`
10. `历史试运行观察`
11. `无法执行 / 不适用`

历史观察必须附来源、日期、当时 commit/tag 和环境。mock 不证明真实 MCP、LLM、认证、数据库、SSE 重连或持久化；conformance/vector 不外推未含场景；preview、Web boot smoke 和截图不证明真实发送、审批、恢复或任务闭环。

## 5. 分层测试与实验

先读取根 `AGENTS.md` 和 `.cursor/rules/verify-scope.mdc`，再读取实际 package 脚本。默认运行最低档点名文件/场景：

- Desktop：点名 Vitest、typecheck、conformance；Playwright/shoot 必须带场景过滤。
- Mobile：点名 fold、bridge 或平台测试；说明是真机、模拟器还是静态检查。
- Admin：点名 Vitest/typecheck；外部额度和区域服务不默认实测。
- AgentTown：仅在 Unity 环境可用时运行对应测试/场景，否则标记无法执行。
- 未修改契约时不执行 `pnpm gen:types`，不修改生成物。
- 非发布语境不裸跑全量 `release:gate`；绿色门禁不等于所有 integration 或产品闭环通过。
- 没有代码或环境变化时不重复运行同一验证。

### 状态实验矩阵

| 场景 | 优先方式 | 必须观察 |
|---|---|---|
| loading/empty/error/no permission | 已有测试或隔离 mock | DOM、store、重试、错误来源 |
| SSE 增量/duplicate/out-of-order | conformance/vector + Desktop fold 测试 | 原始事件、fold、ProjectedTurn、渲染 |
| disconnect/reconnect/replay | 隔离 event source 或真实本地进程 | 续传、去重、草稿、最终状态 |
| stop/cancel/partial/completed | 真实链或已有测试 | UI 是否误报业务任务完成 |
| tool approval/MCP | 跨进程静态链 + Electron 隔离实验 | renderer/preload/main/stdio/回填/resume |
| 文件/diff/产物 | 临时工作区 | 变更、失败、恢复、正式产物语义缺口 |
| Mobile 生命周期 | 模拟器/真机或静态桥接 | 后台/恢复、推送、深链接、网络 |
| AgentTown | Unity 测试或静态网络链 | 实验状态、主闭环隔离、失败表现 |

MCP 重点路径：`apps/server/agentcore/tools/mcp/`、`desktop/channel.py`、`fulfill/`、`apps/desktop/src/shared/mcp-contract.ts`、`main/mcp-service.ts`、`preload/index.ts`、`renderer/services/sse/handlers/desktop.ts`、`renderer/services/mcpOps.ts`。Desktop fold 重点路径：`renderer/protocol/conformanceFold.ts` 与 `foldInteractions.ts`。必须追调用者，不能只因文件存在宣布完整实现。

## 6. 实验记录模板

```text
实验 ID：
目标未决项：
commit/tag 与日期：
工作目录、package 和入口：
命令/URL/viewport/设备/窗口/Unity scene：
环境、fixture、mock 和临时数据：
用户操作与事件输入：
网络/IPC/store/DOM/文件观察：
结果：通过 / 失败 / 不适用 / 无法执行
证据等级：...
它证明什么：
它不证明什么：
绕过了哪些生产层：
截图、测试名或证据路径：
限制和下一步：
```

## 7. 图表与交叉核查

至少校验：全表面拓扑、路由树、页面/组件/store/API 依赖、SSE/fold/ProjectedTurn 时序、MCP 跨进程时序、Electron IPC、Mobile bridge 和 UI 状态机。Mermaid 实线表示代码/测试/实机证据，虚线表示推断，图下列证据路径。

与 AgentCore 架构报告交叉核查 API、事件、持久化、状态、MCP 和权限；与 OpenCode 报告只核查真实关系类型；最后以两份 Magic 产品入口做迁移矩阵。证据冲突保留为未决，不擅自择一。

## 8. 完成检查

- [ ] commit/tag/branch/dirty state、各运行时、lockfile 和报告依赖已锁定。
- [ ] Desktop/Web/Mobile/Admin/AgentTown/Website/Promo/preview 与共享包均已 P0/P1/P2/排除归类。
- [ ] Website、Promo、vendor、fixture、workspace、样本和生成物没有静默消失或混入主产品。
- [ ] 文档声明、代码状态、验证状态和一致性结论四字段已分别记录。
- [ ] 路由、页面、组件、hook/store、API、事件、IPC 和测试清单有证据。
- [ ] protocol-fold-kit 未被误写成完整 fold；Desktop 实际 fold 和 `ProjectedTurn` 已追踪。
- [ ] MCP/ClientTool 已按 Server、SSE、renderer、preload、main、stdio、回填与 resume 全链核查。
- [ ] loading/empty/error/permission/disconnect/reconnect/stop/cancel/partial/completed 均有证据或明确未知。
- [ ] UI 没有因流结束、进程停止或 Run 完成被误判为业务任务完成。
- [ ] preview、boot smoke、mock、conformance、截图和实机证据没有混级。
- [ ] Mobile、Admin、AgentTown 和外围表面没有被 Desktop 结论代替。
- [ ] 性能、响应式、可访问性、订阅清理和 IPC 安全已核查。
- [ ] OpenCode 关系未预设，Magic 对象没有由 AgentCore 直接改名继承。
- [ ] Magic 的任务、运行、责任、事实、产物和旧 UI 心智已分别比较，`U-01` 至 `U-12` 未被技术结论越权关闭。
- [ ] 能力、负能力、风险、未读取、排除、未执行、覆盖率和剩余未知台账已完成。
- [ ] 没有泄露敏感配置、真实用户数据或生产信息。
