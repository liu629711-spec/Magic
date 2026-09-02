---
status: accepted
date: 2026-09-02
decision: tokio-axum-rusqlite
---

# ADR-0005：Magic V1 本地服务基础栈

## 决策

Magic V1 本地 API 和独立 Worker 采用：

- Tokio：异步运行时；
- Axum：本地 HTTP API 路由与请求处理；
- rusqlite `bundled` + SQLite：Magic 产品状态、事件账本和审计数据的本地存储。

数据库访问必须放在明确的阻塞边界内，事务中完成事件和投影写入，并启用 WAL。迁移文件和连接池/单写入者策略在正式骨架阶段确定。

## 依据

`spikes/rust-service-stack` 已在 Rust 1.95.0 下通过 `cargo check`，实际组合了 Tokio 1.53.1、Axum 0.8.9 和 rusqlite 0.40.2（bundled SQLite）。选择符合单用户本地桌面应用的部署边界：无外部数据库服务、可控 SQLite 版本、HTTP 与后台恢复任务共享同一异步运行时。

## 不代表的结论

这次 Spike 只证明依赖可组合，不等于已经验证业务事务、迁移升级、并发写入、备份恢复或生产性能。上述内容必须由正式数据库集成测试覆盖。

## 替换边界

数据库驱动只出现在 `persistence` Adapter；Tokio/Axum 只出现在装配和传输层。Domain、Application、ExecutionPort 和 PersistencePort 不依赖具体库，未来可替换 HTTP、数据库或执行底座。

