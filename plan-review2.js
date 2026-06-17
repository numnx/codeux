// Button:
// aria-disabled={disabled || isPending}
// aria-busy={isPending}
// handleClick: if (isPending) e?.preventDefault(); return;

// IconButton:
// aria-disabled is NOT explicitly checking isPending in aria-disabled
// disabled={disabled || isPending}
// aria-busy={isPending}
// handleClick: same as Button

// ActionButton:
// aria-disabled={disabled || busy}
// aria-busy={busy}
// handleClick: if (busy) e?.preventDefault(); return;

// We need to refine `IconButton` to check for `isSuccess` and `isError` in disabled/aria-disabled states?
// The prompt says: "Audit the existing Button, IconButton, and ActionButton implementations and align hover, focus-visible, pressed, disabled, aria-busy, pending, success, and error treatments around the existing shared interaction classes and motion tokens."
