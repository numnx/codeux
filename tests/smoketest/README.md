# Smoketests

Opt-in, environment-dependent end-to-end checks that drive the **real** runtime
code paths against real local state (Docker, saved provider credentials). They are
intentionally **not** part of the vitest suite (`*.smoketest.ts`, not `*.test.ts`)
and never run in CI — they need a Docker daemon and live credentials that only
exist on a configured host.

## codex.smoketest.ts

Reproduces a containerized sprint "Task Coding" codex invocation: DOCKER execution
mode, the cached setup image, the saved codex credentials mounted in, a snapshot
workspace seeded from the current repo, and a trivial `report ok` prompt. Prints the
full activity log, raw stdout/stderr, and the resulting error classification — useful
for diagnosing "Codex failed with an unexpected error" reports without a real sprint.

```bash
npm run smoketest:codex
# or
node --import ./scripts/tsnode-register.mjs tests/smoketest/codex.smoketest.ts
```

Env overrides:

| Var | Default | Notes |
| --- | --- | --- |
| `CODEX_AUTH_PATH` | `~/.code-ux/credentials/codex` | Credential dir to mount |
| `CODEX_MODEL` | `gpt-5.3-codex` | Use `default` for codex's own default model |
| `CODEX_PROMPT` | `Report ok and nothing else.` | The task prompt |

Note: a ChatGPT-account codex login rejects explicit `--model` slugs (HTTP 400
"model is not supported when using Codex with a ChatGPT account"); only
`CODEX_MODEL=default` succeeds on such an account.
