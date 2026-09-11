# Magic 文档

`main` 是 DSH 插件工作区：Magic 产品能力以 Cordis 插件叠加在 DeepSeek Harness 上，不重写它的 session / tool / agent-loop，也不把 DSH 改成独立应用后再反向接插件。

当前实现对齐的官方底座是 **DSH 0.1.5-rc.2**（git `origin/master` `c291e7961a`）。先读 [当前基线](02-实现/00-当前基线-DSH-0.1.5.md)，再读 PRD 或其它实现文档。

## 文档地图

**产品语义（唯一正式 PRD）**

| 文档 | 回答的问题 | 状态 |
|---|---|---|
| [PRD-01 Magic 产品总览](01-产品/PRD-01-Magic产品总览.md) | 我们做什么、为谁做、首版做什么 | active |
| [PRD-02 代理与 CEO 工作方式](01-产品/PRD-02-代理与CEO工作方式.md) | 用户如何开始工作、协作和切换 | active |
| [PRD-03 工程组织与协作](01-产品/PRD-03-工程组织与协作.md) | 长期项目如何建立 PM、成员和资源关系 | **暂缓** |
| [PRD-04 任务执行与治理](01-产品/PRD-04-任务执行与治理.md) | 任务如何执行、收口、验收并控制风险 | active |
| [PRD-05 权限、成本、事实与副作用](01-产品/PRD-05-权限成本事实与副作用.md) | 谁能做什么、花费多少、共享什么以及哪些影响不可撤销 | active |
| [第一版范围确认（2026-09-02）](第一版范围确认-2026-09-02.md) | V1 到底做到哪、明确不做什么 | confirmed |

**技术实现（不能重新定义产品语义）**

| 文档 | 回答的问题 |
|---|---|
| [当前基线（DSH 0.1.5）](02-实现/00-当前基线-DSH-0.1.5.md) | 官方仓是否齐全、插件能否挂上、官方新能力怎么用、未决事项 |
| [DSH 契约面与 AgentCore 能力映射](02-实现/01-DSH契约面与AgentCore能力映射.md) | 能用哪些 DSH 接口、AgentCore 能力怎么迁 |
| [V1 并行开发计划](02-实现/02-V1并行开发计划.md) | 任务怎么拆过、哪些已完成、还剩什么 |
| [插件契约内核](02-实现/03-插件契约内核.md) | 插件怎么写：ctx 契约、存储端口、跨插件服务 |
| [官方 Agent Teams 集成方案](02-实现/04-官方agent-team集成方案.md) | 形态 A'、为什么不挂官方工具、挂载方式 |

## 阅读规则

1. 新成员先读 [当前基线](02-实现/00-当前基线-DSH-0.1.5.md) 和 PRD-01，再按工作内容读 PRD-02 / PRD-04 / PRD-05。
2. 技术设计以 PRD 为输入；技术文档可以细化实现，但**不能重新定义产品语义**。
3. 产品变更先改对应 PRD，再同步技术文档；**不新建平行 PRD**。
4. PRD-03（工程）当前**暂缓**，按「未来方向」阅读，不代表当前产品范围。使用 CEO 不等于建立工程。

## 当前实现形态

`patches/web.patch.yml` 分两层加载。细节和源码行号见 [当前基线](02-实现/00-当前基线-DSH-0.1.5.md) 与 [集成方案](02-实现/04-官方agent-team集成方案.md)。

**官方 Agent Teams 层（experimental，形态 A'）**

| 插件 | 产品含义 |
|---|---|
| `agent-team` | 名册 / 持久信箱 / 任务板 / 崩溃恢复（`ctx.agentTeams`） |
| `ui-agent-team` | 会话头部团队面板 |

不挂 `tool-agent-team`：顶层会话默认被当成 lead，挂上后每个普通会话都会看到 Team 工具。

**Magic 产品插件层（已挂进 patch）**

| 插件 | 产品含义 | 用户入口 |
|---|---|---|
| `plugins/magic-work-mode` | 工作方式（代理 / CEO）与作用域 | `/mode`、`/mode once ceo` |
| `plugins/magic-ledger` | 交付契约、物证、验收 | `ledger_*` |
| `plugins/magic-memory` | 记忆（作用域隔离） | `magic_memory_*` |
| `plugins/magic-ceo` | CEO 编排；派活仍走 `ctx.subagents` | `ceo_plan` / `ceo_delegate` / `ceo_replan` |
| `plugins/magic-ceo-ui` | CEO 团队图（客户端） | 会话内画布 |

**有意不挂**

- `plugins/magic-engineering` —— 工程暂缓，与 PRD-03 一致。
- `tools/contract-smoke` —— 升级体检（静态契约核查）。

已知活问题（不在本文展开）：成员检查器仍调用已删除的 `layout.openDetails` / `details` 槽；官方 `sendMessage` 已去掉 `delivery` 字段，但 CEO 生产路径还没改道到 `agentTeams`。

## 历史材料

旧的 Rust/Tauri 桌面实现、后端方案、数据库设计、前端方案、ADR 与 F-10 验证记录都在 `old-design` 分支，只用于追溯，**不代表当前实现**。`reference-project/` 下的第三方仓库只作本地源码研究，不提交。
