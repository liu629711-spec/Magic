# Magic Rust UI Runtime Spike

This isolated spike validates a Rust-owned UI and Rust local service inside a Tauri desktop window. It is not the Magic application and contains no Task, Attempt, database, or product domain code.

## Run

From `src-tauri`:

```text
cargo tauri build
```

The build command compiles `ui/` to WASM with Trunk, embeds it into Tauri, and builds a Windows executable. The local Rust service listens on `127.0.0.1:45175`; OpenCode V1 listens on `127.0.0.1:45176` when discovered or started.

Set `MAGIC_WORKSPACE_ROOT` if the spike is moved. Set `MAGIC_SPIKE_BUN` if Bun is not on PATH.
