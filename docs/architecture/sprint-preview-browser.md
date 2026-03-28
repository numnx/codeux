# Sprint Preview Browser

This page describes the sprint-scoped in-app browser and preview-container runtime.

## Goal

Sprint OS can now build and run one isolated preview app per sprint, then surface that app inside the dashboard through a same-origin browser view.

The feature is designed for:
- comparing multiple active sprint builds side by side without port conflicts
- previewing progress inside Sprint OS instead of switching out to separate terminals
- reusing the existing Docker/bootstrap/runtime stack instead of introducing a second container system

## Primary Implementation Files

- `src/services/sprint-preview-service.ts`
- `src/services/sprint-preview-utils.ts`
- `src/repositories/sprint-preview-repository.ts`
- `src/repositories/app-db-storage.ts`
- `src/server/dashboard-server.ts`
- `src/server/jules-agent-server.ts`
- `dashboard/src/v2/BrowserPage.tsx`
- `dashboard/src/v2/lib/browser-api.ts`
- `dashboard/src/v2/SettingsPage.tsx`

## Runtime Model

Each preview session is scoped to one `(projectId, sprintId)` pair.

Key rules:
- every sprint preview runs from a dedicated git worktree prepared by `WorkspaceManager`
- the preview container reuses the same Docker bootstrap and optional cached setup-image flow used by CLI execution
- the app inside the container listens on `sprintPreview.containerAppPort`
- the host-facing port is allocated from `sprintPreview.hostPortRangeStart..hostPortRangeEnd`
- host ports bind to `127.0.0.1` only
- containers are labeled with sprint-preview metadata so runtime reconciliation can rediscover them

Preview session state is persisted in sqlite instead of staying process-local.

## Storage

Preview runtime state is stored in the Sprint OS app database table:
- `sprint_preview_sessions`

The table stores:
- project/sprint identity
- preview status and health
- host/container port mapping
- container id/name
- worktree path and feature branch
- resolved startup mode and detected commands
- task-count and sprint-status markers used by reconciliation
- timestamps and last error state

## Startup Script Resolution

Preview startup uses a dedicated script path, separate from the task-execution setup script.

Resolution order:
1. explicit project setting `sprintPreview.startupScriptPath`
2. default project-relative path `.sprint-os/browser/start-preview.sh`
3. generated fallback script when no custom preview script exists

Command detection reads `package.json` and lockfiles to infer:
- package manager
- install command
- build command
- runtime command

Install behavior:
- pnpm prefers `--frozen-lockfile` first, then falls back to `--no-frozen-lockfile` for preview environments where the worktree manifest and lockfile are temporarily out of sync

Runtime command preference:
1. `preview`
2. `start`
3. `serve`
4. static build-directory fallback via `serve`

The setup script configured in `cliWorkflow.containerSetupScriptPath` still prepares the container environment. It does not replace the preview startup script.

## Browser Delivery

The dashboard does not iframe raw `http://127.0.0.1:<port>` URLs directly.

Instead it proxies preview traffic through:
- `/api/browser/sessions/:sessionId/proxy/*`

This keeps the preview same-origin with the dashboard so the in-app browser can support:
- back/forward navigation
- refresh
- editable address field
- open-in-new-tab behavior
- iframe location tracking after navigation

Body and asset rewriting is best-effort for preview-oriented HTTP traffic and is primarily intended for static/frontend app builds.

## Automation

`SprintPreviewService.reconcileSessions()` runs on a background interval from `JulesAgentServer`.

It supports:
- auto-start when a sprint becomes `running`
- rebuild when completed task count increases
- rebuild when a sprint transitions into a completed terminal state
- auto-stop when a sprint becomes terminal

These behaviors are controlled through scoped settings under `sprintPreview`.

## Dashboard Surface

The dashboard now exposes:
- `/browser` route for the in-app browser workspace
- dock and top-nav entry points for the browser
- sprint-preview controls in the `Sprint Engine` settings category
- per-sprint startup script editing in the browser page itself
- preview logs, rebuild, stop, and open actions

## API Surface

Preview endpoints are implemented in `src/server/dashboard-server.ts`.

- `GET /api/projects/:projectId/preview/sessions`
- `POST /api/projects/:projectId/sprints/:sprintId/preview/start`
- `POST /api/browser/sessions/:sessionId/rebuild`
- `POST /api/browser/sessions/:sessionId/stop`
- `GET /api/projects/:projectId/sprints/:sprintId/preview/script`
- `PUT /api/projects/:projectId/sprints/:sprintId/preview/script`
- `GET /api/browser/sessions/:sessionId/logs`
- `ALL /api/browser/sessions/:sessionId/proxy/*`

## Current Boundaries

Current intentional limits:
- one persisted preview session row per project+sprint pair
- same-origin proxy rewriting is tuned for app-preview traffic, not arbitrary authenticated web browsing
- script detection prefers production-style preview/start commands and does not automatically fall back to `dev`
