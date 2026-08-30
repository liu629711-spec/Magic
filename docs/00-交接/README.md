# Magic 技术总监交接包

本目录用于五个技术总监岗位的可追溯交接。每份岗位包都区分原始事实来源、产品约束、首版责任与未证实边界；它们不是新的技术实现结论。

## 岗位与交接文件

| 岗位 | 交接文件 | 原始主报告 |
|---|---|---|
| OpenCode 后端架构 | `01-OpenCode-后端架构总监交接.md` | `D:\Harmess\opencode\OPENCODE_BACKEND_ARCHITECTURE_BREAKDOWN.md` |
| OpenCode 前端 | `02-OpenCode-前端总监交接.md` | `D:\Harmess\opencode\OPENCODE_FRONTEND_ARCHITECTURE_BREAKDOWN.md` |
| AgentCore 后端架构 | `03-AgentCore-后端架构总监交接.md` | `D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_BACKEND_BREAKDOWN.md` |
| AgentCore 前端 | `04-AgentCore-前端总监交接.md` | `D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_FRONTEND_BREAKDOWN.md` |
| AI 核心 | `05-AI核心总监交接.md` | `D:\Harmess\reference-project\AgentCore\AGENTCORE_EXISTING_AI_CORE_BREAKDOWN.md` |

所有继任者先读本目录对应岗位包，再读其原始报告、`D:\Harmess\Magic\docs\01-产品\Magic最终产品裁定与技术会议输入.md` 与 `D:\Harmess\Magic\docs\02-架构\02-Magic-目标项目\PRODUCT_TECH_ALIGNMENT_BASELINE.md`。完成后必须明确说明：已读材料、确认的事实、未知项和首个工作计划。

## 共同交接结论

产品方向可推进，但首版技术方案尚未冻结。唯一组合阻塞 F-10 是：锁定 OpenCode runtime、commit/tag 与 canonical protocol/client contract 后，证明 `MagicTask` / `TaskAttempt` 在断连、重启、事件异常、重试、停止、审批和外部副作用下的最终收敛。源码存在、测试资产、历史报告和 AgentCore 试运行经验均不能替代该实机证据。
