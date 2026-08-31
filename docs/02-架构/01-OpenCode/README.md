# OpenCode 现有项目架构拆解

本目录用于拆解真实仓库 `D:\Harmess\opencode`，供架构总监建立当前版本的系统事实、运行时边界、状态与持久化模型，以及后续 Magic 适配的技术输入。本目录不是 Magic 的目标架构设计，也不修改 OpenCode 源码。

## 文件

- `opencode_architecture_prompt.md`：可直接交给架构总监/架构分析 Agent 的主提示词。
- `opencode_architecture_tools.md`：配套工具助手、实验清单和安全边界。
- 默认报告：`D:\Harmess\opencode\OPENCODE_BACKEND_ARCHITECTURE_BREAKDOWN.md`

## 基线

当前已知基线为 OpenCode `1.18.23`、`bun@1.3.14`、分支 `dev`、commit `5f5ea53afb2630227ead917f1a0ddf784c33150c`。每次执行仍必须重新核对，因为报告不能混用不同 commit 的事实。

## 使用顺序

按五轮推进：第一轮锁定版本并生成全仓 package 覆盖台账；第二轮深拆 Schema -> Core/Protocol -> Server -> Client 和 Session 主链；第三轮与前端报告交叉核查；第四轮执行可行的已有测试、隔离实验和本地实机验证；第五轮覆盖外围包、复核遗漏并冻结事实基线。对 Magic 的内容只写能力映射和适配风险，不替 Magic 做产品裁定。









