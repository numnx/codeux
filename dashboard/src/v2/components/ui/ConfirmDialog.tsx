import { h } from "preact";
import { useState, useRef, useEffect, useCallback } from "preact/hooks";
import { useFocusTrap } from "../../hooks/use-focus-trap.js";
import type { ConfirmDialogOptions } from "../../hooks/use-confirm-dialog.js";

function DestructiveConfirmButton({
  onConfirm,
  label,
  className
}: {
  onConfirm: () => void;
  label: string;
  className?: string;
}) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  const holdDuration = 1000;
  const holdTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const startHold = () => {
    if (isHolding) return;
    setIsHolding(true);
    setProgress(0);
    setIsShaking(false);
    startTimeRef.current = performance.now();

    const updateProgress = (currentTime: number) => {
      if (!startTimeRef.current) return;

      const elapsed = currentTime - startTimeRef.current;
      const newProgress = Math.min(100, (elapsed / holdDuration) * 100);

      setProgress(newProgress);

      if (elapsed < holdDuration) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);

    holdTimerRef.current = window.setTimeout(() => {
      setIsHolding(false);
      setProgress(100);
      onConfirm();
    }, holdDuration);
  };

  const cancelHold = () => {
    if (isHolding) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
    }
    setIsHolding(false);
    setProgress(0);
    clearTimers();
    startTimeRef.current = null;
  };

  const handlePointerDown = (e: h.JSX.TargetedPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startHold();
  };

  const handlePointerUp = (e: h.JSX.TargetedPointerEvent<HTMLButtonElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    cancelHold();
  };

  const handleKeyDown = (e: h.JSX.TargetedKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      startHold();
    }
  };

  const handleKeyUp = (e: h.JSX.TargetedKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      cancelHold();
    }
  };

  const handlePointerLeave = () => {
    if (isHolding) {
      setIsHolding(false);
      setProgress(0);
      clearTimers();
      startTimeRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative overflow-hidden ${className} ${isShaking ? "animate-shake" : ""}`}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {isHolding && (
        <div
          className="absolute inset-0 bg-black/20 dark:bg-white/20 origin-left"
          style={{
            transform: `scaleX(${progress / 100})`,
            transition: 'transform 0.1s linear'
          }}
        />
      )}

      <span className="relative z-10">
        {isHolding ? `Hold to ${label}` : label}
      </span>
    </button>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  options: ConfirmDialogOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ isOpen, options, onConfirm, onCancel }: ConfirmDialogProps) {
  const containerRef = useFocusTrap(isOpen, onCancel);

  if (!isOpen || !options) return null;

  const { title, body, confirmLabel = "Confirm", cancelLabel = "Cancel", destructive = false } = options;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-900/50 backdrop-blur-sm p-4">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-body"
        className="bg-white dark:bg-void-800 w-full max-w-md rounded-[1.75rem] shadow-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] flex flex-col"
      >
        <div className="p-6 pb-4">
          <h2 id="confirm-dialog-title" className="text-xl font-semibold text-void-900 dark:text-white">
            {title}
          </h2>
          <p id="confirm-dialog-body" className="mt-3 text-sm text-void-600 dark:text-void-300">
            {body}
          </p>
          {destructive && (
            <div className="mt-4 p-3 bg-status-red/10 border border-status-red/20 rounded-lg">
              <p className="text-xs font-medium text-status-red">
                ⚠️ This action is permanent and cannot be undone.
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 p-4 bg-void-50 dark:bg-void-900/30 border-t border-black/[0.06] dark:border-white/[0.06]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-[1rem] border border-black/[0.06] dark:border-white/[0.06] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500 focus-visible:ring-offset-2 active:scale-95"
          >
            {cancelLabel}
          </button>
          {destructive ? (
            <DestructiveConfirmButton
              onConfirm={onConfirm}
              label={confirmLabel}
              className="px-4 py-2 text-sm font-medium rounded-[1rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500 focus-visible:ring-offset-2 active:scale-95 bg-status-red text-white hover:opacity-90"
            />
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium rounded-[1rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500 focus-visible:ring-offset-2 active:scale-95 bg-signal-500 text-white hover:bg-signal-600 dark:hover:bg-signal-400"
            >
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
