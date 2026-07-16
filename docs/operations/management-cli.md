# CLI Management Surface

Code UX exposes a direct command-line management surface for the same core resources that the MCP management tools cover.
The full command reference lives in [CLI Commands Reference](../reference/cli-commands.md). That page covers the action aliases, flag coercions, startup behaviors, required flags, interactive prompting behavior, `--json`, `--payload-json`, and approval handling (including the 15-minute expiry window for destructive actions and settings mutations).

Use this page as a quick landing spot when you just need to remember that the CLI routes through the existing `ManagementToolHandler` and stays aligned with the MCP tool surface.
