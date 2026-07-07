# CLI Management Surface

Code UX exposes a direct command-line management surface for the same core resources that the MCP management tools cover.

The full command reference lives in [CLI Commands Reference](../reference/cli-commands.md). That page covers the action aliases, flag coercions, startup behaviors, required flags, interactive prompting behavior, `--json`, `--payload-json`, and approval handling.

Destructive approval commands follow a two-step flow aligned with the MCP tool surface. When a mutative command (such as deleting a resource or replacing settings) is issued, the CLI returns a non-mutating confirmation request. To execute the change, run the exact same command and payload with `approval.confirmed: true` added to the `--payload-json` input.

Use this page as a quick landing spot when you just need to remember that the CLI routes through the existing `ManagementToolHandler` and stays aligned with the MCP tool surface.
