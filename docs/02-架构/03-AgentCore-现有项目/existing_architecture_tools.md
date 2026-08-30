# AgentCore 现有项目架构拆解工具助手

本工具助手与 `existing_architecture_prompt.md` 同时使用，服务于 `D:\Harmess\reference-project\AgentCore` 的现状取证、静态分析、安全实验和报告验收。工具输出是证据，不是结论。

## 1. 安全和写入边界

- 只读 AgentCore、OpenCode 报告和经允许的两份 Magic 产品入口；不修改三方源码、配置、锁文件、迁移、测试和历史文档。
- 唯一默认写入是 `D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_BACKEND_BREAKDOWN.md`。
- 不读取 `.env` 值、私钥、token、生产数据库、真实用户会话、真实消息或敏感日志；只记录变量名、脱敏类型和来源。
- 文件、Git、shell、网络、模型、邮件和推送实验使用 mock、fixture、假数据及已核验绝对路径的临时目录。
- 不因工具存在、测试名存在或文档声称支持，就写成完整实现。

## 2. 工具选择

| 问题 | 首选方式 | 输出要求 |
|---|---|---|
| 全仓有什么 | `rg --files`、manifest/lock/工作区扫描、按应用和服务域分组 | P0/P1/P2/排除台账、统计口径 |
| 符号在哪里、谁调用谁 | 已配置的 CodeGraph 或语言 AST；索引不可用时再做定向代码读取 | 符号、调用边、绝对路径、动态边界 |
| 文档说了什么 | 定向读取索引和议题相关专题 | frontmatter、段内状态、版本、读取原因 |
| API/事件/协议 | 路由、Pydantic/OpenAPI、contract types、fold kit、conformance 与测试 | schema、发布者/消费者、版本、状态源 |
| 数据与恢复 | ORM/model、Alembic、repository、cache、replay、storage | 表/对象、事务、幂等、恢复和保留 |
| 版本和依赖 | Git、pyproject/uv.lock、package/lock、Docker/Compose、CI | commit/tag/branch/dirty、运行时和冲突 |
| 风险 | 定向扫描 TODO/FIXME、异常、异步、命令/路径、网络、权限、日志、重试 | 文件/符号、影响、严重度和验证方式 |

结构问题优先使用 CodeGraph/AST，字面量、注释、日志和文档内容再用文本搜索。CodeGraph 未初始化或提示待同步时，按项目规则处理，不把陈旧索引当最新内容。

## 3. 覆盖台账模板

```text
路径/应用/package/服务域：
归类：P0 深审 / P1 依赖或能力核查 / P2 存在性登记 / 排除
职责与运行归属：
负责人或归属团队：
入口/公共符号：
上游与下游：
适用 AGENTS/rules：
证据状态：已读 / 部分读取 / 未读取
代码证据与测试证据：
排除或限制理由：
Magic 迁移影响：
未决项：
```

台账必须覆盖全部 `apps`、`packages`、`apps/server/agentcore` 服务域、`deploy`、`.github/workflows`、`scripts`、`demos`、`assets`、`evals` 和根配置。vendor、fixture、workspace、生成物、二进制和样本必须单独归类。

## 4. 统一证据等级

只能使用以下验证等级，报告可按具体测试类型继续细分：

1. `静态代码确认`
2. `仓库已有测试确认`，并标明 unit/integration/conformance/vector
3. `仓库外隔离 harness 或 mock 确认`
4. `真实本地进程或浏览器或 Electron 或移动端或 Unity 确认`
5. `外部服务确认`
6. `历史试运行观察`
7. `无法执行 / 不适用`

历史试运行观察必须写来源、日期、当时 commit/tag 和环境；缺任一项则降为低置信度文档事实。mock 不得证明真实 MCP、LLM、认证、数据库、SSE 重连或外部副作用正确。conformance/vector 不得外推到未包含场景；preview 和 Web boot smoke 不得证明真实发送闭环；静态代码存在不等于路由可达或运行成功。

## 5. 测试与实验

先读取根 `AGENTS.md` 和 `.cursor/rules/verify-scope.mdc`。默认只跑最低档点名测试，且只运行能关闭报告未决项的命令。优先使用仓库已有 harness/fixture；仓库外隔离 harness 只能无侵入验证局部边界并记录绕过层，否则标记“无法执行”：

- 后端：在 `apps/server` 使用点名 pytest 用例或 `-k`，不要默认跑全量。
- 前端/协议：按实际 package 点名 Vitest、typecheck 或 conformance 测试。
- 未修改 OpenAPI、SSE、fold 或契约时，不运行 `pnpm gen:types`，不修改生成物。
- 非发布任务不裸跑 `pnpm release:gate`；需要时只记录适用的 `--only`/lite 方案。
- 上次验证后没有文件或环境变化，不重复运行同一命令。

### 最小验证矩阵

| 场景 | 优先证据 | 必须观察 |
|---|---|---|
| SSE 正常流与 fold | 已有 conformance/fixture/demo tape | 原始事件、顺序、投影、终态 |
| 重复/乱序/断连重连 | 已有 replay 测试或隔离 mock | 去重、排序、续传、最终状态 |
| 工具审批通过/拒绝 | 已有测试或临时目录 fake tool | 权限点、tool record、副作用、错误 |
| stop/cancel/timeout/retry | 点名运行时测试 | Run/Interaction/Journal、事件和持久化 |
| 重启恢复 | 已有持久化/回放测试 | 状态源、恢复入口、不可恢复项 |
| 委派/replan/debate | 代码链 + 已有测试 | Agent 身份、责任、父子关系、终态 |
| MCP/ClientTool 跨进程 | 已有测试、静态链或隔离 Electron | channel、SSE、IPC、main、stdio、回填和 resume |
| sidecar/OpenCode 关系 | 静态边界，外部服务仅在授权条件下 | 关系类型、版本、请求、返回、AgentCore 责任 |

不能安全运行就标记“无法执行”，写清阻塞、需要的环境和建议命令。禁止为了制造“通过”而绕过权限、审批、沙箱或取消逻辑。

## 6. 实验记录模板

```text
实验 ID：
目标未决项：
commit/tag 与日期：
package/入口：
命令或操作：
fixture、mock、临时目录：
输入与前置条件：
观察到的调用、事件、持久化和副作用：
结果：通过 / 失败 / 不适用 / 无法执行
它证明什么：
它不证明什么：
绕过了哪些生产层：
验证等级：静态代码确认 / 仓库已有测试确认（具体类型） / 仓库外隔离 harness 或 mock 确认 / 真实本地进程或浏览器或 Electron 或移动端或 Unity 确认 / 外部服务确认 / 历史试运行观察 / 无法执行或不适用
证据路径或测试名：
限制和下一步：
```

## 7. 图表与交叉核查

至少校验：应用/package DAG、进程与部署拓扑、输入到工具的时序、对象状态机、SSE/录制/replay/fold/ProjectedTurn 分层、持久化与恢复关系图。Mermaid 实线表示代码/测试/实机证据，虚线表示推断，图下列证据路径。

与前端报告交叉核查 API、事件、fold、状态语义和 IPC；与 OpenCode 报告核查真实关系类型和各自责任边界；最后用两份 Magic 产品入口做需求映射。出现冲突时保留双方证据并列为未决，不擅自选择有利结论。

## 8. 完成检查

- [ ] commit/tag/branch/dirty state、运行时和报告依赖已锁定。
- [ ] 全部应用、共享包、服务域和外围目录均已 P0/P1/P2/排除归类。
- [ ] vendor、fixture、eval workspace、生成物和样本数据未混入产品源码统计。
- [ ] 文档状态、代码状态、验证等级、历史观察和推断彼此分开。
- [ ] Interaction/Journal/Run 与 conversation/session/task/run/job 已区分。
- [ ] SSE、录制、replay、fold、ProjectedTurn、服务端终态和 UI 投影已分层。
- [ ] CEO/Multi-Agent、委派、重规划、workflow、standing task 有代码级或明确未知证据。
- [ ] OpenCode 关系已分类，未预设它是运行时底座，未把 sidecar 默认解释成 OpenCode。
- [ ] MCP/ClientTool 已按 Server、SSE、renderer、preload、main、stdio、回填与 resume 的完整跨进程链核查。
- [ ] ORM/Alembic/repository/事务/恢复双账本，以及 PostgreSQL/Redis/S3/workspace/本地文件/sidecar 状态已分开。
- [ ] 权限、审批、沙箱、成本、审计、恢复和副作用有证据或明确缺口。
- [ ] 测试遵循三档验证，未无理由运行全量门禁或重生成契约。
- [ ] 能力、负能力、风险、未读取、排除、未执行和剩余未知台账已完成。
- [ ] OpenCode/AgentCore/Magic 三方矩阵没有直接改名继承，也没有替产品做裁定。
- [ ] Magic 的任务、运行、责任、事实和产物已分别比较，`U-01` 至 `U-12` 未被技术结论越权关闭。
- [ ] 报告说明覆盖比例和剩余风险，没有承诺绝对无遗漏。
- [ ] 没有泄露敏感配置、真实用户数据或生产信息。
