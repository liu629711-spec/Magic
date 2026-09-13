# Magic

Magic is a product layer on [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). DSH owns agent execution, tools, files, terminals, sessions, storage, and workspaces. Magic owns work mode, orchestration, the delivery contract, memory, task ledger, responsibility, and delivery.

This `main` branch is a DSH plugin workspace. The previous Rust/Tauri desktop stack is archived on [`old-design`](https://github.com/liu629711-spec/Magic/tree/old-design). Engineering organization is postponed.

## Product

Canonical product rules live in `docs/01-产品/PRD-01` through `PRD-05`; the document map is in [`docs/README.md`](docs/README.md). PRD-03 (engineering organization) is **deferred**. Technical implementation constraints and the AgentCore capability map live in [`docs/02-实现`](docs/02-实现).

| Plugin | Product meaning | User command |
| --- | --- | --- |
| `@magic/dsh-work-mode` | Agent vs CEO for the current session or current input | `/mode`, `/mode agent`, `/mode ceo`, `/mode once ceo` |
| `@magic/dsh-ceo` | CEO orchestration: planning, waves, delegation (official roster first, subagents fallback) | `ceo_plan`, `ceo_delegate`, `ceo_replan` |
| `@magic/dsh-ceo-ui` | CEO team graph canvas, member-named right-dock workspace, read-only task board on the canvas | — |
| `@magic/dsh-ledger` | Delivery contract, evidence ledger, acceptance | `ledger_*` |
| `@magic/dsh-memory` | Scoped memory (injection + search) | `magic_memory_*` |
| `@magic/dsh-consult` | Unified on-demand retrieval (memory topics + rules) | `consult` |
| `@magic/dsh-devtools` | Developer tools: archive pack/extract, whitelisted git ops | `archive_create`, `archive_extract`, `git_ops` |
| `@magic/dsh-export` | Deliverable export (md → docx/pdf) | `md_to_docx`, `md_to_pdf` |
| `@magic/dsh-engineering` | Long-lived engineering organization (deferred, not loaded) | — |

CEO mode does not create engineering. Engineering is postponed and needs a separate explicit decision before it is restarted.

## Layout

```text
plugins/magic-work-mode      agent / CEO work-mode plugin (client: mode switcher)
plugins/magic-ceo            CEO host plugin
plugins/magic-ceo-ui         CEO team graph client plugin
plugins/magic-ledger         delivery contract / evidence ledger plugin
plugins/magic-memory         scoped memory plugin
plugins/magic-consult        unified on-demand retrieval plugin
plugins/magic-devtools       developer tools plugin
plugins/magic-export         deliverable export plugin
plugins/magic-engineering    engineering plugin (deferred, not loaded)
plugins/dsh-better-sidebar   vendored community sidebar workbench (MIT; upstream omdsh-dev/DSH-better-sidebar)
plugins/dsh-univer-office    vendored Univer Office integration (Apache-2.0; upstream dream-num/dsh-univer-office; standalone nested workspace — install/build inside its dir)
plugins/dsh-any-background   vendored appearance plugin: theme color / wallpaper / opacity (MIT; upstream Tkingxiao/dsh-any-background)
plugins/dsh-ego-browser      vendored agent browser (MIT; upstream Fisfzy/ego-browser) — UNMOUNTED 2026-09-13, superseded by plugins/magic-browser; re-mount via patches/web.patch.yml
patches/web.patch.yml        DSH web overlay (official agent-team layer + Magic plugins)
docs/01-产品                 canonical PRDs
docs/02-实现                 implementation constraints and AgentCore capability map
tools/contract-smoke         contract smoke check (static, zero-dependency)
```

## Run

DSH must already be installed (`npx @deepseek-ai/dsh` or a source checkout). The overlay loads work-mode, the CEO host plugin, and the CEO team graph; engineering is postponed.

The plugin row in `patches/web.patch.yml` is a path relative to that file, not an npm package name. `--patch` itself is resolved from the current working directory.

`--patch` is a launcher flag and must come before web-app flags such as `--no-open`.

```sh
dsh web --patch /absolute/path/to/Magic/patches/web.patch.yml --no-open
```

From this repository with the local DSH checkout:

```sh
pnpm --dir reference-project/deepseek-harness dsh web --patch "$PWD/patches/web.patch.yml" --no-open
```

Or use the launcher, which runs the agent browser (PRD-02 §18) **headless** by default — no OS window, the sidebar watch panel is the only view (pass `--headed` for the visible full-frame-rate window):

```sh
node scripts/start-web.mjs            # headless agent browser
node scripts/start-web.mjs --headed   # visible window, full frame rate
```

Open `http://127.0.0.1:3080`, pick a workspace, then use the composer-left work-mode control or run `/mode` in a session. `/mode once ceo` applies only to the current input.

Community UI plugins such as Codex-style sidebar replacements can be added with `dsh plugin` and stacked on the same web profile. They are not Magic product plugins. Three of them are vendored under `plugins/` and mounted by `patches/web.patch.yml` (2026-09-13 ruling):

- `dsh-better-sidebar` (v0.19.1, MIT) — native right-sidebar tabs (editor / file changes / tasks / side chat / terminal / browser) that coexist with the CEO member-workspace tab; takes over the built-in files page and text preview.
- `dsh-univer-office` (v0.2.14, Apache-2.0) — Univer spreadsheets / docs / slides with bundled collaboration Gateway and Viewer. Upstream declares DSH `0.1.1-rc.2` / `0.1.2-rc.1` only; vendored copy is retargeted to Magic's `0.1.5-rc.2` (peer range `^0.1.5-rc.1`, devDependencies at `0.1.5-rc.2`, full typecheck green against rc.2 types, 2026-09-13). Telemetry is disabled via the mount row's `config.telemetry: false`. It is a standalone nested workspace: install and build inside `plugins/dsh-univer-office` (`pnpm install && pnpm build`); root workspace tooling skips it.
- `dsh-any-background` (v0.2.4, MIT) — custom theme color (PS-style color wheel), wallpaper (image/video), per-surface opacity and blur, configured in the settings page.
- `dsh-ego-browser` (v0.8.3, MIT) — community agent browser that introduced PRD-02 §18. **Unmounted 2026-09-13**: once `magic-browser` (M1) passed live acceptance, the duplicate tool surface made the model pick randomly between two browser tool sets, and ego's auto-activating watch panel crowded out the page the user was reading. Vendored source stays under `plugins/dsh-ego-browser/`; re-mount by restoring its insert row in `patches/web.patch.yml`.

Sync upstream changes from the mirrors under `reference-project/`.

## Develop

```sh
pnpm test
```

The plugin tests cover command contracts only. They do not start DSH or call a model.
