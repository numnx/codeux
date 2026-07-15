# File Browser

The **File Browser** page (dock label **Files**, `/files`) lets you inspect a project's files and
review a sprint's Git changes from inside the dashboard, without switching to a terminal or editor.

## Sessions

The File Browser works through a **session** bound to a sprint, so you can browse the exact state a
sprint is producing. A session has a status:

| Status | Meaning |
| --- | --- |
| **Running** | The session is live and serving files and diffs. |
| **Starting** | The session is spinning up. |
| **Stopped** | The session is not currently running. |
| **Error** | The session failed to start or crashed. |

You can **start**, **stop**, **rebuild**, and **remove** sessions, and pick which sprint to launch a
session for. These correspond directly to the technical backend API routes:
- `/api/projects/:projectId/sprints/:sprintId/file-browser/start`
- `/api/file-browser/sessions/:sessionId/stop`
- `/api/file-browser/sessions/:sessionId/rebuild`
- `DELETE /api/file-browser/sessions/:sessionId` (remove)


## Container Lifecycle

- **Path Validation**: Operations enforce strict path boundaries preventing traversal outside the sprint snapshot workspace.
- **Cleanup and Stale Containers**: Automatic cleanup happens during server startup, resetting persisted sessions and pruning orphaned volumes using Docker label filters (`code-ux.file-browser-volume=true`). On Windows, deeply nested `node_modules` that exceed the `MAX_PATH` are safely deleted via a helper `alpine` Docker container before host-side fallback.
- **Reconnects and Failures**: Sessions track their health. Failed or unexpectedly exited sessions reflect an error status.

## Files mode

In **Files** mode you get a file tree for the project plus a viewer:

- Navigate the tree and open any file to view its contents with syntax highlighting.
- Search to jump to a path quickly.

## Changes mode

In **Changes** mode you review what a sprint has modified:

- A **changes list** of added, modified, and deleted files for the selected sprint's branch.
- A **diff viewer** showing the changes per file, with a side-by-side or stacked layout.

This makes it easy to review a sprint's work — or an individual task's output — before merging,
complementing the PR/CI review handled by the [merge protocol](../automation-and-ci.md).

## Security Boundaries

- **Host Path Isolation**: Browser preview and file browser sessions run strictly within scoped Docker containers or isolated proxies. They do not expose private host paths (e.g., `/home/user/...` or `C:\Users\...`) in prompts, API responses, or logs. All paths displayed are container-relative or workspace-relative.
- **Project Isolation**: Sessions are strongly tied to a specific project and sprint. Path traversal or accessing files outside the exported sprint snapshot is prohibited.
- **Identifier Masking**: Real project names and confidential identifiers are sanitized in logs and proxy outputs.
- **Preview Distinctions**: Sprint previews are distinct, isolated environments running a full application stack, separate from internal validation previews which serve a different role for verifying specific checks.
