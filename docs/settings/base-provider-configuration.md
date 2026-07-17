# Base Provider Configuration

Defines each named provider instance's default eligibility, model, thinking depth, weight, and concurrency. Providers include Jules, Gemini, Antigravity, Codex, Claude Code, Qwen Code, and OpenCode.

> Settings area: `base-provider-configuration`
> Dashboard documentation route: `/docs/settings-base-provider-configuration`

## What This Area Is For

Defines each named provider instance's default eligibility, model, thinking depth, weight, and concurrency. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

Provider cards set default route participation, model, thinking mode, weighted routing weight, and max concurrent tasks.

- Model and thinking mode are configurable per instance (e.g., specific models from a provider's catalog or custom endpoints for Qwen Code and OpenCode).
- The hosted Jules provider does not support model selection or thinking mode options.
- The `maxConcurrentTasks` value controls how many tasks the instance can run at once before deferring them.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Settings card fields | Updates the active Settings scope after you save the page. | Confirm whether you are editing System or Project scope. |
| Inherited values | Values can flow from system defaults into project and sprint behavior. | Check the source badge before assuming a value is project-specific. |
| Related runtime paths | The affected service reads the saved settings during planning, dispatch, dashboard rendering, or maintenance work. | Re-run the affected workflow after changing operational settings. |

## Recommended Configuration

Keep only healthy instances eligible and use weights to express preference rather than hard pinning every route.

A practical review flow is:

1. Start from the inherited default and change only the fields that solve a concrete operational problem.
2. Save the smallest scope that should own the change. Use System for defaults that every project should inherit, and Project for repository-specific behavior.
3. Reopen the Settings page after saving when the value controls startup behavior, provider routing, preview runtime, or destructive maintenance.

## Risks And Gotchas

Incompatible model choices or high concurrency can cause repeated provider failures or quota pressure.

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
- [Dashboard Settings](..//docs/dashboard-design-system-settings)
- [Provider Routing](/docs/settings-provider-routing)
- [Qwen Code Integration](/docs/settings-qwen-code-integration)
- [OpenCode Integration](/docs/settings-opencode-integration)
