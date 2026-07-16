# Display Settings

Controls the dashboard shell layout, language, theme, accent color, motion preference, and desktop zoom when available.

> Settings area: `display-settings`
> Dashboard documentation route: `/docs/settings-display-settings`

## What This Area Is For

Controls the dashboard shell layout, language, theme, accent color, motion preference, and desktop zoom when available. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

Navigation mode switches dock/sidebar, theme sets color mode, accent color personalizes global actions and interaction states, reduced motion limits animation, and zoom scales Electron windows.

Language switches the dashboard-authored interface between English and German. It applies and persists immediately in both System and Project views, updates the page language used by assistive technology, and never marks a Settings draft dirty or requires **Save Changes**. Language is browser-local dashboard state: it does not change runtime/API messages, saved instructions or configuration values, provider output, or the English documentation.

The accent palette is intentionally limited to accessible presets: Code UX, Ocean, Violet, Cyan, Magenta, and Graphite. Accent changes preview immediately and apply to primary actions, active navigation, focus rings, selections, and links. Provider identity colors, status colors, and chart series remain stable so accent personalization never changes their meaning.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Language | Updates dashboard UI copy immediately and persists locally outside backend Settings. | No save is required; confirm English or Deutsch is announced and the interface remains usable at narrow widths. |
| Settings card fields | Updates the active Settings scope after you save the page. | Confirm whether you are editing System or Project scope. |
| Inherited values | Values can flow from system defaults into project and sprint behavior. | Check the source badge before assuming a value is project-specific. |
| Related runtime paths | The affected service reads the saved settings during planning, dispatch, dashboard rendering, or maintenance work. | Re-run the affected workflow after changing operational settings. |

## Recommended Configuration

Use System theme, Code UX accent, and Auto reduced motion unless you need a fixed accessibility or personalization preference.

Use System theme, Code UX accent, and Auto reduced motion unless you need a fixed accessibility or personalization preference.

## Risks And Gotchas

High zoom or dense sidebars can reduce visible workspace on small screens. Reduced motion disables visual feedback for some long-running processes.

## Troubleshooting

If the layout appears broken, reset Zoom to 100%. If animations are missing unexpectedly, verify Reduced Motion is set to Auto or Off.

## Related Documentation

- [Settings overview](./index.md)
- [Dashboard Settings](../dashboard/design-system-settings.md)
- [Dashboard Accessibility Patterns](../dashboard/dashboard-guide.md#accessibility-patterns)
- [Mobile Responsiveness](../dashboard/mobile-responsiveness.md)
