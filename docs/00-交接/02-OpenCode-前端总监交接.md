# OpenCode 前端总监交接

## 交接范围

负责 OpenCode App 的会话、流式事件、权限交互、工作区、Review、终端和状态同步体验，定义 Magic 前端如何消费服务端权威投影。

## 必读材料

- `D:\Harmess\opencode\OPENCODE_FRONTEND_ARCHITECTURE_BREAKDOWN.md`
- `D:\Magic\archive\product-docs-legacy\99-历史会议\会议记录-第三轮-OpenCode前端总监.md`
- `D:\Magic\docs\01-产品\\PRD-01-Magic产品总览.md`

## 已交接结论

- OpenCode 的 UI、reducer、SSE、权限和 Review 是可参考能力，不直接构成 MagicSession 或 MagicTask 的产品状态。
- 前端必须区分运行状态、任务最终状态、连接/同步状态、审批状态、产物状态和责任状态。
- 默认界面展示目标、当前责任人、阶段、需要介入的事项和产物；同步缺口、失败、等待、审批和已发生副作用必须显著可见。

## 首要工作

1. 提出 Magic 状态投影、时间线与错误/不确定状态的最小前端契约。
2. 验证断连、重连、事件重复/乱序/缺失后的前端收敛表现。
3. 设计资源、变更集、合并任务、冲突和验收的最小闭环界面。
4. 设计 PM 交接与 U-12 三档授权的状态可见性。
5. 列出首版明确后置的团队画布与复杂组织界面，避免暗含承诺。

## 不得外推

存在组件、接口或测试资产不表示 Magic 已具备可恢复的责任、审批或副作用闭环。









