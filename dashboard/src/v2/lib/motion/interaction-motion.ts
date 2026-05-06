import { MOTION_TOKENS } from "./tokens.js";
import { GSAP_EASINGS } from "./constants.js";
import { useReducedMotion } from "../../hooks/use-reduced-motion.js";

/**
 * Single source of truth for microinteraction motion tokens.
 * Provides specific, semantic timings and easings for standard interaction types.
 */
export const INTERACTION_MOTION = {
    enter: {
        duration: MOTION_TOKENS.timing.standard,
        easing: GSAP_EASINGS.smooth
    },
    exit: {
        duration: MOTION_TOKENS.timing.fast,
        easing: GSAP_EASINGS.linear
    },
    hover: {
        duration: MOTION_TOKENS.timing.fast,
        easing: GSAP_EASINGS.smooth
    },
    press: {
        duration: "100ms", // Super fast for immediate physical feedback
        easing: GSAP_EASINGS.smooth
    },
    emphasis: {
        duration: MOTION_TOKENS.timing.slow,
        easing: GSAP_EASINGS.spring
    }
} as const;

export type InteractionType = keyof typeof INTERACTION_MOTION;

/**
 * Accessor hook that safely returns motion settings based on the user's reduced-motion preference.
 */
export function useInteractionMotion(type: InteractionType) {
    const isReducedMotion = useReducedMotion();

    if (isReducedMotion) {
        return {
            duration: "0.01ms",
            easing: "linear"
        };
    }

    return INTERACTION_MOTION[type];
}

/**
 * Accessor function that returns the RAW token regardless of reduced motion state.
 * You should use `useInteractionMotion` within React/Preact components when possible.
 * This function exists for utility functions or GSAP timelines where hooks are not available.
 */
export function getInteractionMotion(type: InteractionType) {
    return INTERACTION_MOTION[type];
}
