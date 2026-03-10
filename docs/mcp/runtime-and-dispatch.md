# MCP Runtime and Dispatch

This document explains how MCP requests flow through the server.

## Server Startup

Startup sequence:

1. `src/index.ts` loads environment and app config.
2. `src/index.ts` constructs `JulesAgentServer`.
3. `src/server/jules-agent-server.ts` constructs repositories/services/handlers/orchestrator.
4. `src/server/jules-agent-server.ts` registers MCP request handlers.
5. `src/server/jules-agent-server.ts` starts dashboard server.
6. `src/server/jules-agent-server.ts` connects MCP stdio transport.

## Headless Worker-Host Startup

Sprint OS now has a second runtime mode for external workers.

`--runtime-role worker-host` changes startup behavior:

- dashboard bind is skipped
- local `project_manager` connection registration is skipped
- MCP stdio transport still starts
- the same sqlite app state is still used

This is the runtime mode used by the in-repo `sprint-os-worker` CLI.

## MCP Request Handlers

Registered schemas:
- `ListToolsRequestSchema`
- `CallToolRequestSchema`

### Tool list handler
Returns enabled tool definitions from `src/contracts/mcp-tool-definitions.ts`, filtered by dashboard `mcpTools` settings.

### Tool call handler
- Resolves tool name.
- Verifies tool is enabled in `mcpTools`.
- Dispatches through typed `ToolRegistry` registration in `src/api/mcp/tool-registry.ts`.
- Wraps unknown tool as MCP `MethodNotFound`.
- Normalizes runtime/API errors into `isError` response.

## Correlation Context

MCP tool calls are wrapped in a correlation scope before dispatch.

- `src/server/jules-agent-server.ts` derives a correlation ID from request metadata when available.
- If no correlation ID is provided, one is generated.
- `src/shared/logging/correlation-id.ts` stores the ID in `AsyncLocalStorage`.
- `src/server/mcp-request-router.ts` logs request lifecycle events with the shared logger.

This allows all log lines emitted during a tool call to share a single `correlationId`.

## Dispatch Layers

- Typed registry layer: `src/api/mcp/tool-registry.ts`
  - Defines strict argument interfaces for every MCP tool.
  - Provides `register` and `dispatch` APIs with compile-time tool/argument matching.
- Core dispatch target: `CoreToolHandler`
- Agent dispatch target: `AgentToolHandler`

This split keeps tool contracts stable while allowing orchestration internals to evolve independently.

## External Worker Transport Model

Because MCP transport is stdio, a worker client cannot attach directly to the already-running dashboard server process.

The current worker model is:

1. `sprint-os-worker` spawns a headless Sprint OS worker-host process
2. the worker client connects to that process over stdio using the MCP TypeScript SDK client
3. worker tools operate against the shared Sprint OS sqlite state

That means multiple MCP participants can share one dashboard and one DB-native runtime model without requiring a separate HTTP MCP transport yet.

## Error Handling

- Axios errors are unwrapped for user-friendly API messages.
- Generic errors are returned as text with `isError: true`.
- Server-level uncaught MCP errors are logged via `server.onerror`.

## Shutdown Behavior

On `SIGINT`:
- Server closes MCP transport.
- Process exits cleanly.
