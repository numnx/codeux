// So ActionButton isn't wrapping `useActionFeedback` yet but maybe we need to?
// Wait, the prompt says "Improve the shared control feedback layer so primary actions, secondary actions, icon actions, and settings action buttons communicate state changes clearly and consistently. [...] Audit the existing Button, IconButton, and ActionButton implementations and align hover, focus-visible, pressed, disabled, aria-busy, pending, success, and error treatments around the existing shared interaction classes and motion tokens."

// ActionButton receives `busy` via props. It does not use `useActionFeedback`. But maybe it should have success/error handling or at least use the same motion tokens for state swaps.
// But more importantly, the prompt says: "Preserve the fixed-width pending behavior in Button while making icon/state swaps announce and render predictably for async actions, including reduced-motion fallback and no layout shift."
// Let's look at `Button.tsx`.
// In Button, it uses GSAP:
//         gsap.fromTo(
//           activeIcon,
//           { x: -4, scale: 0.6, opacity: 0 },
//           { x: 0, scale: 1, opacity: 1, duration: reducedMotion ? 0 : 0.2, ease: "power2.out", clearProps: "all" }
//         );

// "predictably for async actions, including reduced-motion fallback and no layout shift."
// IconButton does opacity fades:
// transition-opacity duration-200 ...
// It does not use GSAP.
// ActionButton also does opacity fade.

// We need to use `useActionFeedback` effectively or at least consistent treatment.
// "Preserve the fixed-width pending behavior in Button while making icon/state swaps announce and render predictably for async actions, including reduced-motion fallback and no layout shift."
