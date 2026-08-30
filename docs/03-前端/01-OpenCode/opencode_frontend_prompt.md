# OpenCode 现有项目全端前端架构拆解提示词

## 角色与目标

你是 OpenCode 项目的前端架构审阅总监。请基于真实代码、协议、测试和安全的本地浏览器/桌面实验，拆解 OpenCode 当前 Web、Electron 桌面端、共享 UI、session UI、客户端和 TUI 的真实架构。报告服务于后续 Magic 的技术适配，不把 OpenCode 页面直接定义为 Magic 产品页面。

代码事实优先于 README、截图、设计稿和组件命名。不能因为 UI 中出现 session、agent、tool、task、run 等文字，就把它们解释成 Magic 的工程、任务、成员、事实、产物或责任对象。

## 固定输入与输出

- 项目路径：`D:\Harmess\opencode`
- 重点目录：
  - `packages/app/src/`
  - `packages/app/e2e/`
  - `packages/desktop/src/renderer/`
  - `packages/desktop/src/main/`
  - `packages/desktop/src/preload/`
  - `packages/tui/src/`
  - `packages/ui/src/`
  - `packages/session-ui/src/`
  - `packages/client/src/`
  - `packages/protocol/src/`
  - `packages/schema/src/`
- 外围前端登记：`packages/web/`、`packages/enterprise/` 中的 share/hosted 界面、`packages/console/`、`packages/storybook/` 及其他实际发现的前端入口
- 关联后端：只按前端调用链定向读取 `packages/server/src/`、`packages/core/src/`、`packages/opencode/src/`
- 默认报告：`D:\Harmess\opencode\OPENCODE_FRONTEND_ARCHITECTURE_BREAKDOWN.md`
- 禁止修改 OpenCode 源码、测试、配置和生成物；禁止读取 `.env` 值、密钥、token、生产数据和真实用户会话

开始时先输出不超过 20 行的“前端核查基线”：commit、分支、版本、运行时、包、Web/桌面/TUI 范围、浏览器/桌面可运行性、测试限制和排除项。

## 证据纪律

每条结论附：

```text
状态：代码已实现 / 文档或 spec 已声明但代码未确认 / 测试已验证 / 浏览器或实机已验证 / 代码与文档不一致 / 尚未找到证据 / 不适用
证据类型：代码事实 / 文档事实 / 测试结果 / 浏览器观察 / 推断 / 建议
证据：绝对路径 + route、组件、hook、store、type、函数、测试名、行号或复现步骤
置信度：高 / 中 / 低
```

截图只能证明某个环境下的视觉结果，不能证明所有状态和后端能力。组件存在不等于被路由使用，API 类型存在不等于请求成功，事件被消费不等于状态最终正确。报告必须明确静态证据、测试证据和浏览器/桌面实机证据的差异。

## 执行范围与重点

开始深审前，先枚举全部 workspace package 和前端入口。每个 package/应用表面必须标记为：`P0 主产品深审`、`P1 协议/依赖核查`、`P2 外围表面登记`或`排除`，排除必须写理由。主产品表面 `app/desktop/session-ui/ui/tui` 与 `web`、Enterprise share/hosted、Console、Storybook 等外围表面必须分开，不能都笼统称为“Web 前端”。

读取根目录和所有适用于当前范围的子目录 `AGENTS.md`，至少核查 `packages/app`、`packages/app/e2e`、`packages/app/e2e/performance`、`packages/desktop`、`packages/ui`、`packages/session-ui`、`packages/schema` 及实际测试目录的局部约束，并在报告中列出已读取文件。

### 1. 应用边界与启动

核对 Web app、Electron main/preload/renderer、TUI、共享 UI/session UI、client/protocol 的入口、构建、运行和依赖边界。说明 Web 与桌面是否共享页面和状态，Electron IPC 传递什么，哪些能力只能在 main，preload 暴露的 API 如何限制，窗口生命周期、原生菜单、更新、协议、外部链接和安全策略如何实现。说明 TUI 是否共享协议、client、核心状态或仅共享概念。

建立 V1、current/V2、Legacy、Experimental、generated client、vendor client、SDK、Server route 和 UI consumer 的兼容关系矩阵；类型同名或 UI 可渲染不等于协议兼容。

### 2. 路由、页面与布局

生成真实路由树和页面清单，至少核查 home、new-session、session、error、项目/工作区、设置、文件、review、终端和分享入口。对每个路由记录进入条件、参数、数据请求、订阅事件、可操作动作、返回/刷新/深链接行为，以及 loading、empty、error、no permission、断连、重连、停止、取消、失败、部分完成和完成状态。

### 3. Session UI 与核心交互

重点分析 `packages/app/src/pages/session/` 以及 composer、timeline、file tabs、review、terminal、permission、question、todo、tool call、message、part/block 的组件树和状态收敛。分别核查 session v1/v2 UI 差异，消息流如何增量渲染、折叠、排序、去重和恢复，工具调用如何显示审批/输入/输出/失败，UI 是否把“运行停止/流结束”误显示为“任务完成”。

### 4. 数据层与事件

追踪页面 -> component -> hook/context/store -> client -> protocol/API -> SSE/WebSocket -> reducer/query cache -> render 的完整调用链。核查 Solid 响应式状态、TanStack Query、signals/stores、缓存、selector、草稿和本地持久化的真实使用。记录事件名称、schema、订阅建立/清理、重连、断点、重复/乱序处理、事件与 query 数据冲突时的优先级。

把 Legacy event、EventV2、durable replay、SSE、WebSocket、PTY 和 live-only fragment 分层记录，并区分 V1/V2/App/Desktop/Hosted 数据。明确哪些状态来自持久事实、查询快照、实时传输、前端推导或仅当前进程内存在。

### 5. 文件、工具和平台能力

核查文件树、diff、review、snapshot、Git、PTY、LSP、MCP、插件、技能、设置和权限在前端的入口与状态。对 shell、文件写入、网络和 Git 只记录 UI 触发到 API/IPC 的边界，不因按钮存在就宣称后端成功或安全。区分 Web API、Electron IPC、TUI 输入输出和服务端事件。

### 6. 测试与质量

核对 `packages/app/e2e/`、browser tests、unit tests、组件测试、client/protocol 测试和性能测试的真实覆盖。读取每个 package 的脚本和适用 `AGENTS.md` 后执行可安全执行的 Playwright/browser/unit/typecheck，不能从根目录假设统一测试，也不能假设各包脚本相同。记录 package、命令、commit、结果和环境。

每个验证项只能标记为：`静态代码确认`、`仓库已有测试确认`、`仓库外隔离 harness/mock 确认`、`真实本地 Web/Electron/TUI 确认`或`无法执行`。mock 页面不能证明真实 Server、认证、重连和持久化正确；启动成功和截图也不能证明业务闭环、状态机或错误路径正确。

扫描主题/design token、组件库、响应式、键盘、焦点、语义标签、对比度、国际化、错误边界、长文本、长列表、流式重渲染、订阅泄漏和 IPC 权限风险。

### 7. 负能力与覆盖复核

建立前端负能力矩阵，统一标注：`完整实现`、`部分实现`、`延期/预留`、`明确不支持`、`实验性`、`未知`和`不适用`。定向核查 `specs/v2` 和相关规范，但不能把 spec 声明写成已实现页面或能力。

正式结论前，对照全仓 package/前端表面台账、未读取文件、排除理由、未执行实验和架构报告做交叉复核。报告覆盖比例和剩余未知，不承诺绝对无遗漏。

## 六条关键 UI 流

对每条流使用“用户操作 -> 路由/组件 -> hook/store/query -> client/API/IPC -> SSE/WebSocket/event -> 状态收敛 -> UI 结果”的格式，并附文件和符号证据：

1. 打开项目、创建 session、输入 prompt、提交和恢复。
2. 模型流式输出、message/part 增量渲染、完成/失败/部分完成。
3. 工具调用、审批通过/拒绝、question、todo 和结果展示。
4. agent 委派或多步执行在前端如何呈现，不能凭名称补充不存在的语义。
5. stop/cancel、浏览器关闭、Electron 窗口关闭、断连、重连、事件 replay。
6. 文件变更、diff/review、终端/PTY、恢复和最终交付状态。

## 报告结构

默认生成 `D:\Harmess\opencode\OPENCODE_FRONTEND_ARCHITECTURE_BREAKDOWN.md`，至少包含：

1. 版本、运行环境、扫描范围、排除项和证据边界。
2. 全仓前端表面覆盖台账，以及 Web/Electron/TUI/外围应用/共享包边界、启动和依赖拓扑。
3. 路由树、页面清单、layout 和入口状态。
4. 页面、组件、hook、context、store、query、client、protocol、API、事件清单。
5. 页面到数据层调用链和事件消费/状态收敛路径。
6. session/message/part/tool/permission/question/todo/run 状态到 UI 的映射。
7. session v1/v2 UI 差异、流式渲染、停止/取消/恢复和断连重连。
8. 文件、diff、review、terminal、PTY、LSP、MCP、插件、设置和分享边界。
9. 六条关键用户流的证据链和 Mermaid 路由/组件/事件时序图。
10. Electron IPC、main/preload/renderer 生命周期、安全和权限边界。
11. Playwright/browser/unit/性能测试覆盖、执行结果和缺口。
12. 性能、可访问性、响应式、主题、工程化、维护和安全风险。
13. 统一能力与负能力矩阵，以及面向 Magic 的复用矩阵：可直接复用、需要适配、必须重建、不可直接迁移、仍未知。
14. 未决问题、实机复现步骤和下一轮核查清单。
15. 未读取/排除/未执行台账、覆盖率说明和遗漏复核结果。

统一条目格式：

```text
### <页面、组件、状态或数据流>
状态：...
证据类型：...
证据：...
现状：...
调用/状态路径：...
差异与限制：...
风险与测试缺口：...
面向 Magic：可直接复用 / 需要适配 / 必须重建 / 不可直接迁移 / 仍未知
```

报告最后附“未读取文件和原因”“未执行测试/实机实验和原因”“敏感信息排除说明”。
