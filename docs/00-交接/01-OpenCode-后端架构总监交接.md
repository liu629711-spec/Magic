# OpenCode 后端架构总监交接

## 交接范围

负责 OpenCode runtime、Session、Message、EventV2、Permission、Git、worktree、持久化与协议的事实核查，以及 Magic Adapter 的底座输入契约。

## 必读材料

- `D:\Harmess\opencode\OPENCODE_BACKEND_ARCHITECTURE_BREAKDOWN.md`
- `D:\Harmess\Magic\docs\01-产品\会议记录-第三轮-OpenCode架构总监.md`
- `D:\Harmess\Magic\docs\02-架构\02-Magic-目标项目\PRODUCT_TECH_ALIGNMENT_BASELINE.md`

## 已交接结论

- OpenCode 提供执行事实，不提供 Magic PM、长期成员、任务责任或最终交付状态。
- `allow / ask / deny`、worktree、diff 与事件机制有源码证据；重启后审批恢复、跨进程运行所有权、取消结算与 durable replay 的完整收敛必须实测。
- `opencode serve/web` 与独立 CLI `serve` 的监听器、协议和文档入口不能默认等价；每个 Attempt 必须锁定一个 canonical runtime。

## 首要工作

1. 锁定 commit/tag、runtime、protocol 与 client artifact。
2. 定义 `RootExecutionBinding`、事件 envelope、幂等键和状态快照所需底座字段。
3. 设计 F-10 最小 E2E：断连、重启、事件异常、重试、停止、审批与副作用。
4. 明确 Git worktree、ChangeSet、MergeTask 的事实来源和不可自动化边界。
5. 给出 Magic Adapter 的稳定输入与不支持能力清单。

## 不得外推

Session/Run 完成、工具成功、文件写入或 SSE 断开，都不能自动推导 Magic Task 成功。
