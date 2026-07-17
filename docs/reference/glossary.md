# Glossary

## Code UX
The container-first, local-first agentic coding runtime that coordinates the CLI, MCP server, sprint orchestrator, dashboard, and Electron shell around project work.

## Jules
The hosted remote provider accessed through the Jules API. Code UX treats it as one provider among several and can route sprint work to it when settings select Jules.

## Local CLI providers
Provider runtimes that execute through local CLI workflows, often inside Docker or host-backed worktrees, such as Gemini, Codex, Claude Code, Qwen Code, OpenCode, and Antigravity.

## MCP transports
The communication mechanisms used by Code UX to expose Model Context Protocol surfaces, including `StdioServerTransport` for local human-driven clients and `StreamableHTTPServerTransport` for remote worker registrations and dispatch polling.

## Worker endpoints
The Streamable HTTP surfaces that receive worker connections, manage heartbeats, and handle dispatch polling.

## Sprints
Managed units of work within Code UX that are planned, routed, executed in isolated Docker workspaces, reviewed, and tracked.

## Tasks
Individual executable steps within a Sprint.

## .code-ux
The canonical active project artifact directory for sprints, agents, instruction templates, logs, and runtime files. This has completely replaced the legacy `.jules-subagents` compatibility path.

## Provider instances
Persisted provider configurations and the runtime sessions or dispatches created from them during execution.

## Skills
Executable capabilities available to the agents during task execution.



## Dashboard v2 surfaces
The current Preact dashboard surfaces under `dashboard/src/v2/`, including execution, sprints, memory, settings, chat, and related views.


## Agent Tool Handler
Module that handles worker-local execution and reply helper calls.

## Core Tool Handler
Module that handles shared session, listener, inbox, dispatch, and attention tool calls.

## CI Intelligence
Settings group that controls merge-related protocol guidance for CI and review comments.

## Dashboard Settings
Persisted configuration object used by backend and frontend for runtime behavior.

## Instruction Template
Markdown template with placeholders rendered at runtime for protocol messaging. Templates are stored in scoped settings and fall back to built-in defaults.

## MCP
Model Context Protocol. The communication interface used by clients to call server tools.

## Sprint Loop Step
A single orchestration stage in the atomic loop pipeline (preflight, sync, derive, start, protocol, and related steps).

## Subtask
A markdown-defined unit of work in a sprint with fields like `depends_on`, `is_independent`, and `merged`.

## Watch Loop
Continuous orchestration mode that runs periodic cycles until exit criteria are reached.

## Quicksprints
Reusable Markdown templates resolved from project, home, bundled `.code-ux/quicksprints/templates`, or TS fallback, converted into a sprint goal and sent through normal sprint planning.

## Scheduler
Project-scoped automation persisted in `scheduler_entries`; can run sprints, quicksprints, or chat messages once or on recurrence.

## Memory
Runtime-learned short-term sprint and long-term project learnings, embedded and injected into prompts according to agent memory config.

## Knowledge
Project-scoped document library ingested/uploaded/imported separately from memory, embedded locally, and attached to agent presets via subscriptions; agents use `search_knowledge` for exact passages.

## Previews
Sprint-scoped Docker preview session for one `(projectId, sprintId)`, persisted in `sprint_preview_sessions`, served through the in-app browser on a preview origin, using `.code-ux/browser/start-preview.sh` or generated fallback startup.

## `manage_code_ux` (Deprecated)
Deprecated unified MCP dispatcher; dedicated `manage_*` tools are preferred.

## Legacy `.jules-subagents`
Historical artifact directory used by older docs and migration notes. Current project artifacts live under `.code-ux/`.
