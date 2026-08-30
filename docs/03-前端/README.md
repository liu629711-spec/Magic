# 前端架构拆解入口

这里按项目和阶段管理前端工作。当前第一优先级是拆解真实 OpenCode 前端、桌面壳和 TUI；Magic 是后续目标前端，AgentCore 是已有代码和历史文档的参考基线。

## 项目目录

| 项目 | 目录 | 负责回答的问题 | 默认报告 |
|---|---|---|---|
| OpenCode 现有项目 | `01-OpenCode/` | OpenCode 的 Web/Electron/TUI 页面、组件、状态、协议消费和桌面边界如何工作 | `OPENCODE_FRONTEND_ARCHITECTURE_BREAKDOWN.md` |
| Magic 目标项目 | `02-Magic-目标项目/` | Magic 的页面、路由、工作入口、工程/PM/成员/任务体验、状态模型和协议需求如何设计 | `MAGIC_TARGET_FRONTEND_ARCHITECTURE.md` |
| AgentCore 现有项目 | `03-AgentCore-现有项目/` | AgentCore 当前真实页面、组件、状态、事件、IPC、移动端边界和文档差异是什么 | `AGENTCORE_EXISTING_FRONTEND_BREAKDOWN.md` |

## 推荐使用顺序

1. 先使用 `01-OpenCode/`，拆解 `D:\Harmess\opencode` 的真实 Web、Electron 和 TUI 前端。
2. 再使用 `02-Magic-目标项目/`，仅基于规定的 Magic 产品入口文档反推目标信息架构和首版交互，并引用 OpenCode 报告中的已证实能力。
3. 最后使用 `03-AgentCore-现有项目/`，读取 `D:\Harmess\reference-project\AgentCore` 的真实前端代码和定向文档，提取可继承工程经验。

## 边界规则

- OpenCode 侧必须区分 `packages/app`、`packages/desktop`、`packages/tui` 和共享包的真实边界，不能只根据 README 推断 UI 能力。
- Magic 侧不扫描不存在的前端源码；页面、组件、store、路由和事件都必须标为目标设计或待建立。
- AgentCore 侧必须把桌面、移动端、管理后台、实验项目、共享协议和实时事件分层分析。
- 原生 session/message/agent/tool/run UI 不等于 Magic 的工程、任务、PM、成员或任务账本页面。
- 不因按钮或事件名存在就推断后端能力；没有代码、协议或实验依据就标记为未知。
