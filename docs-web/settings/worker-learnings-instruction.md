# Worker Learnings Instruction

Defines the prompt appended to worker tasks so useful lessons are captured for memory processing.

> Settings area: `worker-learnings-instruction`
> Dashboard documentation route: `/docs/settings-worker-learnings-instruction`

## What This Area Is For

Defines the prompt appended to worker tasks so useful lessons are captured for memory processing. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

The text area controls exactly what workers are asked to observe and write into the temporary learnings file.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Custom Instructions | Passed to the worker agent as context during execution. | Keep instructions concise and relevant to the project. |
| Rules & Constraints | Defines strict boundaries for agent behavior. | Overly strict rules can block agents from completing valid tasks. |

## Recommended Configuration

Keep instructions specific to reusable engineering lessons and avoid asking workers to record secrets.

Use clear, actionable instructions (e.g., 'Always use pnpm, never npm'). Avoid conflicting rules that might confuse the agent.

## Risks And Gotchas

Contradictory instructions can cause agents to loop or fail to generate code. Long instructions consume valuable prompt context tokens.

## Troubleshooting

If the agent behaves erratically or ignores constraints, review the custom instructions for ambiguity or length.

## Related Documentation

- [Settings overview](./index.md)
- [Dashboard Settings](../dashboard/design-system-settings.md)
- [Memory Architecture and Search](../dashboard/memory.md)
- [Instruction Template System](../instructions/markdown-template-system.md)
