# Built-in MCP (Code UX)

Controls which built-in Code UX MCP tool categories are available to containerized CLIs.

> Settings area: `built-in-mcp`
> Dashboard documentation route: `/docs/settings-built-in-mcp`

## What This Area Is For

Controls which built-in Code UX MCP tool categories are available to containerized CLIs. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

Tool-category and individual-tool toggles decide what providers may call on their next run.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Tool Categories | Toggles access to built-in Code UX MCP tool suites (e.g., File System). | Verify providers actually need these capabilities. |
| Individual Tools | Toggles specific built-in tools within a category. | Disabling required tools can break provider workflows. |

## Recommended Configuration

Disable only categories you know a provider should not access.

Keep all standard built-in categories enabled unless you are enforcing strict sandbox rules for a specific provider. Disable only categories you know a provider should not access.

## Risks And Gotchas

Disabling required tools (like file-read) can make provider workflows fail; enabling broad tools increases capability exposure.

## Troubleshooting

If a provider complains about missing capabilities, verify the required Built-in MCP category is enabled in the active scope.

## Related Documentation

- [Settings overview](./index.md)
- [Dashboard Settings](../dashboard/design-system-settings.md)
- [MCP Tools and Contracts](../mcp/tools-and-contracts.md)
- [Security Hardening](../operations/security-hardening.md)
