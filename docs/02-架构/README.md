# 后端与系统架构拆解入口

上游产品入口统一见 [docs/README.md](../README.md) 和 [产品文档入口](../01-产品/README.md)。本目录只回答“现有底座事实是什么”和“Magic 目标架构如何落地”，不重新裁定产品语义。

这里按项目和阶段管理架构工作。当前第一优先级是拆解真实的 OpenCode 仓库；Magic 是后续目标项目，AgentCore 是已有代码和历史文档的参考基线。

## 项目目录

| 项目 | 目录 | 负责回答的问题 | 默认报告 |
|---|---|---|---|
| OpenCode 现有项目 | `01-OpenCode/` | OpenCode 当前真实的运行时、服务、协议、持久化和执行链路如何工作 | `OPENCODE_BACKEND_ARCHITECTURE_BREAKDOWN.md` |
| Magic 目标项目 | `02-Magic-目标项目/` | Magic 的目标对象、责任、任务账本、运行时适配、接口、事件、数据模型和首版拆分如何设计 | `MAGIC_TARGET_BACKEND_ARCHITECTURE.md` |
| AgentCore 现有项目 | `03-AgentCore-现有项目/` | AgentCore 的真实代码、历史架构文档、实现差异、技术债务和可迁移经验是什么 | `AGENTCORE_EXISTING_BACKEND_BREAKDOWN.md` |

## 推荐使用顺序

1. 先使用 `01-OpenCode/`，对 `D:\Harmess\opencode` 的当前版本和真实代码做现状取证，形成架构报告与技术核查清单。
2. 再使用 `02-Magic-目标项目/`，只读取规定的 Magic 产品入口文档，基于 OpenCode 报告做目标适配设计。
3. 最后使用 `03-AgentCore-现有项目/`，对 `D:\Harmess\reference-project\AgentCore` 做定向现状取证，确认可继承经验和不可迁移假设。

## 边界规则

- OpenCode 侧必须以 `D:\Harmess\opencode` 的真实代码为准，报告对象是 OpenCode 本身，不是 Magic 的设计报告。
- Magic 当前没有业务源码，因此 Magic 侧只能输出目标设计、实现蓝图和技术会议输入，不得声称已有页面、模块或接口。
- AgentCore 侧必须区分文档声明、代码实际实现和二者差异，不得把历史蓝图当成已落地能力。
- OpenCode 的内部对象不能直接替换 Magic 的工程、任务、PM、成员、事实或产物；如需映射，必须单独列出证据、差异和适配成本。
- 三份报告必须使用不同文件名，并记录版本、证据等级、未决项和实验限制。

## 产物状态

- `01-OpenCode/`、`03-AgentCore-现有项目/`：现有项目取证，结论必须有源码、测试或实机证据。
- `02-Magic-目标项目/`：目标设计和首版准入材料，所有模块、接口和数据模型均标记为目标或待建立。
- `04-产品技术对齐会议/`：会议过程与签署材料，不能替代产品入口或实机验收。

默认报告由各目录提示词约定；报告生成后放回对应项目目录，禁止放到产品目录顶层。









