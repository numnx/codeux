# Quickstart

This guide gets the MCP server and dashboard running locally with minimal setup.

## Prerequisites

- Node.js >=22
- pnpm@10.33.0 (only for building from source)
- Docker (recommended for virtual worker execution, required for preview containers)
- A valid Jules API key
- Optional for remote git intelligence: GitHub CLI (`gh`) authenticated

## Install and Build (from source)

```bash
git clone https://github.com/codeux-ai/codeux.git
cd codeux
pnpm install
pnpm run build
```

## Configure API Key

Use one of these methods:

1. CLI argument (highest priority)
```bash
node dist/index.js --api-key <YOUR_JULES_API_KEY>
```

2. Environment variable
```bash
export JULES_API_KEY=<YOUR_JULES_API_KEY>
pnpm start
```

3. `.env` file in project root
```env
JULES_API_KEY=<YOUR_JULES_API_KEY>
```

4. `.code-ux/settings.json` (project or home)
```json
{
  "julesApiKey": "<YOUR_JULES_API_KEY>"
}
```

## Run in Development

```bash
# Starts both the backend server and Vite dashboard watcher (node scripts/dev.mjs)
pnpm run dev

# Starts only the source backend server (node --import ./scripts/tsnode-register.mjs src/index.ts)
pnpm run dev:server-only
```

This starts the server directly from TypeScript source through Node's `ts-node` ESM register hook, so local development uses the same `.js` import specifiers as the production build without requiring a precompile step.

## Run Compiled Server

```bash
# Compiles via node scripts/build.mjs
pnpm run build

# Runs compiled node dist/index.js
pnpm start
```

## Open Dashboard

Default URL:
- `http://localhost:4444`

The dashboard starts automatically when the server starts.
If port `4444` is occupied, startup automatically falls back to the next free port (`4445`, `4446`, etc.).

## Verify Health via API Endpoints

From another terminal:

```bash
curl http://localhost:4444/api/status
curl http://localhost:4444/api/system-settings
curl http://localhost:4444/api/git-status
```

## Common First Workflow

1. Configure system settings in dashboard, then adjust project settings and sprint overrides as needed.
2. Create the sprint and tasks. Code UX now prepares the local feature branch automatically when orchestration starts, and it will attempt to push that branch to `origin` when the remote exists.
3. Create the sprint tasks in the dashboard, or import them from markdown if you are bringing in an existing sprint plan.
4. Connect your worker with `listen` so it can monitor inbox, dispatch, and attention events for the project.
5. Start the sprint from the dashboard.
6. Follow merge/action-required protocol shown in dashboard and resume the sprint there when manual work is finished.

## Troubleshooting

- `Jules API Key is missing`
  - Confirm key source and priority order.
- Dashboard port in use
  - Set `DASHBOARD_PORT` in `.env` (e.g., `DASHBOARD_PORT=5555 pnpm run dev`), or configure `dashboardPort` in `config.json` or System Settings.

### Advanced Start Options

For local headless runs without binding the dashboard, you can pass `--headless`. For authenticated MCP-only server processes, use `--server-mode` with an explicit MCP HTTP bearer token (`--mcp-http-auth-token`). MCP HTTP gateway flags (e.g., `--mcp-http-port`, or the legacy `--mcp-https` flags) remain supported. See the [Installation CLI Flags](../docs-web/user/installation.md#cli-flags) reference for the complete list.
- Remote mode has no PR/CI data
  - Verify `gh` is installed and authenticated.

For operational issues, see [Operations Runbook](../operations/runbook.md).
