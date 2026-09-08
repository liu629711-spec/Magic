# Magic

Magic is a product layer on [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). DSH owns agent execution, tools, files, terminals, and sessions. Magic owns work mode, engineering organization, task ledger, responsibility, and delivery.

This `main` branch is a DSH plugin workspace. The previous Rust/Tauri desktop stack is archived on [`old-design`](https://github.com/liu629711-spec/Magic/tree/old-design).

## Product

Canonical product rules live in `docs/01-产品/PRD-01` through `PRD-05`.

| Plugin | Product meaning | User command |
| --- | --- | --- |
| `@magic/dsh-work-mode` | Agent vs CEO for the current session or current input | `/mode`, `/mode agent`, `/mode ceo`, `/mode once ceo` |
| `@magic/dsh-ceo` | CEO work-package delegation | `ceo_delegate` |
| `@magic/dsh-ceo-ui` | CEO team graph and right-column member workspace | — |
| `@magic/dsh-engineering` | Long-lived engineering organization | `/engineering status`, `/engineering confirm <name>` |

CEO mode does not create engineering. Engineering requires a separate explicit confirmation.

## Layout

```text
plugins/magic-work-mode      agent / CEO work-mode plugin
plugins/magic-ceo            CEO host plugin
plugins/magic-ceo-ui         CEO team graph client plugin
plugins/magic-engineering    engineering plugin (not loaded yet)
patches/web.patch.yml        DSH web overlay
docs/01-产品                 canonical PRDs
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

Open `http://127.0.0.1:3080`, pick a workspace, then use the composer-left work-mode control or run `/mode` in a session. `/mode once ceo` applies only to the current input.

Community UI plugins such as Codex-style sidebar replacements can be added with `dsh plugin` and stacked on the same web profile. They are not Magic product plugins.

## Develop

```sh
pnpm test
```

The plugin tests cover command contracts only. They do not start DSH or call a model.
