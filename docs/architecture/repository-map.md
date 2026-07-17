# Repository Map

This map explains where major responsibilities live.

## Top-Level Layout

```text
.
├─ scripts/                    # Build, validation, and maintenance scripts
├─ src/                        # Backend MCP server and orchestration engine
├─ tests/                      # Dedicated backend + dashboard test suites
├─ dashboard/                  # Preact dashboard app
├─ .code-ux/                   # Local configuration, artifacts, and templates
├─ docs/                       # Project documentation
├─ dist/                       # Compiled backend output
└─ package.json                # Scripts and dependencies
```

## Backend (`src/`)

Source trees are intentionally kept free of editor and merge backup artifacts. Files ending in
`.orig` are ignored under `src/` and `dashboard/src/`, and repository hygiene tests fail if those
backup files appear there.

- `index.ts`
  - Minimal bootstrap (`dotenv`, app config, server launch).
- `app/`
  - `dependency-factory.ts` and `dependency-factory/` for application dependency composition root and factories.
  - `lifecycle/` for bootup lifecycle services (dashboard, settings, mcp).
- `electron/`
  - `main.ts`
  - Desktop shell entrypoint and network policy, which hosts the Code UX UI without owning backend orchestration.
- `worker/`
  - Headless execution role entrypoint for worker-host mode.
- `config/`
  - `app-config.ts`, `external-settings.ts`
  - Startup/env config loading and external settings hints.
- `mcp/`
  - `management/`
  - Every action in every management domain, such as `management-tool-handler.ts`.
- `contracts/`
  - `app-types.ts`, `mcp-tool-definitions.ts`
  - Shared backend contracts and MCP tool definitions.
  - `chat-provider-types.ts`
  - External chat provider setup schemas, redacted credential/verification contracts, channel binding records, delivery leases, replay receipts, and resumable session types.
- `domain/`
  - `workers/`
    - Worker control, virtual worker scheduling, project worker assignments, and project attention services.
  - `chat-connectors/`
    - Side-effect-free typed connector profiles: supported modes, provider/native trust boundaries, ingress authentication/normalization, identity, outbound mapping, verification, official references, and session requirements.
  - `sprint/orchestrator/`
    - Action runners, loop runners, and state machines.
  - `sprint/ci/`
    - CI merge gates, automerge policy, and failure summarization.
- `server/`
  - `code-ux-server.ts`
  - Main runtime composition wiring backend services (dashboard API on default port 4444 and MCP server).
  - `mcp-request-router.ts`
  - MCP list/call handler registration and dispatch routing.
  - `activity-cache-service.ts`
  - Live-activity + git-status caching for dashboard endpoints.
  - Modular HTTP routes like `*-routes.ts` (e.g., `dashboard-route-registration.ts`, `sprint-routes.ts`, `task-routes.ts`, `file-browser-routes.ts`, `chat-provider-routes.ts`).
  - `dashboard-server.ts`
  - Express routes for dashboard APIs and static assets.
- `repositories/`
  - Persistence using SQLite via `node:sqlite`. Split by bounded domain.
  - `execution-repository.ts`
  - Delegates snapshot projection to `execution/project-execution-snapshot-query.ts` while keeping validation boundary.
  - `execution/execution-invocations-query.ts`
  - Focused query module separating invocation and message lists from write concerns.
  - `execution/execution-runtime-events-query.ts`
  - Focused runtime-event live snapshot slice.
  - `execution/execution-stats-types.ts`
  - Dedicated module for stats query types.
  - `project-runtime/run-event-writes.ts`
  - Focused write module for legacy runtime status-sync task runs and task-run events.
  - `chat-provider-repository.ts`
  - External chat connector connections, metadata, and provider sessions.
  - `settings-repository.ts`, `guide-repository.ts`, `subtask-repository.ts`, `session-tracking-repository.ts`.
- `infrastructure/`
  - `repositories/`
    - Shared file lookup implementation used by guide and instruction template repositories.
  - `providers/cli/`
    - Docker and host CLI provider implementations for task execution.
    - `invocation-workspace-preparer.ts`
- `services/`
  - Backend services handling specific domains (e.g., `task-service.ts`, `git-status-service.ts`, `sprint-issue-service.ts`, `cli-workflow-service.ts`, `provider-routing.ts`).
- `shared/logging/`
  - `logger.ts`
  - `correlation-id.ts`
- `git/`
  - `sprint-branch-scheme.ts`
- `sprint/`
  - Main sprint orchestration coordinator (`sprint-orchestrator.ts`), shared types (`sprint-types.ts`), and atomic step modules (`steps/`).
- `instructions/`
  - Template loading, fallback, and placeholder rendering.

## Dashboard (`dashboard/src/v2/`)

- `DashboardV2.tsx`
  - Main view orchestration and layout.
- Pages (e.g., `BrowserPage.tsx`, `ChatPage.tsx`, `SettingsPage.tsx`, `TasksPage.tsx`)
  - Top-level routing components for each section of the application.
- `components/`
  - Shared UI primitives, specific settings panels, task cards, and layout elements.
- `hooks/`
  - Reusable React hooks for state, derived data, and integrations.
- `lib/`
  - Frontend helpers, resource clients, and utility functions (`settings`, `status`, `activity`, `markdown`).
- `i18n/`
  - Localization content and translation utilities.
- `types.ts`
  - Dashboard-side type contracts.

## Local Configuration and Templates (`.code-ux/`)

- `agents/`
  - project/home/default agent markdown mirrors such as `planning_agent.md` and `worker.md`
- `sprints/`
  - Runtime sprint plans and generated subtask markdown files.
- `conversations/<thread-id>/session-title.md`
  - Project-local dashboard chat session title mirror. New dashboard chat threads derive a concise title from the first visible user message, and manual title edits update this file alongside the sqlite thread record.

## Documentation (`docs/`)

- `index.md`
  - Documentation home.
- Topic folders (`mcp/`, `sprint-loop/`, `dashboard/`, etc.)
- `yourdocs.md`
  - Atomic refactor notes and migration details.

## Scripts (`scripts/`)

- Major validation and build scripts (e.g., `check-quality-guardrails.mjs`, `build.mjs`, `dev.mjs`, `sync-docs-web.mjs`).
