// Ah, the test for "disabled busy click suppression" probably implies that when `isPending` or `busy`, native `disabled` should be true. Wait, no, maybe the instruction wants us to ensure that we suppress clicks in onClick. The components DO have:
// if (isPending) { e?.preventDefault(); return; }
// Wait, if we use `disabled={disabled || isPending}`, the `onClick` will never fire anyway, which is natively better.
// But we want to maintain hover state? Natively disabled buttons don't get hover.
// "Do not remove existing aria-busy, aria-disabled, or focus-visible behavior."
// What does the issue mean by "disabled busy click suppression"?
// Maybe they want us to add `disabled={disabled || isPending}` to Button?
// Button has:
//   disabled={disabled}
//   aria-disabled={disabled || isPending}
// SettingsSurface has:
//   disabled={disabled}
//   aria-disabled={disabled || busy}
// IconButton has:
//   disabled={disabled || isPending}
//   aria-disabled={disabled || isPending} (Wait, IconButton has `aria-busy={isPending}` but lacks `aria-disabled`)
//
// Let's align them.
// "disabled busy click suppression" might mean `disabled={disabled || isPending}` across the board, or `disabled={disabled}` but explicitly suppressing it in the handler. The handler already has `if (isPending) { e?.preventDefault(); return; }`
