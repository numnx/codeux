# Danger Zone

Groups irreversible project deletion and project override reset actions.

> Settings area: `danger-zone`
> Dashboard documentation route: `/docs/settings-danger-zone`

## What This Area Is For

Groups irreversible project deletion and project override reset actions. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

Project reset clears saved overrides; project delete removes the project and associated local runtime data.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Reset Overrides | Clears all project-specific saved overrides. | Review which system defaults will take over. |
| Delete Project | Irreversibly removes the project and local runtime data. | Ensure no running sprints are active for this project. |
| Clear System DB / Memory | Wipes underlying state or agent memory context. | All ongoing executions and learned context will be lost. |

## Recommended Configuration

Reset overrides before deleting a project when you only need to return to inherited defaults.

Reset overrides before deleting a project when you only need to return to inherited defaults. Only use Delete Project when abandoning a workspace entirely.

## Risks And Gotchas

Delete and reset actions are irreversible after confirmation. Active tasks will fail abruptly if their underlying project or database is wiped.

## Troubleshooting

If an action is blocked, ensure you have typed the exact confirmation phrase (e.g., 'DELETE'). If the UI hangs, check for zombie processes holding a database lock.

## Related Documentation

- [Settings overview](./index.md)
- [Dashboard Settings](../dashboard/design-system-settings.md)
- [Operations Runbook](../operations/runbook.md)
- [Configuration and Storage](./configuration-and-storage.md)
