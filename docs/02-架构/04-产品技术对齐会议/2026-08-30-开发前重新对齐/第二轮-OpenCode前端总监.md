# 第二轮：OpenCode 前端总监

## 修订与答辩

- OpenCode App 作为宿主和组件来源；Magic 新增独立领域 route/provider/store，任务 UI 只消费 Magic Projection API。
- `connection_state`、`sync_state` 和 `completeness` 必须独立。发生 gap/unknown 时保留最后已知事实但禁止宣布成功、自动重试或提交高风险动作。
- PM + 1 成员是首条产品切片；PM 交接和双成员分别作为后续验收，P0 只预留对象与不变量。
- 支持 OpenCode 后端担任 F-10 技术 DRI；AI 核心负责语义 oracle，其他岗位分别签署本层证据。
- P0 主文档应合并，避免目标前端、后端和 AI 核心各自建立一套对象状态。

## 保留意见

反对在直连 OpenCode 路径尚未通过 F-10 前，把 AgentCore 写入首版必经拓扑。









