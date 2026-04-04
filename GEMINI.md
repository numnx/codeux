# GEMINI Context: Jules Subagents MCP Server

This project is a production-grade **Model Context Protocol (MCP)** server for the **Jules Agent API**. It enables LLMs to interact with Jules for codebase management, agent session creation, and intelligent sprint orchestration.

## 🚀 Project Overview

- **Core Purpose**: Bridging LLMs (Gemini, Claude, Codex) with the Jules Agent API via the MCP standard.
- **Main Technologies**:
  - **Runtime**: Node.js (ESM), TypeScript 5.x.
  - **Protocols**: MCP (Model Context Protocol).
  - **Key Libraries**: `@modelcontextprotocol/sdk`, `axios`, `vitest`, `preact`, `tailwind`.
- **Architecture**: Domain-driven design with a clean separation between MCP tools, business logic, and infrastructure.

## 🏗️ Architecture & Structure

- `src/`: Core logic for the MCP server.
  - `src/mcp/`: Tool registration and MCP protocol handling.
  - `src/domain/`: Core business logic (sprints, workers, orchestration).
  - `src/contracts/`: Shared types and interfaces.
  - `src/repositories/`: File-based data access (sprints, tasks, settings).
  - `src/integrations/`: Jules API client and external services.
- `dashboard/`: Preact-based live monitoring dashboard.
  - `dashboard/src/v2/`: Modernized dashboard components and state management.
- `.jules-subagents/`: Agent guidance and local sprint data.
  - `agents/`: Markdown guides defining the technical baseline for Jules agents.
  - `sprints/`: Sprint definitions and subtask management.

## 🛠️ Development & Validation

### Key Commands
- `npm run dev`: Start the server in development mode using `ts-node-esm`.
- `npm run build`: Full build (TSC + Vite for dashboard).
- `npm run typecheck`: Strict TypeScript validation.
- `npm run lint`: ESLint and Prettier check.
- `npm run test`: Run the Vitest test suite.
- `npm run ci`: Full local validation (lint + typecheck + test + build).

### Standards & Constraints
- **ESM Strictness**: All imports in `.ts` files MUST include the `.js` extension.
- **Strict Typing**: No `any` without strong justification. Use explicit return types for public APIs.
- **Testing**: 80% line coverage target for core logic. Every feature must have a corresponding test.
- **Design Quality**: Dashboard UI must target award-winning standards—polished, interactive, and responsive.

## 🏗️ Agent Orchestration Strategy

The system employs a **Tri-Agent Skill Architecture**:
1.  **The Orchestrator** (`orchestrator.md`): Manages high-level sprint lifecycle via MCP.
2.  **The Planning Specialist** (`sprint_agent_guide.md`): Decomposes sprints into atomic, "Jules-Ready" subtasks.
3.  **The Jules Technical Worker** (`worker.md`): The engineering baseline for every execution session, focusing on research-led implementation.

## 🛡️ Repository Safety & Cleanliness (MANDATORY)

To maintain a production-grade codebase, the following rules are **ABSOLUTE**:

1.  **Clear Temporary Files**: ALWAYS clear any temporary or local utility files before completing a task.
    - Specifically: `*.cjs` and `*.log` files are considered temporary unless explicitly tracked in `.gitignore`.
2.  **Commit Lock**: **COMMITS ARE NOT ALLOWED** as long as temporary files (`.cjs`, `.log`) are present in the workspace.
    - You must delete these files before staging or committing changes.
3.  **Credential Protection**: Never commit `.env` files or hardcode API keys. Use `.env.example` for templates.

## 🛠️ Tool-to-Phase Mapping Reference

| Phase | Primary Tool | Description |
|---|---|---|
| **Discovery** | `list_all_sources` | Identify project structure and files. |
| **Planning** | `sprint_agent(action: "plan")` | Generate atomic subtasks for the sprint. |
| **Execution** | `sprint_agent(action: "orchestrate")` | Launch and monitor agent sessions. |
| **Monitoring** | `sprint_agent(action: "status")` | Real-time status of the sprint and tasks. |
| **Verification** | `list_all_activities` | Audit the actual changes made by agents. |

---
*Last Updated: Saturday, April 4, 2026*
