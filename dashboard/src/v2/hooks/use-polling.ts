import { useEffect, useRef } from "preact/hooks";

export function usePolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;
  const callbackRef = useRef(callback);
  const inFlightRef = useRef(false);

  // Update callback ref so we always call the latest without re-setting the interval
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    let timeoutId: number | undefined;
    let isCancelled = false;

    const tick = async () => {
      if (isCancelled) return;

      // Skip if previous poll hasn't finished or tab is hidden
      if (!inFlightRef.current && !document.hidden) {
        inFlightRef.current = true;
        try {
          await callbackRef.current();
        } catch (error) {
          console.error("Polling error:", error);
        } finally {
          inFlightRef.current = false;
        }
      }

      if (isCancelled) return;

      // Clear any existing timeout just in case tick was called manually
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(tick, intervalMs);
    };

    timeoutId = window.setTimeout(tick, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && enabled) {
        // Clear the current wait and run immediately
        window.clearTimeout(timeoutId);
        void tick();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, intervalMs]);
}
