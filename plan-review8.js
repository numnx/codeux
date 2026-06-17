// Wait, the prompt says:
// "Preserve the fixed-width pending behavior in Button while making icon/state swaps announce and render predictably for async actions, including reduced-motion fallback and no layout shift."
// And it specifically mentions "motion tokens".
// In Button.tsx: `transition-all duration-300` is hardcoded. `duration-300` is not using the `useGsapDurations` or a motion token for CSS. Wait, we don't have CSS variables for durations?
// Let's check `constants.ts` or what we have for CSS motion tokens.
