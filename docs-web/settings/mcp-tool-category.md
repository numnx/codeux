# MCP Tool Category

Enables or disables one built-in MCP tool category and its individual tools.

> Settings area: `mcp-tool-category`
> Dashboard documentation route: `/docs/settings-mcp-tool-category`

## What This Area Is For

Enables or disables one built-in MCP tool category and its individual tools. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

The category toggle sets all tools in the group; each row can override a specific tool.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Category Toggles | Enables or disables an entire suite of MCP tools. | Disabling categories like 'Git' prevents agents from making commits. |
| Scope Inheritance | Determines if the category is enabled for all projects or just one. | Check if a project override is intentionally restricting tools. |

## Recommended Configuration

Keep category-level changes coarse and document why any tool is disabled.

Enable categories based on the principle of least privilege. Only enable Git or System tools if the agent specifically requires them for the task.

## Risks And Gotchas

Enabling broad categories (e.g., Shell execution) increases the risk of agents running unintended commands.

## Troubleshooting

If an agent complains it cannot perform an action, verify the corresponding Tool Category is enabled in the active scope.

## Related Documentation

- [Settings overview](./index.md)
- [Dashboard Settings](../dashboard/design-system-settings.md)
- [MCP Tools and Contracts](../mcp/tools-and-contracts.md)
- [MCP Runtime and Dispatch](../mcp/runtime-and-dispatch.md)
