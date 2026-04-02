import { useState, useEffect } from "preact/hooks";

/**
 * Returns true if the user has requested reduced motion via system preferences.
 * Safe for non-browser environments (returns false by default).
 */
export function useReducedMotion(): boolean {
  const [isReduced, setIsReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Update state if it changed between initial render and effect execution
    if (mediaQuery.matches !== isReduced) {
      setIsReduced(mediaQuery.matches);
    }

    const handler = (event: MediaQueryListEvent) => {
      setIsReduced(event.matches);
    };

    // Support modern event listeners and fallback to addListener for older browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [isReduced]);

  return isReduced;
}
