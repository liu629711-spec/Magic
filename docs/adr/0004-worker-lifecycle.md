---
status: accepted-with-validation
date: 2026-09-02
decision: independent-rust-worker-process
---

# ADR-0004：Magic V1 Worker 生命周期

## 决策

Magic V1 的本地 API/Worker 使用独立 Rust 进程运行，Tauri 只负责桌面窗口、启动/发现和安全桥接。窗口关闭不停止 Worker，也不自动取消 Attempt。

```text
Tauri Desktop + Rust UI
          ↓ 启动或发现
独立 Rust Local Service / Worker
          ↓ HTTP/API + 进程管理
DSH（外部 Node/TypeScript 进程）
```

API 和 Worker 初期可以在同一个独立 Rust 进程中部署，但必须保持代码职责和 Interface 分离；后续可以在不改领域模型的前提下拆成两个进程。

## 启动和发现

Worker 在应用数据目录写入 runtime manifest，至少包含：实例 ID、进程 ID、本地 API 地址、协议版本、实例令牌和启动时间。Tauri 启动时先读取 manifest 并进行带令牌的健康检查：

- 健康：复用已有 Worker；
- 不存在：启动 Worker 并等待健康；
- manifest 存在但不健康：保留证据，启动恢复流程，不静默覆盖；
- 多实例：由单实例锁和实例 ID 拒绝重复 Worker。

## 关闭和重启

- 用户关闭窗口：只断开 UI，不发送取消，不终止 Worker；
- 用户明确退出应用：由 Worker supervisor 执行退出策略，未终结 Attempt 进入可对账状态；
- Worker 崩溃或机器重启：下次启动扫描数据库中的未终结 Attempt，查询 DSH session journal 并收敛或标记 `unknown_after_restart`；
- DSH 已运行但 Worker 重启：通过绑定信息和 session journal 重新建立观察，不把重新连接当作新 Attempt。

## Spike 证据

两组 Spike 已提供依据：

- `spikes/rust-ui-runtime/RESULTS.md` 证明同进程 Rust 服务会随 Tauri 窗口退出；
- `spikes/rust-worker-runtime/RESULTS.md` 证明独立 Rust Worker 可以写入 manifest、进行带令牌健康检查、拒绝重复实例，并在旧实例失效后重启和重新发现。

因此独立 Worker 是当前 V1 的已验证方向，但 supervisor、动态端口、令牌存储和 DSH 对账仍属于正式实现前的未决项。

## 未决实现点

本 ADR 尚未冻结 Worker 的进程监督库、manifest 存储格式、认证令牌存储、安装包 sidecar 方式和显式退出的用户交互；这些必须在首个正式 Worker Spike 中验证。
