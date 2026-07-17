# CLI Management Surface

Code UX exposes a direct command-line management surface for the same core resources that the MCP management tools cover.

The full command reference lives in [CLI Commands Reference](../reference/cli-commands.md). That page covers the action aliases, flag coercions, startup behaviors, required flags, interactive prompting behavior, `--json`, `--payload-json`, and approval handling.

Use this page as a quick landing spot when you just need to remember that the CLI routes through the existing `ManagementToolHandler` and stays aligned with the MCP tool surface.

## Supported CLI Domains vs MCP Parity

While the CLI routes through the same underlying handlers, it intentionally bounds its direct command surface. The CLI directly exposes the following top-level management domains:

- `projects`
- `sprints`
- `tasks`
- `quicksprints`
- `scheduler`
- `settings`
- `agents`
- `memory`
- `preview`
- `telemetry`

**MCP-only domains** (e.g., `node_flows`, `chat_providers`, `custom_dashboards`) and their dedicated actions are not available as top-level CLI commands.

### Generic Passthrough (`manage --payload-json`)
To access actions outside the top-level commands (or if you already have an MCP-shaped JSON payload), use the generic passthrough:

```bash
codeux manage --payload-json '{"domain":"node_flows","action":"catalog","payload":{}}'
```

## CLI Behavior and Coercion

The CLI parser provides developer conveniences to simplify scripting:
- **Aliases**: Common kebab-case inputs (e.g., `export-settings-bundle`) are automatically normalized to internal snake_case (`export_settings_bundle`).
- **Coercion**: Flag values like `--auto-start` (`true`/`false`) or `--tasks 5` (number) are correctly coerced before reaching the handler.
- **Interactive Prompting**: If `stdin` is a TTY and required flags are omitted, the CLI will interactively prompt for missing values.
- **Missing-field Behavior (Non-interactive)**: When run outside a TTY, missing required flags cause the CLI to immediately fail and exit with a structured error.
- **JSON Envelopes**: Append `--json` to bypass human-readable text and return the raw API envelope for programmatic inspection.

## Two-Step Approval Contracts

Destructive operations and secret-bearing settings changes require an approval retry. The confirmation contract in the CLI is **stateless**, which differs from the stateful correlation-bound flow used by MCP/Dashboard clients:

- The first call to a gated action fails and returns an `approvalRequired` response.
- To proceed, you must run the **exact same command** with the exact same payload, appending `--payload-json '{"approval":{"confirmed":true}}'`.
- There is no background tracking or 15-minute correlation ID requirement for the CLI.

## Safe CLI Examples

### Destructive Action (Stateless Delete)

```bash
# 1. First call fails and prompts for approval
codeux projects delete --project proj-123
# Output: Approval required.

# 2. Second call succeeds
codeux projects delete --project proj-123 --payload-json '{"approval":{"confirmed":true}}'
# Output: Deleted project proj-123.
```

### Settings Export and Apply

```bash
# Export the settings bundle as a JSON envelope
codeux settings export_settings_bundle --json

# Apply the settings bundle (requires approval confirmation)
codeux settings apply_settings_bundle --bundle-json '{"version":1,"settings":{}}' --payload-json '{"approval":{"confirmed":true}}'
```

### Force Controls

```bash
# Force actions proceed immediately without two-step approval
codeux sprints force_cancel --sprint-run run-456
```
