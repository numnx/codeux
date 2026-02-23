---
name: watch-sprint
description: Monitor and orchestrate the execution of a Jules Subagents sprint. Use when the user wants to start, watch, or get a continuous status update on a specific sprint's progress until completion.
---

# Watch Sprint

## Overview
This skill automates the orchestration of a software development sprint using the Jules Subagents MCP server. It handles repository identification, sprint discovery, and continuous monitoring of parallel subtasks.

## Workflow

### 1. Initialization
- **Identify Repository**: Find the local `repo_path` (containing `.jules-subagents/`).
- **Identify Source**: Use `list_all_sources` to find the matching `source_id` for the repository.
- **Find Sprint**: List `.jules-subagents/sprints/sprint-<N>.md` to identify the target sprint number.

### 2. Execution
- **Trigger Watch**: Call `sprint_agent(action: "orchestrate", wait: true, sprint_number: N, repo_path: P, source_id: S)`.
- **Observation**: During execution, the tool will report progress every 120 seconds. Monitor these logs for task completions or failures.

### 3. Finalization
- **Success**: Once all tasks are `COMPLETED`, verify the generated Pull Requests and summarize the sprint outcome.
- **Failure**: If tasks are `FAILED`, use `list_all_activities(session_id: ...)` for the failing task to diagnose the issue and propose a fix.

## Quick Actions
- "Watch sprint 5": Automatically performs discovery and starts the watch loop.
- "What's the status of the current sprint?": Performs a one-off `action: "status"` check.

## Guidelines
- **Branching**: Ensure the orchestrator has created the feature branch before starting.
- **Dependencies**: The skill relies on the `depends_on` graph defined in `.jules-subagents/sprints/sprint<N>-subtasks/`.
