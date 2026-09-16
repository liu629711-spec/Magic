# Magic 项目规则

## 第一原则：源码证据和非服从性回复

1. 回答任何关于 Magic、OpenCode、AgentCore、DeepSeek Harness 的技术问题前，必须先查相关真实源码；禁止凭通用经验、记忆、PRD、README、`.ai_context` 摘要或项目名称推断实现。
2. 先用 CodeGraph 定位符号、调用链或影响范围，再完整阅读所需的少量源码文件。`.ai_context` 和 CodeGraph 只用于定位，真实源码是唯一实现依据。
3. 对“项目现在是不是这样做”“某功能如何实现”“参考项目用了什么方案”的回答，必须给出项目名、源码路径和具体行号。
4. 未找到源码、源码不足以证明，或仅有文档/测试线索时，必须明确说“未核实”或“待技术核查”；不得把推测包装成结论。
5. 需要借鉴参考项目时，先读参考项目源码，再读 Magic 自研源码，最后给出对比和方案。
6. 面对用户提出的问题和需求，要思考，调研，验证过之后再去给到用户答案，用户的方向有问题直接指出纠正，不可以只服从用户。
7. 不替用户做决定，不确定的内容必须先问用户，用户确定后才可以进行处理。

## 当前架构

`main` 是 DSH 插件工作区。Magic 产品能力以 Cordis 插件形式接入 DSH，不重新实现 Agent 执行底座。

产品交付形态（2026-09-16 用户裁定，PRD-01 §2.1）：**自有 Tauri 桌面客户端**（对标 Codex，界面基准 `stitch_codex_ui_clone/`）+ DSH 后台 runtime。客户端经 `dsh-sdk-client`（主干，`patches/sdk.patch.yml`）驱动 runtime，审批/文件等界面能力按需补充 Remote 通道（`dsh web` 网关）；`dsh web` 自带界面降级为开发调试通道。技术细节与验证证据见 `docs/02-实现/09-自有客户端架构.md`。旧 `old-design` 分支的 Tauri 实现仅作历史追溯，不构成约束。

| 内容 | 路径 | 用途 |
| --- | --- | --- |
| Magic 产品规则 | `docs/01-产品/PRD-01`、`PRD-02`、`PRD-04`、`PRD-05` | 唯一正式 PRD |
| Magic 插件 | `plugins/` | 自研 DSH 插件 |
| web 调试通道 overlay | `patches/web.patch.yml` | `dsh web` 调试 + Remote 网关宿主 |
| 自有客户端 runtime overlay | `patches/sdk.patch.yml` | Tauri 客户端经 SDK 驱动的 runtime 挂载清单 |
| 界面设计基准 | `stitch_codex_ui_clone/` | 自有客户端设计系统与界面稿（唯一视觉基准） |
| 参考项目 | `reference-project/` | 本地源码研究，不提交第三方完整仓 |
| 旧桌面实现 | `old-design` 分支 | 归档，仅追溯，不作为当前实现或复用来源 |

工程模式已从产品中移除（2026-09-15 用户裁定）：`magic-engineering` 插件与 PRD-03 已删除，不做长期工程组织。CEO 模式是唯一的协作组织方式。

## 修改规则

1. 用户只问问题时，只核实并回答；只有用户明确要求时才改代码或文档。
2. 改动前说明文件、依据、目的和影响范围；只做完成任务所需的最小改动。
3. 涉及共享协议、状态、权限、事件或跨项目适配时，先用 CodeGraph 查影响范围，再实施和验证。
4. 产品语义变更先改对应既有 PRD；不要新建平行 PRD。
5. 新能力优先做成 DSH 插件或 bundle patch，不要在 Magic 里复制 DSH 的 session、tool、agent-loop。
