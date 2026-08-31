# Magic 目标项目架构蓝图

本目录服务于 Magic 的目标后端与系统架构设计。Magic 当前没有可供扫描的业务源码，因此本目录不是代码拆解目录，而是根据产品文档和 AgentCore 经验形成可裁定、可验收、可排期的实现蓝图。

## 产品-技术会议共同基线

在设计 Magic 目标架构前，先阅读 [PRODUCT_TECH_ALIGNMENT_BASELINE.md](PRODUCT_TECH_ALIGNMENT_BASELINE.md)。该文件记录产品经理与 AI 核心、AgentCore 架构、OpenCode 架构、OpenCode 前端四位技术总监已经共同签署的边界、首版范围和 F-10 验证门槛。

本次五方开发前重新对齐后，P0 工作统一进入以下三份主文档：

- [01-首版生产拓扑与底座锁定ADR.md](01-首版生产拓扑与底座锁定ADR.md)
- [02-Magic最小执行与收敛契约-v0.md](02-Magic最小执行与收敛契约-v0.md)
- [03-F-10与首次开发准入验收规范.md](03-F-10与首次开发准入验收规范.md)

三份文档当前均为 `draft-p0`。它们完成五方签署且 F-10 形成可重复证据前，First Development 保持 No-Go。

- 主提示词：`target_architecture_prompt.md`
- 工具助手：`target_architecture_tools.md`
- 默认报告：`MAGIC_TARGET_BACKEND_ARCHITECTURE.md`
- 必读产品入口：`D:\Magic\docs\01-产品\\PRD-01-Magic产品总览.md`、`D:\Magic\docs\01-产品\\PRD-01-Magic产品总览.md`
- 现有项目参考：`D:\Harmess\reference-project\AgentCore` 及其 `docs`，只作为经验和技术核查来源，不作为 Magic 现状

报告中所有路径都必须标明是“目标路径”“参考路径”还是“待建立路径”，不得虚构 Magic 已存在的模块、接口或数据库。









