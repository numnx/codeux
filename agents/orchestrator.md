# SPRINT ORCHESTRATOR GUIDE

This guide defines how the `sprint_agent` tool orchestrates sprints and delegates tasks to Jules agents.

## 1. Directory Structure
- Sprints are located in `/sprints/sprint-<n>.md`.
- Subtasks are located in `/sprints/sprint<n>-subtasks/task-id.md`.

## 2. Planning Phase
- If the subtasks directory for a sprint does not exist, create it.
- Break the sprint into "small well-planned tasks".
- For each task, create a markdown file in the subtasks directory.

## 3. Intelligent Delegation
- **Independent Tasks**: Identify tasks that can be performed fully independently of other code changes in the sprint. These MUST be delegated to Jules.
- **Sequential Tasks**: Identify tasks that have dependencies. Decide intelligently which tasks can run in parallel and which must wait.
- **Blockers/Manual Parts**: Identify parts of the sprint that cannot be done independently or require human/main agent intervention. Report these clearly to the user.

## 4. Branching Strategy
- **Main Feature Branch**: All work for a sprint happens on a branch named `feature/sprint<n>-<description>` (e.g., `feature/sprint34-implement-dashboard`).
- **Subtask Branches**: Each subtask delegated to Jules must create its own branch *starting from the main feature branch*.
- **Merging**: Once a Jules subtask is completed and its PR is created, it should be merged back into the main feature branch.

## 5. Monitoring and Completion
- The orchestrator must keep watching/polling the status of all Jules sessions.
- Once all subtasks are completed, instruct the user to merge the final state or verify the feature branch.
- Report status clearly: which tasks are running, which are blocked, and which are done.
