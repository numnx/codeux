# External MCP Worker Client

This page documents the first real external Sprint OS worker process shipped in-repo.

## Purpose

The worker is not an embedded executor inside the dashboard server.

It is a separate process:

1. starts a headless Sprint OS server in `worker-host` mode over stdio
2. connects to that server with the MCP client SDK
3. registers itself as `role = worker`
4. claims queued `mcp_worker` dispatches from sqlite
5. executes the claimed task through the existing provider stack
6. heartbeats and finalizes the dispatch back into sqlite

That gives us a real external worker role without introducing a second execution model.

## Why Worker-Host Mode Exists

Sprint OS currently uses stdio MCP transport.

That means a worker client cannot attach to the already-running dashboard process over MCP. Instead, each worker process spawns its own Sprint OS server process and talks to it over stdio.

To make that safe, the spawned server now supports:

- `--runtime-role worker-host`
- implicit dashboard disable in worker-host mode
- no local `project_manager` connection registration in worker-host mode

This avoids dashboard port conflicts while still letting every worker-host process share the same Sprint OS sqlite state.

## Worker Command

The new CLI is:

- `sprint-os-worker`

Default behavior:

- spawns `node dist/index.js --runtime-role worker-host`
- polls for queued dispatches every few seconds
- polls the claimed session for progress and terminal state
- calls `cancel_local_dispatch` when `update_task_dispatch` returns `controlAction = "cancel"`

Useful flags:

- `--connection-key`
- `--display-name`
- `--project-id`
- `--sprint-id`
- `--dispatch-poll-interval-ms`
- `--session-poll-interval-ms`
- `--server-command`
- `--server-arg`
- `--server-cwd`

## Execution Path

The worker does not reconstruct tasks from markdown.

For each claimed dispatch:

1. `pull_task_dispatch` returns the DB-native claim payload
2. `execute_worker_dispatch` resolves the DB task, sprint, and project
3. Sprint OS starts the existing provider flow through `TaskService.startSprintTask(...)`
4. CLI providers keep using the existing Docker/worktree/CI path
5. Jules providers keep using the existing Jules session path
6. the worker polls `get_session`
7. the worker writes `RUNNING`, `COMPLETED`, `FAILED`, or `BLOCKED` through `update_task_dispatch`

This means connected workers are now another executor lane on top of the same runtime records, not a side system.

## Cancellation Model

Dashboard cancel now flows through two layers:

1. the shared DB dispatch is marked `cancel_requested`
2. the next worker heartbeat receives `controlAction = "cancel"`

The worker then calls `cancel_local_dispatch`.

Behavior:

- active local CLI runs are stopped through the worker-host process' in-memory `ActiveDispatchRegistry`
- Jules sessions receive a soft-stop `send_session_message(...)` request

This keeps cancellation aligned with the same worker dispatch and task run records already shown in the v2 dashboard.
