# Troubleshooting

Solutions to the most common issues. If your problem is not covered here, see the [system overview](../architecture/system-overview.md), the [MCP client guide](./mcp-clients.md), or open an issue.

## Server startup

### Port 4444 already in use

Another process holds the dashboard port.

**Fix:** set `DASHBOARD_PORT` to a free port, or kill the offender. On Linux: `lsof -i :4444`.

### Permission denied on Git operations

The user running Code UX cannot write to the repo.

**Fix:** Ensure the process has write permissions to the project's `repository path` and to the `.code-ux/` directory therein.

## Dashboard access

### Dashboard loads but data is empty

You haven't created a project yet, **or** the active project pointer is stale.

**Fix:** open **Projects** page, create or select a project. Refresh.

### Real-time updates stopped

The WebSocket disconnected and reconnection failed.

**Fix:** refresh the page. If it persists, check browser console for `WebSocket` errors; verify the dashboard process is alive and the port is reachable.

### "Failed to fetch" on every API call

The dashboard process died or the browser is on a different host than the server (e.g. `0.0.0.0` binding but firewall blocks the inbound).

**Fix:** verify the server is running; if accessing remotely, ensure your firewall allows the port and you are using the correct hostname.

## MCP integration

### Client never sees `code-ux` tools

The MCP server failed to start. Common causes:

- The `command` in client config is wrong (typo in `npx @codeuxai/codeux`).
- The `JULES_API_KEY` is missing in the client-supplied env block, and the server exited.
- The npx command needed network access at first launch and the network was unavailable.

**Fix:** run the same command manually in a terminal — `npx -y @codeuxai/codeux --help` — and observe the output. Then check your MCP client's error log.

### `listen` returns no message and the call hangs

This is normal. `listen` is a long-poll: it blocks until a message is available or `timeout_seconds` elapses (default = `watchLoopOutputIntervalSeconds`, i.e. ~5 minutes).

**Fix:** call `listen` in a loop. The call returns immediately when a dashboard user posts to the connection.

### Server mode fails on startup

`--server-mode` or `CODE_UX_SERVER_MODE=true` is set without a valid explicit bearer token.

**Fix:** set `MCP_HTTP_AUTH_TOKEN` or `MCP_HTTPS_AUTH_TOKEN`, or pass `--mcp-http-auth-token` / `--mcp-https-auth-token`. Use at least 32 bearer-safe characters. Server mode does not use the generated local user token.

### HTTP gateway returns 401

The client did not send `Authorization: Bearer <token>`, sent the wrong token, sent duplicate authorization headers, or is still using the old token after rotation.

**Fix:** update the client secret, reconnect, and avoid diagnostics that print authorization headers. Tokens are case-sensitive.

### HTTP gateway returns 400 "must be initialize"

You called the endpoint without an `mcp-session-id` header, but with a non-`initialize` JSON-RPC method.

**Fix:** the *first* call on a new session must be `{"method": "initialize"}`. The response carries the session ID via `mcp-session-id` header — include it on subsequent calls.

### `/health` passes but `/ready` fails

The MCP HTTP listener is alive, but runtime readiness has not completed or the server is degraded.

**Fix:** wait for startup recovery to finish, then inspect structured logs. Use `/ready` for load balancer readiness gates.

### Worker connects but does not claim work

The worker may not have an active project assignment, the project may be missing from `--project-id` / `--active-project-id`, the endpoint may be stale, the queued task may use a different executor, or the server may not have returned a lease token.

**Fix:** confirm the worker status and project assignment, verify queued dispatches, and do not start local execution without a lease token.

### Settings bundle import requires approval

Secret-bearing `manage_settings` bundle exports and imports use a one-use approval flow tied to the exact payload.

**Fix:** review the bundle, then repeat the same request with `approval.confirmed: true` within the approval window. Keep redacted bundles in review channels and secret-bearing bundles only in approved secret storage.

## Sprint orchestration

### `CRITICAL: Emergency stop active`

The orchestrator hit `maxFailures` consecutive task-start failures.

**Fix:** read the latest few cycle logs. Common causes:

- `JULES_API_KEY` invalid or expired.
- A virtual worker CLI not installed / not authenticated.
- The repo has uncommitted state preventing branch creation.

Re-run the sprint after fixing — the counter resets on each run.

### Tasks stay BLOCKED forever

A dependency is `COMPLETED` but `is_merged: false`. Code UX gates on merge, not just completion.

**Fix:** open the dependency's PR; merge it. Then set `merged: true` in the subtask file (or use auto-merge so this is automated).

### Task dispatch fails during branch refresh

CLI-backed tasks refresh the remote branch before preparing the worker branch. That refresh is mandatory so local branch state cannot drift from the remote.

**Fix:** verify `git fetch origin <branch>` works in the project repository and that the dashboard GitHub/GitLab token or local SSH setup can read the remote. Slow GitHub/GitLab smart HTTP connections may exceed short local timeouts; Code UX waits 120 seconds by default, and operators can raise it with `CODE_UX_GIT_FETCH_TIMEOUT_MS`.

### CI autofix loops

A `VirtualWorkerService` doing `ci_fix` tasks keeps trying and failing.

**Diagnostics**: Inspect the latest run. Code UX evaluates only the latest timestamped observation per workflow/check.

**Fix**: If the newest run still fails, reproduce it locally, fix it, push, and resolve the attention item. A CI-blocked task should remain code-complete and must not start another ordinary coding invocation. Optionally lower the CI-fix guardrail cap to fail faster next time.

### Sprint paused at finalisation

`mainBranchAutoMergeMode` is `OFF`, so the engine is waiting for you to merge the feature branch into `main` manually.

**Fix:** run the printed `gh pr merge` command. Code UX detects the merge on the next cycle and transitions the sprint to `completed`.

## Provider readiness

### Missing Jules API key

**Symptom**: The sprint failed to start or a task is blocked because no provider is configured.

**Diagnostics**: Check Settings -> Providers, or the CLI provider authentication.

**Fix**: Set a Jules key via UI, `JULES_API_KEY`, or enable an authenticated CLI provider.

### "Provider quota exceeded" / `QUOTA` status

**Symptom**: Your API key hit a rate or token quota.

**Diagnostics**: Check provider dashboards for rate limits.

**Fix**: Wait, raise the quota, or route the affected invocation to a different provider via Settings -> Routing. Tasks in `QUOTA` are retried automatically.

### "Provider auth not detected" badge in settings

The CLI is installed but not logged in.

**Fix:** run the CLI's auth command directly (e.g. `gemini auth login`, `codex login`, `claude login`). Refresh Settings.

### Preview/file-browser failures or Docker mode fails to start a container

The Docker daemon is unreachable, or the worker image cannot be pulled.

**Diagnostics**: Verify `docker ps` works. If the header Docker status control shows the red `Runtime not ready` warning, open the Docker status menu for the dependency list.

**Fix**: Pre-pull the image: `docker pull node:24-bookworm`. For preview/file-browser issues, ensure safe commands. Current builds use an opaque desktop shell and GPU memory hints; if Chromium `tile_manager.cc` warnings appear, switch to Static background. For Windows `spawn ENAMETOOLONG`, ensure you use a recent build that mounts arguments via file. Do not recommend destructive Docker cleanup before safer scoped recovery steps.

## Memory & embeddings

### Search returns no results

The active embedding model has no memories embedded with it (you switched models without re-embedding).

**Fix:** open **Memory → Embedding models** and click **Re-embed all**.

### Embedding model download stuck

The download failed mid-stream.

**Fix:** click **Cancel download**, then **Download** again. Check disk space.

## Where to find logs

- **Dashboard process stdout/stderr** — the terminal you launched `codeux` from. Logs are JSON-structured.
- **MCP client logs** — depends on client. Gemini CLI: `~/.gemini/logs/`. Claude Desktop: app log directory per OS.
- **Per-task activity** — visible in the dashboard task detail panel; also at `/api/live-activities` and `/api/execution/invocations/:id/messages`.
- **Cycle telemetry** — `/api/projects/:projectId/execution/invocations` (typed by `type`).

## Chat connector recovery

Start with `/api/chat-providers/health`, the redacted connection/binding, and `/api/chat-providers/deliveries`. Health is persisted diagnostics and makes no provider call.

### Bad credentials

Disable the connection/binding, rotate and replace the write-only credential, run connection verification, and re-enable one test route only after `verified`. Secret/setup/mode changes invalidate old verification. Telegram `getMe`, Slack `auth.test`, and Discord current-user tests need credentials; Meta send testing needs explicit test-number opt-in. A skipped check is not a pass.

Rollback by disabling the changed connection and re-enabling the previously verified managed/custom bridge.

### Provider outage or repeated retries

Honor the persisted `nextAttemptAt`/provider retry delay. Do not repeatedly click retry during throttling or while an unexpired lease owns `sending` work. Disable outbound if the queue grows, cancel stale/unsafe work, and approval-retry one delivery after provider recovery. Reconcile ambiguous outcomes with provider history before resending.

Rollback new traffic to a known-good managed/custom bridge, but preserve failed rows for audit.

### Stale sessions

For Discord reconnect loops, disable the connection; confirm token, intents, privileged `MESSAGE_CONTENT`, and Discord-owned resume host; restart once to resume or re-identify; then correct/reverify if bounded attempts exhaust. For iMessage, repair the operator-selected protocol-v1 bridge. Code UX does not provide AppleScript, Messages-database automation, or an Apple bot sandbox.

### Failed legacy-secret migration

Protect a database backup and matching key-provider version, restore secure key readiness, restart/rerun migration until `pending: 0`, then reverify anything changed. Migration seals and compare-and-set commits before clearing plaintext, so do not manually copy secrets back to `secret_json`. Database rollback requires matching key material.

### Disabled or ambiguous routing

Check active/enabled connection state, stored project authorization, external channel, selectors, and inbound/outbound flags. Shared channels must select exactly one project; Code UX records `disambiguation_needed` rather than guessing. Correct the binding and send a new test message; do not move a historical delivery between projects.

### Cleanup

Keep failed connections disabled until retention review, cancel unwanted pending work, and let leases/sessions settle. Deleting a connection requires approval and cascades bindings/delivery history. Expired replay receipts and sessions are cleaned automatically.

## Recovery & reset

If state is corrupted or unrecoverable:

- **Soft reset (one project)** — Delete the project; re-create.
- **Hard reset (all data)** — Settings → System → **Reset database**. *Irreversible.*
- **Manual** — Stop Code UX. Delete `~/.code-ux/` and the project's `<repo>/.code-ux/`. Restart.

## Filing an issue

Include:

- Code UX version (`codeux --help` shows the version banner).
- Node version (`node --version`).
- OS / shell.
- The exact MCP client and version.
- Relevant logs (last ~50 lines from the failing cycle, redacted of secrets).
- Steps to reproduce.

Issue tracker: https://github.com/codeux-ai/codeux/issues
