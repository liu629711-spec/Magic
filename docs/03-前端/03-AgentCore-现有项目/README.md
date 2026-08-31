# AgentCore 现有项目前端拆解

本目录用于拆解真实仓库 `D:\Harmess\reference-project\AgentCore` 的全部前端表面和协议消费链，供前端总监建立当前版本的页面、状态、事件、IPC 与多端边界事实，并为后续 Magic 技术会议提供迁移输入。本目录不是 Magic 前端设计，也不修改 AgentCore 或 OpenCode。

## 文件

- `existing_frontend_prompt.md`：发给前端总监/前端分析 Agent 的主提示词。
- `existing_frontend_tools.md`：与主提示词同时提供的扫描、测试、浏览器、Electron、移动端和 Unity 验收规则。
- 默认报告：`D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_FRONTEND_BREAKDOWN.md`

## 当前已知基线

- commit：`2ef9ad4c2109a122cdd3d3d0f27eb468b205360e`
- tags：`prod-2ef9ad4c2`、`desktop-v0.9.11`
- 执行时必须重新核对 HEAD、tag、branch、dirty state、Node/pnpm、Electron、Capacitor/Android 和 Unity 环境。
- Desktop/Electron 是主产品深审面；Mobile/Capacitor、Admin 分开审；AgentTown 是 Unity 实验边界；Website、Promo 和离线 preview/demo 只做外围登记，不能混为同一个“前端”。

## 使用顺序

将本 README、主提示词、工具助手按顺序交给前端总监。按五轮推进：第一轮锁定版本和全部前端表面台账；第二轮深拆 Desktop/Mobile/Admin/AgentTown 及协议状态主链；第三轮与 AgentCore 架构报告、OpenCode 报告交叉核查；第四轮按证据等级执行已有测试和安全的 Web/Electron/移动端/Unity 实验；第五轮覆盖 Website/Promo/preview 等外围表面，复核负能力、未读取项和遗漏后冻结报告。

OpenCode 只做关系核查，必须先判断双方是 provider、API 兼容、计费、sidecar、源码/运行时依赖、无直接关系还是未知，不能预设 OpenCode 是 AgentCore 底座。对 Magic 只做前端能力和心智迁移边界，不把 AgentCore 页面、Agent 或运行状态直接改名继承。









