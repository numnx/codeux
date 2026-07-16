# Onboarding

Reopens the guided setup flow without changing saved settings by itself.

> Settings area: `onboarding`
> Dashboard documentation route: `/docs/settings-onboarding`

## What This Area Is For

Reopens the guided setup flow without changing saved settings by itself. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

The action button launches onboarding so you can revisit provider, project, and setup prompts.

Easy mode follows the short Setup mode, Installation, Introduction, Provider, and GitHub sequence. The Introduction presents the container-first runtime and credential boundary before provider setup. Easy provider selection offers Antigravity, Codex, Claude Code, Qwen Code, and OpenCode; deprecated Gemini CLI remains available in Standard, Expert, and Settings but is not shown in Easy. Every Easy provider card initially selects **Dashboard Login**. Operators can still explicitly switch the selected provider to **Local Copy** before finishing.

The flow and its guided dashboard tour follow the active English or German dashboard locale, including keyboard-accessible names, validation, progress, readiness framing, and completion feedback. Provider names, detected paths, model IDs, runtime diagnostics, and installation output remain unchanged, and locale selection never changes the settings values submitted by onboarding.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Launch Onboarding | Opens the guided setup flow (Easy, Standard, Expert). | Note that completing onboarding can overwrite system defaults. |

## Recommended Configuration

Use it when setting up a new machine or after adding provider credentials.

Use it when setting up a new machine or after adding provider credentials to ensure all core settings are initialized.

## Risks And Gotchas

Saving new onboarding choices can overwrite the current system defaults for providers and docker runtimes.

## Troubleshooting

If you accidentally overwrite settings during onboarding, you can reset them manually in their respective settings panels.

## Related Documentation

- [Settings overview](./index.md)
- [Dashboard Settings](../dashboard/design-system-settings.md)
- [Dashboard Onboarding](../dashboard/onboarding.md)
- [Quickstart](../getting-started/quickstart.md)
