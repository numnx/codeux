# Project Memory

Clears selected memory tiers for the active project only.

> Settings area: `project-memory`
> Dashboard documentation route: `/docs/settings-project-memory`

## What This Area Is For

Clears selected memory tiers for the active project only. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

The project memory page provides immediate confirmation-protected `DELETE` actions. These bypass standard page-save behavior and directly mutate the database.

| Control Surface | Runtime Effect | Scope |
| --- | --- | --- |
| Clear short-term memory | Deletes active and completed sprint task observations. | Active project only. |
| Clear long-term memory | Deletes canonical claims, supporting evidence, and vectorized knowledge indices. | Active project only. |
| Clear all memory | Deletes all short-term sprint observations and all durable long-term knowledge. | Active project only. |

## Recommended Configuration

Clear short-term first when fixing noisy sprint memory; use all-memory only for a full project memory reset.

A practical review flow is:

1. Start from the inherited default and change only the fields that solve a concrete operational problem.
2. Save the smallest scope that should own the change. Use System for defaults that every project should inherit, and Project for repository-specific behavior.
3. Reopen the Settings page after saving when the value controls startup behavior, provider routing, preview runtime, or destructive maintenance.

## Risks And Gotchas

Clearing long-term or all memory removes claims, evidence, and vectors permanently for the active project only.

Before applying changes, check:

- Whether the value affects provider credentials, Docker runtime behavior, Git automation, memory retention, or destructive cleanup.
- Whether a project override is masking the system value you expected to change.
- Whether a running sprint needs to be paused, restarted, or allowed to finish before the new value can be observed.

## Troubleshooting

If the saved setting does not appear to take effect:

- Verify the active Settings scope in the sticky command bar.
- Check for a project or sprint override that takes precedence over the system value.
- Refresh the affected dashboard page if the setting controls a rendered surface.
- Restart the local runtime only when the setting explicitly controls startup, listener, or process-level behavior.

## Related Documentation

- [Settings overview](./index.md)
- [Dashboard Settings](../../dashboard/design-system-settings.md)
- [Memory Claims and Evidence](../../architecture/memory-claims.md)
- [Memory Architecture and Search](../../dashboard/memory.md)
