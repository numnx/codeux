# Git Flow

Controls branch naming, PR creation, issue closure, and cleanup for sprint work.

> Settings area: `git-flow`
> Dashboard documentation route: `/docs/settings-git-flow`

## What This Area Is For

Controls branch naming, PR creation, issue closure, and cleanup for sprint work. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

Git mode, default branch, prefixes, sprint key, branch template, PR toggles, linked issue closure, and branch deletion define the workflow.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Settings card fields | Updates the active Settings scope after you save the page. | Confirm whether you are editing System or Project scope. |
| Inherited values | Values can flow from system defaults into project and sprint behavior. | Check the source badge before assuming a value is project-specific. |
| Related runtime paths | The affected service reads the saved settings during planning, dispatch, dashboard rendering, or maintenance work. | Re-run the affected workflow after changing operational settings. |

### Default Branch Resolution

`git.defaultBranch` resolves with the following precedence:
1. Sprint setting override (Dashboard)
2. Project setting override (Dashboard)
3. System setting default (Dashboard)
4. Hardcoded default (`main`)

The legacy project metadata `defaultBranch` column is retained for project records created before the scoped settings model and for display/initialization context, but sprint orchestration and final merge targets do not let that metadata override resolved scoped settings. A project inheriting a system default of `dev` must merge sprint completion PRs into `dev`, even if the older project row still says `main`.

When Code UX has to create a missing feature branch, it prefers `origin/<defaultBranch>` over the local `<defaultBranch>` ref when the remote-tracking base branch exists. If direct remote inspection is unavailable, branch preflight can use an existing `refs/remotes/origin/<branch>` ref as remote-branch evidence.

### Remote vs. Local Mode

In **Remote git mode**, Code UX refreshes `origin` before sprint branch preflight and before each task start so branch resolution is based on current remote state instead of stale local refs.
In **Local git mode**, sprint branch allocation and preflight inspect and create only `refs/heads/*`. They do not fetch, inspect, fast-forward from, or push to `origin`, even when the local repository still has an origin remote configured.

### Worktree Cleanup

Code UX manages host-backed git worktrees for tasks using `cliWorkflow.cleanupWorktreeOnSuccess` and `cliWorkflow.cleanupWorktreeOnFailure`. If these are enabled, Code UX performs best-effort cleanup of the worktree when a task finishes. Retained failed worktrees can be used for manual inspection.

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

If task dispatches complain about dirty workspaces, check if a previous task failure bypassed worktree cleanup (due to `cleanupWorktreeOnFailure` being false) and the workspace is still dirty.

## Related Documentation

- [Settings overview](./index.md)
- [Dashboard Settings](../../dashboard/design-system-settings.md)
- [Operations Runbook](../../operations/runbook.md)
- [Instruction Template System](../../instructions/markdown-template-system.md)
