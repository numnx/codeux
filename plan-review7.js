// Wait, the test:
// "renders Button with pending attributes and styling" in ui-components.test.tsx:
// expect(btn.getAttribute("aria-disabled")).toBe("true");

// Look at the prompt:
// "Preserve the fixed-width pending behavior in Button while making icon/state swaps announce and render predictably for async actions, including reduced-motion fallback and no layout shift."
// How to make icon/state swaps announce predictability?
// `aria-live="polite"`?
// No, the icon swaps are just elements. If they swap, maybe we need to add `aria-live` somewhere?
// The prompt says "success/error visual state attributes or accessible state" and "make icon/state swaps announce and render predictably for async actions, including reduced-motion fallback and no layout shift."
// In `Button`:
// ```tsx
// <div ref={iconContainerRef} className="relative flex items-center justify-center w-4 h-4 shrink-0">
// ...
// </div>
// ```
// If we add `aria-live="polite"` to `iconContainerRef`?
// Or maybe we can just make sure `aria-disabled` and `aria-busy` are consistent across Button, IconButton, ActionButton.
// And align `reducedMotion` usage in IconButton, ActionButton? ActionButton doesn't use `useReducedMotion`.
