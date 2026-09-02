# Magic Tauri Desktop Runtime Spike

This is an isolated validation project. It is not the Magic application and must not receive domain, database, or product UI code.

## What it tests

- React/TypeScript renders inside a Tauri window.
- Rust/Tauri exposes only two typed commands.
- Tauri can start or discover the local TypeScript/Bun service.
- Tauri can start or discover the OpenCode V1 `serve` process.
- Reopening the window re-probes fixed local endpoints instead of treating the renderer lifecycle as task lifecycle.

## Run

From this directory:

```text
bun install
bun run tauri dev
```

The OpenCode source is expected at `../../reference-project/opencode`. Set `MAGIC_WORKSPACE_ROOT` if the spike is moved. Set `MAGIC_SPIKE_BUN` if `bun` is not on PATH.

The current Rust shell intentionally does not kill child processes when the window closes. Use the in-app stop button or terminate the processes after a test. This is a lifecycle experiment, not the final Worker policy.
