---
status: partial
date: 2026-09-02
scope: f10-t06-opencode-http-api
authority: technical-evidence-record
---

# F-10 验证记录 001：OpenCode HTTP API

## 1. 目的

验证 OpenCode 是否已有可供 Magic 直接调用和观察的会话 API。此记录不证明 Magic 已接入 OpenCode，也不证明断连、重启、成本或审批语义已经满足首版要求。

## 2. 源码事实

- V1 Experimental HttpApi 在 `reference-project/opencode/packages/opencode/src/server/routes/instance/httpapi/groups/session.ts:85-96` 声明会话消息读取、创建、取消与异步提示路径：`GET /session/:sessionID/message`、`POST /session`、`POST /session/:sessionID/abort`、`POST /session/:sessionID/prompt_async`。
- 对应处理器在 `reference-project/opencode/packages/opencode/src/server/routes/instance/httpapi/handlers/session.ts:106-130`、`155-178`、`232-235`、`311-331` 实现消息读取、会话创建、取消和异步输入投递。
- 仓库已有 HTTP API 验证入口：`reference-project/opencode/packages/opencode/package.json:11` 的 `test:httpapi`。测试环境将数据库与 XDG 状态隔离到临时目录，见 `reference-project/opencode/packages/opencode/test/server/httpapi-exercise/environment.ts:9-22`。

## 3. 本次执行

| 项目 | 值 |
| --- | --- |
| 参考提交 | OpenCode `5f5ea53afb` |
| 运行目录 | `reference-project/opencode/packages/opencode` |
| 命令 | `bun run test:httpapi` |
| 运行时 | Bun `1.4.0` |
| 依赖准备 | 按锁文件执行 `bun install --frozen-lockfile`；未修改参考源码或锁文件 |

## 4. 结果

| 模式 | 结果 | 可确认范围 |
| --- | --- | --- |
| `coverage` | 通过：`208` pass，`0` fail，`0` skip，`0` missing | 路由清单包含 V1 `/session` 创建、读取、异步投递、取消，以及 V2 `/api/session` 创建、事件、打断和等待路径。 |
| `auth` | 通过：`208` pass，`0` fail，`0` skip，`0` missing | 同一 API 清单经过鉴权模式验证。 |
| Effect：`session.create` | 通过：`2` pass，`0` fail | V2 `POST /api/session` 与 V1 `POST /session` 均返回 `200`，并完成隔离临时工作区清理。 |
| Effect：`session.abort` | 通过：`2` pass，`0` fail | 已存在会话的 V1 取消返回 `200`；不存在会话同样返回 `200`，是空操作成功语义。 |
| Effect：`session.messages` | 通过：`5` pass，`0` fail | V1 `GET /session/:id/message` 在新会话返回 `200` 和空消息列表。V2 的四个场景验证缺失会话和无效游标的错误契约，未验证已有会话的消息内容。 |
| Effect：`session.prompt` | 通过：`3` pass，`0` fail | V1 同步投递返回 `200` 和受控模型结果；V1 异步投递返回 `204`，并等待至少一次受控模型请求。测试定义见 `test/server/httpapi-exercise/index.ts:1476-1501`。 |
| 全量 `effect` | 未完成 | 用例开始执行，但测试进程未在合理时间内自行退出；本轮为避免遗留后台状态，终止了已确认属于本轮的三个 Bun 测试进程。没有把全量模式视为通过。 |
| Effect：sync 路由 | 通过 | `sync.start`：`1/1`；`sync.history.list`、`sync.replay` 及序号校验：`test/server/httpapi-sync.test.ts` 中 `2 pass、1 skip`。历史返回事件包含 `id`、`aggregate_id`、`seq`、`type`、`data`，重放成功返回对应 `sessionID`。 |
| V2 路由细粒度验证 | 通过/受限 | `v2.session.history`：`3/3`；`v2.session.interrupt`：`1/1`；`v2.session.events.missing`：`1/1`。`v2.session.compact` 和 `v2.session.wait` 明确返回 `503 ServiceUnavailableError`，说明这些能力在当前参考提交尚未实现。 |
| 事件与 SDK 回归测试 | 通过 | `httpapi-event.test.ts`：`3/3`；`httpapi-sdk.test.ts`：`18/18`。覆盖实时 `server.connected`、后续实例事件、SDK 事件流、sync-backed part 更新和 SDK prompt 路径。 |
| 真实 TCP 监听器：V1 基础会话 | 通过 | 直接调用 OpenCode `Server.listen` 后，以真实 `fetch` 请求 `POST /session`、`GET /session/:id`、`GET /session/:id/message`、`POST /session/:id/abort`；四个响应均为 `200`，读回 ID 等于创建 ID，空消息列表长度为 `0`，取消结果为 `true`。监听器在 `finally` 中关闭。 |
| 真实 TCP 监听器：V1 受控模型投递 | 通过 | 在当前进程临时注入 `OPENCODE_CONFIG_CONTENT`，使用只返回固定 SSE 响应的本地模型服务。`POST /session` 返回 `200`，随后 `POST /session/:id/message` 返回 `200`；响应角色为 `assistant`，文本为受控模型的 `network model result`。两个监听器均在 `finally` 中关闭。 |
| 真实 TCP 监听器：V1 异步投递和读取 | 通过 | `POST /session/:id/prompt_async` 返回 `204`；本地模型收到 `2` 次调用，轮询 `GET /session/:id/message` 后获得 `2` 条消息，其中包含受控文本 `network async result`。 |
| 真实 TCP 监听器：V1 在飞取消 | 通过 | 受控模型对非标题请求保持 SSE 流打开；确认该请求已经到达后调用 `POST /session/:id/abort`，响应为 `200` 与 `true`，上游模型连接在三秒内关闭。 |
| 跨进程重启：已落盘 session | 通过 | 进程 A 在临时 XDG 数据目录创建 session 后停止；进程 B 使用同一目录启动，`GET /session/:id` 返回 `200`，ID、标题、目录等元数据一致，`GET /session/:id/message` 返回 `200`。 |
| 跨进程重启：运行时状态 | 源码已确认不持久化 | `packages/opencode/src/session/status.ts:25-48` 使用进程内 `Map` 保存 busy/retry 状态，启动时为空；因此不能把重启后的 `idle` 视为“任务已完成”，也没有源码证据表明 V1 会自动接管中断循环。 |
| V1 重复提交幂等 | 未冻结 | V1 请求允许客户端提供 `messageID`（`packages/opencode/src/session/prompt.ts:1499-1521`），但没有像 V2 `SessionInputTable` 那样的重复请求契约；Magic 不能直接假设 V1 同一 `messageID` 重试只执行一次。 |

## 5. 结论

T-06 保持 `H`，但已获得六个重要的候选事实：

1. OpenCode 已有可直接复用的 V1 和 V2 会话 API，且仓库本身维护 HTTP API 覆盖与鉴权验证。
2. V1 `POST /session`、`POST /session/:id/message`、`POST /session/:id/prompt_async`、`GET /session/:id/message` 与 `POST /session/:id/abort` 已在 OpenCode 自带的隔离 Effect 运行时中通过细粒度验证；异步投递至少触发一次受控模型调用。
3. OpenCode 的真实 TCP 监听器可以完成 V1 会话创建、读回、消息读取和取消，且创建的会话 ID 在读回时保持一致。
4. 真实 TCP 监听器可在临时配置和受控模型下完成 V1 同步投递并返回模型结果；这证明 V1 HTTP API 是 Magic 的候选接入入口。
5. 真实 TCP 监听器可完成 V1 异步投递，并从同一会话读回受控模型结果。
6. 真实 TCP 监听器可以取消在飞模型流并关闭上游连接。Magic 仍不能把 V1 的实时 SSE 当作可恢复队列；断线期间的补拉应使用已验证的 `/sync/history`，并由 Magic 自己维护最后确认序号。
7. 重启后已落盘会话可读回，但当前 session status 是内存态，V1 没有已证实的“接管未完成执行”机制。Magic 必须区分 `completed`、`cancelled`、`unknown_after_restart`，不能用重启后的 `idle` 推断成功。
8. V2 的精确 message-ID 重试在 `httpapi-session.test.ts:565-635` 中有持久幂等/冲突契约；V1 未证明具备同等语义，适配层应自行生成请求幂等键并记录。

## 6. 下一实验

1. 修复或隔离 `effect` 模式未退出的测试运行环境，取得完整退出码和最终汇总。
2. 由 Magic 适配层实测并定义 V1 的断线补拉、重复提交和 `unknown_after_restart` 收口策略。
3. 不再把“V1 自动恢复未完成 prompt”作为底座能力写入产品或开发文档；若首版必须支持，需要在 Magic 中实现任务账本和恢复编排。

在三项完成前，不冻结 Magic 的会话适配 API、Attempt 绑定表或同步状态机。

## 7. Magic 适配层真实冒烟

Magic 已新增可选真实集成测试：
`cargo test -p magic-execution-opencode-v1 --test real_opencode -- --nocapture`，设置
`MAGIC_REAL_OPENCODE=1` 后启动本机 OpenCode CLI，隔离数据库和工作目录，验证 V1
Session 创建、异步投递、消息读取和取消。Windows 若无法从 PATH 直接启动包装脚本，
可通过 `MAGIC_OPENCODE_BIN` 指定真实 `opencode.exe` 路径。本次本机 OpenCode `1.18.21`
运行结果为 `1 pass`；该测试不验证模型成功结果，也不替代重启和事件恢复测试。
