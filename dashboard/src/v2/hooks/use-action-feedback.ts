import { useState, useCallback, useRef, useEffect } from "preact/hooks";
import gsap from "gsap";

export type ActionFeedbackStatus = "idle" | "pending" | "success" | "warning" | "error";

export interface ActionFeedbackState {
  status: ActionFeedbackStatus;
  message: string | null;
}

export function useActionFeedback(autoDismissMs: number = 5000) {
  const [feedback, setFeedback] = useState<ActionFeedbackState>({ status: "idle", message: null });
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  const triggerFeedback = useCallback((element: HTMLElement | null, type: "success" | "error") => {
    if (!element) return;

    if (type === "success") {
      // Signal Jade pulse
      gsap.fromTo(element,
        { boxShadow: "0 0 0px 0px rgba(0, 224, 160, 0)" },
        {
          boxShadow: "0 0 20px 4px rgba(0, 224, 160, 0.4)",
          duration: 0.4,
          repeat: 1,
          yoyo: true,
          ease: "power2.out",
          clearProps: "boxShadow"
        }
      );
    } else if (type === "error") {
      // Subtle jitter
      gsap.to(element, {
        x: (i) => [ -2, 2, -1, 1, 0 ][i] ?? 0,
        duration: 0.1,
        repeat: 4,
        ease: "none",
        onComplete: () => gsap.set(element, { x: 0 })
      });
    }
  }, []);

  const clearFeedback = useCallback((message?: string) => {
    clearTimer();
    setFeedback({ status: "idle", message: message || null });
  }, [clearTimer]);

  const setWithTimeout = useCallback((status: ActionFeedbackStatus, message: string) => {
    clearTimer();
    setFeedback({ status, message });
    timerRef.current = window.setTimeout(() => {
      setFeedback({ status: "idle", message: null });
    }, autoDismissMs);
  }, [clearTimer, autoDismissMs]);

  const setPending = useCallback((message: string) => {
    clearTimer();
    setFeedback({ status: "pending", message });
  }, [clearTimer]);

  const setSuccess = useCallback((message: string, element?: HTMLElement | null) => {
    setWithTimeout("success", message);
    if (element) triggerFeedback(element, "success");
  }, [setWithTimeout, triggerFeedback]);

  const setWarning = useCallback((message: string) => {
    setWithTimeout("warning", message);
  }, [setWithTimeout]);

  const setError = useCallback((message: string, element?: HTMLElement | null) => {
    clearTimer();
    setFeedback({ status: "error", message });
    if (element) triggerFeedback(element, "error");
  }, [clearTimer, triggerFeedback]);

  return {
    feedback,
    setPending,
    setSuccess,
    setWarning,
    setError,
    clearFeedback,
    triggerFeedback,
  };
}
