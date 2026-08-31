# OpenCode 前端拆解工具助手

本工具助手配合 `opencode_frontend_prompt.md` 使用，服务于 `D:\Harmess\opencode` 的 Web、Electron、TUI 和共享前端现状取证。

## 1. 安全边界

- 只使用本地代码、脱敏配置、mock 数据和临时用户；不读取 `.env` 值、私钥、token、生产数据、真实用户会话或敏感日志。
- 不修改 OpenCode 源码、测试、配置、生成物和锁文件；报告写到指定报告路径。
- 浏览器或 Electron 实验只连接本地隔离服务。涉及文件、shell、Git、网络或 IPC 的操作使用 mock/临时目录和无害输入。
- 不以 UI 按钮、路由或成功截图推断后端能力；必须追到 client、protocol、API/IPC 和事件证据。

## 2. 静态分析

| 目标 | 建议动作 | 输出 |
|---|---|---|
| 文件边界 | `rg --files packages/app packages/desktop packages/tui packages/ui packages/session-ui packages/client packages/protocol`，排除依赖和构建产物 | package、入口、测试范围 |
| 路由 | 扫描 router、route definition、navigate/link、deep link 和 error boundary | 路由树、参数、守卫和入口 |
| 组件 | 用 TypeScript AST/CodeGraph 提取 component、export、import、JSX/props 和引用者 | 组件依赖图、孤立组件 |
| 状态 | 提取 Solid signal/store/context、TanStack Query、persist/cache、selector 和 reducer | 状态源、读写者、生命周期 |
| 数据链路 | 追踪 client 方法、protocol schema、fetch、SSE/WebSocket、IPC 和事件 handler | 页面到数据层调用链 |
| 桌面 | 分析 `main`、`preload`、`renderer` 的 IPC channel、handler、暴露 API、窗口和更新逻辑 | Electron 边界和安全矩阵 |
| TUI | 分析输入、渲染、client/protocol、事件和 terminal 生命周期 | TUI 与图形前端共享边界 |
| 质量 | 扫描订阅清理、异步竞态、重复 query、长列表、危险 HTML、外部链接、IPC 输入和日志 | 性能、安全、可维护性风险 |

结构问题优先用 AST/CodeGraph 回答“谁引用谁、谁消费事件”；字面量问题才用文本搜索。动态 import、字符串路由和生成代码要单独标注。

扫描开始前先生成全部 workspace package 和前端表面台账，标记 P0/P1/P2/排除、主产品/外围归属、负责人、适用 `AGENTS.md`、证据状态和未决项。台账必须包括 `app/desktop/session-ui/ui/tui`，并单独登记 `web`、Enterprise share/hosted、Console、Storybook 等实际存在的外围界面。

## 3. 浏览器与 Electron 实验

### Playwright/browser 基线

先读取对应 package 和测试目录适用的 `AGENTS.md`。在本地启动实际声明的 Web app 和隔离 API，记录 URL、viewport、commit、浏览器版本和命令。覆盖 home、new-session、session、错误页、设置、文件/review 等真实存在的路由。每个场景记录网络请求、SSE/WebSocket 帧、控制台错误、页面状态和截图路径。无法启动时记录环境阻塞，不得以静态截图替代实机验证。

### 状态实验

优先使用仓库已有 fixture 和测试能力。若必须使用 fake API/event source，只能证明前端在该 mock 输入下的行为，不能证明真实 Server 或持久化；没有现成 harness 时可在仓库外临时目录建立隔离 harness，否则标记“无法执行”。发送 loading、empty、增量 message/part、tool waiting、approval、question、todo、error、stop、cancel、disconnect、reconnect、duplicate、out-of-order、replay 和 partial completion 事件。检查 store/query 最终状态、渲染内容、滚动、草稿保留和订阅清理。特别验证 UI 没有把流结束或进程停止误当作业务任务完成。

### 交互实验

在临时项目中验证 prompt 提交、工具审批通过/拒绝、question 回答、停止/取消、重连、文件 diff/review、terminal/PTY 入口和恢复。没有实现或无法启动的场景写“尚未找到证据”，不制作假截图。

### Electron IPC 实验

在隔离窗口观察 renderer -> preload -> main -> server/OS 的调用，验证未知 channel、畸形参数、外部链接、窗口关闭、重复调用和异常返回。检查 context isolation、nodeIntegration、权限校验、channel 白名单和错误序列化。不得调用真实凭据或真实用户目录。

## 4. 测试与可访问性

- 执行 `packages/app/e2e/` 和各 package 自己声明的 browser/unit/typecheck 脚本，记录通过、失败、跳过和环境阻塞。
- 关键交互检查键盘可达、焦点移动、ARIA/语义元素、对比度、缩放、窄 viewport、长文本和错误提示；结论必须附 DOM/测试证据。
- Mermaid 校验路由树、页面/组件依赖、数据链路和事件时序；图中实线为代码/测试/实机证据，虚线为推断。

## 5. 记录模板

```text
实验 ID：
commit：
package/入口：
环境、URL、viewport 或 Electron 窗口：
mock/临时数据：
用户操作和事件输入：
网络/IPC/状态/DOM 观察：
结果：通过 / 失败 / 不适用 / 无法执行
证据级别：静态代码 / 仓库已有测试 / 仓库外隔离 harness或 mock / 真实本地 Web、Electron 或 TUI
截图或测试证据：
限制与后续核查：
```

## 6. 完成检查

- [ ] Web/Electron/TUI/共享包边界和版本已锁定。
- [ ] 全仓 package/前端表面均已标记 P0/P1/P2/排除，主产品与外围前端已分开。
- [ ] 根目录和所有适用的子目录 `AGENTS.md` 已读取并记录。
- [ ] 路由树、页面、组件、hook/store、client/protocol 已有证据。
- [ ] `packages/schema` 和 V1/V2/Legacy/Experimental/生成客户端兼容矩阵已核查。
- [ ] SSE/WebSocket/事件消费、缓存和状态收敛已追踪。
- [ ] Legacy/EventV2/SSE/WebSocket/PTY/live-only 与各数据域已分层建账。
- [ ] session v1/v2、流式、审批、question、todo、停止、取消和恢复已核查。
- [ ] main/preload/renderer IPC 与安全边界已核查。
- [ ] Playwright/browser/unit 测试结果真实记录，环境阻塞没有伪装成通过。
- [ ] 响应式、主题、可访问性、性能和维护风险已扫描。
- [ ] 负能力矩阵和未读取/未执行/剩余未知台账已完成。
- [ ] Magic 复用建议与 OpenCode 页面和对象事实分开。
- [ ] 没有泄露敏感配置或真实用户数据。









