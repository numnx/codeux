// Button `aria-busy` and `aria-disabled` logic:
// `aria-disabled={disabled || isPending}`
// `aria-busy={isPending}`
// disabled={disabled} // Wait! `disabled` is NOT true when `isPending`!
// Should `disabled={disabled || isPending}`?
// "disabled busy click suppression" is mentioned in prompt.
// In HTML, if `disabled` is not true, the button is still clickable via keyboard/mouse (unless handled by `onClick`), but it's better to set `disabled={disabled || isPending}` for `Button` like `IconButton` does?
// Actually `IconButton` does: `disabled={disabled || isPending}`
// `ActionButton` does: `disabled={disabled}` (Wait, let's check SettingsSurface)
