# DSH validation result

Status: passed on 2026-09-04 against DeepSeek Harness `0.1.2-alpha.4`.

The validation ran with an isolated `DSH_HOME` under this directory. It installed `magic-dsh-poc-plugin` through the official Profile and Bundle workflow, then composed this order:

```text
dsh-base -> magic-dsh-poc-plugin -> dsh-web-app
```

The external Magic bundle received DSH's real `workspaceRegistry`, `sessionController`, and `sessions` services. It created a workspace registration and an empty persisted session without making an LLM request, and observed `session/created` plus durable session events.

An independent process then exchanged the local launch token for a session cookie and called the documented Remote endpoint `session/list`. The response included the same session and its projections, including permission, selected model state, token counters, and agent preset.

This proves that Magic can keep its own desktop UI while DSH supplies session, workspace, event, model, tool, and approval capabilities through a local bridge. It does not prove compatibility with Magic's Rust code yet, and it does not authorize replacing the OpenCode integration. The next implementation step is a small Rust DSH adapter that owns the local process, token exchange, `session/*` and `workspace/*` Remote calls, and event-stream reconnection.

Constraints retained for a real migration:

- Pin DSH versions and run this verification in CI before every upgrade; DSH is still an alpha preview.
- Keep all Magic additions in Profile bundles and patch files. Do not modify upstream DSH source.
- Treat the local DSH Remote protocol as a bridge contract; do not couple the desktop UI to DSH's bundled Web UI.
