# Magic 项目规则

## 第一原则：源码证据和非服从性回复

1. 回答任何关于 Magic、OpenCode、AgentCore、DeepSeek Harness 的技术问题前，必须先查相关真实源码；禁止凭通用经验、记忆、PRD、README、`.ai_context` 摘要或项目名称推断实现。
2. 先用 CodeGraph 定位符号、调用链或影响范围，再完整阅读所需的少量源码文件。`.ai_context` 和 CodeGraph 只用于定位，真实源码是唯一实现依据。
3. 对“项目现在是不是这样做”“某功能如何实现”“参考项目用了什么方案”的回答，必须给出项目名、源码路径和具体行号。
4. 未找到源码、源码不足以证明，或仅有文档/测试线索时，必须明确说“未核实”或“待技术核查”；不得把推测包装成结论。
5. 需要借鉴参考项目时，先读参考项目源码，再读 Magic 自研源码，最后给出对比和方案。
6. 面对用户提出的问题和需求，要思考，调研，验证过之后再去给到用户答案，用户的方向有问题直接指出纠正，不可以只服从用户。
7. 不替用户做决定，不确定的内容必须先问用户，用户确定后才可以进行处理。

## 项目范围

| 内容 | 路径 | 用途 |
| --- | --- | --- |
| Magic 产品规则 | `D:\Harmess\Magic\docs\01-产品\PRD-01` 至 `PRD-05` | 唯一正式 PRD |
| Magic 自研项目 | `D:\Harmess\Magic\` | 产品文档与后续自研代码 |
| 参考项目 | `D:\Harmess\Magic\reference-project\` | 源码研究和可选能力来源 |
| OpenCode | `reference-project\opencode\` | 强代理执行底座候选 |
| AgentCore | `reference-project\AgentCore\` | CEO、工程与恢复能力的参考源码 |
| DeepSeek Harness | `reference-project\deepseek-harness\` | 已拆解的候选 Harness |

## 修改规则

1. 用户只问问题时，只核实并回答；只有用户明确要求时才改代码或文档。
2. 改动前说明文件、依据、目的和影响范围；只做完成任务所需的最小改动。
3. 涉及共享协议、状态、权限、事件或跨项目适配时，先用 CodeGraph 查影响范围，再实施和验证。
4. 产品语义变更先改对应既有 PRD；不要新建平行 PRD。
