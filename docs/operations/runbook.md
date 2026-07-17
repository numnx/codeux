# Operations Runbook

This guide is a clean symptom-to-evidence-to-recovery guide for current multi-provider Code UX operations.

## Approved Local Test-Project Validation
Run recovery drills only against the approved local test project and mocked job/email providers. Ensure you are not operating against production databases or credentials during a drill.
```bash
pnpm run test:e2e:credentialed-automation
```
- A drill passes only when all processed fixtures verify the expected selected delivery count, with no duplicate provider/idempotency ids, and no secret canary exposure.

## Operational Procedures

### Normal Startup and Shutdown
- **Startup:** Server initializes (`pnpm run dev` or `pnpm start`) and starts bounded database maintenance via `DatabaseMaintenanceService` (WAL checkpoints, incremental vacuum up to 256 pages). Writes are deferred while provider invocations are active.
- **Shutdown:** Code UX attempts a graceful shutdown. If a runtime PID lock exists, it waits briefly for the old process to exit to avoid duplicating scheduler tasks against the same Docker/runtime state.

### Emergency Stop
If consecutive task creation failures reach threshold, the emergency stop activates:
- New task creation is halted.
- The system prevents further dispatch until corrective actions (e.g., verifying credentials, source ID, branch state) are complete.

### Cancel versus Force-Cancel
- **Cancel:** Sends a stop signal to the active sprint run, task dispatch, or invocation. Providers attempt to gracefully terminate tool calls and clean up resources. Stale cancelled dispatches are cleaned up after `STALE_CANCEL_REQUEST_MS` (15 minutes).
- **Force-Cancel:** Used when providers are unresponsive. Immediately force-closes active task dispatch rows, runs, and statuses after stopping provider containers. Late provider callbacks are dropped so they cannot revive a stale `running` dispatch state.

### Stale-State Reconciliation
- Recoveries rely on `RuntimeCleanupService` and `StartupRecoveryService`.
- Reconciles orphaned `running` task dispatches that lack active provider sessions back to a `retryable` or `failed` state.
- Durable remote worker sessions (e.g., Jules) attach to the resumed sprint run if their IDs persist but their previous sprint run crashed.

### WAL and Retention Handling
- The `DatabaseMaintenanceService` manages the SQLite WAL.
- `dbRetentionDays` retains data (bounded 1-3650 days). Pruning runs in cursor-based batches (max 500 rows/table).
- Operations skip destructive full-file `VACUUM` and only use incremental-vacuum pages.

---

## Incidents

### 1. Dashboard and Probes
**Observable Symptoms:** Dashboard loads slowly, shows "Internal Server Error", or `/health` and `/ready` probes fail or time out.
**Safe Inspection Commands:**
```bash
curl -s http://127.0.0.1:4444/health
curl -s http://127.0.0.1:4444/ready
```
**Correlation Fields:** `request_id`, `correlationId`, `logPurpose: HTTP`
**Likely Causes:** Express process is starving for CPU; long-running synchronous code blocking the event loop.
**Recovery Actions:** Restart the server process gently. Check if `CODE_UX_ALLOW_MULTIPLE_RUNTIMES` is inadvertently active.
**Retry/Idempotency Expectations:** Dashboard components will automatically reconnect WebSockets and resume polling once the server restarts.
**Cleanup Behavior:** WebSocket disconnects are logged; stale clients will refresh their UI state natively.
**Escalation Evidence:** Include the `/ready` probe output, `HTTP` error logs, and browser console trace.

### 2. Planning
**Observable Symptoms:** Planning retry message appears constantly, or subtask files are reported as missing (planning preflight blocker).
**Safe Inspection Commands:**
```bash
sqlite3 ~/.code-ux/app.db "SELECT status, failure_count FROM task_dispatch WHERE task_type='planning';"
```
**Correlation Fields:** `sprint_run_id`, `task_id`
**Likely Causes:** Planning provider timeouts, API throttling, or failure to read the necessary project repository files.
**Recovery Actions:** Wait for automatic backoff retries. If permanently stuck, use the dashboard to restart the planning task cleanly.
**Retry/Idempotency Expectations:** Restarting clears intervention state and rebuilds the context prompt idempotently.
**Cleanup Behavior:** Old failed planning dispatches are left in history; a new dispatch takes precedence.
**Escalation Evidence:** Extract the `failure_count` and the specific provider error from the `provider_invocations` table.

### 3. Dispatch and Providers
**Observable Symptoms:** Task stays at "Started dispatch", or provider invocations fail immediately without streaming output.
**Safe Inspection Commands:**
```bash
sqlite3 ~/.code-ux/app.db "SELECT id, status, provider_session_id FROM provider_invocations WHERE status='running';"
```
**Correlation Fields:** `provider_invocation_id`, `sprint_run_id`
**Likely Causes:** Missing or invalid `JULES_API_KEY` or CLI provider credentials, slot exhaustion due to `ProviderSettings.maxConcurrentTasks`.
**Recovery Actions:** Verify credentials in `.code-ux/settings.json`. The dispatcher will automatically retry claiming a slot once capacity frees up.
**Retry/Idempotency Expectations:** The system enforces atomic slot claiming. Cancelled queue waits do not leave stale records.
**Cleanup Behavior:** The `RuntimeCleanupService` reaps unacknowledged dispatches older than 15 minutes.
**Escalation Evidence:** Supply `provider_invocation_id`, execution mode, model, and tool-call count from the database.

### 4. Docker and Workspaces
**Observable Symptoms:** Provider errors out with workspace not found, permissions denied on mounts, or zombie containers remain.
**Safe Inspection Commands:**
```bash
docker ps --filter "label=ai.codeux.role"
```
**Correlation Fields:** `workspace_id`, `container_id`
**Likely Causes:** Docker daemon is down, missing images, or host path mapping permissions are improperly configured.
**Recovery Actions:** Pull images if missing. Ensure `DOCKER` execution mode paths are valid.
**Retry/Idempotency Expectations:** Subsequent runs with **Clear worktree** selected will generate a fresh OS temp folder or Docker volume.
**Cleanup Behavior:** `DockerRuntimePruneService` automatically garbage-collects labels with expired task dispatches.
**Escalation Evidence:** Output of `docker inspect` for the failing container (redacting environment secrets) and `logPurpose: ORCH`.

### 5. Git, CI, and Merge
**Observable Symptoms:** Preflight blocker on branch creation, unable to push to `origin`, or Git merge status fails.
**Safe Inspection Commands:**
```bash
git status
git log -1
```
**Correlation Fields:** `branch_name`, `commit_sha`
**Likely Causes:** Protected branch rules prevent pushing, local working directory is dirty with uncommitted user changes, or remote detached head.
**Recovery Actions:** Undo any manual merges. Use the "Undo the Git merge" option in the dashboard for clean retries.
**Retry/Idempotency Expectations:** Branch checkout is idempotent. If a branch exists, Code UX safely updates or resets it based on the action required.
**Cleanup Behavior:** Discarded feature branches are left intact locally for human review unless explicitly cleared via the UI.
**Escalation Evidence:** Git status output, CLI error output, and the failing feature branch name.

### 6. QA
**Observable Symptoms:** QA review gets stuck in "running", feedback is not applied, or QA fails to start within `QA_RUN_START_TIMEOUT_MS`.
**Safe Inspection Commands:**
```bash
sqlite3 ~/.code-ux/app.db "SELECT id, status FROM qa_reviews WHERE status='running';"
```
**Correlation Fields:** `qa_review_id`, `task_id`
**Likely Causes:** The QA test runner failed to report its completion status, or the test harness crashed silently.
**Recovery Actions:** Cancel the task and run a clean rerun.
**Retry/Idempotency Expectations:** Restarting the task will generate a new QA snapshot worktree.
**Cleanup Behavior:** Read-only QA worktrees are instantiated in OS temp (`/tmp/code-ux-qa-[REDACTED]`) and automatically pruned by the cleanup service.
**Escalation Evidence:** Provide the `qa_review_id` and the local test suite output.

### 7. Worker Leases
**Observable Symptoms:** Tasks show RUNNING after an MCP interruption, or a task is assigned to an old/offline worker connection.
**Safe Inspection Commands:**
```bash
sqlite3 ~/.code-ux/app.db "SELECT id, status, worker_id FROM task_dispatch WHERE status='running';"
```
**Correlation Fields:** `worker_id`, `lease_token`
**Likely Causes:** The remote worker disconnected without returning a terminal heartbeat, leaving the lease dangling.
**Recovery Actions:** The `sprint_orchestrator:<pid>` automatically runs `StartupRecoveryService` upon boot to cancel or re-queue tasks lacking a live worker.
**Retry/Idempotency Expectations:** Dispatches with expired leases are safely moved back to `retryable` status without corrupting task state.
**Cleanup Behavior:** Unused `leaseToken`s are discarded and cannot be reused for heartbeat updates once closed.
**Escalation Evidence:** Extracted `lease_token` and `worker_id` from the dispatch record.

### 8. Previews
**Observable Symptoms:** Browser preview fails to load, `127.0.0.1` binds fail, or realtime logs do not stream.
**Safe Inspection Commands:**
```bash
lsof -i :<preview-port>
```
**Correlation Fields:** `preview_session_id`, `origin_host`
**Likely Causes:** Another process is blocking the preview port, or the preview host crashed.
**Recovery Actions:** Identify and kill the conflicting process using `lsof`. Restart the preview from the dashboard.
**Retry/Idempotency Expectations:** Previews are ephemeral; creating a new preview spins up a fresh container reading the current branch snapshot.
**Cleanup Behavior:** Preview containers are strictly isolated from the provider worktree and are destroyed on session close.
**Escalation Evidence:** `preview-<session>.localhost` networking logs and port availability checks.

### 9. Scheduler
**Observable Symptoms:** Scheduled tasks like `agent_wakeup` or periodic `memory_remediation` fail to execute.
**Safe Inspection Commands:**
```bash
sqlite3 ~/.code-ux/app.db "SELECT target_type, status FROM scheduler_entries WHERE status='pending';"
```
**Correlation Fields:** `scheduler_entry_id`, `target_json`
**Likely Causes:** Scheduler loop is paused, lock wait timed out, or date parsing failed for `scheduledFor` UTC entries.
**Recovery Actions:** The scheduler automatically polls upon server resume. Ensure the dashboard is not paused.
**Retry/Idempotency Expectations:** Standard entries and anchor-relative delays are idempotent if the target hasn't changed.
**Cleanup Behavior:** Completed or canceled scheduler entries are retained for audit but ignored by the active polling loop.
**Escalation Evidence:** Log output indicating `scheduler` or `timer` failures.

### 10. Chat Connectors
**Observable Symptoms:** Failed legacy-secret migration, bad credentials, provider outage/throttling, or stale reconnecting sessions for external chat.
**Safe Inspection Commands:**
```bash
sqlite3 ~/.code-ux/app.db "SELECT id, provider, status FROM connections_chat;"
```
**Correlation Fields:** `connection_id`, `external_session_id`
**Likely Causes:** Rotated external keys, rate limits, or network partitions causing websocket disconnects.
**Recovery Actions:** Disable the affected connection. Correct the credential locally, re-enable, and verify with a test route.
**Retry/Idempotency Expectations:** Webhooks and event messages use an idempotency key to prevent duplicate sends during retries.
**Cleanup Behavior:** Disabling a connection halts new processing but leaves historical audit records intact.
**Escalation Evidence:** Include the masked idempotency keys and error messages from `logPurpose: LIVE`.

### 11. Memory, Databases, and Storage
**Observable Symptoms:** App stalls due to database locks (`SQLITE_BUSY`), or out of space on WAL disk.
**Safe Inspection Commands:**
```bash
ls -lh ~/.code-ux/app.db*
```
**Correlation Fields:** `logPurpose: DATA`
**Likely Causes:** Active provider invocations are preventing WAL checkpoints, or heavy concurrency is causing lock contention.
**Recovery Actions:** Pause the active sprint to allow the `DatabaseMaintenanceService` to catch up on WAL checkpoints.
**Retry/Idempotency Expectations:** Checkpoint failures are non-fatal and will be retried automatically on the next maintenance cycle.
**Cleanup Behavior:** Pruning runs passively to remove old logs and telemetry bounded by `dbRetentionDays`.
**Escalation Evidence:** SQLite lock timeout logs, database file sizes, and the count of WAL checkpoint failures.

### 12. Security Exposure
**Observable Symptoms:** Unauthorized connections or unexpected commands executed on the host.
**Safe Inspection Commands:**
```bash
grep -i "unauthorized" ~/.code-ux/debug.log
```
**Correlation Fields:** `logPurpose: SEC`, `correlationId`
**Likely Causes:** Server bound to `0.0.0.0` without a reverse proxy, leaked MCP HTTP Bearer token, or browser origins bypassing CSRF constraints.
**Recovery Actions:**
1. Immediately kill the Code UX server process.
2. Ensure `HOST` environment binds strictly to `127.0.0.1`.
3. Rotate any leaked API keys or `MCP_HTTP_AUTH_TOKEN`.
**Retry/Idempotency Expectations:** Validating origin headers and restricting paths is structurally enforced on every request.
**Cleanup Behavior:** All invalid paths or hostile origins result in immediate drops (403/404) and are logged.
**Escalation Evidence:** Masked `ExecutionInvocations` logs and the external IPs that attempted the connection.

---

## Subprocess Execution Limits
Subprocess execution restricts accumulated `stdout` (default 5MB) and `stderr` (default 4KB) memory growth by slicing long outputs and prepending `"..."`. Streaming callbacks process the full line output regardless of this cap. These bounds can be overridden via `maxStdoutChars` and `maxStderrChars`.

## Escalation Notes
When reporting issues include:
- Action used (`plan`, `status`, `orchestrate`)
- Sprint number and feature branch (use placeholders like `feature-[REDACTED]`)
- Relevant dashboard warnings
- Latest protocol instructions
- Any recent settings changes
