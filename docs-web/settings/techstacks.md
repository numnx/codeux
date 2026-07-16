# Techstacks

Manages the system techstack catalog and per-project techstack/application-kind assignment.

> Settings area: `techstacks`
> Dashboard documentation route: `/docs/settings-techstacks`

## What This Area Is For

Manages the system techstack catalog and per-project techstack/application-kind assignment. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

System scope owns stack entries, default-stack selection, and technology items; project scope chooses a stack, clears to Unassigned, and selects web or desktop app kind.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Languages & Frameworks | Instructs the agent on the project's technology stack. | Ensure selected frameworks match the actual repository. |
| Package Managers | Specifies which package manager (e.g., pnpm, npm) to use. | Mismatched managers can cause build or test failures. |

## Recommended Configuration

Keep imported projects unassigned until setup or an operator identifies the stack; use the built-in Code UX stack only for Code UX-style Preact dashboards.

Only select tech stacks actually present in the repository to avoid hallucinated dependencies. Always specify the correct package manager.

## Risks And Gotchas

Incorrect tech stack selection can cause agents to write code for the wrong framework or use incompatible syntax, failing tests.

## Troubleshooting

If agents generate incorrect boilerplate, verify the Techstacks configuration does not include legacy or unused frameworks.

## Related Documentation

- [Settings overview](./index.md)
- [Dashboard Settings](../dashboard/design-system-settings.md)
- [Configuration and Storage](./configuration-and-storage.md)
- [Settings Reference](./configuration-and-storage.md)
