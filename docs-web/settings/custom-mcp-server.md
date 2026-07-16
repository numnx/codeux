# Custom MCP Server

Configures one custom MCP server injected into compatible provider CLIs.

> Settings area: `custom-mcp-server`
> Dashboard documentation route: `/docs/settings-custom-mcp-server`

## What This Area Is For

Configures one custom MCP server injected into compatible provider CLIs. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

Display name, server key, transport, URL or command, args/env/headers, description, CLI restrictions, and preview define the server.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Server Key & Name | Identifies the custom server in logs and routing. | Ensure the key is unique and descriptive. |
| Transport & URL/Command | Configures HTTP/SSE endpoint or stdio command. | Verify the URL is reachable or the command is installed in the container. |
| Args/Env/Headers | Passes context and authentication to the server. | Do not leak sensitive auth headers in plain text if possible. |
| CLI Restrictions | Limits which CLIs can access this server. | Restrict sensitive servers to specific trusted CLIs. |

## Recommended Configuration

Prefer HTTP/SSE for managed remote servers and restrict sensitive servers to specific CLIs.

Prefer HTTP/SSE for managed remote servers and restrict sensitive servers to specific CLIs to minimize exposure.

## Risks And Gotchas

Invalid JSON, unavailable commands, or leaked auth headers can break provider startup or expose secrets. Stdio servers running missing commands will crash the provider process.

## Troubleshooting

If the custom server fails to start, check the provider logs for JSON parse errors or command not found. Verify network access if using HTTP/SSE.

## Related Documentation

- [Settings overview](./index.md)
- [Dashboard Settings](../dashboard/design-system-settings.md)
- [External MCP Worker Client](../architecture/external-mcp-worker-client.md)
- [Security Hardening](../operations/security-hardening.md)
