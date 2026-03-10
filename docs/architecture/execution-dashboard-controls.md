# Execution Dashboard Controls

This page describes the first DB-native runtime control actions exposed through the v2 dashboard.

## Scope

The dashboard can now control execution state without bypassing the Sprint OS execution model.

Shipped controls:

- start or resume sprint orchestration for a sprint
- pause an active sprint run
- cancel an active sprint run
- cancel queued or claimed task dispatches
- retry terminal task dispatches through the existing task rerun path

These actions operate on `sprint_runs`, `task_dispatches`, `task_runs`, and runtime events.

## API Surface

The dashboard server now exposes:

- `POST /api/projects/:projectId/sprints/:sprintId/orchestrate`
- `POST /api/sprint-runs/:sprintRunId/pause`
- `POST /api/sprint-runs/:sprintRunId/cancel`
- `POST /api/task-dispatches/:dispatchId/cancel`
- `POST /api/task-dispatches/:dispatchId/retry`

## Runtime Behavior

### Start / Resume Sprint

Starting from the dashboard does not invent a second orchestrator path.

It schedules `sprintOrchestrator.execute({ action: "orchestrate", project_id, sprint_id, wait: true })` inside the Sprint OS server process and lets the normal lease and watch-loop rules apply.

That means:

- duplicate orchestration still respects sprint leases
- a resumed sprint creates a fresh orchestration attempt rather than mutating old run history
- dashboard-triggered execution and MCP-triggered execution converge on the same runtime model

### Pause Sprint Run

Pausing updates the `sprint_run` status to `paused` and writes a `sprint_pause_requested` event.

The watch loop now checks the stored sprint-run status on each iteration and exits when a dashboard pause is observed.

### Cancel Sprint Run

Cancelling updates the `sprint_run` status to `cancelled` and writes a `sprint_cancel_requested` event.

Queued and claimed dispatches under that run are cancelled immediately.

## Dispatch Controls

### Cancel Dispatch

Dispatch cancel is currently limited to `queued` and `claimed` dispatches.

When cancelled:

- the dispatch becomes `cancelled`
- the associated `task_run` becomes `BLOCKED`
- a `dispatch_cancelled` runtime event is written
- selected-project dashboard status is updated so the task card reflects the cancellation

### Retry Dispatch

Retry is currently limited to terminal dispatches.

Retry uses the existing task rerun flow instead of inventing a dispatch-only executor path. That keeps retry semantics aligned with normal task restarts.

## Current Limitation

Sprint OS still does not have a safe force-stop path for already running provider work:

- active Docker/CLI executions are not force-killed by dashboard cancel
- active Jules sessions are not terminated by dashboard cancel
- running worker executions are not revoked mid-flight

For that reason, dashboard cancel is conservative:

- sprint cancel stops orchestration ownership and cancels not-yet-started dispatches
- dispatch cancel is only allowed before the work is truly running

This is intentional until executor-specific kill semantics are designed and tested.
