1. **Audit Button**:
   - `disabled={disabled || isPending}` (already has `disabled={disabled}`). Update to `disabled={disabled || isPending}`? Wait, if we use `disabled={disabled || isPending}`, the button won't be focusable. But "Do not remove existing aria-busy, aria-disabled, or focus-visible behavior." If a button is natively `disabled`, it loses `focus-visible`. To preserve focus-visible, maybe we should keep `disabled={disabled}` and use `aria-disabled={disabled || isPending}`.
   - Let's check `IconButton`: it uses `disabled={disabled || isPending}`. We should probably align it to `disabled={disabled}` and `aria-disabled={disabled || isPending}` to preserve focus-visible behavior when pending.
   - Add `aria-live="polite"` to the icon container for accessibility announcements.
   - Ensure GSAP animations respect `reducedMotion`. (It currently does in Button).

2. **Audit IconButton**:
   - Replace manual `transition-opacity` with GSAP `fromTo` for state swaps to match Button? Wait, `Button` does this in `useLayoutEffect`. Or maybe we can just use consistent CSS? `transition-all duration-300 scale-100 opacity-100` vs `scale-0 opacity-0` is what Button uses. Let's align `IconButton` and `ActionButton` to use the same CSS classes for transitions rather than rewriting GSAP for all of them, or extract the GSAP logic. The prompt says "align hover, focus-visible, pressed, disabled, aria-busy, pending, success, and error treatments around the existing shared interaction classes and motion tokens."
   - Wait, `Button` uses GSAP *only* for the `activeIcon` (the main icon). The state icons (spinner, check, x) just use CSS transitions in Button:
     `transition-all duration-300 ${isPending ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"}`
   - `IconButton` uses `transition-opacity duration-200`. Let's align it to use `transition-all duration-300 scale-100 opacity-100` etc. And use `reducedMotion` for the spinner animation (already does).
   - Add `aria-disabled={disabled || isPending}`.
   - Fix `disabled={disabled}` instead of `disabled={disabled || isPending}`.

3. **Audit ActionButton**:
   - It doesn't have success/error handling. Should we add it? "Improve the shared control feedback layer so primary actions, secondary actions, icon actions, and settings action buttons communicate state changes clearly and consistently."
   - Let's use `useActionFeedback` in `ActionButton`? Or maybe just align the pending state transition. It currently uses `transition-opacity duration-200` and `animate-spin`. We should align to `transition-all duration-300` and handle `reducedMotion`.
   - Wait, we need to handle success/error states in `ActionButton` too!

4. **Testing**:
   - Update `ButtonWidth.test.tsx` to cover width stability, disabled busy click suppression.
   - Update `ui-components.test.tsx` for ActionButton to check success/error visually.

5. **Pre commit steps**:
   - Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
