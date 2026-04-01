import type { FunctionComponent, ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

interface ToastProps {
  message: ComponentChildren;
  type?: "success" | "error" | "info" | "warning";
  durationMs?: number;
  onClose?: () => void;
}

export const Toast: FunctionComponent<ToastProps> = ({
  message,
  type = "info",
  durationMs = 3000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (durationMs <= 0) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, onClose]);

  if (!isVisible) return null;

  const typeClasses = {
    success: "bg-signal-500 text-white",
    error: "bg-status-red text-white",
    warning: "bg-status-amber text-white",
    info: "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900",
  };

  const isAssertive = type === "error" || type === "warning";

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-xl px-4 py-3 shadow-lg transition-opacity duration-300 ${typeClasses[type]}`}
      role={isAssertive ? "alert" : "status"}
      aria-live={isAssertive ? "assertive" : "polite"}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium">{message}</span>
        {onClose && (
          <button
            type="button"
            onClick={() => {
              setIsVisible(false);
              onClose();
            }}
            className="text-white/80 hover:text-white dark:text-slate-900/80 dark:hover:text-slate-900"
            aria-label="Close notification"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
};
