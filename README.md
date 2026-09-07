# Magic

Magic is a product layer on [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). DSH owns agent execution, tools, files, terminals, and sessions. Magic owns work mode, engineering organization, task ledger, responsibility, and delivery.

This `main` branch is a DSH plugin workspace. The previous Rust/Tauri desktop stack is archived on [`old-design`](https://github.com/liu629711-spec/Magic/tree/old-design).

## Product

Canonical product rules live in `docs/01-产品/PRD-01` through `PRD-05`.

| Plugin | Product meaning | User command |
| --- | --- | --- |
| `@magic/dsh-work-mode` | Agent vs CEO for the current session | `/mode`, `/mode agent`, `/mode ceo` |
| `@magic/dsh-engineering` | Long-lived engineering organization | `/engineering status`, `/engineering confirm <name>` |

CEO mode does not create engineering. Engineering requires a separate explicit confirmation.

## Layout

```text
plugins/magic-work-mode      agent / CEO plugin
plugins/magic-engineering    engineering plugin
patches/web.patch.yml        DSH web overlay
docs/01-产品                 canonical PRDs
```

## Run

Install DSH, then load the Magic overlay:

```sh
dsh web --patch ./patches/web.patch.yml
```

Community UI plugins such as Codex-style sidebar replacements can be added with `dsh plugin` and stacked on the same web profile. They are not Magic product plugins.

## Develop

```sh
pnpm test
```

The plugin tests cover command contracts only. They do not start DSH or call a model.
