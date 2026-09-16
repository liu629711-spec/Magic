# Magic 文档

`main` 是 DSH 插件工作区：Magic 产品能力以 Cordis 插件叠加在 DeepSeek Harness 上，不重写它的 session / tool / agent-loop。

**产品交付形态（2026-09-16 裁定）**：自有 Tauri 桌面客户端（对标 Codex）+ DSH 后台 runtime；`dsh web` 降级为调试通道。见 [PRD-01 §2.1](01-产品/PRD-01-Magic产品总览.md) 与 [09-自有客户端架构](02-实现/09-自有客户端架构.md)。

当前实现对齐的官方底座是 **DSH 0.1.5-rc.2**（git `origin/master` `c291e7961a`）。先读 [当前基线](02-实现/00-当前基线-DSH-0.1.5.md)，再读 PRD 或其它实现文档。

## 文档地图

**产品语义（唯一正式 PRD）**

| 文档 | 回答的问题 | 状态 |
|---|---|---|
| [PRD-01 Magic 产品总览](01-产品/PRD-01-Magic产品总览.md) | 我们做什么、为谁做、首版做什么 | active |
| [PRD-02 代理与 CEO 工作方式](01-产品/PRD-02-代理与CEO工作方式.md) | 用户如何开始工作、协作和切换 | active |
| [PRD-04 任务执行与治理](01-产品/PRD-04-任务执行与治理.md) | 任务如何执行、收口、验收并控制风险 | active |
| [PRD-05 权限、成本、事实与副作用](01-产品/PRD-05-权限成本事实与副作用.md) | 谁能做什么、花费多少、共享什么以及哪些影响不可撤销 | active |
| [第一版范围确认（2026-09-02）](第一版范围确认-2026-09-02.md) | V1 到底做到哪、明确不做什么 | confirmed |

**技术实现（不能重新定义产品语义）**

| 文档 | 回答的问题 | 状态 |
|---|---|---|
| [当前基线（DSH 0.1.5）](02-实现/00-当前基线-DSH-0.1.5.md) | 官方仓是否齐全、插件能否挂上、官方新能力怎么用、未决事项 | active |
| [DSH 契约面与 AgentCore 能力映射](02-实现/01-DSH契约面与AgentCore能力映射.md) | 能用哪些 DSH 接口、AgentCore 能力怎么迁 | active |
| [自有客户端架构](02-实现/09-自有客户端架构.md) | Tauri 客户端怎么连 runtime、双通道验证结论、缺口与里程碑 | active |
| [V1 并行开发计划](02-实现/02-V1并行开发计划.md) | 任务怎么拆过、哪些已完成、还剩什么 | 历史（2026-09-13 状态快照；插件地基已完成，演进看 09） |
| [插件契约内核](02-实现/03-插件契约内核.md) | 插件怎么写：ctx 契约、存储端口、跨插件服务 | active |
| [开发者工具集复刻规格](02-实现/06-开发者工具集复刻规格.md) | devtools 六工具的蓝本行为与复刻分期 | active |
| [体验对标调研](02-实现/07-体验对标调研.md) | 10 维度 × 成熟产品体验对标 + 差距路线（P0/P1/P2） | active（落点从 web 插件平移到自有客户端） |
| [官方 Agent Teams 集成方案](02-实现/04-官方agent-team集成方案.md) | 形态 A'、为什么不挂官方工具、挂载方式 | active |
| [CEO 派活改道映射](02-实现/05-CEO派活改道映射.md) | 派活改道的逐动作映射、硬缺口、动工门禁 | active |
| [自研浏览器插件](02-实现/08-自研浏览器插件.md) | magic-browser v1 复盘 | 已退役（基线改定 dsh-builtin-browser） |

## 阅读规则

1. 新成员先读 [当前基线](02-实现/00-当前基线-DSH-0.1.5.md) 和 PRD-01，再按工作内容读 PRD-02 / PRD-04 / PRD-05。
2. 技术设计以 PRD 为输入；技术文档可以细化实现，但**不能重新定义产品语义**。
3. 产品变更先改对应 PRD，再同步技术文档；**不新建平行 PRD**。
4. 工程模式已从产品中移除（2026-09-15 用户裁定，PRD-03 已删除）；CEO 是唯一的协作组织方式。

## 当前实现形态

两条挂载清单：

- `patches/web.patch.yml` —— `dsh web` 调试通道（含 vendored 客户端插件），分两层加载。细节和源码行号见 [当前基线](02-实现/00-当前基线-DSH-0.1.5.md) 与 [集成方案](02-实现/04-官方agent-team集成方案.md)。
- `patches/sdk.patch.yml` —— **自有客户端的 runtime 挂载清单**（2026-09-16 新建）：官方 Agent Teams 服务层 + 会话检索 + Magic 产品插件，剔除 web 专属插件。见 [09-自有客户端架构](02-实现/09-自有客户端架构.md)。

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
| `plugins/magic-ceo` | CEO 编排；半改道：官方名册优先 + subagents 降级回退 | `ceo_plan` / `ceo_delegate` / `ceo_replan` |
| `plugins/magic-ceo-ui` | CEO 团队图 + 成员工作区（官方右侧栏，tab 以选中成员命名）+ 任务板（只读，画布唯一展示） | 会话内画布；点成员在右侧栏看其工作区 |
| `plugins/magic-consult` | 统一按需检索（记忆主题 + 按需规则，「按需目录」+ consult 工具） | 系统提示词「按需目录」；`consult` 工具 |
| `plugins/magic-devtools` | 开发者工具集六工具：archive_create / archive_extract / git_ops（白名单）/ package_install（钉源+黑名单）/ code_search（web-tree-sitter+BM25）/ code_diagnostics（tsc 路线） | 成员与 CEO 的执行工具 |
| `plugins/magic-export` | 交付物导出（md → docx/pdf） | 成员与 CEO 的执行工具 |

**有意不挂**

- `tools/contract-smoke` —— 升级体检（静态契约核查）。

2026-09-11 接线状态：成员工作区已迁入官方右侧栏；CEO 派活已完成**半改道**（官方名册/信箱/打断优先 + subagents 降级回退，容量对策 `maxMembers: 32`），映射与门禁见 [05 文档](02-实现/05-CEO派活改道映射.md)。

2026-09-13 状态：任务板只读且只在画布展示、右坞 tab 以成员命名（PRD-04 §12）；P0-1 折叠体系与 P0-4 失败/阻塞卡已落地（见 [07 文档](02-实现/07-体验对标调研.md) §5）；质量门现状：9 插件 304 测试 / 真实 `tsc` 0 错误 / 契约体检 PASS=74。

## 历史材料

旧的 Rust/Tauri 桌面实现、后端方案、数据库设计、前端方案、ADR 与 F-10 验证记录都在 `old-design` 分支，只用于追溯，**不代表当前实现**。`reference-project/` 下的第三方仓库只作本地源码研究，不提交。
