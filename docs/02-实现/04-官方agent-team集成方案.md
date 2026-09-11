---
status: active
version: 2.0
date: 2026-09-11
owner: Magic 项目
authority: implementation-plan
dsh: 0.1.5-rc.2 / c291e7961a
---

# 04 官方 Agent Teams 集成方案

> 本文回答：**Magic 用官方 `experimental/agent-team` 当地基，接到哪一层、为什么不挂官方工具。**
> 仓库快照见 `00-当前基线-DSH-0.1.5.md`。v2.0 相对 DSH 0.1.5-rc.2 更正了「experimental 全 private / 未发布 / 本地 0.1.2」等过时陈述，并补上 UI 槽位漂移。

## 1. 决策（已定：形态 A'）

**官方当引擎，Magic 当方向盘。**

- **挂**：官方**服务** `agent-team`（名册 / 持久信箱 / 任务板 / 崩溃恢复）+ 官方**面板** `ui-agent-team`。
- **不挂**：官方**工具** `tool-agent-team`。
- 官方服务层一行不改；模型可见入口由 Magic 提供（`ceo_*`）。

**为什么这么切**：官方工具只是薄适配器（`tool-agent-team/src/index.ts` 的 `send_message` 转发 `ctx.agentTeams.sendMessage`）。挂不挂工具，只决定「模型能不能自己按到按钮」，不改变服务能力。挂工具的代价是全局的，见 §6。

**现状（不要读成已经改道）**：Magic CEO 生产派活仍是 `ctx.subagents.startContinuable` / `sendMessage` / `interrupt`（`plugins/magic-ceo/src/index.ts:965`）。`readAgentTeams` 只探测 `ctx.get('agentTeams')`，不写进 `inject`。官方服务在场时日志打 `available`，缺席时 `delegation stays on dsh subagents`。

## 2. 挂载证据【已核实】

### 2.1 配置层

`patches/web.patch.yml` 按路径 insert：

```
- id: agent-team
  name: ../reference-project/deepseek-harness/packages/experimental/agent-team/lib/index.js
- id: ui-agent-team
  name: ../reference-project/deepseek-harness/packages/experimental/client-ui-agent-team/lib/index.js
- id: magic-work-mode / magic-ledger / magic-memory / magic-ceo / magic-ceo-ui
```

`tool-agent-team` 不在树中。`magic-engineering` 不在树中。

相对路径由 `anchorInsertedPluginNames` 转成 `file://`（`DSH/packages/boot/app-boot/src/index.ts`）。`--dump-config` 只算配置、不 import 包（`DSH/apps/cli/src/args.ts`）——能预检插入顺序，**查不出包解析失败**。

### 2.2 为什么仍用路径、不用官方 profile

0.1.5 起五包 Agent Teams 已 `publishConfig.access: public`（`DSH/packages/experimental/README.md`：packages are private by default; the five Agent Teams packages are published opt-in exceptions）。npm 抽查：`@deepseek-ai/dsh-experimental-agent-team` = `0.1.5-alpha.2`。

这**没有**让 `--patch` 能按包名挂：

1. CLI 把 experimental 放在 **devDependencies**（`workspace:^`），不在 `dependencies`。
2. `profileDependencyNames` 只返回 `dependencies` + `peerDependencies`（`DSH/packages/boot/app-boot/src/profile.ts:460-461`）。
3. `healProfilesModuleFallback` 只给 install-anchor 闭包和 **profile.layers 的 bundle** 建链接（同文件 `:547-619`）。`--patch` 不产生 bundle 层。

按包名挂 ⇒ 运行期 `Cannot find package`。

官方 `agent-team-profile` 还会 **insert `tool-agent-team`**（`DSH/packages/experimental/agent-team-profile/cordis.patch.yml:23-37`）。Magic 若改用官方 profile「顺便升级」，等于放弃 A'。所以继续路径挂载服务 + 面板。

`lib/` 被 gitignore。当前 git checkout 上的 `agent-team/lib` 与 `client-ui-agent-team/lib` 是拷入的构建产物，不是 `pnpm run build` 在本机编出来的。正式做法是在 DSH checkout 里 `pnpm run build`。`apps/cli/lib` 仍缺，启动走 `pnpm dsh`（tsx 源码入口）。

## 3. 官方 Agent Teams 是什么【已核实】

**六个相关包**（`DSH/packages/experimental/`）：

| 包 | 作用 | Magic 是否挂 |
|---|---|---|
| `agent-team` | `ctx.agentTeams`：名册、信箱、任务 DAG | 挂（路径） |
| `tool-agent-team` | 模型可见的 Team 工具 | **不挂** |
| `client-ui-agent-team` | 会话头部面板 | 挂（路径） |
| `agent-team-profile` | host profile，会同时挂工具 | **不用** |
| `agent-team-web-profile` | web profile 层 | **不用** |

**对外服务** `TeamService`（`agent-team/src/index.ts:59`，CodeGraph 命中同一符号）：

```
spawnTeammate(caller, request) :153
sendMessage(caller, request)   :163
createTask / getTask / listTasks / updateTask
waitForChange(caller, timeoutMs, signal)
interrupt(caller, targetName)
Remote: remoteView / remoteCreateTask / remoteUpdateTask
```

**请求契约**（`agent-team/src/types.ts`）：

- `SpawnTeammateRequest`：`name / description / prompt / context('fresh'|'fork') / provider / signal`（`:144-151`）
- `SendTeamMessageRequest`：`target / content / signal`（`:159-163`）—— **没有 `delivery`**
- 成员创建后 name / description / context 不可变

**持久化**：写进 Lead Session 的事件日志，不是 `ctx.storageDomain`。

**UI**：slot `conversation.session.header.actions`（`client-ui-agent-team/src/client/mount.ts:66-74`），依赖 `remote.agentTeams`。

CodeGraph：`spawnTeammate` 的生产调用方是 `tool-agent-team` 的 `install`（`tool-agent-team/src/index.ts:159`）和官方测试。Magic 不是调用方。官方 `roster.spawnAdmitted` 自己再调 `ctx.subagents.startContinuable`。

## 4. 冲突定性

| 层 | 是否有冲突 | 事实 |
|---|---|---|
| **服务层** | 不冲突 | `TeamService` 与 Magic CEO 都站在 `ctx.subagents` 之上；各 provide 各的 |
| **工具层** | A' 下无冲突 | 不挂 `tool-agent-team`，模型可见面仍是 Magic 的 `ceo_*` |
| **config 层** | A' 下无需关原生工具 | 本 web profile 下 `tool-subagent-control` 等已被 `@deepseek-ai/dsh-web-app` 关掉 |
| **UI 层** | **有活漂移** | Magic 挂 `details` + `openDetails`；官方根槽是 `rightbar`。见 §7 |

官方 host profile 里「先关原生、再挂工具」针对的是 `dsh-base`（原生工具开启的 profile）。换 profile 时需重新核实。

## 5. 混合架构

### 5.1 分工

- **官方管运行态可靠性**：名册、消息投递、任务板版本号、崩溃对账。
- **Magic 管产品能力**：工作方式、波次调度、交付契约与验收、团队图、记忆。

### 5.2 能力归属（计划，不是现状）

| 能力 | 现状 | 接入后（计划，需裁定） |
|---|---|---|
| 成员名册 / 驻留 | `residency.ts` + `magic_ceo` 域 | 可收窄 → `spawnTeammate` / `listMembers` |
| 消息 / 续派 | `ctx.subagents.sendMessage` | 可改用官方 mailbox（无 `delivery` 字段） |
| 任务账本 | `plan.ts` + `journal.ts` | 任务真相源可交官方 task board；Magic 留波次元数据 |
| 波次调度 | `wave.ts` | **保留** |
| 交付判定 | `delivery.ts` + `magic-ledger` | **保留** |
| 团队图 | `magic-ceo-ui` | **保留**；检查器槽位必须先改 |
| 记忆 | `magic-memory` | **保留** |

> 退役 `residency` 前必须证明官方 `waitForChange`（等团队域变化）能覆盖 Magic 的 `waitForChildTurn`（等成员回合结束）。两者不等价。**待技术核查。**

### 5.3 状态归属

- **官方**：团队运行态 → Lead Session 事件日志。
- **Magic**：产品态（计划、波次、token、ledger 引用）→ `magic_ceo` 域。
- 不重叠：Magic 从官方读团队态（改道之后），从自己的域读产品态。

## 6. 为什么是 A'（而非 B / C）

| 形态 | 做法 | 判定 |
|---|---|---|
| **A' 产品外壳** | 只挂服务 + 面板，不挂官方工具 | **采用** |
| B 双工具并存 | 官方工具 + `ceo_*` 都开 | 模型要在两套入口里选；普通会话也被塞进 Team 工具 |
| C 官方为主 | 用官方工具，退役 `ceo_delegate` | 波次与验收失去入口 |

**官方工具是全局的**（选 A' 的决定性依据）：

1. 安装门槛：`if (installed.has(agent) || ctx.agentTeams.tryMembership(agent) === undefined) return`（`tool-agent-team/src/index.ts:397-399`）。
2. 无 parent 的顶层会话，`tryMembership` 默认返回 `{ role: 'lead' }`（`agent-team/src/roster.ts:92-115`）。

两者相乘 ⇒ 挂上官方工具后，随便开一个会话也会拿到 Team 工具。官方插件没有「只在 CEO 模式下装」的开关。

官方面板只能看和管任务：Remote 是 `view` / `createTask` / `updateTask`（`agent-team/src/index.ts:243/257/268`），`spawnTeammate` 未暴露。创建入口本来就只能由 Magic 提供。

## 7. 风险与活漂移【已核实】

1. **experimental 无支持承诺**：组 README 写明 contracts can change；五包虽已发布，仍标 opt-in exception。DSH 公共 API 仍 pre-stable。
2. **路径挂载绑目录结构**：`packages/experimental/*/lib/index.js` 被官方挪走，patch 即失效。`lib/` 还依赖本机构建或拷贝。
3. **官方数据模型更窄**：成员创建后不可变；任务 revision 必须 CAS。Magic 的 ledger 不能去改官方任务字段。
4. **`AgentTeamsPort` 过期**：Magic 仍声明 `delivery: 'quiet'|'wakeup'`（`plugins/magic-ceo/src/index.ts:699-701`）。官方已删除该字段。探测仍通过；改道会发错形状。
5. **检查器挂空槽**：`magic-ceo-ui` 声明 `layout.openDetails/closeDetails` 并 `slots.inject('details')`（`register.ts:254,283,300-308`）。官方 `ILayout` 只有 `openRightbar/closeRightbar`（`ui-layout/src/client/service.ts:28-51`）。根槽：`sidebar` / `main` / `rightbar` / `shell.overlay`（`index.ts:151-155`）。CodeGraph 查 `openDetails`：生产符号 0 命中。画布能画；点节点打开工作区会打空方法。**未改代码，待裁定交互。**

## 8. 阶段

| 阶段 | 内容 | 状态 |
|---|---|---|
| P1 路径挂载服务 + 面板 | patch 已指向 git checkout | ✅ |
| P2 形态 A' | 不挂 `tool-agent-team` | ✅ |
| P3 只读探测 | `readAgentTeams` + 8 个单测 | ✅；派活改道未做 |
| P4 退役 residency / 收窄 `magic_ceo` | 先证明 `waitForChange` 覆盖 `waitForChildTurn` | 待裁定 + 待核查 |
| P5 契约体检覆盖路径与服务面形状 | 含「无 `delivery`」「无 `openDetails`」 | 待做 |
| P6 检查器迁槽 | `rightbar` 或画布内面板 | 待裁定 |

## 9. 待裁定

1. ~~接入形态~~ **已定 A'**。
2. **成员工作区**：官方 `rightbar`，还是画布内面板。官方删了 `details`，不能再假装这个 API 还在。
3. **派活改道**：继续 `ctx.subagents`，还是改 `spawnTeammate` + mailbox。必须先映射 replan / 重定向 / 不可变成员，并改掉 `delivery` 字段。
4. **双边 UI**：头部 `ui-agent-team` 与 Magic 画布功能重叠，是否只留一个。
