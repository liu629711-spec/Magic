---
status: active
version: 2.0
date: 2026-09-11
owner: Magic 项目
authority: technical-implementation-reference
dsh: 0.1.5-rc.2 / c291e7961a
---

# DSH 契约面与 AgentCore 能力映射

## 1. 本文定位

本文回答「技术上能接哪些口、AgentCore 哪些能力该迁」，**不定义产品语义**。产品语义以 `docs/01-产品/PRD-01` 至 `PRD-05` 为准。对齐后的仓库快照见 `00-当前基线-DSH-0.1.5.md`。

三条硬约束（对应根目录 `AGENTS.md`）：

1. 不重写 DSH 的 session / tool / agent-loop；
2. 只使用 DSH 文档化的插件扩展点；
3. 所有结论给出项目名、源码路径与行号；未核实的标注「待核查」，不把推测写成结论。

命名：`DSH` = `reference-project/deepseek-harness`；`AgentCore` = `reference-project/AgentCore`；Magic 指本仓 `plugins/`。

---

## 2. DSH 扩展契约面（允许使用的接口）

DSH 自称 "all-plugin Cordis agent harness"（`DSH/AGENTS.md:3`）。官方扩展手册 `DSH/docs/cookbook/extension-cookbook.md` 提供 feature → mechanism 映射表，并承诺该表 **"No row modifies the loop"**。

Magic 使用的扩展点**全部在该表内**：

| 能力 | DSH 机制 | 源码证据 | Magic 使用位置 |
|---|---|---|---|
| 注册工具 | `ctx.tools.register()` | `extension-cookbook.md` | `plugins/magic-ceo/src/index.ts` 的 `ceo_plan` / `ceo_delegate` / `ceo_replan` |
| 注入系统提示 | `ctx.systemPrompt.section()` | 同上 | `magic-ceo`、`magic-work-mode`、`magic-memory` |
| 派发子代理 | `ctx.subagents.startContinuable` / `sendMessage` / `interrupt` | `DSH/packages/subagent/subagent/src/index.ts:228` | `plugins/magic-ceo/src/index.ts:965` 起 |
| 持久化存储 | `ctx.storageDomain` | `DSH/packages/storage/storage-domain/src/index.ts` | `magic-ceo` / `magic-ledger` / `magic-memory` 各开一域 |
| 官方团队服务（可选） | `ctx.agentTeams` | `DSH/packages/experimental/agent-team/src/index.ts:59` | `readAgentTeams` 探测；**生产派活未改道** |
| 前端插槽 | `dsh.client` 双面包 | `DSH/packages/client/modules/src/index.ts` | `plugins/magic-ceo-ui` |

**插件依赖方式**：Magic 插件**不 import 任何 `@deepseek-ai/dsh-*` 包**，用手写结构化类型声明所需 `ctx` 能力，靠 Cordis 注入获取——见 `plugins/magic-ceo/src/index.ts:63` 的 `inject` 与 `apply` 的 ctx 类型。

不 import 的理由（2026-09-11 相对 0.1.5 复核）：

1. 编译期与运行期仍可能不是同一套契约。npm 上 `@deepseek-ai/dsh-session` 仍显示 `0.0.1-rc.1`，本地 checkout 是 `0.1.5-rc.2`。
2. experimental Agent Teams 虽已发 npm（`@deepseek-ai/dsh-experimental-agent-team` = `0.1.5-alpha.2`，五包 `publishConfig.access: public`），但 CLI runtime 闭包只扫 `dependencies` / `peerDependencies`（`DSH/packages/boot/app-boot/src/profile.ts:460-461`），experimental 在 CLI **devDependencies**，按包名挂会在运行期失败。
3. DSH 公共 API 仍标 pre-stable（`DSH/AGENTS.md:5-7`）：改消费者，而不是给自己留 shim。把 npm 版本写进 Magic `package.json` 等于主动引入漂移面。

**禁止事项**：不复制 DSH 源码进 Magic；不 import DSH 内部路径；不做需要改 DSH 源码才能生效的能力。

---

## 3. 兼容性政策与升级护栏

### 3.1 DSH 明文政策（0.1.5 已改口）

旧文档写「`SESSION_FORMAT_VERSION` 停在 0、无兼容承诺」——**对 0.1.5 已不成立**。

现行 `DSH/AGENTS.md:5-7`：

> Public APIs are pre-stable; update every consumer. Session version/status defines the authorities. Adjacent migration may add a version-named successor but never move, overwrite, or delete committed generations.

现行 writer：

- `SESSION_FORMAT_VERSION = 3`（`DSH/packages/core/session/src/types.ts:88`）
- `latestReleasedVersion: 3`，`evidenceTag: dsh-v0.1.5-alpha.1`（`DSH/docs/session-format-status.md:28-30`）

含义：公共 API 仍可改，但**已发布的 Session 数据**要走相邻迁移，不能当一次性草稿丢。Magic 若自己写 session 事件，必须跟 writer=3 对齐；`ignorable` 仍是词汇增长的出口。

### 3.2 当前缺口

DSH 改字段名时，Magic 仍会出现「编译不报错、测试不失败、运行时才炸」：

- 插件用鸭子类型，上游改字段名 TypeScript 不报错；
- `plugins/*/tests/` 只 import 自己的 `../src/*`，**不加载真实 DSH**。

活的契约漂移（已核实，见基线 §4.1）：

| 漂移 | Magic | 官方 0.1.5 | 后果 |
|---|---|---|---|
| 检查器槽 | `slots.inject('details')` + `layout.openDetails/closeDetails`（`magic-ceo-ui/src/client/register.ts:254,300-308`） | `ILayout` 只有 `openRightbar/closeRightbar`（`ui-layout/src/client/service.ts:28-51`）；根槽无 `details`（`ui-layout/src/client/index.ts:151-155`）。CodeGraph：`openDetails` 生产符号 0 命中 | 点节点打开工作区会打空方法 |
| 官方消息口 | `AgentTeamsPort.sendMessage` 带 `delivery: 'quiet'\|'wakeup'`（`magic-ceo/src/index.ts:699-701`） | `SendTeamMessageRequest = { target, content, signal }`（`agent-team/src/types.ts:159-163`） | 探测仍通过（只查函数是否存在）；真改道会按错形状发 |
| 服务键 `ctx.agent` | Magic 未 inject | `Context` 只声明 `agents`（`core/agent/src/index.ts:26-29`） | 当前无影响。提示词仍可读 `AssembleContext.agent`（`runtime-types.ts:19-21`，`dispatch.ts:174-175`） |

### 3.3 升级护栏

1. **契约收窄**：新增能力前先查 `extension-cookbook.md` 是否有对应行；没有对应行的视为「在动底座」，不做。
2. **升级冒烟**：在锁定 DSH checkout 上跑一次真实加载。静态测试与 `--dump-config` 都发现不了 `inject` / `effect` / `tools.register` 的运行期语义。
3. **基线文档**：底座升级后先改 `00-当前基线-DSH-0.1.5.md`，再改本文。

### 3.4 已知脆弱点（登记为待迁移）

`plugins/magic-ceo/src/journal.ts` 与 `plugins/magic-work-mode/src/persist.ts` 通过临时替换全局 `Object.freeze`，在 DSH 冻结事件对象之前注入 `ignorable: true`。

- DSH 侧：`ignorable` 是给外部插件的词汇增长出口；
- `session.append` 没有给外部事件留第三个参数入口，所以目前只能这样注入；
- 风险：依赖「DSH 内部会调用 `Object.freeze`」这一实现细节。
- 处置：**暂保留**，登记为待迁移点。

---

## 4. AgentCore 能力映射清单

AgentCore 是自带执行引擎的完整独立产品，**不是 Magic 的生产运行层**。引擎部分与 DSH 大量重复，不迁移；只迁移「引擎之上的产品能力」，在 DSH 插件层重建。

> 迁移策略是**重做**，不是**搬运**。

### 4.1 不迁移（DSH 已覆盖）

会话、工具循环、上下文、模型接入、API、数据库、可观测——对应 AgentCore 的 `core/`、`llm/`、`api/`、`db/`、`middleware/`、`observability/`。
**差距为零，且 Magic 规则禁止自建。**

官方 0.1.5 额外覆盖了「可续派子代理 + 实验性 Agent Teams」。Magic 的 CEO **仍然**用 `ctx.subagents`；官方 Teams 只挂服务与面板，见 `04-官方agent-team集成方案.md`。

### 4.2 V1 核心能力（相对 AgentCore）

| 能力域 | AgentCore 源码证据 | DSH 承载机制 | Magic 落点 | 现状（0.1.5 对齐后） |
|---|---|---|---|---|
| 编排与调度 | `runtime/delegate/`、`runtime/coordination/`、`runtime/runs/` | `ctx.subagents`；可选 `ctx.agentTeams` | `plugins/magic-ceo`（`wave.ts` / `index.ts`） | 已有波次调度；派活未改道官方 |
| 交付契约与验收账本 | `tools/builtin/delegate/schema.py`、`runtime/evidence_ledger.py`、`runtime/runs/file_acceptance.py` | `ctx.tools` + `ctx.storageDomain` | `plugins/magic-ledger` | **已挂载**；CEO 用 `ctx.get('magicLedger')` |
| 状态持久化 | `runtime/journal/`、`runtime/leases/` | `ctx.storageDomain` | `magic-ceo` 的 `store/` | **已接线** `magic_ceo` 域 |
| 记忆 | `memory/` | `ctx.systemPrompt.section` + 工具 + storage | `plugins/magic-memory` | **已挂载**（首切片） |
| 统一检索（consult） | `tools/builtin/consult.py` | skill 注册 + `inject()` | `magic-consult` | **未建** |

### 4.3 后续（不在当前产品范围）

| 能力域 | 备注 |
|---|---|
| 文件夹与多工作区 | `ctx.workspaceRegistry` 底座已有；产品语义与「工程」重叠，随 PRD-03 |
| 笔记墙 / 看板 / 辩论 / Playbook | 后置；第一版范围确认明确不做 |
| 工程组织 | PRD-03 暂缓；`magic-engineering` 不进 patch |
| 成本配额 / 可观测回放 | 后置；V1 只做 token 计量展示 |

官方 Agent Teams **不是**这些后置能力的替代。它提供名册、信箱、任务板、恢复；不提供账本、记忆、工作方式、CEO 波次或画布。

### 4.4 可参考、不可当依赖的包

| 包 | 来源 | 作用 |
|---|---|---|
| `packages/graph-layout` 等 | AgentCore | 布局 / 事件折叠，源码级参考 |
| `packages/experimental/agent-team` | DSH | 官方团队服务。experimental，无支持承诺；Magic 路径挂载服务 + 面板，不 import |

---

## 5. 依赖顺序（不能乱）

已经落地的顺序：存储域 → 账本闭环 → 记忆首切片 → 官方 Teams **服务/面板**挂载。

还没做、且必须先裁定的：

1. 检查器迁到 `rightbar` 还是画布内面板（官方删了 `details` / `openDetails`）。
2. CEO 派活是否改道 `spawnTeammate` / 官方 mailbox（官方成员创建后不可变；`sendMessage` 无 `delivery`）。
3. `magic-consult`。
4. 升级体检从静态升到真实加载。

每一步仍以「跑通一个真实交付闭环」为验收，不以插件数量为准。

---

## 6. 结论等级

- **【已核实】**：§2 扩展点与不 import 的理由；§3.1 Session writer=3；§3.2 两处活漂移（details / AgentTeamsPort）；§4.2 账本、记忆、存储已挂载；官方 Teams 调用链（CodeGraph：`spawnTeammate` 生产调用方是 `tool-agent-team`，Magic 不是）。
- **【待用户裁定】**：检查器交互；派活是否改道官方服务。
- **【待技术核查】**：`ignorable` 注入的官方替代机制；`waitForChange` 能否覆盖 `waitForChildTurn`；契约体检何时覆盖路径存在性。

## 7. 相关文档

- `00-当前基线-DSH-0.1.5.md` — 对齐快照。
- `02-V1并行开发计划.md` — 工作流历史与剩余项。
- `03-插件契约内核.md` — 插件接口冻结件。
- `04-官方agent-team集成方案.md` — 形态 A'。
