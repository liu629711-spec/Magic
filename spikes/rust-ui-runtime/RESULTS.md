# Rust UI + Rust 本地服务 Spike 结果

日期：2026-09-02

## 结论

在当前 Windows 环境中，Rust UI + Tauri + Rust 本地服务的基础链路可行：

- Yew Rust 页面可以编译为 WASM 并嵌入 Tauri；
- Rust UI 可以通过本地 HTTP 接口读取 Rust 服务状态；
- Rust 服务可以启动或发现 OpenCode V1；
- OpenCode V1 可以在 Rust UI 重开后被重新发现。

但是，关闭测试暴露出最终架构必须拆分生命周期：Tauri 窗口关闭后 OpenCode 进程仍保持健康，而与 Tauri 同进程的 Rust 本地服务会退出。正式 Magic 必须把 Worker/本地服务做成独立进程或由独立 supervisor 管理，不能依赖窗口进程存活。

## 实测数据

测试环境：Windows，WebView2 Runtime 已安装，Rust/Cargo 1.95.0，Bun 1.4.0，Tauri CLI 2.11.4，Trunk 0.21.14，`wasm32-unknown-unknown`。

| 项目 | 结果 |
|---|---|
| Rust/Yew UI 编译为 WASM | 通过 |
| Tauri Release 构建 | 通过 |
| Rust UI → Rust 本地 HTTP 服务 | 通过 |
| Rust 服务 → OpenCode V1 | 通过 |
| Release Spike 可执行文件 | 8.35 MB |
| Release 桌面进程工作集 | 约 62.4 MB |
| OpenCode V1 工作集 | 约 405.8 MB |
| Rust 服务 `/bootstrap` | HTTP 200 |
| OpenCode `/global/health` | HTTP 200，`healthy: true` |
| 关闭 Tauri 后 OpenCode | 仍健康 |
| 关闭 Tauri 后同进程 Rust 服务 | 退出 |
| 重开 Tauri 后 Rust 服务 | 恢复 |
| 重开后发现原 OpenCode | 通过，PID 不属于新 Tauri 进程 |

内存是单次 Windows 工作集观测，未执行真实模型请求、长日志或并发任务。它不能直接作为生产资源预算。

## 已知限制

1. UI 使用 Yew 作为 Rust/WASM 框架验证候选，不代表最终 UI 框架已经冻结。
2. Rust 本地服务是最小 HTTP 健康接口，没有 Task、Attempt、数据库和事件账本。
3. 本地服务与 Tauri 同进程只是验证 UI 通信，不能作为最终 Worker 生命周期设计。
4. OpenCode 使用固定端口和开发源码入口，没有验证最终 sidecar 打包、认证和多实例锁。
5. 尚未测量真实模型请求、长时间运行、文件索引和多任务并发下的资源占用。

## 对正式架构的影响

- Magic 自有 UI 和后端可以继续使用 Rust；
- Rust UI 框架仍需结合 Markdown、Diff、终端、无障碍和虚拟列表做专项评估；
- Worker/Recovery 必须独立于 Tauri 窗口，关闭窗口不能杀死执行生命周期；
- 启动时应先发现独立 Worker，再进行 OpenCode 对账；
- Rust 后端轻量化不能消除 OpenCode V1 的主要内存开销，性能验收必须测总进程组。
