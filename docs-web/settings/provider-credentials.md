# Provider Credentials

Manages named provider instances, authentication mode, local auth copy, dashboard login, provider config files, and base model defaults. Providers include Jules, Gemini, Antigravity, Codex, Claude Code, Qwen Code, and OpenCode.

> Settings area: `provider-credentials`
> Dashboard documentation route: `/docs/settings-provider-credentials`

## What This Area Is For

Manages named provider instances, authentication mode, local auth copy, dashboard login, provider config files, and base model defaults. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

Each instance owns API key/auth path/login/config-file mode plus routing-visible identity and availability.
The `authType` property is set individually per provider instance:
- `apiKey`: Allows you to override the API key used. Mutual exclusion is enforced; mounting local auth is disabled when this is active. Jules only supports this mode. Saved API keys are redacted upon persistence for security.
- `localAuth`: Mounts a custom local directory into the container (e.g., `~/.gemini`). It clears the `apiKey` field and ignores custom model and base URL fields. Not supported by Jules.
- `dashboardAuth`: Launches an interactive terminal inside the container to perform a dashboard login, saving credentials to the host. Like `localAuth`, this clears the `apiKey` and custom model settings. Not supported by Jules.

Custom endpoint configurations are supported for some providers:
- **Qwen Code**: Can use `MODEL_PROVIDER` for OpenAI-compatible and other protocol endpoints, or `ALIBABA_CODING_PLAN`. If local or dashboard auth is used, it forces `qwenAuthMode` to `LOCAL_AUTH` and clears all custom endpoint fields.
- **OpenCode**: Can use `CUSTOM_PROVIDER` for OpenAI-compatible endpoints or `ENV_KEY` for standard built-in providers. If local or dashboard auth is used, it forces `openCodeAuthMode` to `LOCAL_AUTH` and clears custom endpoint fields.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Settings card fields | Updates the active Settings scope after you save the page. | Confirm whether you are editing System or Project scope. |
| Inherited values | Values can flow from system defaults into project and sprint behavior. | Check the source badge before assuming a value is project-specific. |
| Related runtime paths | The affected service reads the saved settings during planning, dispatch, dashboard rendering, or maintenance work. | Re-run the affected workflow after changing operational settings. |

## Recommended Configuration

Use named instances per account or quota pool; use Provider Config File only when a CLI needs a specific config copied.

A practical review flow is:

1. Start from the inherited default and change only the fields that solve a concrete operational problem.
2. Save the smallest scope that should own the change. Use System for defaults that every project should inherit, and Project for repository-specific behavior.
3. Reopen the Settings page after saving when the value controls startup behavior, provider routing, preview runtime, or destructive maintenance.

## Risks And Gotchas

Local auth copy and config-file mounts expose host credentials to Docker-backed provider runs.

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
- [Provider Routing](./provider-routing.md)
- [Qwen Code Integration](./qwen-code-integration.md)
- [OpenCode Integration](./opencode-integration.md)
- [Security Hardening](../operations/security-hardening.md)
