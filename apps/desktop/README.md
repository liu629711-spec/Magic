# Magic Desktop

正式 Tauri + Yew 桌面入口将在本目录落地。当前桌面运行链路仍由 `spikes/rust-ui-runtime` 验证，等本地服务契约稳定后迁入，避免把 Spike 的固定端口和健康接口带进业务代码。

浏览器前端从 `frontend` 目录执行 `./build.ps1` 构建。脚本会隔离当前进程的 `NO_COLOR` 环境变量，以兼容 Trunk 0.21 的参数解析。
