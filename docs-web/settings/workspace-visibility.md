# Workspace Visibility

Controls automatic preview lifecycle and whether browser workspace entry points appear in the dashboard.

> Settings area: `workspace-visibility`
> Dashboard documentation route: `/docs/settings-workspace-visibility`

## What This Area Is For

Controls automatic preview lifecycle and whether browser workspace entry points appear in the dashboard. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

Preview enablement, in-app browser visibility, auto-start, rebuild triggers, and auto-stop define the preview lifecycle.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Preview Enabled | Defaults to `true`. Determines if Code UX can launch browser previews for the scope. | Disable for pure backend APIs or CLI projects. |
| Show In-App Browser | Defaults to `true`. Determines if the preview renders inside the dashboard iframe. | Disable if your app uses frame-busting headers. |
| Auto-Start on Running Sprint | Defaults to `false`. Automatically boots a preview when a sprint begins. | Enable only if previews start quickly without blocking dev resources. |
| Rebuild on Task Completion | Defaults to `false`. Recreates the preview container after every task. | Can be noisy for slow projects or heavy Docker images. |
| Rebuild on Sprint Completion | Defaults to `false`. Recreates the preview container after the sprint ends. | Useful to get a clean final snapshot of sprint changes. |
| Auto-Stop on Terminal Sprint | Defaults to `false`. Stops the preview container when a sprint concludes. | Enable to conserve local resources when previews are no longer needed. |
| Settings card fields | Updates the active Settings scope after you save the page. | Confirm whether you are editing System or Project scope. |
| Inherited values | Values can flow from system defaults into project and sprint behavior. | Check the source badge before assuming a value is project-specific. |
| Related runtime paths | The affected service reads the saved settings during planning, dispatch, dashboard rendering, or maintenance work. | Re-run the affected workflow after changing operational settings. |

## Recommended Configuration

Enable previews for UI projects and stop terminal previews automatically to conserve local resources.

A practical review flow is:

1. Start from the inherited default and change only the fields that solve a concrete operational problem.
2. Save the smallest scope that should own the change. Use System for defaults that every project should inherit, and Project for repository-specific behavior.
3. Reopen the Settings page after saving when the value controls startup behavior, provider routing, preview runtime, or destructive maintenance.

## Risks And Gotchas

Automatic rebuilds can be noisy for slow projects or heavy Docker images.

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
- [Dashboard Settings](../user/dashboard/settings.md)
- [Browser Preview](../user/dashboard/browser-preview.md)
- [Sprint Preview Browser](../user/dashboard/browser-preview.md)
