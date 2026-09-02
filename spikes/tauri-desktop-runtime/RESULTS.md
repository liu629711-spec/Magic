# Tauri 桌面运行时 Spike 结果

日期：2026-09-02

## 结论

在当前 Windows 环境中，Tauri + Rust 桌面层能够：

- 启动 React/TypeScript 渲染层；
- 通过受限 Tauri 命令启动 Magic TypeScript/Bun 本地服务；
- 启动 OpenCode V1 `serve` 进程；
- 通过 HTTP 健康检查确认两个本地服务；
- 关闭桌面窗口后不自动取消子进程；
- 重新启动桌面窗口后发现并复用原有健康服务，未重复创建监听端口。

本次验证支持继续采用 Tauri 作为 Magic V1 桌面层，但不等于最终 Worker 生命周期方案已经完成。

## 实测数据

测试环境：Windows，WebView2 Runtime 已安装，Rust/Cargo 1.95.0，Bun 1.4.0，Tauri CLI 2.11.4。

| 项目 | 结果 |
|---|---|
| React/TypeScript 生产构建 | 通过 |
| Rust `cargo check` | 通过 |
| Tauri Debug 启动 | 通过 |
| Tauri Release 构建 | 通过 |
| Release Spike 可执行文件 | 8.31 MB |
| Release 桌面进程空闲工作集 | 约 28.5 MB |
| Magic Bun 本地服务工作集 | 约 83.4 MB |
| OpenCode V1 服务工作集 | 约 401.1 MB |
| Magic `/health` | HTTP 200 |
| OpenCode `/global/health` | HTTP 200，`healthy: true` |
| 关闭桌面进程后的两个服务 | 仍健康 |
| 重新启动后的服务发现 | 通过 |

内存是单次 Windows 工作集观测，未启动模型请求，也不是生产性能预算。OpenCode V1 明显是本次链路的主要内存开销来源，桌面壳本身不是主要开销来源。

## 已知限制

1. Spike 使用固定本地端口，没有实现最终端口注册、认证或多实例锁。
2. Magic 服务只是健康检查服务器，没有 Task、Attempt、数据库和事件账本。
3. Tauri 进程重启后只能通过端口发现服务，尚未实现 Worker 身份、状态对账和进程监督。
4. 尚未测量真实模型请求、长日志、文件索引和多任务并发下的内存/CPU。
5. Release 可执行文件大小不等于最终安装包大小；最终包还要计入 Bun/Worker、OpenCode、运行资源和签名元数据。

## 对正式架构的影响

- 桌面层可以采用 Tauri/Rust，界面继续采用 React/TypeScript。
- 本地 Worker 必须具备独立生命周期，不能把 Tauri 窗口进程当作 Attempt 生命周期。
- 最终实现应优先设计 Worker supervisor、健康发现、身份认证和重启对账，再接入正式 Task/Attempt。
- 性能验收必须覆盖 OpenCode、Worker、日志渲染和并发任务的总资源，而不是只测桌面壳。
