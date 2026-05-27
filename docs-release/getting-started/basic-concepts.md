# Basic Concepts

## 1. Purpose and scope

This guide defines the foundational concepts of the Jules Agent OS and MCP Server. It provides the necessary mental model for operators to understand how high-level goals are transformed into low-level execution. It covers Sprints, Orchestration, Virtual Workers, Tasks, and PR Gating.

## 2. Data flow or behavior summary

The system operates on a Tri-Agent Skill Architecture where the Orchestrator plans, the Planning Specialist decomposes goals, and the Jules Technical Worker executes tasks. Understanding the following core concepts is critical for effectively monitoring and managing this flow.

### Sprints

- **What it is**: A sprint transforms natural language goals into atomic, test-validated pull requests. Sprints are persisted in the repository pattern as Markdown files with YAML frontmatter.
- **Why it matters**: Sprints provide the boundary and context for all automated work, ensuring changes are scoped, tracked, and verifiable.
- **How it interacts**: Sprints are managed by the Orchestrator. The Planning Specialist breaks the sprint down into Tasks.
- **Actionable Guidance**: Manage sprint goals and review overall sprint health via the local Dashboard on port 4444.

### Orchestration

- **What it is**: The central nervous system of the MCP server, primarily driven by the `Cycle Runner` (manages task dependency resolution and DAG scheduling) and the `Watch Loop` (a continuous background process monitoring PR status, CI results, and task completion).
- **Why it matters**: Orchestration guarantees that tasks run in the correct order based on dependencies and that the system correctly reacts to external CI events.
- **How it interacts**: The Orchestrator interacts with Virtual Workers to provision environments and execute tasks based on the current DAG state.
- **Actionable Guidance**: Monitor the Watch Loop events in the Dashboard to check real-time CI status and understand why the system might be paused or waiting.

### Virtual Workers

- **What it is**: On-demand, specialized agents provisioned in isolated Docker environments. They integrate multiple LLM providers (Gemini, Claude, Codex) as execution backends.
- **Why it matters**: Docker isolation ensures that agent executions do not pollute the host machine. Virtual workers also handle automated CI Autofixing and Merge Conflict Resolution independently.
- **How it interacts**: Virtual Workers are spun up by the Orchestrator to execute specific Tasks. They operate within local Git worktrees to allow parallel task execution.
- **Actionable Guidance**: Inspect Virtual Worker execution logs when a task fails. The logs will reveal if the worker is stuck in an autofix loop or encountering dependency errors.

### Tasks

- **What it is**: "Jules-Ready", atomic, testable subtasks derived from the Sprint goal. Like Sprints, they are stored as Markdown files with YAML frontmatter.
- **Why it matters**: Tasks represent the actual code changes. Keeping them atomic ensures they can be independently verified and reverted if necessary.
- **How it interacts**: Tasks are executed in parallel by Virtual Workers within isolated Git worktrees, orchestrated by the Cycle Runner's DAG.
- **Actionable Guidance**: Track task progress, blockages, and dependencies directly in the Sprint DAG view on the Dashboard.

### PR Gating

- **What it is**: Automated merge policies enforced by the system.
- **Why it matters**: Gating ensures that PRs only merge if all Continuous Integration (CI) checks pass, maintaining the "Award-Winning" production-grade standard.
- **How it interacts**: The Watch Loop continuously monitors the PR status and CI results. It triggers PR Gating to block merges until validation is successful, preventing broken code from entering the main branch.
- **Actionable Guidance**: Check the PR gating status when a completed task is pending merge. If gated, review the CI results to understand the failure preventing the merge.

## 3. Related links

- [Quickstart Guide](./quickstart.md)
- [Operations Runbook](../operations/runbook.md)