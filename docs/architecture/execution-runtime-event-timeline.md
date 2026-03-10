# Execution Runtime Event Timeline

This page describes the DB-native event stream that now powers the v2 live runtime feed.

## Purpose

Sprint OS should not depend on ad hoc session polling responses as the primary dashboard live feed.

The durable runtime timeline now lives in sqlite:

- one `task_run` captures the current execution record for a task run
- many `task_run_events` capture the timeline of what happened during that run

This gives the dashboard, orchestrator, and future worker control paths one shared event history.

## Stored Events

Primary event types now written into `task_run_events`:

- `dispatch_queued`
- `dispatch_started`
- `session_created`
- `dispatch_failed`
- `worker_claimed`
- `run_running`
- `run_completed`
- `run_failed`
- `run_blocked`
- `session_state_synced`
- `provider_activity`
- existing `status_sync` projection events from selected-project runtime sync

Each event stores:

- `task_run_id`
- `event_type`
- `originator`
- `payload_json`
- `source_event_key`
- `created_at`

## Deduplication

`task_run_events.source_event_key` is now used to make event ingestion idempotent per task run.

Current usage:

- provider activities use `activity:<activityId>`
- session state sync uses a signature-based key derived from session identity and state metadata

That allows repeated session polling without duplicating the same dashboard-visible event rows.

## Provider Activity Ingestion

The session sync step still polls provider sessions, but it no longer exists only for transient UI hydration.

It now also:

1. resolves the latest `task_run` for the DB task inside the current `sprint_run`
2. updates `task_runs` session metadata and run state from provider session state
3. updates `task_dispatches` status/heartbeat from that same state
4. writes durable `session_state_synced` and `provider_activity` events

This keeps provider-backed execution on the same runtime contract as worker-backed execution.

## Dashboard Projection

`ExecutionRepository.getProjectExecutionSnapshot(projectId)` now returns:

- `sprintRuns`
- `taskDispatches`
- `recentEvents`

`recentEvents` is joined with:

- `task_runs`
- `tasks`
- `sprints`
- `mcp_connections`

so each row already has the task, sprint, connection, provider, branch, PR, and payload context the v2 dashboard needs.

## UI Usage

The v2 live page now uses this DB timeline in two places:

- the execution runtime sidebar panel shows a project-scoped runtime timeline
- each task card can open a runtime feed derived from recent `task_run_events`

This means the main live feed is now DB-native even when execution is happening through Docker/CLI providers or connected MCP workers.
