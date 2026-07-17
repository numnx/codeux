# Git Flow

Controls branch naming, PR creation, issue closure, and cleanup for sprint work.

> Settings area: `git-flow`
> Dashboard documentation route: `/docs/settings-git-flow`

## What This Area Is For

Controls branch naming, PR creation, issue closure, and cleanup for sprint work. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

Git mode, default branch, prefixes, sprint key, branch template, PR toggles, linked issue closure, and branch deletion define the workflow.

| Runtime Context | Default Branch Precedence Order |
| --- | --- |
| Worker Dispatch & Planning | `project.defaultBranch` &rarr; `settings.git.defaultBranch` &rarr; `"main"` |
| Branch Preview & Rollback | `settings.git.defaultBranch` &rarr; `project.defaultBranch` &rarr; `"main"` |

## GitHub/GitLab Modes (LOCAL vs REMOTE)

The chosen Git mode fundamentally changes how Code UX interacts with your repositories:

- **LOCAL mode**: Remote repository interactions and pull request creation are skipped. The `git_manager_remote` agent skill is explicitly disabled, meaning workers will only commit to local branches and rely on local Git flow.
- **REMOTE mode**: Enables remote fetching, pushing, and PR automation. Agents will interact with the configured remote repository (e.g. creating PRs) using the provided authentication tokens.

## Recommended Configuration

Use Remote mode for PR/CI automation and Local mode for repositories where Code UX must not touch remotes.

A practical review flow is:

1. Start from the inherited default and change only the fields that solve a concrete operational problem.
2. Save the smallest scope that should own the change. Use System for defaults that every project should inherit, and Project for repository-specific behavior.
3. Reopen the Settings page after saving when the value controls startup behavior, provider routing, preview runtime, or destructive maintenance.

## Risks And Gotchas

Wrong default branches or aggressive cleanup can disrupt expected repository flow.

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
- [Operations Runbook](../../operations/runbook.md)
- [Instruction Template System](../../instructions/markdown-template-system.md)
