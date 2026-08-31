---
status: draft-p0
owner: OpenCode 后端架构技术总监
approval: five-party
---

# 首版生产拓扑与底座锁定 ADR

## 已同意的候选拓扑

`OpenCode App 中的 Magic UI → Magic Control Plane/账本/Projection → OpenCode Adapter → canonical OpenCode runtime`。

Control Plane 表示逻辑权威，不预设独立进程。AgentCore 首版不作为必经 runtime，只提供机制、经验和对照实现。

OpenCode Adapter 只能依赖本 ADR 锁定的 protocol/client 和公开契约，不得直接绑定未版本化的 OpenCode Core 内部 API。Git worktree 由 Magic Resource/Git Adapter 创建、登记并绑定 base commit；canonical runtime 不需要提供完整 worktree HTTP API，也不能替 Magic 持有工程资源真相。

## 待补锁定清单

- OpenCode commit/tag、listener 和 server artifact hash；
- Bun 精确版本、依赖锁、启动参数、认证与数据目录；
- migration、protocol/OpenAPI 和 generated client hash；
- runtime 能力矩阵与明确 unsupported/degraded；
- 独立 V2 和完整 listener 的比较结果；
- 升级、回滚、兼容和重新触发 F-10 的条件。

独立 V2 CLI `serve` 是第一候选，不是最终裁定。App vendored `1.17.13-v2` client 不进入 canonical Adapter path；等价验证最多允许其保留在遗留 UI 兼容路径。

## 完成条件

锁定栈可从干净环境重复构建和启动；任一 Attempt 记录唯一 `runtime_lock_id`；同一 Attempt 不混用 runtime/client 写路径；五方签署。









