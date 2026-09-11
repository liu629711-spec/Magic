---
status: active
version: 1.0
date: 2026-09-11
owner: Magic 项目
authority: technical-mapping
dsh: 0.1.5-rc.2 / c291e7961a
---

# 05 CEO 派活改道映射（ceo_* → 官方 agent-team）

> 本文回答：**把 CEO 派活从 `ctx.subagents` 改到官方 `agent-team`，每个产品动作映射到哪个官方 API、哪里对不上、改道前必须先核查什么。**
> 本文是改道前置作业（集成方案 §9.3 的「先要映射」），**不授权改代码**；派活改道仍是待裁定项。

## 1. 结论（先读这个）

1. **改道在技术上成立，但只能是「半改道」**：成员创建（`spawnTeammate`）、消息（`sendMessage`）、打断（`interrupt`）走官方；**回合结束等待与成员产出捕获留在 Magic**（`waitForChildTurn` + residency），因为官方没有等价物（§6）。
2. 官方成员的会话身份**就是** continuable 子代理：`spawnAdmitted` 把成员 id 直接当 `childId` 传给 `ctx.subagents.startContinuable`（`roster.ts:281-290`），`TeamMemberView.id` 的类型就是 `SessionId`（`types.ts:58-59`）。所以改道后 Magic 的 residency、`interrupt`、产出捕获**继续工作，不需要换轨道**。
3. 三个硬缺口的对策（2026-09-11 已实施）：无退役 API → **容量对策①（maxMembers 调大至 32，接受堆积）**，用户裁定；名字唯一 → `officialMemberNameOf(runId)` 生成 kebab 名（runId 已 ASCII 化）；`maxMembers` → patch 已调 32。
4. 改道的净收益是**可靠性**：持久信箱（离线排队）、Lead Session 事件日志（崩溃恢复）、任务板（CAS 版本）。**不是产品能力**——波次、验收、账本、画布官方都没有。

> **状态（2026-09-11）：半改道已实施**。派工循环官方名册优先 + 降级回退（`plugins/magic-ceo/src/index.ts`，`readAgentTeams` 探测），steer 走官方信箱按名路由，halt 走官方 interrupt；官方缺席/失败时三条路各自回退 subagents。集成测试与降级测试见 `plugins/magic-ceo/tests/ceo.test.ts`。

## 2. 两侧模型对照

| | Magic 现状 | 官方 agent-team |
|---|---|---|
| 成员身份 | residency 座位 → `memberId`（childId），`index.ts:365` | 名册成员，`TeamMemberView.id: SessionId`（`types.ts:58-59`），创建后五元组不可变（`types.ts:144-151`，`index.ts:150`） |
| 创建 | `ctx.subagents.startContinuable`（`index.ts:965-974`） | `spawnTeammate`（`index.ts:153-156`）→ 内部同一 `startContinuable`（`roster.ts:282`） |
| 成员续聊 | `ctx.subagents.sendMessage`（`index.ts:980`） | `sendMessage` → 持久信箱，先落盘再投递（`index.ts:162-165`），返回 `accepted \| queued`（`types.ts:167-171`） |
| 打断 | `ctx.subagents.interrupt`（`index.ts:1513-1538`） | `interrupt(caller, targetName)`，不清空待投信箱（`index.ts:227-233`） |
| 回合结束 | `waitForChildTurn`（`index.ts:1008`；`residency.ts` 按 childId+seq 折叠回合事件） | **无等价物**。`waitForChange` 只返回 `{ timedOut }`（`types.ts:249-252`），团队域任意变化都会醒 |
| 成员产出 | 回合事件的 `output / stopReason / seq`（`residency.ts:1-6`） | **无**。`TeamMemberView` 只有 name/role/status/diagnostics（`types.ts:58-67`） |
| 持久化 | `magic_ceo` 存储域（计划/账本引用） | Lead Session 事件日志：`team/member`、`team/task`、`team/message/queued`、`team/message/delivered`（`types.ts:254-270`） |

## 3. 逐动作映射（ceo_delegate / ceo_replan → 官方 API）

`ceo_replan` 的动作集来自工具 schema（`plugins/magic-ceo/src/index.ts:1326-1420`）。

| Magic 动作 | 现在的实现 | 改道后的官方路径 | 语义差异与处置 |
|---|---|---|---|
| **delegate 派新成员** | `startContinuable`（`index.ts:965`） | `spawnTeammate(caller, { name, description, prompt, context, provider, signal })` | 官方五元组不可变；`prompt` 要求是 `ContentBlock[]`。返回 `SpawnTeammateResult.member`，**`member.id` 即 childId**，直接喂给 residency |
| **binds**（bind_after_deps 定案） | 图状态本地铁结，随后按常规派发 | 任务依赖可用 `createTask({ blockedBy })` / `updateTask('set_dependencies')` 表达；bind 决策用 `updateTask('edit')`（CAS） | 官方任务是共享任务板语义，Magic 的绑定是**图内调度语义**。建议：任务板只做「谁在跑」的投影，绑定决策仍留在 `magic_ceo` 域 |
| **steers**（给排队节点补指令） | note 存图里，派发时拼进 prompt（未 spawn 的节点不涉及成员） | 节点已 spawn → `sendMessage(target, content)`；未 spawn → 维持现状（prompt 还没定） | 无冲突。信箱消息带 `team-message` source 去重（`types.ts:112-123`） |
| **continue**（给被阻塞成员传用户答案） | `ctx.subagents.sendMessage`（`index.ts:980`） | `sendMessage(target, content)` | 等价。官方会先落盘再尝试立即投递（`mailbox.ts:50-53`），成员离线也不丢 |
| **replace**（失败/未核实座位重派） | 新 `startContinuable`，同座位新 childId | **新 `spawnTeammate`**（旧成员 prompt 不可变，不能复用） | 两个缺口：① 旧成员**无法退役**（无公开 API，§4），占 `maxMembers` 名额；② 名字必须唯一，需要命名策略（§7） |
| **halt**（打断运行中成员） | `ctx.subagents.interrupt(memberId)`（`index.ts:1513-1517`） | `interrupt(caller, targetName)` | 等价且更干净：官方按**名字**打断、不清信箱。保留 `subagents.interrupt` 也可行（member.id 即 childId） |
| **redirect**（停running成员并重派） | halt + replace 组合（`index.ts:1534-1538`） | `interrupt` + 新 `spawnTeammate`（steer note 进新成员 prompt） | 同 replace 的两个缺口 |
| **stop**（停掉尾部未启动节点） | 纯图状态，不动成员 | 不变 | 无成员交互，无需映射 |
| **UI 干预**（工作区 halt/redirect/resume 按钮） | 拼成 `ceo_replan` 指令发给父会话（`CeoWorkspace.ts:301-311`） | 不变（入口仍是 CEO 工具），底层落到上面对应行 | 无冲突 |

## 4. 硬缺口一：没有成员退役 API

- `TeamService` 公开面只有 `spawnTeammate / sendMessage / createTask / getTask / listTasks / updateTask / waitForChange / interrupt / tryMembership` / Remote 只读（`agent-team/src/index.ts:152-268`）。
- `roster.stopTeammates`（`roster.ts:236-241`，内部调 `ctx.subagents.drainContinuableChildren`）只在两处被调用：**服务销毁**（`index.ts:308-318`）和 **spawn 失败清理**（`roster.ts:301`、`:329`）。没有任何「Lead 主动退役一个成员」的公开方法。
- 后果：replace/redirect 每次重派都**新增**一个名册条目，旧条目（status `failed`/`inactive`）永久占位。`roster.ts:274-275` 在 `maxMembers` 达到时直接抛 `TEAM_MEMBER_LIMIT`。
- 对策选项（2026-09-11 用户已裁定 **①**）：① 调大 patch 里 `maxMembers` 至 32 并接受堆积（已实施）；② 给官方提成员退役 API（后续观察上游）；③ replace 复用旧成员 + 信箱重 steering（受「prompt 不可变」限制，只适合轻redirect，不适合任务变更，未采用）。

## 5. 硬缺口二：名字唯一与容量

- 名字唯一：`TEAM_MEMBER_NAME_TAKEN`（`roster.ts:272`）；名字会被 `memberName` 规范化（`roster.ts:453`）。Magic 的座位名（如 `研究员`）在多次 replace/多图并发下必然撞名。
- 命名策略建议：`座位@图短id@尝试序号`（如 `研究员@a3f2@2`），Magic 侧维护 座位 ↔ 官方名 的映射（residency 现有字段即可承载）。
- 容量：patch 配置 `maxMembers: 8` / `maxTasks: 256` / `maxPendingMessagesPerMember: 64` / `maxMessageBytes: 65536`（`patches/web.patch.yml:66-71`）。Magic 的图节点数没有上限校验（`plan.ts` 无断言）。已处置：`maxMembers` 调至 32（`patches/web.patch.yml`），官方派工/信箱/打断异常一律回退 subagents 等价调用（见 §8.3）。

## 6. 半改道边界：哪些必须留在 Magic

1. **回合结束等待**：`waitForChange` 返回 `{ timedOut }`（`types.ts:249-252`），语义是「团队域任何变化」，成员状态机是 `running/idle/inactive/provisioning/failed`（`types.ts:61`）。理论上可轮询 `status running→idle` 近似回合边界，但 Magic 的波次推进还需要**这一回合的产出**。
2. **产出捕获**：`ChildTurnResult { output, stopReason, seq }`（`residency.ts:1-6`）来自 subagents 回合事件；官方 `TeamMemberView` 没有输出字段。验收（magic-ledger）、汇总、画布实时流都吃这个。
3. 因此：**residency.ts + `waitForChildTurn` + subagents 事件订阅保留**；官方名册只接管「成员是谁、信箱、任务板」。这正是集成方案 §5.2 那行「退役 residency 前必须证明 waitForChange 能覆盖 waitForChildTurn」的答案：**覆盖不了，也不必覆盖——半改道下 residency 不退役，只收窄为「座位 ↔ member.id」映射**。

## 7. `AgentTeamsPort` 修正（2026-09-11 已完成）

- `sendMessage` 声明里的 `delivery: 'quiet' | 'wakeup'` 已删除，与官方请求 `{ target, content, signal }`（`types.ts:159-163`）一致；体检有双向断言。
- `interrupt?` 已加入端口（官方按名打断）；`spawnTeammate` 结果经 `officialMemberIdOf` 运行时收窄取 `member.id`。
- `readAgentTeams` 探测不变（`spawnTeammate` + `sendMessage` 是函数）；派工循环里官方缺席/失败一律回退 subagents 等价调用，产品能力不降级。

## 8. 改道前核查清单（P4 门禁，2026-09-11 已全部完成）

| # | 事项 | 状态 |
|---|---|---|
| 1 | `mailbox.send` 立即投递对成员回合的实际唤醒行为：`dispatchOnce` → `steerHostSubagentPrompt(ctx.subagents, …)`（`mailbox.ts:235-268`），与 Magic 现用 `ctx.subagents.sendMessage` 同一底座；离线则持久排队重试 | ✅ 已核实 |
| 2 | 容量策略选定（§4 对策①：调大名额、接受堆积）+ 命名策略（`officialMemberNameOf`：runId → `m-` kebab ≤64） | ✅ 用户裁定并实施 |
| 3 | `TEAM_MEMBER_LIMIT` / `TEAM_INVALID_MEMBER_NAME` 的降级路径：官方 spawn/sendMessage/interrupt 异常一律回退 subagents 等价调用 | ✅ 已实施 |
| 4 | `AgentTeamsPort` 重写（§7）：`delivery` 已删、`interrupt?` 已加、`officialMemberIdOf` 收窄结果、`officialName` 进 `CeoMember`/`PersistedMember` | ✅ 已实施 |
| 5 | 状态分工：官方事件日志管团队态、`magic_ceo` 域管产品态，已写入插件契约内核（03 文档 §7） | ✅ 已登记 |
| 6 | 契约体检补官方形状断言（无 `delivery` ✅；`TeamMemberView.id` 为 SessionId ✅，含 selftest fixtures） | ✅ 已实施 |

## 9. 明确不做

1. **全改道**（退役 residency / 用 `waitForChange` 推波次）——官方没有产出捕获，做不到（§6）。
2. 把 Magic 的波次 / 依赖 / 验收搬进官方任务板——任务板只做投影。
3. 官方成员退役 API 落地前，replace 产生的旧名册条目不主动清理（容量对策①接受堆积，`maxMembers: 32` 内有余量）。
