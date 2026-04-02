/**
 * Checks if the user has requested reduced motion via system preferences.
 * Safe for non-browser environments.
 */
export function isReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Returns `motionValue` if reduced motion is disabled, otherwise returns `fallbackValue`.
 */
export function withMotion<T>(motionValue: T, fallbackValue: T): T {
  return isReducedMotion() ? fallbackValue : motionValue;
}

/**
 * Shared motion tokens to ensure consistent animation timings across the app.
 */
export const MOTION_TOKENS = {
  duration: {
    fast: 0.15,
    normal: 0.3,
    slow: 0.5,
  },
  ease: {
    default: "power2.out",
    inOut: "power2.inOut",
    bounce: "back.out(1.5)",
  },
} as const;

/**
 * A safe GSAP configuration generator that respects reduced motion preferences.
 * If reduced motion is enabled, it forces durations to 0 to create instant transitions.
 */
export function getGsapConfig(
  config: Record<string, any>,
  reducedMotionFallback: Record<string, any> = { duration: 0, delay: 0 }
): Record<string, any> {
  if (isReducedMotion()) {
    return { ...config, ...reducedMotionFallback };
  }
  return config;
}
