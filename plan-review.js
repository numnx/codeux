// Reviewing requirements
// 1. Audit existing `Button`, `IconButton`, `ActionButton` and align hover, focus-visible, pressed, disabled, aria-busy, pending, success, error treatments.
// 2. Preserve fixed-width pending behavior in Button while making icon/state swaps announce and render predictably for async actions, including reduced-motion fallback and no layout shift.
// 3. Add or update focused tests covering pending width stability, disabled busy click suppression, success/error visual state attributes, accessible state, and settings ActionButton busy behavior.
// 4. Keep the change reusable at the primitive level so page-specific controls can inherit the refinement without local class duplication.
