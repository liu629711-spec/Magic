---
status: partial
date: 2026-09-02
scope: f10-t07-opencode-v1-event-protocol
authority: technical-evidence-record
---

# F-10 验证记录 002：OpenCode V1 事件协议

## 1. 目的

确认 OpenCode V1 实时事件流的可消费身份字段，并区分“事件载荷可去重”与“SSE 协议可自动续传”。本记录不证明事件可重放、可补拉、可乱序重排或可在服务重启后恢复。

## 2. 源码事实

- 路由 `GET /event` 只声明工作区路由查询参数，见 `reference-project/opencode/packages/opencode/src/server/routes/instance/httpapi/groups/event.ts:7-24`；未声明事件游标或恢复 ID。
- 处理器将内部事件映射为 `{ id, type, properties }` 载荷，见 `reference-project/opencode/packages/opencode/src/server/routes/instance/httpapi/handlers/event.ts:34-45`；心跳同样先生成内部 ID，见 `:63-65`。
- 但 SSE 编码前的 `eventData` 明确将 SSE 信封的 `id` 设为 `undefined`，见同文件 `:12-18`、`:72-73`。

## 3. 本次执行

| 项目 | 值 |
| --- | --- |
| 参考提交 | OpenCode `5f5ea53afb` |
| 入口 | `Server.listen` 的真实 TCP 监听器，`GET /event` |
| 隔离 | 临时工作区、临时 OpenCode 数据库与 XDG 状态目录 |
| 断言 | 首个 SSE 事件的协议 `id:` 字段、JSON 载荷 `id` 字段和事件类型 |

## 4. 结果

真实 TCP 响应为 `200`，`Content-Type` 为 `text/event-stream`。首个事件类型是 `server.connected`。仓库回归测试 `test/server/httpapi-event.test.ts` 的 `3/3` 用例和 `test/server/httpapi-sdk.test.ts` 的 `18/18` 用例也通过，确认实时事件可送达 SDK 订阅者及 sync-backed part 更新：

| 字段 | 结果 |
| --- | --- |
| SSE 信封 `id:` | 不存在 |
| JSON 载荷 `id` | 存在且为非空字符串 |
| JSON 载荷 `type` | `server.connected` |

## 5. 结论

1. Magic 可以把 V1 实时事件 JSON 载荷中的 `id` 作为候选去重键，但不能把它当作 SSE 自动续传游标。
2. Magic 不能依赖浏览器或 SSE 客户端的 `Last-Event-ID` 自动续传，因为当前响应没有 SSE 信封 `id:` 字段，也没有声明游标/恢复参数。
3. 当前已验证 `/sync/history` 能返回带 `aggregate_id` 和连续 `seq` 的事件行，`/sync/replay` 能接受这些行并完成重放；因此首版补拉候选是“Magic 持久化每个聚合的最后确认 seq，断线后调用 `/sync/history`”，而不是重连 SSE 本身。
4. 重复、乱序和跨重启的最终收敛仍由 Magic 事件账本负责；OpenCode 的实时流测试没有证明这些语义。

## 6. 下一实验

1. 查验并实测 `/sync/history`、`/sync/replay`、`/sync/start` 是否能成为 V1 事件补拉来源，及其身份、游标与故障语义。
2. 验证同一会话在客户端断开、服务重启和重复投递后的事件可观察性。
3. 仅在补拉事实明确后，定义 Magic 的事件幂等键、持久游标和“状态未知”收口规则。
