# Projects Management Guide

## Overview

The Projects Management domain within the orchestrator provides a centralized dashboard to define, monitor, and configure agentic execution environments. It serves as the top-level boundary for tasks, sprints, and memory context. By organizing work into explicit projects, the system bounds the operational scope of autonomous agents, ensuring robust contextual separation and precise resource allocation.

## Prerequisites

- **System Access:** Appropriate permissions to interact with the system dashboard.
- **Environment Constraints:** For local projects, the absolute directory path must exist and be accessible by the orchestrator service account. For Git repository projects, network egress to the remote origin and valid authentication must be established.
- **Routing Setup:** Ensure the `/projects` dashboard route is successfully mounted.

## Concepts

### Project Types
1. **Local Directory (`local`)**: The project operates within a specified absolute path on the host filesystem. Changes are executed directly in this directory.
2. **Git Repository (`git`)**: The project is linked to a remote repository URL. The orchestrator will clone this repository into a specified destination and execute tasks within the context of that repository.

### Execution Statuses
The lifecycle and immediate state of a project are surfaced through the following statuses:
- **Running (Green):** Active execution of agents or sprint loops is underway.
- **Failed (Red):** One or more tasks or infrastructure operations have encountered an unhandled exception or non-zero exit state.
- **Needs Review (Amber):** The system has paused execution and is explicitly requesting human intervention to proceed (e.g., resolving ambiguity, approving destructive operations).
- **Idle (Slate):** The project is instantiated but has no active executions or sprints in progress.

### Task Completion Metrics
The dashboard visualizes real-time progress using a ratio of `completedTasks` to total tasks (`completedTasks + openTasks`), providing an immediate overview of sprint velocity and project health.

## Workflows

### Viewing Projects
1. Navigate to the `/projects` route via the primary navigation menu.
2. The grid interface will display all instantiated projects.
3. Review key metrics on each project card: Name, Status Indicator, and Task Completion Percentage. The UI provides a filtered view (All, Running, Idle, Failed) to rapidly isolate project states.

### Creating a New Project
1. Within the Projects Management view, select the **Add Project** (or **+**) affordance.
2. The "Add Project" modal will surface.
3. Supply a distinct **Project Name**.
4. Select the **Source Type**:
    - **Local Directory:** Provide the absolute path (e.g., `/home/user/projects/my-project`).
    - **Git Repository:** Provide the repository URL (e.g., `https://github.com/user/repo.git`) and an optional **Clone Into Directory** path.
5. Confirm the addition. The project will be initialized and subsequently transition to the Idle status.

### Selecting a Project
1. From the grid view, click on a specific project card.
2. This action sets the `selectedProjectId` in the application state, transitioning the dashboard context to that specific project's executions, sprints, and memory parameters.

### Deleting a Project
1. (If applicable in the current UI design) Use the context menu or settings panel associated with a project to invoke deletion.
2. Confirm the destructive action. This will invoke the `deleteProject` API endpoint.

## Troubleshooting

- **Validation Errors on Project Creation:** Ensure paths are fully qualified absolute paths. For Git URLs, ensure standard protocol prefixes (e.g., `https://`, `git@`) are present and syntactically valid.
- **Failed Status Indication:** Review the execution logs or sprint traces for the specific project. A failed status indicates an unhandled exception in the agentic workflow.
- **Needs Review Status Persistent:** Navigate into the project context. Ensure you resolve pending attention items (e.g., approving a plan or resolving a conflict) using the available intervention workflows.
- **Path Not Found or Permission Denied:** For local directory projects, verify that the orchestrator service process runs with sufficient OS-level permissions to read/write the target directory.
