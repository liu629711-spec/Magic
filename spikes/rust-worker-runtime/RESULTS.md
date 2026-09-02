# Rust Worker Runtime Spike 结果

日期：2026-09-02

## 结论

独立 Rust Worker 的生命周期链路可行，且满足 Magic V1 的核心约束：Worker 不依赖 Tauri 窗口存活，能够通过 runtime manifest 和带令牌健康检查被发现；同一 manifest 锁下的重复启动会被拒绝；崩溃后会保留证据，清理确认失效的锁后可以重启并重新发现。

## 自动验证结果

验证脚本：`verify.ps1`，使用 Release Worker 可执行文件。

| 场景 | 结果 |
|---|---|
| 启动 Worker 并写入 manifest | 通过 |
| manifest PID、地址、协议版本和令牌存在 | 通过 |
| 带令牌 `/health` 检查 | 通过 |
| 重复启动被单实例锁拒绝（退出码 17） | 通过 |
| 无关的桌面进程退出后 Worker 仍健康 | 通过 |
| 强制终止 Worker 后 manifest 和 lock 仍保留 | 通过 |
| 确认旧 PID 已失效后清理锁并重启 | 通过 |
| 重启后新实例重新健康并被发现 | 通过 |

## 重要发现

Windows 可能在重启时复用旧 PID，因此不能把“PID 必须变化”当作新实例判断。正式实现应比较实例令牌/实例 ID、启动时间，并再次执行带令牌的健康检查；manifest 读取也必须等待新实例完成发布，避免读到旧文件。

## 尚未验证

- Worker supervisor 如何在生产环境拉起、监控和升级 Worker；
- Worker 与数据库、Task/Attempt 和 OpenCode V1 的实际对账；
- 端口动态分配、安装包 sidecar、令牌安全存储和显式退出策略；
- Worker 自身崩溃后的自动拉起（本 Spike 只验证了外部恢复流程）。

