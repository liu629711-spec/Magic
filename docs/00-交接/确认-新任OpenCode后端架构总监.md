# 新任 OpenCode 后端架构总监交接阅读确认

## 已读文件

1. `D:\Harmess\Magic\docs\00-交接\README.md`
2. `D:\Harmess\Magic\docs\00-交接\01-OpenCode-后端架构总监交接.md`
3. `D:\Harmess\opencode\OPENCODE_BACKEND_ARCHITECTURE_BREAKDOWN.md`
4. `D:\Harmess\Magic\docs\01-产品\Magic最终产品裁定与技术会议输入.md`
5. `D:\Harmess\Magic\docs\02-架构\02-Magic-目标项目\PRODUCT_TECH_ALIGNMENT_BASELINE.md`

## 确认的三项事实

1. OpenCode 提供 Session、Message、Event、Tool、Git/worktree 等执行事实，但不定义 Magic 的任务、长期身份、成员关系、PM 或最终交付状态；Magic 必须独立持有产品对象、责任与最终收口账本。
2. OpenCode 当前是 Legacy V1 与 EventV2/V2 Session Core 并存的迁移态，且存在两套不能默认等价的 `serve` HTTP 运行时；`TaskAttempt` 必须绑定锁定的 canonical runtime 和协议契约。
3. `MagicTask`、`TaskAttempt`、OpenCode Run/Session、连接同步、审批、产物、副作用和责任必须分层；底层 `idle`/结束、工具成功、文件写入或 SSE 断开都不能单独推导 Magic 任务成功。

## 仍未知的两项

1. Magic 首版最终选用并锁定的 OpenCode runtime、commit/tag、protocol 和 client artifact 尚未确定；实际部署使用哪套监听器及其认证、路由和文档契约也尚未完成实机确认。
2. 断连/重连、进程重启、重复/乱序/缺失事件、重试、停止/取消、审批恢复与已发生外部副作用组合场景下的端到端收敛仍未实测证明。

## 我理解的 F-10 责任

F-10 是首版唯一的组合技术阻塞。我负责先锁定 OpenCode runtime、commit/tag 与 canonical protocol/client contract，再明确 `RootExecutionBinding`、事件 envelope、幂等键、快照/恢复字段和 Adapter 输入边界；随后建立可重复的端到端实验，证明同一 `MagicTask` / `TaskAttempt` 在断连、重启、事件异常、重试、停止、审批和外部副作用后的最终收敛，并交付可复现证据与 Go/No-Go 结论。源码存在、测试资产、历史报告或 AgentCore 试运行经验都不代替该实机证据。

## 接任后的首个工作项

建立 OpenCode 首版底座锁定记录：确定唯一 canonical runtime，锁定 commit/tag、protocol 与 client artifact，并为启动入口、路由、认证、事件和 Session 契约建立可复现基线，作为 F-10 实验的前置输入。
