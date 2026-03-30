# Live Runtime Contract

The Live snapshot (`ProjectLiveDashboardSnapshot`) serves as the authoritative boundary contract for the Live dashboard page and websocket realtime stream.

## Core Boundary Contract

1. **SQLite is the Absolute Source of Truth:**
   The database holds the definitive state for project metadata, task execution, assigned workers, chat threads, and sprint activity. No single module is the global truth; the database schema as a whole represents the system state.

2. **The Server Assembles the Snapshot:**
   The `getProjectLiveSnapshot` module (`src/app/live/project-live-snapshot.ts`) is the unified assembly path. It reads data across repositories to compute a complete projection for a project in a specific moment.

3. **Websockets Transport Committed Changes:**
   The realtime service (`DashboardRealtimeService`) strictly listens for database commits (e.g., SQLite `UPDATE`, `INSERT`) and triggers the snapshot assembly path. It publishes the newly assembled `ProjectLiveDashboardSnapshot` over the websocket. The websocket transport itself is stateless and relies completely on the backend snapshot assembly.

4. **The Browser Renders (No Reconciling):**
   The browser UI renders the exact snapshot it receives over HTTP `/api/live` or websockets. It does not attempt to reconcile competing sources, merge partial updates manually, or maintain local hidden state that contradicts the snapshot.

## Field Ownership & Mutation Triggers

The top-level fields within `ProjectLiveDashboardSnapshot` are explicitly owned and mapped back to strict backend origins:

- **`projectId`**:
  - **Owned By:** `ProjectManagementRepository`
  - **Mutated:** When a project is created, selected, or changed via the system.
- **`selectedSprintId`**:
  - **Owned By:** `ProjectManagementRepository`
  - **Mutated:** When a new sprint is created, or the user navigates between sprints.
- **`status`**:
  - **Owned By:** `ProjectRuntimeRepository`
  - **Mutated:** When task states change, a sprint is run, or the orchestration loop updates progress markers.
- **`execution`**:
  - **Owned By:** `ExecutionRepository` (assembled via `getProjectExecutionSnapshot`)
  - **Mutated:** When sprint runs are dispatched, worker states change, attention items are created/claimed, or chat threads progress.
- **`gitStatus` / `gitStatusError`**:
  - **Owned By:** The external git/system environment.
  - **Mutated:** Dynamically tracked when local branches, origin synchronization, or pending PRs change.
- **`updatedAt`**:
  - **Owned By:** The `getProjectLiveSnapshot` module.
  - **Mutated:** Upon every snapshot assembly call to provide an accurate rendering timestamp.
