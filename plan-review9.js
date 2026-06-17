// Ah, `MOTION_TOKENS.timing.fast` is `150ms`.
// `SHARED_INTERACTION_CLASSES` in `Button.tsx`: "transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]"
// This aligns perfectly with fast + standard easing.

// But `IconButton` and `ActionButton` are using `transition-opacity duration-200`. We should probably align them to use:
// `transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]`
// Or better yet, we can export `SHARED_INTERACTION_CLASSES` properly and reuse it. (Wait, `IconButton` already imports it but uses `duration-200` internally for `opacity`!).
// `IconButton`: `transition-opacity duration-200` (which conflicts or overrides?)
// Same for ActionButton.

// And `Button` uses `duration-300` for the state icons:
// `transition-all duration-300` -> this would correspond to `MOTION_TOKENS.timing.standard`. Wait, `300ms` is standard!
// So let's align `IconButton` and `ActionButton` to use `duration-300` (i.e. standard timing) for their internal icon swaps, just like Button.

// Let's create the plan.
