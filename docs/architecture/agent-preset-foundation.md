# Agent Preset Foundation

## Status
Implemented foundation

## Purpose

Sprint OS now separates `Agents` from live MCP connections.

`Agents` are project-scoped instruction presets, not runtime clients.

This is the first product-correct slice for the v2 `Agents` page.

## Data Model

Agent presets are stored in sqlite table:

- `agent_presets`

Current fields:

- `id`
- `project_id`
- `name`
- `instruction_markdown`
- `labels_json`
- `created_at`
- `updated_at`

Implementation files:

- `src/contracts/agent-preset-types.ts`
- `src/repositories/agent-preset-repository.ts`
- `src/server/dashboard-server.ts`

## API Surface

Dashboard endpoints:

- `GET /api/projects/:projectId/agent-presets`
- `POST /api/projects/:projectId/agent-presets`
- `PATCH /api/agent-presets/:agentPresetId`
- `DELETE /api/agent-presets/:agentPresetId`

These endpoints are project-scoped and intentionally separate from:

- live MCP connection APIs
- chat thread APIs
- worker dispatch APIs

## Dashboard Behavior

The v2 `Agents` page now manages project-scoped presets only.

Current supported fields:

- preset name
- labels
- instruction markdown

This gives Sprint OS a clean product foundation for:

- reusable planning roles
- reusable worker role definitions later
- future task-to-agent assignment

## What This Fixes

Before this change, the `Agents` page incorrectly showed:

- live listeners
- workers
- connection heartbeat state

That mixed runtime transport state with a product concept that should be stable and reusable.

The page now aligns with the intended model:

- `Agents` = presets
- live connections stay in runtime/chat/live surfaces

## What Is Not Included Yet

This is only the foundation slice.

Not implemented yet:

- automatic task assignment to presets
- preset-to-worker matching
- preset inheritance or global templates
- preset versioning
- preset execution analytics

## Why This Matters

This change removes one of the major architecture mismatches in the v2 refactor.

It means the system now has a clean distinction between:

- product configuration
- runtime connections
- execution workers

That separation is required before more planning and worker orchestration logic can be added safely.
