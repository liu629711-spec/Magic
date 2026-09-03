---
status: frozen
version: 1.2
date: 2026-09-03
authority: technical-design-draft
---

# Magic 前端技术设计方案 V1

> 本文原地替换同文件的 1.0 草案，是唯一的前端技术设计文档，不新建平行 PRD 或过程文档。
> 本文不冻结视觉风格；只定义信息架构、状态语义、交互行为和 API 消费方式。视觉与风格对齐清单见第 0.6 节，对齐前不做任何视觉实现。
> 依据：《第一版范围确认》(confirmed)、ADR-0001/0002/0003/0004/0005、《代码架构基线 V1》《后端方案 V1》《数据库设计 V1》、PRD-01 至 PRD-05，以及 `apps/`、`crates/` 当前源码。文档与源码冲突时以源码为准，冲突逐条列在第 0.5 节。
> 2026-09-03：前端契约冻结完成（决议 FZ-1~FZ-P1，见 [03-前端契约审查报告-2026-09-03.md](03-前端契约审查报告-2026-09-03.md) 第五节）。§6.2 为冻结版接口契约，全部待实现接口仍标注【待实现】；§4.4/§6.5/§6.6/§9.5/§9.10 已按决议修订。

## 0. 结论来源与证据状态

### 0.1 来自源码的结论（可直接作为设计依据）

| # | 结论 | 源码证据 |
|---|---|---|
| S1 | Magic 本地 API 当前只有 3 个路由：`GET /health`、`POST /api/tasks/{task_id}/attempts`、`POST /api/tasks/{task_id}/attempts/{attempt_id}/reconcile`，默认监听 `127.0.0.1:45280` | `apps/local-service/src/main.rs:106-115`、`:96` |
| S2 | 创建 Attempt 请求体为 `{attempt_id, attempt_no, idempotency_key, request_hash, directory?, input}`，`attempt_id` 与幂等键均由客户端提供；`UNIQUE(task_id, attempt_no)`、`UNIQUE(task_id, idempotency_key)` | `apps/local-service/src/main.rs:26-33`；`crates/persistence/src/lib.rs:50-59` |
| S3 | 首次创建返回 201 `{attempt_id, status:"running", event_seq, reused:false}`；同幂等键复用返回 200 `{..., reused:true, event_seq:null}` | `apps/local-service/src/main.rs:143-165` |
| S4 | 错误映射：幂等冲突 409、执行失败 502、`MissingBinding` 409、`MissingAttempt`/持久化错误 500，响应体 `{error}` | `apps/local-service/src/main.rs:200-229` |
| S5 | Attempt 状态机为 8 态：`created→admitted→running`，`running→cancelling→cancelled`，`running|cancelling|unknown_after_restart→succeeded/failed`，`admitted|running|cancelling→unknown_after_restart`；wire 名称 snake_case | `crates/domain/src/lib.rs:25-34`、`:71-133`、`:334-343` |
| S6 | Task 状态机为 8 态：`proposed/ready/in_progress/awaiting_review/completed/blocked/cancelled/failed`；Task 字段只有 `id/status/current_owner_id/acceptance_criteria_defined`，没有目标文本、时间戳和计划步骤 | `crates/domain/src/lib.rs:12-21`、`:156-234` |
| S7 | Task `completed` 必须处于 `awaiting_review` 且带验收证据（`complete(true)`）；`ready` 必须有责任人和验收标准 | `crates/domain/src/lib.rs:190-222` |
| S8 | reconcile 不是"刷新状态"：只有观察到终态证据才落终态；`running` 等非终态 Attempt 一经对账（含证据不足）即收口为 `unknown_after_restart` | `crates/application/src/lib.rs:176-240`；测试 `:390-405`。**2026-09-03 FZ-1 决议变更该语义**：周期对账移除、观测语义改为 Running/Terminal/Unknown（见 6.2）；后端实现前源码行为仍如上 |
| S9 | 派发成功路径：建 Attempt(`created`)→写 `admitted`→新建 OpenCode Session→写 binding→`prompt_async`→写 `running`；每次派发新建一个 OpenCode Session，不跨 Attempt 复用 | `crates/application/src/lib.rs:89-173`、`:124` |
| S10 | 持久层当前只有 4 张表：`task_attempt`、`event_ledger`、`attempt_binding`、`event_cursor`；没有 tasks、审批、产物、成本、副作用表；`task_attempt` 无时间戳列，`event_ledger` 无 occurred_at 列 | `crates/persistence/src/lib.rs:48-92` |
| S11 | 状态事件写入事务：按 Attempt 聚合递增 `seq`，`event_type='attempt.status_changed'`，`source='magic'`，`payload_json={"from":..,"to":..}`，同一事务更新投影 | `crates/persistence/src/lib.rs:237-282` |
| S12 | 外部（OpenCode）事件以 `aggregate_type="opencode"`、`source="opencode-v1"` 入账，按 `(source, source_event_id)` 与 `(aggregate, seq)` 去重；游标只在 seq 连续时推进，单调不回退 | `crates/reconciliation/src/lib.rs:100-108`、`:45-68`；`crates/persistence/src/lib.rs:348-505` |
| S13 | Recovery Worker 与 API 同进程，默认每 30s 补拉 history 并对活跃 Attempt（admitted/running/cancelling）自动对账；无 binding 或对账失败→`unknown_after_restart` | `apps/local-service/src/main.rs:74-94`；`crates/reconciliation/src/lib.rs:88-150`。**2026-09-03 FZ-1 决议**：周期只补拉 history、不翻状态，探测仅在服务启动恢复/用户触发时执行（后端实现前源码行为仍如上） |
| S14 | 端口层已有 `cancel`（OpenCode `POST /session/:id/abort`），但没有任何用例或 HTTP 路由调用它；`policy`、`observability` 是空壳 | `crates/execution-port/src/lib.rs:55`；`crates/execution-opencode-v1/src/lib.rs:102-107`、`:217-219`；`crates/policy/src/lib.rs:1-3` |
| S15 | OpenCode 终态判据：最后一条 assistant 消息 `error.name=MessageAbortedError`→Cancelled，其他 error→Failed，`finish` 非空且 `time.completed` 存在→Succeeded，否则 Unknown；OpenCode 运行态不跨进程持久化 | `crates/execution-opencode-v1/src/lib.rs:230-260`；`docs/F-10-验证记录-001-OpenCode-HttpApi.md:49` |
| S16 | 本地服务路由无 CORS、无鉴权中间件；`crates/contracts` 仅有未接线的 `AttemptView` | `apps/local-service/src/main.rs:106-115`；`crates/contracts/src/lib.rs:4-10` |
| S17 | `apps/desktop/` 当前仅有占位 README、无源码；README 声明正式 Tauri+Yew 桌面入口待本地服务契约稳定后从 `spikes/rust-ui-runtime` 迁入 | `apps/desktop/README.md:3`；`ARCHITECTURE.md:5` |
| S18 | 底层 OpenCode V1 能力：`POST /session[?directory]`、`POST /session/:id/prompt_async`、`GET /session/:id/message`、`POST /session/:id/abort`、`POST /sync/history`、SSE `GET /event`（信封无 `id:`，不可作续传游标） | `crates/execution-opencode-v1/src/lib.rs:50-158`；`docs/F-10-验证记录-002-OpenCode-事件协议.md:39-44` |

### 0.2 来自现有文档的结论（产品/架构约束，不与源码冲突时有效）

- 技术栈冻结：Tauri 桌面壳 + Yew 0.23 + Trunk + `wasm32-unknown-unknown`；本地服务 Tokio + Axum + rusqlite bundled（ADR-0001/0002/0003/0005）。
- Yew 能力已编译级验证：50 行窗口化列表、1 万行长日志节点、Markdown（pulldown-cmark）、Diff（similar）、键盘事件、`aria-current`/`role=alert`（ADR-0003:19；`spikes/rust-ui-capabilities/RESULTS.md`）。
- 窗口关闭不取消 Attempt、Worker 独立于窗口进程、manifest+令牌发现机制（ADR-0004）。
- Spike 实测：桌面进程工作集约 62.4 MB、OpenCode V1 约 405.8 MB、WASM 约 311 KB + JS 胶水约 31 KB（`spikes/rust-ui-runtime/RESULTS.md`；ADR-0003:17）。
- 产品展示约束：五个用户问题（在做什么/谁负责/等什么/已产生什么结果/需要我决定什么）；失败、同步缺口、权限拒绝、预算超限、不可逆副作用不可被折叠隐藏（PRD-01 §12、§15；PRD-04 §12；PRD-05 §15）。
- 权限请求卡、成本四数（上限/已预留/实际/剩余）、副作用卡、事实卡的必备字段（PRD-05 §5、§15）。
- 运行成功≠任务完成；取消不撤销已发生副作用；重试创建新 Attempt；同幂等键同请求体复用、异请求体冲突（PRD-04 §20、§22；《第一版范围确认》§2）。

### 0.3 仍是假设的部分（本文提出、待验证）

> 2026-09-03 冻结更新：下列假设中的排序口径（C-2/FZ-4）、`request_hash` 口径（B-5/FZ-5）、CEO 语义（P-4/FZ-P1）、责任人取值（P-3）、视觉风格（P-6）均已收口，见 0.6 节与《前端契约确认清单》第 6 节；仅首屏耗时等量化目标仍待 E2E 校准。

- 视觉风格、布局密度、主题（亮/暗跟随系统）——完全未定义，见 0.6 节。
- 首屏耗时、长会话内存等量化目标——Spike 只测过空链路，未测真实负载，本文数字均为"待 E2E 校准的初始预算"。
- 任务列表的排序/筛选字段——当前数据模型没有 `updated_at`（S10），排序口径待后端定。
- `request_hash` 的计算口径——服务端只做相等比较（S2），哈希算法与覆盖字段需前后端约定（Q9）。
- CEO 工作方式在 V1 后端的体现——范围确认纳入 CEO 入口，但后端无编排对象，前端只能预留入口字段（Q7）。
- 任务责任人取值——V1 单用户，`current_owner_id` 指向谁（用户本人/主 Agent）待确认（Q6）。

### 0.4 尚未实现的后端接口（前端必须标记为"待实现契约"）

当前已实现的只有 S1 的 3 个接口。以下均为待实现（契约提案见 6.2 节）：Task 创建/列表/详情、Attempt 列表与详情、事件账本查询、取消、重试（可由现有派发接口模拟）、审批、Plan Step、验收收口、人工标记结果、产物/Diff/测试证据查询、成本查询、副作用查询、binding 查询、CORS/本地令牌。

### 0.5 文档与源码冲突清单（以源码为准，前端不得按文档实现）

| # | 冲突 | 处理 |
|---|---|---|
| C1 | AGENTS.md 项目路径写 `D:\Harmess\Magic\`，实际工作区为 `D:\Magic` | 按实际路径；建议回写 AGENTS.md |
| C2 | PRD-04 §3/§15 与旧前端草案 §4 的 Task 状态含"等待/部分完成/已停止/已归档"；domain 源码只有 8 态，无这四个状态 | 前端只展示 domain 8 态（S6）；补状态属后端语义变更，须先改 domain 与 PRD |
| C3 | 后端方案 §7、数据库设计 §2-§5、旧前端草案 §6 规划了大量 API/表（tasks、cancel、retry、plan、approvals、events、artifact、usage、side_effect 等），源码均未实现 | 全部按"待实现契约"处理，不得当作已存在接口 |
| C4 | 旧前端草案 §5 首屏流程依赖 `GET /api/tasks/:id` 和事件订阅，均未实现 | 首屏流程改为 6.6 节的降级方案 |
| C5 | 旧前端草案 Task 状态文案含"已归档" | 同 C2，移除 |
| C6 | 后端方案 §7 将 reconcile 描述为"主动触发对账"，容易被理解为刷新状态；源码语义是"取终态证据，否则转 unknown"（S8） | 前端把 reconcile 定义为收口动作，禁止当轮询用（6.6 节） |
| C7 | 用户任务书要求重点阅读 `apps/desktop/`，该目录当前仅有占位 README、无源码可读（S17） | 桌面壳设计基于 `spikes/rust-ui-runtime` 与 ADR-0001/0004；`apps/desktop/README.md` 确认契约稳定后迁入，迁入时需复核本文第 2/10 节 |
| C8 | 范围确认把"取消"列入 V1 控制，但源码无取消 API/用例（S14） | 取消按钮按"待实现契约"设计，见 4.5/6.2 |
| C9 | 数据库设计 §3 的 `event_ledger` 规划含 `occurred_at/received_at`，实现无时间戳列（S10/S11） | 时间线 V1 只按 `seq` 排序展示，不显示发生时间，避免伪造时间 |
| C10 | PRD-04 §16 运行状态含"排队/等待审批/暂停"，domain Attempt 无这些状态 | 同 C2；审批等待在 V1 以"审批卡+横幅"呈现，不改状态机（Q1） |

### 0.6 需要产品/后端确认的问题（对齐前不实现）

> 2026-09-03：Q1-Q13 已随《前端契约确认清单 2026-09-02》与审查决议 FZ-1~FZ-P1 全部收口，本表保留作历史索引。

| ID | 问题 | 影响 |
|---|---|---|
| Q1 | 审批等待是新增 Attempt/Task 状态，还是保持 `running`+审批卡？ | 状态展示与 4.5 节设计 |
| Q2 | PRD-04 的"等待/部分完成/已停止/归档"是否进 V1 状态机？ | 任务列表筛选与详情页 |
| Q3 | `unknown_after_restart` 的人工收口（标记成功/失败/取消）用哪个 API？审计要求？ | 4.6 节三操作之一当前无接口 |
| Q4 | 取消 API 形态：路径、幂等键要求、`cancelling` 超时后如何呈现？ | 4.4/9.5 节 |
| Q5 | 事件查询 API 的分页/过滤/排序契约；是否补 `occurred_at` 时间戳 | 时间线与游标设计 |
| Q6 | V1 单用户下 `current_owner_id` 的取值与展示 | 任务卡责任人区 |
| Q7 | CEO 入口在 V1 的后端语义（只是标记，还是有编排差异？） | 创建任务表单字段 |
| Q8 | 验收证据（产物/Diff/测试证据）由谁登记、什么格式？ | 4.3 验收区 |
| Q9 | `request_hash` 计算口径（哈希算法、覆盖字段） | 6.4 幂等设计 |
| Q10 | 前端连本地服务走 HTTP+CORS+本地令牌，还是 Tauri invoke 桥？（当前服务无 CORS/鉴权，S16） | 7/10 节架构缝 |
| Q11 | 任务列表排序与筛选字段（无 `updated_at`） | 4.2 节 |
| Q12 | OpenCode 原始消息/transcript 按需加载的证据 API 是否提供 | 4.3 证据面板 |
| Q13 | 视觉风格方向（见 0.6.1） | 全部界面 |

#### 0.6.1 视觉与风格待对齐（不盲目设计）

本文不预设视觉方案。以下三项需要产品确认后再做任何视觉实现；确认前所有界面仅用系统默认样式搭建结构与状态：

1. 风格方向：贴近系统原生（WebView2 默认控件观感）还是自定义品牌视觉（需设计稿）；
2. 布局密度与信息层级：单栏为主还是"列表+详情"双栏；
3. 主题：亮/暗是否跟随 Windows 系统设置。

在此之前，本文只约束与风格无关的硬性要求：状态不得只用颜色区分（必须文字+图标）、未知/失败/缺口不得隐藏（PRD-05 §15）、中文为界面语言、状态命名使用第 5.1 节的固定文案。

## 1. 设计边界与原则

1. 界面展示的核心对象是 Magic 自己的 Task、Plan Step、Attempt、责任人、验收标准、审批、状态、事件账本、产物、Diff、测试证据、成本、权限和外部副作用。OpenCode 的 Session、消息、原始事件只作为"底层绑定/证据"展示（S9、S12 的数据结构），永远不出现在任务状态的主表达里。
2. Attempt 成功只是"一次尝试结束"。Task 完成必须由用户基于验收证据收口（S7）。前端在 Attempt 终态后必须显示"等待验收，任务未完成"，不得把 OpenCode 成功渲染成任务成功。
3. 诚实状态优先：加载不出就显示失败，证据不足就显示"重启后状态未知"，缺口就显示同步缺口；不猜测、不乐观替换（PRD-04 §22）。
4. 事件账本是前端最终数据源；前端只用 Magic API，不直连 OpenCode（V1 不依赖 OpenCode SSE）。
5. V1 范围：单用户、单工作区、单工程、代理+CEO 入口、任务闭环（创建→计划→责任人→Attempt→观察→取消→重试→审批→验收→产物/Diff/证据/成本/副作用→未知收口）。范围外内容见第 16 节。

## 2. 技术栈与运行形态

```text
Tauri 桌面壳（窗口、生命周期、manifest 发现、受限 invoke）
   └─ Yew 0.23 + Trunk → WASM（本方案主体，运行在系统 WebView2）
         └─ HTTP(S) → Magic 本地 API/Worker（独立 Rust 进程，Axum）
               └─ SQLite 事件账本 → OpenCode V1 Adapter → OpenCode 进程（外部）
```

- 栈冻结依据：ADR-0001/0002/0003/0005；Yew 能力证据见 `spikes/rust-ui-capabilities/RESULTS.md`。
- Worker 与 API 当前同进程（S13），但生命周期独立于窗口（ADR-0004）；前端不假设"窗口开着=执行中"。
- 服务发现：按 ADR-0004，Tauri 侧读取 runtime manifest（实例 ID、API 地址、令牌、启动时间）后交付给 UI。manifest 与令牌机制在 Worker Spike 中验证过单实例拒绝与重发现（`spikes/rust-worker-runtime/RESULTS.md`），尚未在正式服务实现——前端按"启动时通过 Tauri 命令取 API 基址+令牌，取不到则进入未连接态"设计，开发模式回退 `127.0.0.1:45280`（S1）。

## 3. 前端信息架构

围绕 PRD-01 §12 的五个用户问题组织信息：

| 用户问题 | 承载界面 |
|---|---|
| 现在在做什么 | 工作台"进行中"区、任务详情当前 Attempt、全局状态带 |
| 谁负责 | 任务卡与详情的责任人区（唯一责任人，Q6） |
| 系统在等什么 | 待审批队列、审批卡、等待原因横幅、unknown 卡 |
| 已经产生了什么结果 | 产物、Diff、测试证据、成本、副作用、事件时间线 |
| 下一步需要我决定什么 | 工作台"需要你处理"区（unknown 收口、审批、验收） |

信息分层（不建万能 Tab）：导航栏（工作台/任务/审批）→ 工作面（列表或详情）→ 检查器式侧栏（详情页内的证据区）。治理信息（审批、成本、副作用）进入任务上下文相关位置，不堆成独立大页面；跨任务汇总只在审批队列出现。

## 4. 页面和路由结构

路由采用 `yew-router` 0.23（与 Yew 同版本线，ADR-0003 栈内）。路由是纯视图切换，不携带业务状态；业务状态统一在全局 Store（第 5.3 节）。

| 路由 | 页面 | 说明 |
|---|---|---|
| `/` | 工作台 | 默认页 |
| `/tasks` | 任务列表 | 支持状态/责任人/排序筛选 |
| `/tasks/:task_id` | 任务详情 | `?attempt=` 锚定历史 Attempt |
| `/approvals` | 审批队列 | 待实现契约数据源 |

### 4.1 工作台

- 顶部：工程标识条（V1 单工程，只读展示工程名/根目录；工程对象后端未实现，先静态显示工作目录，Q11 关联）。
- "进行中"区：当前有活跃 Attempt（admitted/running/cancelling）的任务卡，显示任务标题、Attempt 序号、状态徽标、已确认事件序号。
- "需要你处理"区：按严重度排序——`unknown_after_restart` 收口卡 > 待审批卡 > 待验收任务（Attempt 终态但 Task 未完成）。
- "最近任务"区：按 C-2/FZ-4 冻结排序口径（读列表响应的 `ordering` 字段）取前 N 条。
- 右上全局状态带：本地服务连接状态（已连接/重连中/未连接）、Recovery Worker 观察到的事件游标水位（待实现接口）、同步缺口标记。

### 4.2 任务列表

- 列：任务标题（后端补齐前以 task_id 显示）、状态、责任人、当前 Attempt 序号与状态、最近事件 seq。
- 筛选：状态（domain 8 态，S6）、责任人；排序按 C-2/FZ-4 冻结口径——读列表响应的 `ordering` 字段：时间戳迁移完成前为 `creation`（显示降级提示），迁移后 `updated_at DESC, id DESC`。
- 行操作：Enter/点击进详情。
- 列表虚拟化渲染（能力 spike 已验证 50 行窗口），筛选在客户端内存完成（V1 单用户数据量小，服务端分页接口待实现后切换）。

### 4.3 任务详情

单页锚点分区，全部来自 Magic 数据，无 OpenCode 原生界面：

1. 目标区：任务目标、状态、唯一责任人。目标文本依赖 Task 创建接口（待实现）；当前 domain 只有 `acceptance_criteria_defined` 布尔值（S6），文本存储是后端缺口（数据库设计 §2 `task` 表规划）。
2. 验收标准区：标准清单+证据核对表。完成按钮的可用性=Task 处于 `awaiting_review` 且全部必填证据已登记（S7），点击后弹出确认框，逐条列出证据再二次确认。
3. Plan Step 区：步骤列表（标题/状态/顺序）。数据结构与接口均为待实现契约（数据库设计 §2 `plan_step` 规划）；未实现前显示空态"计划能力未接入"。
4. 当前 Attempt 区：状态徽标、attempt_no、底层绑定摘要（adapter、session_id、message_id，来自待实现 binding 查询；数据当前已在 `attempt_binding` 表中，S10）、操作按钮（取消/重试/对账，按状态可用性矩阵渲染，见 4.4）。
5. 历史 Attempt 区：按 attempt_no 倒序，保留全部旧 Attempt（含失败/取消原因），点击展开各自时间线。重试永不覆盖旧行（S2 唯一约束）。
6. 事件时间线：见 4.4。
7. 产物/Diff/测试证据区：三个并列证据卡。数据源均为待实现契约（Q8）；未接入时显示空态并说明数据来源未登记，禁止用 OpenCode 消息文本冒充证据。
8. 成本区：四数卡（上限/已预留/实际消耗/剩余，PRD-05 §5）。后端 `usage_record` 未实现（S10），显示"暂无成本数据来源"。
9. 权限区：授权快照与审批历史（待实现）；展示字段按 PRD-05 §15 权限请求卡。
10. 外部副作用区：副作用卡（动作、资源、是否可逆、补偿入口，PRD-05 §15）。取消/失败后已发生的副作用必须继续显示（PRD-05 §7）。
11. 未决问题区：unknown 卡（若有）、同步缺口、待用户决策项的聚合入口。

### 4.4 Attempt 时间线

时间线主体是 Magic 事件账本的 `attempt.status_changed` 事件流（S11），按 `seq` 升序；每条显示：seq、状态变化 `from → to`、来源（`magic`）。OpenCode 原始事件（`aggregate_type="opencode"`，S12）进入独立的"底层证据"折叠面板，按需加载，不与主时间线混排（对应旧草案 §5 原则，保留）。

状态展示固定文案与语义（与 domain 8 态一一对应，S5）：

| 状态 | 文案 | 用户语义 | 可用操作 |
|---|---|---|---|
| `created` | 已创建 | 已登记，尚未接纳 | 无 |
| `admitted` | 已接纳 | 已接纳，准备执行 | 无（取消仅 `running` 可发起，FZ-7；原 Q4 提案的 admitted 取消已废弃） |
| `running` | 执行中 | 正在执行 | 取消（待实现，FZ-7 仅此状态可发起）；观察 |
| `cancelling` | 取消中 | 取消已发出，未确认终态 | 只读；禁止重复取消 |
| `cancelled` | 已取消 | 确认取消完成 | 重试（创建新 Attempt） |
| `succeeded` | 成功 | 本次尝试成功，任务未完成 | 验收入口；再次执行 |
| `failed` | 失败 | 本次尝试失败 | 重试；查看失败证据 |
| `unknown_after_restart` | 重启后状态未知 | 证据不足，需要你决定 | 对账/重新执行/人工标记（4.6） |

注意以下源码/冻结语义必须在 UI 体现：
- "取消中"不是终态，取消可能以成功收口（domain 测试 `cancellation_race_can_finish_as_success`，`crates/domain/src/lib.rs:288-296`），UI 不得预设取消结果。
- 时间线按 `seq` 排序展示；`occurred_at` 已纳入冻结契约（B-1/FZ-3），迁移完成前为 null，显示"时间未知"，不伪造历史时间（C9）。
- 对账（reconcile）是状态探测：按 FZ-1 冻结语义，会话存活时保持原状态，仅在无法观测（无绑定/会话丢失/对账失败）时收口为 unknown（见 4.6/6.6；后端待实现）。

### 4.5 审批区域

- 独立路由 `/approvals` 为跨任务队列；任务详情内的审批区为同一数据的上下文视图。
- 审批卡字段（PRD-05 §15）：动作、资源、范围、环境、风险等级、预计成本、有效期、来源；操作：批准/拒绝（拒绝需填原因）。
- 数据源与写入接口均为待实现契约（S10 无审批表；S14 无审批用例）。未接入前，队列页显示空态"审批能力未接入"，不隐藏入口。
- 审批等待期间（P-1 已决议：不新增状态，当前状态机无等待态）：任务详情顶部显示"等待审批"横幅+审批卡引用；Attempt 状态保持后端真实值；用户在此期间可以：查看时间线与已登记证据、关闭窗口（执行继续）、（若 running）发起取消、不做任何会改变验收语义的操作。

### 4.6 `unknown_after_restart` 处理界面

unknown 是一等状态（S5、S8），展示上既不是成功也不是失败（PRD-04 §22）。unknown 卡固定分区：

1. 已知证据：该 Attempt 的完整事件序列（seq+from→to）、最近一次事件高亮、binding 摘要（adapter/session_id/message_id，待实现查询）。
2. 未知原因：无终态证据/无 binding/对账失败，来源对应 S8 与 S13 的三种进入路径，展示时注明。
3. 最近一次事件：seq、from→to。
4. 底层绑定信息：OpenCode session/message 引用，说明"这是证据引用，不是状态来源"。
5. 三个操作：
   - 对账：调 `POST .../reconcile`（已实现，S1）。必须在卡上明示后果（FZ-1 冻结语义）："对账是一次状态探测——只有拿到终态证据才会改变状态并收口；会话仍在运行或仍无法观测时状态不变、不产生新事件"。禁止把对账当刷新按钮反复点。
   - 重新执行：创建新 Attempt（现有派发接口即可实现，attempt_no+1、新幂等键，9.6 节），旧 Attempt 与 unknown 卡保留。
   - 人工标记结果：把 unknown 收口为成功/失败/取消。domain 状态机允许（`mark_succeeded/mark_failed/mark_cancelled` 从 unknown 可达，S5），但无 API（Q3）——按待实现契约设计，按钮禁用并标注"接口待实现"。

unknown 卡同时出现在工作台"需要你处理"区和任务详情，点击互跳。

## 5. 状态模型与数据映射

### 5.1 枚举映射（唯一文案来源）

Task：`proposed` 待开始 / `ready` 待执行 / `in_progress` 执行中 / `awaiting_review` 等待验收 / `completed` 已完成 / `blocked` 已阻塞 / `cancelled` 已取消 / `failed` 失败（S6；不含 C2 列出的四个文档状态）。
Attempt：见 4.4 表（S5）。
wire 名称以 `crates/domain/src/lib.rs:334-343` 的 snake_case 为准；前端解析遇到未知字符串一律落入"未识别状态"显示原文并标记告警，不猜测映射。

### 5.2 视图模型（前端自有类型，不直接复用后端 DTO）

```text
TaskView      { task_id, title?, status, owner_id?, acceptance: AcceptanceView,
                current_attempt: Option<AttemptView>, attempt_count, last_seq }
AttemptView   { attempt_id, task_id, attempt_no, status, events: Vec<EventView>,
                binding: Option<BindingView>, terminal: bool }
EventView     { seq, event_type, from?, to?, source }        // S11 payload
BindingView   { adapter, session_id, message_id? }           // S10 attempt_binding
ApprovalView  { approval_id, action, resource, scope, risk, est_cost, ttl, decision? } // 待实现
CostView      { limit, reserved, spent, remaining }          // 待实现（PRD-05 §5）
SideEffectView{ id, action, target, reversible, compensation? } // 待实现
```

映射规则为纯函数（`view-model` 模块，无 Yew 依赖，可单测）：未知枚举值→未识别态；`terminal = status ∈ {cancelled, succeeded, failed, unknown_after_restart}`（unknown 视为"需要人工的准终态"，仍可被对账/人工收口，S5/S8）。

### 5.3 页面状态模型

- 每个数据区域用统一四态包装：`Loadable<T> = Loading | Ready(T) | Failed(AppError) | Empty`，另有 `Stale(T)`（展示旧值同时提示刷新中，见 9.3）。空态与加载态区分：Empty 仅在"查询成功且无数据"时出现。
- 全局 Store：单实例 `AppStore`，内含 `tasks: BTreeMap<TaskId, TaskView>`、`attempts: BTreeMap<AttemptId, AttemptView>`（事件按 seq 有序）、`approvals/costs/side_effects`（待实现数据槽）、`connection: ConnectionState`、`pending_writes: Map<IdempotencyKey, WriteState>`。纯 Rust 结构+reducer，Yew 组件通过 context 订阅切片；reducer 不做 IO，副作用全部走 `ApiClient` 命令层。
- 乐观更新的边界：只允许"按钮禁用/提交中"这类无语义风险的乐观态；状态本身永远以后端返回和事件为准（unknown/取消竞态语义决定不可乐观写状态）。

### 5.4 事件合并规则

收到事件（按 seq 升序、去重键 `(source, source_event_id)`，客户端再防一次，S12）：
1. `seq <= 已有最大 seq` 且已存在 → 丢弃；
2. `status_changed` → 更新 AttemptView.status 与时间线；
3. 断档（收到 seq > max+1）→ 该 Attempt 标记 `gap`，时间线插入"存在缺口"分隔条，触发按游标补拉（6.5）；缺口未补齐前不渲染推断状态。

## 6. API 使用与契约

### 6.1 已实现接口（以源码为准）

**GET /health** → 200 `{ "healthy": true }`（`main.rs:117-119`）。可达即 healthy，无更多诊断字段。

**POST /api/tasks/{task_id}/attempts**
请求（`main.rs:26-33`）：

```json
{
  "attempt_id": "客户端生成 UUID",
  "attempt_no": 1,
  "idempotency_key": "客户端幂等键",
  "request_hash": "请求体摘要",
  "directory": "C:\\path\\to\\project 或 null",
  "input": "任务输入文本"
}
```

响应：201 `{attempt_id, status:"running", event_seq, reused:false}`；幂等复用 200 `{attempt_id, status:<当前态>, event_seq:null, reused:true}`（S3）。`status` 取值域为 S5 枚举。
错误：400 解析失败、409 幂等冲突/`MissingBinding`、500 持久化/`MissingAttempt`、502 OpenCode 执行失败（S4）。502 时后端已把 Attempt 落为 `failed`（S9）。

**POST /api/tasks/{task_id}/attempts/{attempt_id}/reconcile**
无请求体 → 200 `{attempt_id, status, event_seq}`；`event_seq=null` 表示状态未变化（终态原样返回或无证据可写，S8）。

### 6.2 接口契约（已冻结 2026-09-03）

冻结依据：《前端契约确认清单 2026-09-02》第 2/4 节结论 + 《前端契约审查报告 2026-09-03》决议 FZ-1~FZ-P1。除 §6.1 三个已实现接口外，本节全部接口均为【待实现】。现状基准：路由仅 `GET /health`、`POST /api/tasks/{task_id}/attempts`、`POST /api/tasks/{task_id}/attempts/{attempt_id}/reconcile`（`apps/local-service/src/main.rs:106-115`）。实现前不得按已存在接口编码。

通用约定：

1. **错误体**：统一 `{ "error": string }`；状态码沿用现有映射（409 幂等冲突/非法状态/无 binding、502 执行失败、500 存储，`apps/local-service/src/main.rs:208-229`），并扩展 400 参数、404 不存在/归属不符、401/403 传输层。
2. **幂等键与 request_hash**：派发接口二者的确定口径为 `SHA-256(UTF-8(task_id + U+001F + 十进制 attempt_no + U+001F + input + U+001F + directory))`，空 directory 用空串（B-5；服务端仅做相等比较，`crates/application/src/lib.rs:76-77`）。非派发写接口（cancel/resolve/complete/plan）的 `request_hash` = 对排除 `idempotency_key` 和 `request_hash` 后的规范化请求体做 SHA-256：对象键排序、无空白、数组顺序保留（FZ-5）。
3. **事件游标（FZ-3）**：`confirmed_seq` = 该 Attempt 聚合在 `event_ledger` 中的最大 seq（服务端权威水位）；`next_cursor` = 本页最后一条事件的 seq，无更多数据时为 null；`limit` 默认 100、上限 500。`event_cursor` 表仅服务 OpenCode 外部事件续传（`crates/reconciliation/src/lib.rs:54-57`、`:100-108`），前端不消费。查询不推进任何游标、不触发 reconcile。
4. **能力未接入（FZ-6）**：统一返回 HTTP 200 `{ "available": false, "reason": "not_implemented", "items": [], "next_cursor": null }`；前端以 `available` 判别并走"能力未接入"空态，`items` 空数组不得渲染为"无数据"。
5. **传输（FZ-9）**：`GET /api/service-info` 为能力发现权威，`/health` 仅表示存活+可选诊断（B-7）；生产使用 `Authorization: Bearer <manifest 令牌>` + 受限 CORS 白名单；开发模式通过明确的环境变量开启（变量名由后端实现时确定并回写），禁止通配来源。

| 契约 | 方法与路径 | 请求 → 响应 | 错误 | 备注 |
|---|---|---|---|---|
| 创建 Task【待实现】 | `POST /api/tasks` | `{idempotency_key,goal,acceptance_criteria[],owner_id,mode:"agent"\|"ceo"}` → 201 `{task_id,status,event_seq,reused:false}`；同键 200 `{…,event_seq:null,reused:true}` | 400/409/500 | P-3/P-4；`goal` 为任务目标文本，`mode` 仅取 agent/ceo（FZ-P1）；FZ-8：创建用例内自动完成 proposed→ready |
| Task 列表【待实现】 | `GET /api/tasks?status=&owner=&limit=&offset=` | → `{items:[{task_id,goal,status,owner_id,current_attempt_no?,current_attempt_status?,last_seq,updated_at?}],next_offset,ordering}`（FZ-4）；时间戳迁移完成前 `updated_at` 为 null、`ordering:"creation"`，排序一律读 `ordering`；`next_offset` 末页为 null | 400/500 | C-2 |
| Task 详情【待实现】 | `GET /api/tasks/{task_id}` | → `{task_id,goal,status,owner_id,acceptance_criteria[],attempts:[{attempt_id,attempt_no,status,last_seq}],last_seq,updated_at?}` | 404/500 | 清单第 3 条 |
| Attempt 列表【待实现】 | `GET /api/tasks/{task_id}/attempts` | → `{items:[{attempt_id,attempt_no,status,last_seq}],next_cursor}`，`attempt_no` 倒序 | 404/500 | `UNIQUE(task_id,attempt_no)`（`crates/persistence/src/lib.rs:57`） |
| 事件查询【待实现】 | `GET /api/tasks/{task_id}/attempts/{attempt_id}/events?after_seq=&limit=&source=` | → `{events:[{seq,event_type,source,source_event_id?,payload,occurred_at?}],next_cursor,confirmed_seq}`；seq 升序，`after_seq=0` 全量；`limit` 默认 100、上限 500；`source` ∈ `magic`/`opencode-v1`；`occurred_at` 迁移完成前为 null（显示"时间未知"） | 400/404/500 | B-1/FZ-3；游标口径见通用约定 3 |
| Binding 查询【待实现】 | `GET /api/attempts/{attempt_id}/binding` | → 200 `{attempt_id,adapter,session_id,message_id}`，`message_id` 可空 | 404/500 | 与 `crates/persistence/src/lib.rs:304-326` 查询一致；仅证据引用，非状态来源 |
| 取消【待实现】 | `POST /api/tasks/{task_id}/attempts/{attempt_id}/cancel` | `{idempotency_key,request_hash}` → 202 `{attempt_id,status:"cancelling",event_seq,reused:false}`；同键重放 200 `reused:true`；终态调用 200 `{attempt_id,status:<终态>,event_seq:null,reused:true}` 且不新增事件（FZ-7） | 400/404/409（幂等冲突/非法状态/无 binding）/502/500 | 仅 `running` 可发起，`created/admitted/cancelling/unknown_after_restart` 一律 409（FZ-7；domain `crates/domain/src/lib.rs:83-89`）；先写 `cancelling` 再调 `ExecutionPort::cancel`（`crates/execution-port/src/lib.rs:55`）；取消竞态仍可能以 succeeded 收口（`crates/domain/src/lib.rs:288-296`）；超时不自动重试 |
| 人工收口【待实现】 | `POST /api/tasks/{task_id}/attempts/{attempt_id}/resolve` | `{idempotency_key,result:"succeeded"\|"failed"\|"cancelled",reason,evidence_refs[]}` → 200 `{attempt_id,status,event_seq,reused}`；产生 `attempt.status_changed` 事件，payload 含审计字段（C-1） | 400/404/409（非 unknown/证据为空/幂等冲突）/500 | 仅 `unknown_after_restart` 可调；与 domain 迁移一致（`crates/domain/src/lib.rs:91-120`） |
| Plan【待实现】 | `GET`/`PUT /api/tasks/{task_id}/plan` | GET → `{version,steps[]}`（无计划 `{version:0,steps:[]}`）；PUT `{idempotency_key,version,steps[]}` → `{task_id,version,steps,event_seq,reused}` | 400/404/409（版本/幂等）/500 | 清单第 9 条；无表无用例，前端先空态占位 |
| 审批【待实现】 | `GET /api/approvals?status=&task_id=&limit=&cursor=`；`POST /api/approvals/{id}/decision` | GET → `{items,next_cursor}`（字段按 §4.5）；decision `{idempotency_key,decision,reason?}` → `{approval_id,status,event_seq,reused}` | 400/404/409/500 | P-1：审批不新增 Attempt 状态，`running`+审批卡；字段保持现方案（FZ-P1） |
| 验收收口【待实现】 | `POST /api/tasks/{task_id}/complete` | `{idempotency_key,evidence_refs[]}` → 200 `{task_id,status:"completed",event_seq,reused}` | 400/404/409（状态/证据/幂等）/500 | 严格对应 `complete(true)`（`crates/domain/src/lib.rs:216-222`）；仅 `awaiting_review` 且证据齐全 |
| 产物/Diff/测试证据【待实现】 | `GET /api/tasks/{task_id}/artifacts`、`/changesets`、`/test-evidence?limit=&cursor=` | 已接入 → `{items,next_cursor}`；未接入 → FZ-6 统一形态 | 404/500 | 通用约定 4 |
| 成本【待实现】 | `GET /api/tasks/{task_id}/cost` | 已接入 → `{available:true,limit,reserved,spent,remaining,currency,source}`；未接入 → FZ-6 统一形态，不返回伪造零值 | 404/500 | PRD-05 §5 |
| 副作用【待实现】 | `GET /api/tasks/{task_id}/side-effects?limit=&cursor=` | 已接入 → `{items,next_cursor}`，items 含 `action,target,reversible,compensation,status,occurred_at`；未接入 → FZ-6 统一形态 | 404/500 | PRD-05 §7；取消/失败不回滚已发生副作用 |
| 服务发现【待实现】 | manifest 下发基址+令牌；`GET /api/service-info` | → `{protocol_version,instance_id,capabilities,worker}` | 401/403/500 | FZ-9；绝不返回令牌；`/health` 保持 `{healthy:true}`+可选诊断字段 |

补充约定：

- **重试/再次执行不设独立接口**：前端以 `attempt_no+1` + 新派生键调用已实现派发接口（§6.1；唯一约束天然支持，`crates/persistence/src/lib.rs:57-58`）；`unknown` 不自动重派，必须用户显式操作（C-3）。
- **Task 状态推进（FZ-8）**：由服务端用例自动推进——创建→proposed、准备（owner 与验收标准齐备，V1 在创建用例内完成）→ready、派发→in_progress、Attempt 落 succeeded→awaiting_review、验收完成→completed；不提供直接改状态 API，前端永不调用，Task 状态一律以响应与事件为准。
- **对账与 Worker 语义（FZ-1，后端语义变更，待实现）**：Recovery Worker 周期只补拉 history，不因缺少终态证据把正常运行中的 Attempt 改成 unknown；状态探测仅在服务启动恢复或用户明确点击对账时执行；观测语义为 Running/Terminal/Unknown，有 binding 且会话存活返回 Running 并保持原状态（FZ-2：正常运行中的任务不得显示"状态未知"）。该决议实现前，现源码行为仍为"周期对账无终态证据即落 unknown"（`crates/application/src/lib.rs:222-240`、`crates/reconciliation/src/lib.rs:114-142`）；前端按冻结语义设计，联调前以 mock 契约测试覆盖（第 14 节第 3 条）。
- **对账与 Worker 语义补充（FZ-1.1，2026-09-03 实弹联调裁定，待实现）**：FZ-1 禁止的是"无证据打 unknown"，不禁止正向收口——Worker 入账后，若已入账事件中含绑定活跃 Attempt 的终态证据，应据此收口为 succeeded/failed/cancelled（不需要用户点对账，也不算周期探测）；unknown 三进入路径不变。依据：实弹测试中 OpenCode 完成执行、223 条事件已入账，但 Attempt 因无人探测而永远停在 running。

### 6.3 页面 ↔ 接口依赖矩阵

| 页面/区域 | 已实现依赖 | 待实现依赖 |
|---|---|---|
| 全局状态带 | `/health` | 服务信息（令牌/CORS） |
| 工作台 | —（无数据可用时的骨架） | Task 列表、审批队列、unknown 汇总（可由 Task 列表推导） |
| 任务列表 | — | Task 列表 |
| 任务详情·目标/责任人 | — | Task 详情/创建 |
| 任务详情·当前 Attempt 操作 | 派发、reconcile | 取消、人工收口、binding |
| Attempt 时间线 | — | 事件查询、binding |
| 产物/Diff/证据、成本、权限、副作用 | — | 对应查询契约 |
| 审批区域 | — | 审批契约 |
| unknown 卡 | reconcile（对账）、派发（重新执行） | binding、人工收口 |
| 验收 | — | 验收收口、证据查询 |

### 6.4 幂等键使用方式

- 所有会触发执行的写请求（派发、取消、审批决定、人工收口）必须携带客户端幂等键（S2 模式；后端方案 §6 原则）。
- 键生成：`idempotency_key = UUIDv4()`，在"一次用户意图"生命周期内不变：网络超时、5xx、连接中断后的重发使用同一键与同一请求体；用户显式修改内容则视为新意图、生成新键。
- 崩溃恢复：进程重启后内存键丢失。约定派发键为确定性派生 `hash(task_id | attempt_no | input | directory)`（B-5/FZ-5 冻结口径）——同键同请求体在服务端命中唯一约束并复用既有 Attempt（S3），因此重启后重发安全，无需前端持久化存储。
- `attempt_no` 取当前任务已有 Attempt 最大值+1，来源于 Attempt 列表查询【待实现】；列表不可得时禁用派发按钮而不是猜序号，避免 `UNIQUE(task_id, attempt_no)` 冲突（S2）。
- `request_hash`（B-5/FZ-5 冻结口径）：派发为 `SHA-256(UTF-8(task_id ␟ attempt_no ␟ input ␟ directory))`（与派发键同口径，空 directory 用空串）；非派发写接口对排除 `idempotency_key` 与 `request_hash` 后的规范化请求体做 SHA-256（对象键排序、无空白、数组顺序保留）。同键不同体服务端返回 409（S4），前端渲染幂等冲突卡，提供"查看已有 Attempt/放弃本次"两个动作，禁止静默重试。
- 收到 `reused:true`（200）表示该键已被消费：将响应中的 attempt_id 与状态并入 Store，继续观察，不视为错误。

### 6.5 事件序号与游标使用方式（FZ-3 冻结口径）

- `confirmed_seq` = 服务端该 Attempt 聚合在 `event_ledger` 中的最大 seq（服务端权威水位）；`next_cursor` = 本页最后一条事件的 seq，无更多数据时为 null。`event_cursor` 表仅服务 OpenCode 外部事件续传，前端不消费（2026-09-03 冻结修订，替换原"对齐 event_cursor"表述）。
- 每个 Attempt 维护 `last_seq`（内存）；拉取一律 `?after_seq=last_seq&limit=`（默认 100、上限 500），响应按 seq 升序，客户端按 5.4 合并；`next_cursor` 非空时回写 `last_seq`；`last_seq == confirmed_seq` 即视为追平。
- 断线/重启恢复：以服务端 `confirmed_seq` 为权威水位重新拉取，客户端不持久化事件数据本身（第 8 节）。
- 游标只前进；发现服务端 `confirmed_seq` 小于本地 `last_seq`（服务重建库）→ 清空本地该聚合缓存全量重拉，并提示"检测到事件账本重建"。

### 6.6 轮询策略（V1 无 SSE；2026-09-03 按 FZ-1/FZ-2 冻结修订）

- 数据轮询只允许 GET 查询类接口；**严禁轮询 reconcile**——对账是状态探测动作（会话不存活时会把 Attempt 收口为 unknown），且 FZ-1/FZ-2 规定状态探测只发生在服务启动恢复与用户明确点击时（原"对运行中调 reconcile 会直接打成 unknown"的源码行为已由 FZ-1 决议移除，后端待实现，见 6.2 注记）。
- 活跃 Attempt（admitted/running/cancelling）：2s 基础间隔，±20% 抖动；连续失败指数退避 2s→4s→…→30s 封顶；到达终态或 unknown 即停该 Attempt 的轮询。FZ-1 落地后，正常运行中的 Attempt 保持活跃，不会被周期任务改成 unknown。
- 工作台/列表概览：10s；窗口隐藏（Tauri 可见性事件）时降为 30s，恢复可见立即刷一次。
- Reconcile 触发时机（FZ-1/FZ-2 冻结）：服务启动恢复时由服务端自动探测一次（前端如实呈现结果，不重复调用）；unknown 卡上用户点击；应用启动检测到"上次会话有活跃 Attempt"时逐个提示用户选择（不自动批调）；活跃超过 10 分钟显示对账建议横幅——仅建议，不自动调用、不是计时器（FZ-2）。
- 每次响应附 `Stale` 清除与同步水位更新；连续 2 次失败进入 9.3 的断线态。

### 6.7 实时事件订阅的扩展方式

V1 不做实时订阅。扩展点预留：
- 后端在 Magic API 增加 `GET /api/events/stream`（Magic 自己的 SSE，非 OpenCode `/event`）；前端把"轮询执行器"抽象为 `SyncDriver` trait，轮询实现与 SSE 实现可切换；
- OpenCode SSE 信封无 `id:`，不可作续传游标（S18），因此即使将来接入实时流，恢复语义仍是"最后确认 seq + 补拉"，与 6.5 一致；
- 订阅断开→自动回退轮询→按游标补齐，UI 呈现"同步中"，不隐藏内容。

## 7. API Client 设计

```text
crates 内新建（Yew WASM 侧）
api/
  mod.rs        ApiClient：base_url、token 槽、超时、重试判定
  ids.rs        幂等键/attempt_id/request_hash 生成
  dto.rs        6.1/6.2 请求响应结构（serde）
  error.rs      ApiError { Timeout | Network | Status(u16, String) | Decode | Conflict(..) }
```

- 传输：`gloo-net`/`reqwest-wasm` 同类 WASM HTTP 客户端（以 ADR-0003 栈内可用性为准）；所有请求默认超时 10s，写请求 30s（派发含 OpenCode 交互，S9）。
- 重试判定：幂等写可安全重发（同键同体）；非幂等 GET 可重试；`409` 一律不重试，进入冲突处理；`502` 不自动重发（执行已失败并落账，S9），展示失败证据。
- 鉴权与跨源：Q10 已决议（B-4/FZ-9）——走 HTTP + `Authorization: Bearer <manifest 令牌>` + 受限 CORS；开发模式经明确的环境变量开启无令牌本机回退（禁止通配来源，变量名待后端定）；Client 层用 trait 隔离传输通道，页面代码不感知。
- 客户端生成的 `attempt_id` 为 UUIDv4，一次派发尝试内不变。

## 8. 本地缓存设计

- 权威数据只有服务端 SQLite 事件账本；前端缓存全部在内存（WASM 堆），不使用 localStorage/IndexedDB 存业务状态——避免与服务端投影产生第二个"事实源"。
- 缓存结构：第 5.3 节 Store；每 Attempt 事件环形缓冲默认保留最近 200 条，更早数据按需经事件接口按 seq 回拉（不常驻）。
- 打开过的时间线面板、原始事件面板在关闭时释放大对象；路由切走时详情页大字段（Diff 文本等，待实现）不驻留。
- 持久化仅限 UI 偏好（排序选择、窗口尺寸，由 Tauri 侧存储）与"上次会话有无活跃 Attempt"一个布尔标记（用于 9.2 启动提示），不持久化任何业务状态或幂等键（幂等键靠 6.4 确定性派生恢复）。

## 9. 交互行为定义（任务书第五节逐条）

### 9.1 用户关闭窗口
Tauri 关闭窗口只断开 UI，不调用任何取消/派发接口（ADR-0004；Worker 独立存活，S13）。关闭前若存在活跃 Attempt 或 unknown，弹一次确认框告知"执行会在后台继续，窗口关闭不影响"，提供"最小化到托盘/直接关闭"（托盘属 Tauri 侧能力，待实现项）。不弹任何"正在取消"类误导文案。

### 9.2 重新打开应用
启动顺序：读取 manifest 取 API 基址（失败→未连接态，含重试按钮）→ `GET /health` → 并行拉 Task 列表与活跃 Attempt【待实现】→ 对每个上次活跃/当前非终态 Attempt 显示"继续观察 / 对账 / 重新执行"选择条。当前源码缺查询接口（S1），此流程在 6.2 契约落地前只能显示"服务已连接；任务数据接口待接入"的降级首页——如实标注，不伪造列表。

### 9.3 网络断开与恢复
任何请求失败→全局状态带转"重连中"，正在轮询的任务退避（6.6）；已加载数据保留显示并加 `Stale` 徽标，不清空、不显示为实时。恢复探测：`GET /health` 成功→立即按游标补拉活跃聚合→状态带回"已连接"。服务进程重启（游标回退/连接拒绝后恢复）→ 8 节的账本重建检测+全量重拉。

### 9.4 API 超时防重复提交
写请求超时后：请求进入 `pending_writes`，界面显示"提交中（可安全重试）"；重试按钮复用同一幂等键同一请求体（6.4）；收到 201/200 任一即收敛；409 幂等冲突→冲突卡。全程禁止前端生成新键自动重试。

### 9.5 取消的展示
取消仅 `running` 态可用（FZ-7：其余状态一律 409，按钮按 4.4 可用性矩阵禁用并注明原因；收到 409 时按事件重新对齐本地状态，不重试）。点击后立即：按钮转禁用+状态徽标切"取消中"（该徽标只能由后端 `cancelling` 事件确认后渲染，在此之前显示"取消请求发送中"）；终态前不显示"已取消"；终态可能是 cancelled 也可能是 succeeded（S5 取消竞态），按事件如实渲染；若已产生副作用，副作用区保持完整展示（PRD-05 §7）。

### 9.6 重试
仅在 failed/cancelled/unknown（且用户选择"重新执行"）可用；动作=以 `attempt_no+1`+新键派发（6.4），旧 Attempt 原样保留在历史区，时间线独立。成功状态的任务提供"再次执行"，同一机制。派发前弹确认框显示本次输入与预计影响（V1 无预算预估数据，只显示输入）。

### 9.7 审批等待时用户能做什么
见 4.5 末段：观察、取消（若 running）、关闭窗口；不能改验收标准、不能派发新 Attempt（同任务）、不能人工收口。

### 9.8 Task 完成前的验收验证
完成按钮可用条件=Task `awaiting_review` 且证据核对表全绿（S7）；证据数据待实现（Q8）期间按钮永久禁用并注明原因"验收证据接口未接入"。确认框逐条列出：验收标准、产物引用、测试证据、未决副作用、成本；二次确认后调用【待实现】complete 接口。

### 9.9 底层成功但 Magic 验收未完成
Attempt `succeeded` 时：Attempt 区显示"成功"；任务详情顶部固定横幅"执行已结束，等待验收——任务尚未完成"（PRD-04 §20 首行）；Task 状态保持后端值（`in_progress/awaiting_review`），绝不自动跳 `completed`。

### 9.10 服务重启后的未终结 Attempt
按 FZ-1 冻结语义（后端待实现）：Recovery Worker 周期只补拉 history；服务启动恢复时执行一次状态探测；正常运行中的 Attempt 不会被周期任务改成 unknown（FZ-2）。前端职责是如实呈现结果：收口为终态→时间线补事件；转 unknown（仅发生在无法观测：无 binding/会话丢失/对账失败）→unknown 卡入"需要你处理"区。前端不自动派发、不自动改状态、不自动调对账（对账失败禁止静默重派，代码架构基线 §7）。现源码仍为每 30s 周期对账（S13），实现落地前联调需注意该差异。

### 9.11 副作用已发生后的取消/失败
取消/失败不回滚任何记录：副作用卡继续展示全部已发生条目并标注"取消/失败前已发生"（PRD-05 §7）；可逆项提供补偿入口（创建补偿任务，待实现）；不可逆项明示"不可撤销"。该区域数据在副作用契约落地前显示"副作用记录接口未接入"，不得留空冒充"无副作用"。

## 10. Tauri 与 Yew 的边界

- Yew/WASM 只做：渲染、路由、状态、业务校验、HTTP 到本地 API。不触碰文件系统、进程、托盘、窗口策略。
- Tauri Rust 侧提供（均为待实现项，Spike 已验证可行性）：manifest 读取命令（返回 API 基址+令牌）、单实例与窗口生命周期、可选的系统通知（终态/unknown 提醒）、打开产物目录（shell 最小白名单）、UI 偏好存储。
- 安全边界遵循代码架构基线 §5：invoke 白名单+能力配置，渲染层无任意文件/命令权限（ADR-0001 验证门槛 5）。
- 窗口关闭/最小化事件由 Tauri 侧转发给 UI（用于 6.6 的轮询降级），但生命周期决策（是否驻留、显式退出策略）在 Worker/Tauri 侧，不在 UI（ADR-0004 未决项之一）。

## 11. 错误处理与四态规范

- 全局错误分三类：连接错误（服务不可达，全局状态带+全页级提示）、请求错误（按 S4 状态码映射文案：409 幂等冲突/无绑定、502 执行失败、500 内部错误）、数据错误（解码失败/未知枚举/游标回退）。
- 每个数据区域必须实现四态：Loading（骨架，占位尺寸与内容一致防跳动）、Empty（明确"无数据"或"能力未接入"两种文案）、Failed（重试按钮+错误码）、Ready。unknown 是 Ready 的合法值，不是 Failed。
- 错误呈现不阻断其他区域（区域级隔离）；全局仅连接错误和账本重建需要页面级提示。
- 所有 `role=alert` 告警区符合能力 spike 已验证的模式；失败、缺口、超限不可被折叠隐藏（PRD-05 §15）。

## 12. 可访问性与键盘操作

- 基线：能力 spike 已覆盖 `aria-current`、`role=alert`、键盘上下移动（`spikes/rust-ui-capabilities/RESULTS.md`）；扩展为：列表/时间线为 `list/listitem` 语义，状态徽标带文字（不仅颜色），焦点环可见，WebView 缩放跟随系统。
- 键盘表（V1 最小集）：`↑/↓` 列表与时间线移动；`Enter` 打开/展开；`Esc` 关闭弹层/返回列表；`Tab` 按视觉顺序；操作快捷键 `n` 新建任务、`r` 重试（带确认）、`c` 取消（带确认）、`g` 对账（unknown 卡内）；所有快捷键在设置页可查，输入框聚焦时不拦截。
- 弹层（确认框/unknown 收口）打开时焦点移入、关闭时归还；取消中/unknown 等关键状态变化用 `role=alert` 播报。

## 13. 性能与内存约束

初始预算（除标注外均为待 E2E 校准，Spike 空链路数据不能当生产预算）：

| 项 | 约束 | 依据 |
|---|---|---|
| WASM 体积 | 基线 ~311KB + JS ~31KB，业务增量目标 <2MB | ADR-0003:17 |
| 列表渲染 | 虚拟化窗口 50 行；列表项定高 | 能力 spike |
| 时间线 | 单 Attempt 常驻 ≤200 事件；更早回拉 | 第 8 节 |
| 原始 OpenCode 证据 | 折叠面板按需加载，单次 ≤200 条，关闭即释放 | S12、PRD-05 §15 折叠不隐藏原则 |
| 状态刷新 | 定高行+keyed list 就地更新；徽标区预留宽度；不整页重渲染 | 9.3/防跳动 |
| 全局轮询请求 | 空闲 ≤0.2 req/s（隐藏时更低） | 6.6 |
| UI 进程内存 | 目标 <150MB（待测）；已知大头是 OpenCode ~400MB，UI 不是瓶颈 | `spikes/rust-ui-runtime/RESULTS.md`、ADR-0003:35 |
| 首屏 | 服务发现+health+首列表 <1s（本地回环，待测） | 9.2 |
| 长时运行 | 无无界缓存（第 8 节上限）；连续 8h 观察内存曲线列为 E2E 验收 | ADR-0001 验证门槛 |

明确不做：完整 transcript 一次性进内存（永远按需分页）；用持续渲染底层日志换取"实时感"（底层证据只按需展开）。

## 14. 测试策略

对齐代码架构基线 §8，前端补充：

1. 纯逻辑单测（Rust，无 WASM 依赖）：枚举映射与未知值兜底、幂等键/attempt_no 派生、事件合并与缺口检测、游标推进、Loadable 状态机。
2. Store reducer 测试：9.3-9.11 全部交互规则的断言（超时重发同键、409 冲突、取消竞态终态、unknown 三操作可用性矩阵）。
3. API Client 契约测试：以 6.1 真实响应样例（含 201/200/409/502/500）驱动；对【待实现】契约先写 mock 服务测试，后端落地后切换为真服务回归。
4. WASM 组件测试（wasm-bindgen-test）：四态渲染、unknown 卡、键盘导航、ARIA 标记。
5. E2E（真实 local-service + 桩 OpenCode，参照 `crates/execution-opencode-v1/tests/real_opencode.rs` 的真实集成模式）：派发→复用→对账→unknown→重新执行全链路；窗口关闭重开恢复；断网重连补拉。
6. 手工验收脚本：打包后 Windows 实机，覆盖 ADR-0001 验证门槛 4/5 的 UI 部分。

## 15. 当前后端缺口（按前端阻塞度排序）

> 2026-09-03 冻结新增后端实现项：FZ-1 Worker 观测语义改造（周期只补拉 history、启动恢复/用户触发的状态探测、Running/Terminal/Unknown）——需在阶段 1 真实服务联调前落地，否则界面将按决议前源码行为（周期对账打 unknown）失真。原缺口 1-9 保持不变。

1. **查询类**：Task 列表/详情、Attempt 列表、事件查询、binding 查询——没有它们，工作台/列表/详情/时间线四个主界面无数据可用（S1 对比 6.3 矩阵）。
2. **时间戳**：`event_ledger` 无 `occurred_at`（S10/C9），时间线无时间可显示。
3. **取消**：端口有 `cancel`，无用例无路由（S14）。
4. **人工收口**：unknown 人工标记无 API（Q3）。
5. **Task 生命周期**：创建/责任人/验收标准文本/ready→in_progress→awaiting_review→completed 的用例与 API（domain 已有规则 S6/S7，缺应用层与 HTTP 层）。
6. **审批/产物/Diff/测试证据/成本/副作用**：表、用例、API 全缺（S10），前端以空态+待实现标注先行。
7. **传输**：CORS/本地令牌/manifest 下发（S16、Q10）。
8. **Plan Step**：无表无用例（数据库设计 §2 规划）。
9. **contracts**：API 类型目前散在 `main.rs`，前端契约落地时应同步迁入 `crates/contracts`（该 crate 现仅 AttemptView，S16）。

## 16. 不属于 V1 的内容

多人实时协作、复杂组织看板、跨工程成员借调、自动合并冲突、完整原始思维展示、OpenCode 原始界面嵌入、把 OpenCode Session 当任务对象、OpenCode SSE 直连、多工程/多工作区切换界面、成员管理与角色配置界面、事实（Fact）账本界面、预算编辑界面、托盘与系统通知（Tauri 侧能力成熟后单列）、自动重试/自动对账策略、移动端或浏览器生产形态（浏览器仅作渲染层测试模式，桌面选型评审 §2C）。

## 17. 前端开发分阶段顺序

每阶段有独立进入条件与退出验收；阶段 1 起必须与后端契约逐项对齐（第 15 节顺序）。

- **阶段 0 契约与骨架**：冻结 6.2 契约（与后端评审 Q1-Q12）；搭 Tauri+Yew 工程落地 `apps/desktop`（满足其 README 的迁入前提：本地服务契约稳定，S17）；API Client+Store+Loadable；用已实现 3 接口做"派发控制台"最小页（输入→派发→显示 201/复用/错误→unknown 时提示可对账）。退出：契约评审通过（已满足：2026-09-03 契约冻结，见 6.2）；控制台可对真实 local-service 跑通 S3/S4/S8 全部分支。
- **阶段 1 读路径**：Task 列表/详情/工作台（依赖后端缺口 1）；四态与错误规范全量落地。退出：9.2 启动流程、9.9 横幅可演示。
- **阶段 2 执行与恢复**：时间线（事件查询+游标+缺口条）、unknown 卡（对账+重新执行）、9.3/9.4/9.5/9.6/9.10 交互、轮询驱动。退出：E2E 断网/重启/取消竞态场景通过。
- **阶段 3 治理面**：审批队列与卡片、验收收口、产物/Diff/证据/成本/副作用区域（依赖后端缺口 4-6）；取消接口接入。退出：9.7/9.8/9.11 验收通过。
- **阶段 4 质量与交付**：性能预算实测（13 节逐项）、可访问性走查、键盘全覆盖、打包（sidecar/manifest/令牌按 ADR-0004 未决项决议）、8 小时长稳观察。退出：第 14 节全部测试绿+人工脚本通过。
