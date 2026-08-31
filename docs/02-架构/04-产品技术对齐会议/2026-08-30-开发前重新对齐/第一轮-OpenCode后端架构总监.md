# 第一轮：OpenCode 后端架构总监

## 独立判断

- 理解 Magic：Magic 自持任务、责任、审批、产物和副作用账本；OpenCode 只提供执行事实。
- 当前阶段：OpenCode 底座锁定与 F-10 技术取证准备期，尚未进入首次正式开发。
- 当前可做：runtime/client 锁定、Adapter spike、事件 envelope、幂等、快照、故障注入和证据模板。
- 当前不可冻结：生产 schema、公共 API、完整状态机、自动合并/回滚和正式排期。

## 岗位事实

当前报告基线为 OpenCode `dev@5f5ea53afb2630227ead917f1a0ddf784c33150c`、版本 `1.18.23`；仓库声明 Bun `1.3.14`，本机为 `1.4.0`。OpenCode 存在两套不同 listener。EventV2 live queue、进程内 Session coordinator、审批恢复和 worktree 强制清理均不能直接形成 Magic 的恢复保证。

## 首轮建议

F-10 技术切片从 `1 MagicTask / 1 TaskAttempt / 1 canonical Session / 1 worktree / 1 approval / 1确定副作用`开始。独立 V2 CLI `serve` 只作为第一候选，须在同源 client 和锁定环境上通过实测。

## 判定

`Product Go`；`Technical Discovery Go`；`First Development No-Go`。









