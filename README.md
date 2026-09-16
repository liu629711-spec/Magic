# Magic

Magic is a product layer on [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). DSH owns agent execution, tools, files, terminals, sessions, storage, and workspaces. Magic owns work mode, orchestration, the delivery contract, memory, task ledger, responsibility, and delivery.

This `main` branch is a DSH plugin workspace. The previous Rust/Tauri desktop stack is archived on [`old-design`](https://github.com/liu629711-spec/Magic/tree/old-design).

## Product

Canonical product rules live in `docs/01-产品/PRD-01`, `PRD-02`, `PRD-04`, and `PRD-05`; the document map is in [`docs/README.md`](docs/README.md). Technical implementation constraints and the AgentCore capability map live in [`docs/02-实现`](docs/02-实现).

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

Engineering organization was removed from the product on 2026-09-15 (plugin and PRD-03 deleted); CEO is the only collaboration mode.

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
plugins/magic-browser        retired first-cut agent browser (Playwright + live canvas) — UNMOUNTED 2026-09-13; retro in docs/02-实现/08-自研浏览器插件.md
plugins/dsh-better-sidebar   vendored community sidebar workbench (MIT; upstream omdsh-dev/DSH-better-sidebar)
plugins/dsh-univer-office    vendored Univer Office integration (Apache-2.0; upstream dream-num/dsh-univer-office; standalone nested workspace — install/build inside its dir)
plugins/dsh-any-background   vendored appearance plugin (MIT; upstream Tkingxiao/dsh-any-background) — UNMOUNTED 2026-09-13 (user ruling: unused); re-mount via patches/web.patch.yml
plugins/dsh-oss-prompt-optimizer vendored prompt optimizer (MIT; upstream seven282/oss-prompt-optimizer) — prompt_optimize tool + composer ✨ draft optimization + /optimize
plugins/dsh-harness-zh-cn    vendored Chinese localization (MIT; upstream zjl1989-li/dsh-harness-zh-cn) — runtime zh for system prompts/tool descriptions/UI labels
plugins/dsh-ego-browser      vendored agent browser (MIT; upstream Fisfzy/ego-browser) — UNMOUNTED 2026-09-13, superseded by plugins/dsh-builtin-browser; re-mount via patches/web.patch.yml
plugins/dsh-builtin-browser  vendored shared real browser (MIT; upstream wqty123/dsh-browser) — PRD-02 §18 baseline: visible window, agent drives over CDP on the same page, human takeover, browser_challenge for CAPTCHAs; + local page-annotation tools (§18.6)
plugins/dsh-sidenote         vendored side chat + selection annotations (MIT; upstream g-yixuan/dsh-sidenote) — true-fork side chat with main-conversation renderer parity; replaces better-sidebar's built-in sidechat tab (hidden by local patch)
patches/web.patch.yml        DSH web overlay (official agent-team layer + Magic plugins)
docs/01-产品                 canonical PRDs
docs/02-实现                 implementation constraints and AgentCore capability map
tools/contract-smoke         contract smoke check (static, zero-dependency)
```

## Run

DSH must already be installed (`npx @deepseek-ai/dsh` or a source checkout). The overlay loads work-mode, the CEO host plugin, and the CEO team graph.

The plugin row in `patches/web.patch.yml` is a path relative to that file, not an npm package name. `--patch` itself is resolved from the current working directory.

`--patch` is a launcher flag and must come before web-app flags such as `--no-open`.

```sh
dsh web --patch /absolute/path/to/Magic/patches/web.patch.yml --no-open
```

From this repository with the local DSH checkout:

```sh
pnpm --dir reference-project/deepseek-harness dsh web --patch "$PWD/patches/web.patch.yml" --no-open
```

Or use the launcher:

```sh
node scripts/start-web.mjs            # DSH web with the Magic overlay
node scripts/start-web.mjs --headed   # legacy magic-browser flag; currently a no-op
```

The agent browser (PRD-02 §18) is the vendored shared real browser (`dsh-builtin-browser`): the first `browser_*` tool call in a session self-hosts a visible Electron window that the human shares with the agent — there is no headless/headed launcher switch anymore.

Open `http://127.0.0.1:3080`, pick a workspace, then use the composer-left work-mode control or run `/mode` in a session. `/mode once ceo` applies only to the current input.

Community UI plugins such as Codex-style sidebar replacements can be added with `dsh plugin` and stacked on the same web profile. They are not Magic product plugins. Several of them are vendored under `plugins/` and mounted by `patches/web.patch.yml` (2026-09-13 rulings):

- `dsh-better-sidebar` (v0.19.1, MIT) — native right-sidebar tabs (editor / file changes / tasks / side chat / terminal / browser) that coexist with the CEO member-workspace tab; takes over the built-in files page and text preview.
- `dsh-univer-office` (v0.2.14, Apache-2.0) — Univer spreadsheets / docs / slides with bundled collaboration Gateway and Viewer. Upstream declares DSH `0.1.1-rc.2` / `0.1.2-rc.1` only; vendored copy is retargeted to Magic's `0.1.5-rc.2` (peer range `^0.1.5-rc.1`, devDependencies at `0.1.5-rc.2`, full typecheck green against rc.2 types, 2026-09-13). Telemetry is disabled via the mount row's `config.telemetry: false`. It is a standalone nested workspace: install and build inside `plugins/dsh-univer-office` (`pnpm install && pnpm build`); root workspace tooling skips it.
- `dsh-any-background` (v0.2.4, MIT) — theme color / wallpaper / opacity. **Unmounted 2026-09-13** (user ruling: unused). Source stays under `plugins/dsh-any-background/`; re-mount by restoring its insert row in `patches/web.patch.yml`.
- `dsh-oss-prompt-optimizer` (v1.8.1, MIT) — prompt optimizer: `prompt_optimize` tool, composer ✨ one-click draft optimization, `/optimize` command and prefix-triggered auto-optimization; runs through the harness LLM service (default model). Standalone nested workspace (install/build inside `plugins/dsh-oss-prompt-optimizer`). rc.2 adaptation: peers/devDeps `^0.1.0-rc.6` → `^0.1.5-rc.2` (npm prerelease rules) except `dsh-client-runtime` pinned `0.1.1-rc.2` (its npm line tops out there); `deepFreeze` moved from dsh-llm to `@deepseek-ai/dsh-util-values` in 0.1.5 (dependency added, import adjusted). tsc clean + 562/562 vitest green.
- `dsh-harness-zh-cn` (v0.2.0, MIT) — runtime Chinese localization: system-prompt/assemble waterfall hook translates system prompts/tool descriptions, client half patches `ctx.locale.lookup` for UI labels and command menus; zero DSH source changes, uninstall to restore. lib committed upstream (no build); standalone nested workspace — run `pnpm install` inside `plugins/dsh-harness-zh-cn` for runtime deps (upstream lockfile pinned a 0.1.1-rc.2-era closure and was removed). rc.2 adaptation: `dsh-llm` dependency `0.0.1-rc.1` → `0.1.5-rc.2` (lib imports BlockAssembler/createUserMessage, both present in rc.2; import smoke-tested).
- `dsh-ego-browser` (v0.8.3, MIT) — community agent browser that introduced PRD-02 §18. **Unmounted 2026-09-13**: the duplicate tool surface made the model pick randomly between two browser tool sets, and ego's auto-activating watch panel crowded out the page the user was reading. Vendored source stays under `plugins/dsh-ego-browser/`; re-mount by restoring its insert row in `patches/web.patch.yml`.
- `dsh-builtin-browser` (v0.1.21, MIT) — shared real browser, the PRD-02 §18 baseline (2026-09-13 ruling): a visible native browser window the agent drives over CDP on the same page the human sees; the human takes over at any time; `browser_challenge` pauses on CAPTCHAs instead of retrying blindly; per-task session isolation; cookie persistence (`browser_auth`). In the web profile there is no desktop shell, so it self-hosts an Electron window. Version adaptation (no src changes): `electron` pinned `>=40 <44` (44+ no longer ships the binary on install; pnpm 11 skips its postinstall — pull it once with `node node_modules/.pnpm/electron@43*/node_modules/electron/install.js`), dsh peers raised to `^0.1.5-rc.2` (upstream declared `^0.1.1-rc.2`, which npm prerelease rules narrow to the 0.1.1 line). tsc + 26 tests green on the vendored copy; downloads converge to `<dsh-home>/browser-downloads`. Local patch (2026-09-13, PRD-02 §18.6): page-annotation tools `browser_annotate_enable` / `browser_annotations` — inject an in-page annotation layer through the seam's execute (Runtime.evaluate); they live inside `tool-browser` to reuse the task's session (provider.open does not dedupe by label). The layer does not survive navigation; re-enable after navigating (stored annotations persist per URL in the page's localStorage).
- `dsh-sidenote` (v0.3.4, MIT) — side chat + selection annotations (2026-09-13): true-fork side chat rendered with the main conversation's own components (tool cards, reasoning, task cards, model/permission switcher, @ references, image attachments), selection annotations with numbered badges and a structured protocol block, selection popover (add to current task / ask in side chat), one-click reflow of side conclusions to the main line. Upstream declares DSH 0.1.5-rc.x + better-sidebar ≥0.19.0 compatible. Standalone nested workspace: install/build inside `plugins/dsh-sidenote` (`pnpm install && pnpm build`). better-sidebar's built-in sidechat tab is hidden by a local patch so only one side-chat surface exists.

Sync upstream changes from the mirrors under `reference-project/`.

## Develop

```sh
pnpm test
```

The plugin tests cover command contracts only. They do not start DSH or call a model.
