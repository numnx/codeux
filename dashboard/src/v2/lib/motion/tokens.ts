import { useReducedMotion } from "../../hooks/use-reduced-motion.js";

export const MOTION_TOKENS = {
  timing: {
    fast: "150ms",
    standard: "300ms",
    slow: "500ms"
  },
  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    dramatic: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    linear: "linear"
  }
} as const;

export const INTERACTION_TOKENS = {
  controlFeedback: {
    duration: MOTION_TOKENS.timing.fast,
    ease: MOTION_TOKENS.easing.standard
  },
  enterExit: {
    duration: MOTION_TOKENS.timing.standard,
    ease: MOTION_TOKENS.easing.standard
  },
  expansionCollapse: {
    duration: MOTION_TOKENS.timing.standard,
    ease: MOTION_TOKENS.easing.standard
  },
  selectionMovement: {
    duration: MOTION_TOKENS.timing.fast,
    ease: MOTION_TOKENS.easing.standard
  },
  asyncFeedback: {
    duration: MOTION_TOKENS.timing.slow,
    ease: MOTION_TOKENS.easing.linear
  }
} as const;

export function useInteractionTokens() {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) {
    return {
      controlFeedback: { ...INTERACTION_TOKENS.controlFeedback, duration: "0ms" },
      enterExit: { ...INTERACTION_TOKENS.enterExit, duration: "0ms" },
      expansionCollapse: { ...INTERACTION_TOKENS.expansionCollapse, duration: "0ms" },
      selectionMovement: { ...INTERACTION_TOKENS.selectionMovement, duration: "0ms" },
      asyncFeedback: { ...INTERACTION_TOKENS.asyncFeedback, duration: "0ms" }
    };
  }
  return INTERACTION_TOKENS;
}
