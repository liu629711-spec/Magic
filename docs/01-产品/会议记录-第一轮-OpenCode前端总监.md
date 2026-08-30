# 第1轮正式发言

> 角色：Magic OpenCode 项目前端技术总监
>
> 范围：OpenCode 前端复用，以及 Magic 状态、事件、回放、错误、责任、模式和工程信息的呈现与交互契约。
>
> 证据基线：OpenCode `dev` 分支，commit `5f5ea53afb2630227ead917f1a0ddf784c33150c`，报告版本对应 OpenCode `1.18.23`。

## 一、事实与证据

### 1. 已实现

源码证据：`D:\Harmess\opencode\packages\app\src\app.tsx:615-666` 已实现 Home、draft、session、server/session 路由，并存在新旧布局分支。`D:\Harmess\opencode\packages\app\src\pages\session.tsx` 已实现 timeline、composer、review、terminal、revert 等工作区交互。

源码证据：`D:\Harmess\opencode\packages\app\src\context\server-sync.tsx`、`server-session.ts`、`server-session-v2-reducer.ts` 已形成 query、store、事件 reducer、optimistic update 和 rollback 链路。`D:\Harmess\opencode\packages\app\src\context\permission.tsx`、`pages\session\composer\session-permission-dock.tsx`、`session-question-dock.tsx`、`session-todo-dock.tsx` 已形成权限、问题和 todo 的交互入口。

源码证据：`D:\Harmess\opencode\packages\desktop\src\main`、`preload`、`renderer` 已实现 Electron 窗口、sidecar、WSL、deep link、updater 和 renderer 复用 App；preload 通过 `contextBridge` 暴露白名单 API。`D:\Harmess\opencode\packages\tui\src` 已实现独立 OpenTUI/Solid 工作台，但不复用浏览器 DOM 页面。

报告证据：`D:\Harmess\opencode\OPENCODE_FRONTEND_ARCHITECTURE_BREAKDOWN.md` 第 3 至 10 节、第 13 节，已登记 Web、Electron、TUI、共享 UI、session UI、client、protocol、schema、事件消费和六条关键 UI 流。

### 2. 已验证

测试结果证据：Desktop 安全/订阅相关测试实际通过 `5 passed`；Console app server-action referer 测试实际通过 `3 passed`。

测试资产证据：仓库存在 App E2E、timeline、transport、permission、review、terminal、性能和可访问性测试资产。这只能证明测试覆盖意图，不能证明本轮真实运行通过。

验证边界：本轮没有完成 Web、Electron、TUI、全量 Playwright、真实断连、重复事件、乱序事件、PTY、多窗口和生产式构建验证。App 单测受 `@happy-dom/global-registrator` 缺失阻塞，typecheck 受 `tsgo` 缺失阻塞。

报告证据：报告第 12 节和第 16 节明确区分了测试资产、实际通过结果和未执行项。

### 3. 仅设计

产品证据：`D:\Harmess\Magic\docs\01-产品\Magic产品系统边界与生命周期底图.md` 设计了工程、PM、项目成员、会话、任务、子任务、回合、运行实例、共享事实、产物和权限的分层。

产品证据：`D:\Harmess\Magic\docs\01-产品\Magic最终产品裁定与技术会议输入.md:180-236` 建议由 Magic 任务账本保存产品任务的权威状态，OpenCode 运行事件、工具结果和 AgentCore 机制只作为运行证据。

产品建议：代理方式和 CEO 方式是平等的会话工作方式，工程是长期组织形态。前端应展示这三个概念的关系，但不能将 OpenCode 的 session、agent、task、run 名称直接变成 Magic 用户对象。

### 4. 未知

源码和报告证据：OpenCode 当前可以呈现 parent/child session、step、tool、permission 以及 V1/V2 事件，但没有足够证据证明它们等同 Magic 的成员、任务、责任或工程对象。

源码证据：`D:\Harmess\opencode\packages\opencode\src\server\routes\instance\httpapi\handlers\event.ts:25-99` 的全局 `/api/event` SSE handler 会建立 listener、发送 connected/heartbeat，但其本身不等于完整 durable replay；session history 需要另行参与恢复。

尚未确认：OpenCode session 与 Magic session 的基数；子 Agent 的长期复用边界；运行 ID 是否稳定；断线补偿、重试、并发冲突、审批恢复和副作用登记；OpenCode `1.18.23` 与 App 显式 vendor client `1.17.13-v2` 的生成物和协议等价性。

## 二、对 Magic 产品基线的修正或澄清

### 1. 任务账本必须从“建议”提升为首版不变量

源码证据：OpenCode UI 会依据 `idle`、`busy`、`retry`、`admitted`、`ended` 和 tool result 更新界面，见 `D:\Harmess\opencode\packages\app\src\context\server-session-v2-reducer.ts` 和 `session-status-event.ts`。

报告证据：报告第 7、8、13 节已指出这些状态不能直接代表 Magic 任务完成。

产品建议：明确 Magic 任务账本是唯一产品状态真相源，底座事件只负责提供运行证据。推断：如果继续保持“建议”口径，前端很容易出现“运行结束即任务完成”的错误心智。

### 2. 必须冻结 Magic 会话、任务、回合和 OpenCode session 的基数关系

源码证据：OpenCode 当前以 session、message、part、child session 组织 UI，未发现与 Magic 任务账本等价的产品对象。

报告证据：报告第 6、7、16 节将该问题列为未知。

产品建议：明确一个任务是否可跨多个回合、多个 OpenCode session 和多个运行实例，子任务是否必须拥有独立任务会话。推断：该问题不确定将直接阻塞路由、缓存 key、事件归属、恢复和历史展示。

### 3. “切换模式”必须拆成任务级和会话默认级两个操作

产品证据：Magic 基线已区分“当前任务使用 CEO”和“修改会话默认工作方式”。

源码证据：OpenCode 有 agent/model/session 操作，但没有 Magic 代理/CEO 作用域。

产品建议：UI 必须明确作用范围、持续时间、当前运行处理和完成后的回退方式；执行中只允许在稳定边界移交。推断：一个笼统的“切换模式”按钮会把当前任务、未来任务和工程默认值互相污染。

### 4. “唯一当前责任人”需要补充父子任务展示规则

产品证据：生命周期底图要求正式任务任一时刻只有一名当前责任人，同时区分 PM、会话主 Agent 和成员责任。

报告证据：OpenCode 的 parent/child lineage 只能证明执行层级，不能证明 Magic 责任层级。

产品建议：明确成员对成员任务负责，PM 对计划和项目汇总负责，会话主 Agent 对用户侧交付负责。推断：不补充该规则，UI 会同时显示多个“负责人”，但用户不知道谁必须最终收口。

### 5. 用户直达成员必须进入统一任务账本

产品证据：Magic 基线规定用户直达成员产生的新任务必须入账，影响工程目标时通知 PM。

源码证据：OpenCode composer 和 child session 能够发起新输入，但没有 Magic 工程账本、PM 通知和冲突判断证据。

产品建议：明确新任务的创建、归属、责任人、冲突处理和 PM 通知是否需要确认。推断：如果允许私下直达而不入账，工程总览必然不完整。

### 6. 断连、等待、停止和取消必须拆成可解释状态

源码证据：OpenCode 同时存在 session status、SSE generation、permission/question pending、PTY 状态和 query cache。

报告证据：报告第 6、7、8 节指出断连后的完整回放仍未实机验证。

产品建议：UI 至少分别呈现任务状态、运行状态、连接状态、审批状态、同步缺口和已发生副作用。推断：“运行中但断连”不能显示成失败；“运行停止但文件已写入”不能显示成撤销。

### 7. 权限确认必须展示授权边界和副作用

源码证据：`D:\Harmess\opencode\packages\app\src\context\permission.tsx` 和 `session-permission-dock.tsx` 支持 allow/deny，但主要是底座审批交互。

报告证据：报告第 9、13、15 节区分了工具可见性、执行授权和安全审计。

产品建议：Magic 需要定义主体、资源、动作、范围、时效、成本和副作用等级。推断：只复用 OpenCode permission dock，不足以形成 Magic 的权限产品。

## 三、与另外三位总监的接口问题

### 与主产品经理

依赖内容：请裁定 U-01 至 U-12 中影响首版的项目，优先裁定任务账本真相源、模式作用域、用户直达成员、共享事实权威和权限继承。

需要的证据：每项裁定说明作用范围、生命周期、用户是否确认、冲突时默认行为和需要回写的文档。

前端依赖：路由、入口文案、确认弹窗、默认值、通知、状态标签和权限界面都依赖这些结果。产品建议不能替代用户裁定。

### 与责任闭环、共享事实方向总监

依赖内容：请提供任务状态机、责任移交记录、父子任务收口规则、事实版本状态和产物验收条件。

需要的证据：至少覆盖成员失败、部分完成、用户直达成员、PM 交接、任务重试和事实撤销场景。

前端依赖：任务列表、任务详情、责任人展示、事实冲突、产物状态和最终收口页面。没有这些状态契约，前端只能展示运行日志，不能展示可信任务状态。

### 与自然体验、旧产品方向总监

依赖内容：请提供真实场景中哪些协作信息应默认展示、哪些应折叠，以及用户何时主动展开 CEO 视图。

需要的证据：代理直答、单次 CEO、成员直达、审批等待、失败恢复和断连恢复的用户试运行观察。

前端依赖：首屏信息密度、协作图是否默认展开、通知频率、错误解释和用户介入时机。组件存在或截图不能替代用户场景证据。

## 四、首版 Go/No-Go 门槛与阻塞产品问题

当前判断：**Magic 产品方向 Go；首版开发冻结 No-Go。**这不是否定产品方向，而是首版关键能力仍存在“仍未知”和未决产品契约。

### Go 门槛

1. OpenCode commit、client artifact、协议版本和生成链锁定。
2. U-01、U-02、U-03、U-04、U-05、U-06、U-08、U-09 完成用户裁定并回写。
3. Magic 任务状态与 OpenCode 运行状态拥有独立模型和明确映射。
4. 通过真实验证证明断连、重复事件、乱序事件、进程重启、重试和审批恢复能够最终收敛。
5. 权限、成本、副作用和撤销边界形成可执行方案。
6. UI 能准确展示当前责任人、任务最终状态、运行状态、产物和证据来源。
7. “完成”必须有 Magic 任务或产物验收依据，不能由 `idle`、`ended`、tool success 或文件写入推断。

证据要求：每项能力只能标记为“原生满足、适配后满足、Magic 需补建、当前不支持、仍未知”，并附版本、复现、限制、负责人和验收标准。这一要求来自 `D:\Harmess\Magic\docs\01-产品\技术会议议题与裁定表.md:31-48`。

### No-Go 条件

- 仍把 OpenCode session、run、agent 或 child session 直接当 Magic 对象。
- 没有事件 ID、幂等策略、回放游标和缺口修复。
- `idle`、`ended`、tool success 或文件写入被直接渲染为任务成功。
- 用户直达成员可以绕过工程任务账本。
- 模式切换承诺执行中无损重编排。
- 任一首版关键能力仍为“仍未知”。

源码/报告证据：以上风险分别对应报告第 6、7、8、13、14、15、16 节；产品建议：未通过这些门槛不应冻结数据库、接口、完整状态机和排期。

### 阻塞产品问题

- Magic session 与 OpenCode session 是一对一还是一对多。
- 一个任务能否跨多个 OpenCode session 和运行实例。
- 运行重试是否生成新运行实例，模式移交是否生成新回合或新运行。
- 用户直达成员与 PM 计划冲突时如何处理。
- 哪些产物可以进入验收，哪些只能作为运行结果。
- 权限、成本和共享事实如何继承到任务与成员。

这些不是页面偏好，而是会改变前端路由、缓存、事件订阅、状态机和错误收口的产品决策。

## 五、首版必须做、可延后、明确不做

### 必须做

产品建议：建立 Magic 自有 facade 和任务账本，承载工程、PM、成员、任务、回合、运行实例、事实、产物和权限。

源码/报告证据：OpenCode 的 `packages/ui`、`session-ui`、App Provider、query/event sync、timeline、diff 和 permission dock 可作为技术基础，但报告第 14 节明确它们需要领域适配。

首版前端必须提供：工程总览、任务账本、任务详情、成员负载、阻塞/审批、产物、事实来源、模式作用域确认，以及断连、同步缺口和已发生副作用的可见状态。

事件层必须采用“查询快照 + durable 事件 + live 事件 + 缺口修复”分层，并为事件定义版本、ID、幂等键、游标和重放边界。OpenCode 的 V1/V2 reducer 可以借鉴，不能直接作为 Magic 领域状态机。

### 可延后

产品建议：Electron sidecar、WSL、TUI、VS Code、Hosted share、Stats、Console 支持台、多层 PM、多人协作、跨工程调用、复杂记忆共享和圆桌会议。

报告证据：报告第 11、14、16 节显示这些表面与 Magic 首版闭环没有直接必要关系，且多数尚未完成真实运行验证。延后不表示否定价值，而是避免首版把平台工程和产品责任同时冻结。

### 明确不做

产品建议：不因 Agent 数量、耗时或复杂度自动进入 CEO 或建立工程；不把运行成功当任务成功；不把文件、摘要或模型输出自动提升为共享事实；不以工具目录可见性替代执行授权；不把同账号多端跟播当多人协作权限模型。

源码/报告证据：OpenCode 当前源码只能证明 session、message、part、tool、permission 和 event 消费链存在，不能证明 Magic 的长期身份、项目责任和工程治理。

明确反对把 OpenCode `session`、`agent`、`task`、`run` 直接暴露为 Magic 用户对象。推断：一旦沿用这些同名对象，底座实现捷径会被固化成 Magic 产品模型，后续将同时破坏责任、权限、回放和用户解释能力。
