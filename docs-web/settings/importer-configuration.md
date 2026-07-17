# Importer Configuration

Configures read-only external work imports for project management, whiteboard, diagram, and design providers.

> Settings area: `importer-configuration`
> Dashboard documentation route: `/docs/settings-importer-configuration`

## What This Area Is For

Configures read-only external work imports for project management, whiteboard, diagram, and design providers. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

Enablement, API token, optional secret, base URL, default IDs, and search limit decide when each importer is active.

Code UX supports the following external importers for reading project context into the sprint:
- GitHub
- GitLab
- Jira
- Notion
- Asana
- Linear
- Miro
- Lucid
- Figma
- Mural

The importer logic supports standard platform search queries and filters (such as mapping the unified `state` filter into `"open"` vs `"closed"` based queries). It also natively resolves various user-friendly search aliases back to the authoritative provider, such as:
- "github issues" or "repository issues" (GitHub/GitLab)
- "jira issues", "asana tasks", "linear issues" or "work items"
- "notion pages" or "notion databases"
- "miro boards" or "miro canvas items"
- "lucidchart", "lucidspark", or "lucid documents"
- "figma files" or "figjam boards"
- "mural workspaces" or "mural canvases"

## Recommended Configuration

Store shared credentials at system scope, then add project overrides only when one project needs different defaults.

A practical review flow is:

1. Start from the inherited default and change only the fields that solve a concrete operational problem.
2. Save the smallest scope that should own the change. Use System for defaults that every project should inherit, and Project for repository-specific behavior.
3. Reopen the Settings page after saving when the value controls startup behavior, provider routing, preview runtime, or destructive maintenance.

## Risks And Gotchas

Broad tokens can expose external workspaces to import searches; use read-only or least-privilege credentials where providers support them.

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
- [Sprint Imports](/docs/user-dashboard-sprints)
- [Security Hardening](/docs/user-troubleshooting)
