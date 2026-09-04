# Magic DSH validation

This isolated proof verifies that DSH can load Magic as an external bundle and that the bundle can use real workspace and session services without a model request.

Run from this directory:

```powershell
.\run-validation.ps1 -Mode prepare
.\run-validation.ps1 -Mode run
```

After the web process starts, inspect the proof:

```powershell
.\run-validation.ps1 -Mode verify
```

To validate the same session through DSH's local Remote API, pass the launch URL printed by DSH to the external probe. The token is exchanged for a session cookie and is not written to disk.

```powershell
node .\probe-web.mjs 'http://127.0.0.1:3091/?token=<printed-token>'
```

The proof uses only `spikes/dsh-magic-poc/runtime` as `DSH_HOME`, disables telemetry, and never edits the DeepSeek Harness checkout. It creates one workspace registration and one empty DSH session under `spikes/dsh-magic-poc/workspace`; it does not call an LLM or read credentials.
