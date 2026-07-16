# Jules Automation

Configures Jules clarification automation and CI autofix handoff behavior.

> Settings area: `jules-automation`
> Dashboard documentation route: `/docs/settings-jules-automation`

## What This Area Is For

Configures Jules clarification automation and CI autofix handoff behavior. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

Clarification auto-answer, answer mode/template, Jules CI autofix, and retry cap decide when hosted Jules automation runs.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Clarification Auto-Answer | Decides if hosted provider automatically replies to unclear tasks. | Check if the project requires explicit human approval for all tasks. |
| Answer Mode/Template | Sets the tone and structure of automated replies. | Ensure template covers necessary context for the hosted provider. |
| CI Autofix | Automatically hands off failed CI runs to hosted provider for repair. | Review if CI failures often require human intervention. |
| Retry Cap | Limits how many times hosted provider can retry a CI repair. | High caps can consume excessive tokens on failing builds. |

## Recommended Configuration

Use template answers for routine clarifications and keep retry caps low.

Use template answers for routine clarifications and keep retry caps low (1-3) to avoid token exhaustion. Ensure Jules automation is strictly scoped to the hosted provider, not local models.

## Risks And Gotchas

Automatic clarification replies can answer with stale assumptions if the template is too broad. High retry caps on CI autofix can rapidly drain QA budgets if the fix is fundamentally blocked.

## Troubleshooting

If CI autofix doesn't trigger, verify the retry cap hasn't been reached and the hosted provider is configured properly. See [Provider Routing](./provider-routing.md), [MCP Servers](./mcp-servers.md), and [Configuration and Storage](./configuration-and-storage.md) for related setup.

## Related Documentation

- [Settings overview](./index.md)
- [Dashboard Settings](../dashboard/design-system-settings.md)
- [Operations Runbook](../operations/runbook.md)
- [Provider Routing](./provider-routing.md)
