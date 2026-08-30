# 第二轮：OpenCode 后端架构总监

## 修订与答辩

- AgentCore 不应预设为生产必经层，只可作为机制来源或可选 `ExecutionPort` 实现。
- 独立 V2 CLI 覆盖 Session、durable event、Permission 和内建 Tool 主链；Git/worktree/ChangeSet 由 Magic 资源适配层治理。若该候选不能跑通真实工具与持久事件链，立即转测完整 listener，不能混用两套入口。
- `/api/event` 不是恢复入口；单 Session durable event/history、pending Permission 和真实资源状态共同构成 Adapter 输入，Magic 自持统一 snapshot。
- 首条技术验证切片与首次正式产品切片必须分开；正式产品切片采用 PM + 1 成员。
- 主张 OpenCode 后端担任 F-10 单一技术 DRI。

## 保留意见

在用户裁定和直连/经 AgentCore 对比证据前，反对把 AgentCore 固化为必经生产 runtime。
