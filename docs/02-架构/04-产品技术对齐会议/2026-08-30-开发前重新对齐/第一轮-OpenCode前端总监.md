# 第一轮：OpenCode 前端总监

## 独立判断

- 理解 Magic：前端必须分别表达 Task、Attempt/Run、Connection、Sync、Approval、Artifact、SideEffect 和 Responsibility。
- 当前阶段：产品已确认，处于 F-10 取证与目标契约收敛，目标前端尚未冻结。
- 当前可做：假快照/事件、故障 fixture、可丢弃状态原型、Projection 契约和基础组件。
- 当前不可冻结：客户端自行推导终态、审批恢复、PM 接管、冲突合并与正式生产状态层。

## 岗位事实

当前 OpenCode App 关闭 reconnect/mount/focus 自动 refetch；全局 SSE 会重连，但事件端点不提供历史 replay。OpenCode `1.18.23` 与 App vendored client `1.17.13-v2` 存在待证漂移。连接恢复不等于任务事实完整。

## 首轮建议

首条产品切片采用单用户、单工程、唯一 PM、一个成员和一个任务工作台。UI 至少显示目标、责任、任务状态、同步完整性、审批、产物、变更和副作用；团队画布后置。

## 判定

`Product Go`；`Technical Discovery Go`；`First Development No-Go`。









