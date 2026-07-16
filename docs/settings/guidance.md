# Guidance

Manages selected tech-stack and styleguide guidance plus custom instruction entries for the active settings scope.

> Settings area: `guidance`
> Dashboard documentation route: `/docs/settings-guidance`

## What This Area Is For

Manages selected tech-stack and styleguide guidance plus custom instruction entries for the active settings scope. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

Each section has a selector with None support, custom entry add/edit/delete controls, and styleguide visibility controls for hiding built-in defaults from the UI.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Tooltips & Hints | Controls the visibility of inline help text across the dashboard. | Useful for new users, but can clutter the UI for experts. |
| Inline Help Toggles | Enables or disables comprehensive help sections in settings. | Disabling help requires users to rely on external documentation. |

## Recommended Configuration

Use None until a scope needs explicit design guidance; keep custom ids stable once projects or sprints reference them.

Leave tooltips and hints enabled for new projects. Experts can disable them to maximize dashboard screen real estate.

## Risks And Gotchas

Disabling guidance might make complex settings panels harder to understand without referring to documentation.

## Troubleshooting

If you cannot find explanations for specific settings, ensure Inline Help Toggles are enabled in the Guidance panel.

## Related Documentation

- [Settings overview](./index.md)
- [Dashboard Settings](../dashboard/design-system-settings.md)
- [Configuration and Storage](./configuration-and-storage.md)
- [Settings Reference](./configuration-and-storage.md)
