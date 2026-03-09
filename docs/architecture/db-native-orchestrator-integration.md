# DB-Native Orchestrator Integration

This page describes the first shipped execution refactor that moves `sprint_agent` onto the Sprint OS database model.

## Scope

This slice replaces markdown task directories as the orchestration input for `status` and `orchestrate`.

It now:
- resolves execution scope from `project_id` / `sprint_id` / `sprint_number` / selected project
- loads sprint tasks from sqlite instead of `.sprint-os/sprints/...`
- creates `sprint_runs` for orchestrate executions
- creates `task_dispatches` and `task_runs` when ready tasks start
- keeps Docker or CLI-backed execution and Jules execution under the same dispatch flow
- persists auto-merge updates back into DB task records instead of markdown

It does not yet:
- remove all legacy wording from every instruction template
- move dashboard rerun flows onto the new dispatch service
- use `execution_leases` for active run ownership
- route connected MCP workers through the dispatch queue

## Primary Files

- `src/services/sprint-execution-state-service.ts`
- `src/services/sprint-task-dispatch-service.ts`
- `src/sprint/sprint-orchestrator.ts`
- `src/domain/sprint/orchestrator/cycle-runner.ts`
- `src/domain/sprint/orchestrator/watch-loop-runner.ts`
- `src/domain/sprint/ci/feature-pr-gate.ts`
- `src/repositories/execution-repository.ts`

## New Runtime Shape

`sprint_agent` now resolves a concrete execution scope before orchestration starts:

- `project`
- `sprint`
- `repoPath`
- `featureBranch`
- `defaultBranch`
- `sprintNumber`

That scope comes from sqlite, not from a subtask directory path.

## `sprint_agent` Arguments

`sprint_agent` now accepts project-scoped arguments:

- `project_id`
- `sprint_id`
- `sprint_number`
- `repo_path`
- `source_id`
- `feature_branch`
- `action`

Current resolution order is:

1. `project_id` if provided
2. `repo_path` matched to a known project
3. selected dashboard project

Then sprint scope is resolved from:

1. `sprint_id` if provided
2. `sprint_number` within the resolved project

## Task Loading

The orchestration loop now reads tasks from:

- `tasks`
- `task_dependencies`
- latest `task_runs`

Those rows are projected into the existing `Subtask` runtime shape so the CI and protocol steps can still operate while the rest of the loop is being transformed.

This is a migration seam, not a compatibility workspace:

- no task markdown is materialized
- no task markdown is read during execution
- markdown remains import/export only

## Dispatch Flow

When `startReadyTasksStep` launches work during `orchestrate`:

1. the orchestrator creates a `task_dispatch`
2. it creates a `task_run`
3. it starts the provider workflow through the existing `TaskService`
4. it writes session/provider metadata back onto the `task_run`

Executor mapping in this slice:

- `jules` provider -> `jules` dispatch executor
- CLI providers (`gemini`, `codex`, `claude-code`) -> `docker_cli` dispatch executor

That keeps the old Docker/worktree flow alive, but under DB-native dispatch records.

## Watch Loop

Watch-loop execution now updates `sprint_runs` directly:

- `running` while polling
- `completed` when all tasks are completed and merged
- `failed` when execution ends with failed tasks
- `paused` when execution stops for manual merge or no-more-action conditions
- `cancelled` when the sprint is empty

The old subtask-directory cleanup behavior is removed from the execution path.

## Merge Persistence

Feature PR auto-merge no longer writes `merged: true` into task markdown.

Instead it persists:

- `tasks.is_merged`
- `tasks.merge_indicator`

through the project repository.

## Remaining Gaps

The execution model is now DB-native at the entry, load, dispatch, and merge-persistence layers, but not fully end-to-end yet.

Still pending:

- rerun should create a new dispatch/task-run instead of calling `TaskService` directly
- CI/protocol wording should stop referencing any subtask-file semantics
- live provider activity should be attached more directly to `task_runs` / `task_run_events`
- `execution_leases` should prevent overlapping active sprint orchestration
- `mcp_worker` should claim from `task_dispatches`
