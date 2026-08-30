# AgentCore 现有项目架构拆解

本目录用于拆解真实仓库 `D:\Harmess\reference-project\AgentCore`，供架构总监建立当前版本的系统事实、对象与生命周期、运行时与恢复边界，并为后续 Magic 技术会议提供有证据的迁移输入。本目录不是 Magic 目标架构设计，也不修改 AgentCore 或 OpenCode。

## 文件

- `existing_architecture_prompt.md`：发给架构总监/架构分析 Agent 的主提示词。
- `existing_architecture_tools.md`：与主提示词同时提供的工具、实验和验收规则。
- 默认报告：`D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_BACKEND_BREAKDOWN.md`

## 当前已知基线

- commit：`2ef9ad4c2109a122cdd3d3d0f27eb468b205360e`
- tags：`prod-2ef9ad4c2`、`desktop-v0.9.11`
- 当前分支名可能为空，执行时必须重新核对 HEAD、tag、branch 和 dirty state。
- 仓库包含 Python/FastAPI 服务端、Electron/React 桌面端、Capacitor 移动端、Admin、Unity AgentTown、Promo、Website、共享协议包、部署和评估目录，不能只扫描 `apps/server`。

## 使用顺序

将本 README、主提示词、工具助手按顺序交给架构总监。按五轮推进：第一轮锁定版本和全仓覆盖台账；第二轮深拆服务端与协议主链；第三轮与前端报告、OpenCode 关系报告交叉核查；第四轮执行最低必要等级的已有测试、隔离实验和实机验证；第五轮复核外围目录、负能力、未读取项和遗漏后冻结报告。

OpenCode 报告只用于核对双方是否存在真实技术关系。执行者必须先将关系判定为 `模型上游 / provider preset / API 兼容 / 计费对象 / sidecar / 源码或运行时依赖 / 无直接关系 / 未知`，不能预设 OpenCode 是 AgentCore 的底座，也不能预设 `sidecar` 等于 OpenCode。若 OpenCode 报告尚未产出，AgentCore 报告仍可先完成，但所有跨项目结论必须保持未知。对 Magic 只做能力映射和迁移风险，不替产品文档裁定对象、流程或首版范围。
