---
status: active
version: 2.0
date: 2026-09-04
authority: frontend-design
---

# Magic 前端方案 V1

## 1. 产品边界

Magic 是独立桌面 Agent 产品。DSH 负责会话、模型、工具和执行；Magic 负责产品界面、会话管理、工程归属、工作区、产品产出和后续治理。

前端只调用 Magic Local Service，不直连 DSH Web UI、Remote API 或 launch token。Magic 不嵌入 DSH Web UI，也不复制 DSH 的 transcript。

## 2. 默认工作流

用户进入 Magic 后直接处于会话工作区：

1. 点击“新会话”即创建并打开一个 DSH Session；不是创建 Task。
2. 用户在底部 Composer 发送消息，消息投递到当前 DSH Session。
3. Magic 从 `session/follow` 日志读取用户消息、Agent 回复和执行过程。
4. 只有需要独立责任、验收、定时、协作或重试治理时，才在关联会话中创建 Magic Task 和 Attempt。

Task 不是左侧默认导航，也不是普通对话的前置条件。

## 3. 布局与交互

界面以 `DESIGN.md`、`UI mockup/` 和成熟桌面 Agent 的已确认区域映射为准：连续三栏，不做 IDE 布局。

```text
┌──────────────────────────────────────────────────────────────────┐
│ Magic                                           窗口最小化/还原/关闭 │
├───────────────┬────────────────────────────────┬─────────────────┤
│ 会话导航       │ 当前会话                         │ 按需工作区       │
│ 新会话 / 搜索  │ 用户消息在右，Agent 在左          │ 文件/终端/Diff   │
│ 自动化 / 插件  │ Composer + 模型选择               │ 关闭时不切断主区 │
│ 置顶/工程/项目/最近 │                                │                 │
└───────────────┴────────────────────────────────┴─────────────────┘
```

- 左栏：会话分为置顶、工程、项目、最近。仅当前会话使用激活色；悬停显示摘要和置顶操作。工程和项目使用文件夹图标。
- 中栏：对话宽度有稳定阅读范围。当前会话运行时，列表项显示加载状态；用户消息右对齐，Agent 消息左对齐。
- 右栏：是中栏的按需延展工作区，不是独立页面。左右栏可拖动；到临界值自动收纳，收纳按钮固定在各自外侧。
- 顶栏：显示 Magic，不显示“工作”下拉。窗口控制属于连续标题栏。
- 搜索：点击后使用弹窗搜索会话标题和内容，不占左栏常驻空间。

## 4. 会话数据

DSH 是会话与消息的权威来源：

| Magic API | DSH 映射 | 前端用途 |
|---|---|---|
| `GET /api/sessions` | `session/list` | 左侧会话列表 |
| `POST /api/sessions` | `session/create` | 新会话 |
| `GET /api/sessions/{id}/messages` | `session/follow` snapshot | 加载对话 |
| `POST /api/sessions/{id}/messages` | `session/prompt` | 发送输入 |
| `GET /api/sessions/status` | session projection | 执行中状态 |

前端将 DSH `user/message` 渲染为用户消息，将 `assistant/message` 渲染为 Agent 消息。`turn/end` 的 `completed`、`error`、`aborted` 分别驱动成功、失败、取消状态；其他原因不能假装为完成。

## 5. 模型与供应商

Composer 旁的模型入口用于会话级选择：先展示供应商，悬停供应商后在其右侧展开模型菜单，菜单按内容宽度自适应并右对齐。模型选择不应要求用户每次进入设置。

设置页的“模型与供应商”通过 Magic Local Service 调用 DSH 的受鉴权 Remote API：读取红脱敏设置与当前模型目录，保存/修改 `llm-pi-ai` 供应商配置，测试草稿端点的模型发现，并将选择写入当前 Session。API Key 只单向写入 DSH credential store，不能回传、落库或写日志。模型选择器只展示 DSH 当前可路由的模型；没有可用模型时必须诚实展示空态。

## 6. Magic 扩展

Magic 保存只属于自己的元数据，例如置顶、工程和项目归属。它们以 DSH `session_id` 为关联键，不复制底座消息或工具过程。

插件入口属于 Magic 产品界面。V1 可以管理经过批准的 DSH Bundle/Profile；市场展示、安装授权、失败处理和产品说明仍属于 Magic，不能把第三方 DSH 市场直接当作 Magic 插件市场。

## 7. 运行与错误状态

- Local Service 未连接：显示“本地服务不可连接”。
- DSH 无法启动或初始化：显示“DSH 服务未启动或初始化失败”。
- 会话加载失败：保留当前界面与重试入口，不清空已有消息。
- 模型或供应商未配置：说明该会话不能执行，不伪造回复。
- 运行中：会话列表显示加载效果，Composer 和对话流保持可读。

窗口关闭不等于取消会话或 Attempt。恢复后重新读取 Magic 状态与 DSH 会话日志；没有终态证据时，受治理 Attempt 只能进入或保持 `unknown_after_restart`，不能推断成功。

## 8. V1 已完成与待完成

| 状态 | 内容 |
|---|---|
| 已完成 | Codex 风格三栏界面、会话列表与 Composer、DSH 本地服务启动、会话创建/列表/消息代理、DSH 日志解析、模型目录/供应商配置/会话级模型选择代理、Attempt 绑定与基础对账 |
| 待完成 | 已配置模型的真实执行与工具调用全链路、置顶/工程/项目元数据持久化、搜索索引、右侧文件/Diff/终端、插件安装与授权、正式打包与升级 |

## 9. 验收顺序

1. 使用用户配置的模型完成真实执行：发送、工具调用、取消、失败、重启后会话恢复。
3. 将会话管理元数据从界面状态接入 SQLite。
4. 接入右侧工作区和插件安装流程。
5. 固定 DSH 版本，完成打包、升级、Safe Mode 和端到端回归。
