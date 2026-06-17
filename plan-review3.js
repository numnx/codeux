// IconButton issues:
// 1. Doesn't have `aria-disabled={disabled || isPending}` (only disabled prop)
// 2. Doesn't use `reducedMotion` properly for its transitions or GSAP animations like Button does? Wait, IconButton uses `transition-opacity duration-200` which isn't using GSAP. Button uses GSAP and standard classes.
// 3. Doesn't use GSAP for icon swaps? Button uses GSAP `fromTo` for `activeIcon`. IconButton just uses opacity.

// ActionButton issues:
// 1. Doesn't use `useActionFeedback` at all, it only accepts `busy` and `disabled`. Wait, ActionButton doesn't support success/error visually. The prompt: "Improve the shared control feedback layer so primary actions, secondary actions, icon actions, and settings action buttons communicate state changes clearly and consistently."
// 2. ActionButton uses `transition-opacity duration-200`.

// Let's create a shared state handling or just align the code manually.
// Wait, "Keep the change reusable at the primitive level so page-specific controls can inherit the refinement without local class duplication."
// Button already imports `SHARED_INTERACTION_CLASSES`.
