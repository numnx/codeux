# Docker Runtime

Defines the default container environment used by Docker-backed provider CLIs.

> Settings area: `docker-runtime`
> Dashboard documentation route: `/docs/settings-docker-runtime`

## What This Area Is For

Defines the default container environment used by Docker-backed provider CLIs. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

Image, setup script, memory limit, setup image caching, and Playwright browser preinstall shape each worker container.

Managed provider preparation installs registry-resolved CLI versions into isolated Docker volumes. npm lifecycle scripts remain blocked unless a fixed provider catalog entry explicitly requires them: only Claude Code's `@anthropic-ai/claude-code` package and OpenCode's `opencode-ai` package receive that narrow permission. A failed preparation reports the provider package and resolved version, removes the incomplete volume, and remains retryable.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Base Image | Determines the OS and toolchain available inside worker containers. | Ensure the image has required dependencies (e.g., Node, Python). |
| Setup Script | Runs inside the container before the provider CLI starts. | Test scripts locally to avoid container startup crashes. |
| Memory Limit | Constrains the RAM available to the worker container. | High limits may starve the host; low limits cause OOM kills. |
| Playwright Preinstall | Pre-downloads browser binaries for Playwright tasks. | Disable if not using Playwright to speed up container start. |

## Recommended Configuration

Keep the default image unless your repo needs a custom toolchain; enable Playwright browser preload for browser-heavy QA.

Keep the default image unless your repo needs a custom toolchain; enable Playwright browser preload for browser-heavy QA. Assign memory limits based on available host resources (e.g., 4GB default).

## Risks And Gotchas

Broken setup scripts or overly tight memory limits can fail every provider invocation in the scope. OOM kills are surfaced as container exits with code 137.

## Troubleshooting

If a worker fails to start, check the setup script for syntax errors. If tasks fail mid-execution, monitor host memory and increase the limit if OOM killed.

## Related Documentation

- [Settings overview](./index.md)
- [Dashboard Settings](../dashboard/design-system-settings.md)
- [Configuration and Storage](./configuration-and-storage.md)
- [Security Hardening](../operations/security-hardening.md)
