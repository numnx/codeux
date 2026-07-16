# Importer Configuration

Configures read-only external work imports for project management, whiteboard, diagram, and design providers.

> Settings area: `importer-configuration`
> Dashboard documentation route: `/docs/settings-importer-configuration`

## What This Area Is For

Configures read-only external work imports for project management, whiteboard, diagram, and design providers. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

Enablement, API token, optional secret, base URL, default IDs, and search limit decide when each importer is active.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Source URLs | Defines external data sources for read-only import. | Ensure URLs are accessible and not behind firewalls. |
| Import Limits | Caps the number of records imported per run. | High limits can cause memory bloat during import. |
| Scheduling | Sets automatic sync intervals. | Frequent syncs might trigger rate limits on the source. |

## Recommended Configuration

Store shared credentials at system scope, then add project overrides only when one project needs different defaults.

Set reasonable import limits (e.g., 100-500 records) and schedule syncs during off-peak hours to avoid rate limiting.

## Risks And Gotchas

Unreachable sources or strict firewalls will cause import failures. Broad imports without limits can bloat project memory.

## Troubleshooting

If imports fail, verify the source URL is reachable and the authentication token has not expired.

## Related Documentation

- [Settings overview](./index.md)
- [Dashboard Settings](../dashboard/design-system-settings.md)
- [Sprint Imports](../dashboard/sprint-imports.md)
- [Security Hardening](../operations/security-hardening.md)
