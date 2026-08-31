# OpenCode 现有项目前端拆解

本目录用于拆解真实仓库 `D:\Harmess\opencode` 的 Web/桌面共享前端、Electron 壳、TUI、共享 UI 和客户端协议消费。它不是 Magic 的页面设计，也不修改 OpenCode 源码。

## 文件

- `opencode_frontend_prompt.md`：可直接交给前端总监/前端分析 Agent 的主提示词。
- `opencode_frontend_tools.md`：配套扫描、浏览器、Playwright、IPC 和状态实验助手。
- 默认报告：`D:\Harmess\opencode\OPENCODE_FRONTEND_ARCHITECTURE_BREAKDOWN.md`

## 基线

当前已知基线为 OpenCode `1.18.23`、`bun@1.3.14`、分支 `dev`、commit `5f5ea53afb2630227ead917f1a0ddf784c33150c`。执行前必须重新核对，不能把不同 commit 的页面、协议和测试结果混写。

## 使用顺序

按五轮推进：第一轮锁定版本并盘点全部前端表面；第二轮深拆 App/Desktop/TUI、Schema/Client 和 Session UI 主链；第三轮与架构报告交叉核查事件和状态；第四轮执行可行测试及本地 Web/Electron/TUI 验证；第五轮覆盖外围界面、复核遗漏并输出事实报告与 Magic 复用边界。









