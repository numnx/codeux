# Git Host Configuration

Stores GitHub or GitLab tokens and Docker git-auth behavior for repository automation.

> Settings area: `git-host-configuration`
> Dashboard documentation route: `/docs/settings-git-host-configuration`

## What This Area Is For

Stores GitHub or GitLab tokens and Docker git-auth behavior for repository automation. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

Tokens, GitHub auth mounting, auth paths, local git config copy, and container git identity control remote repository access.

Code UX uses GitHub/GitLab tokens to power `REMOTE` mode pull request automation and API capabilities. In `LOCAL` mode, these tokens are not used for remote PR creation.

Docker container git-auth mounts (like GitHub auth mounting or local config copy) control whether the internal agent runtime is permitted to fetch or push directly to remote repository origins.

## Recommended Configuration

Prefer least-privilege tokens and use local auth copy only on trusted machines.

A practical review flow is:

1. Start from the inherited default and change only the fields that solve a concrete operational problem.
2. Save the smallest scope that should own the change. Use System for defaults that every project should inherit, and Project for repository-specific behavior.
3. Reopen the Settings page after saving when the value controls startup behavior, provider routing, preview runtime, or destructive maintenance.

## Risks And Gotchas

Tokens and copied auth directories can grant repository write access inside provider containers.

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

- [Settings overview](/docs/settings-overview)
- [Dashboard Settings](/docs/user-dashboard-settings)
- [Security Hardening](/docs/user-troubleshooting)
- [Operations Runbook](/docs/user-troubleshooting)
