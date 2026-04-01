import { h, type FunctionComponent, type ComponentChildren } from "preact";

export interface NotificationToastProps {
  id?: string;
  type?: "info" | "success" | "warning" | "error";
  title?: string;
  children: ComponentChildren;
  onDismiss?: () => void;
}

export const NotificationToast: FunctionComponent<NotificationToastProps> = ({
  type = "info",
  title,
  children,
  onDismiss,
}) => {
  const isError = type === "error";
  const ariaLive = isError ? "assertive" : "polite";

  const typeClasses = {
    info: "bg-white dark:bg-void-800 border-black/[0.06] dark:border-white/[0.08] text-slate-800 dark:text-slate-200",
    success: "bg-signal-50 dark:bg-signal-500/10 border-signal-500/20 text-signal-800 dark:text-signal-300",
    warning: "bg-amber-50 dark:bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300",
    error: "bg-status-red/10 border-status-red/20 text-status-red",
  };

  return (
    <div
      role="status"
      aria-live={ariaLive}
      className={`relative w-full max-w-sm rounded-xl border p-4 shadow-lg backdrop-blur-md transition-all ${typeClasses[type]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {title && <h4 className="text-sm font-bold tracking-tight mb-1">{title}</h4>}
          <div className="text-sm opacity-90">{children}</div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-lg p-1 opacity-60 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-current"
            aria-label="Dismiss notification"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const NotificationContainer: FunctionComponent<{
  children?: ComponentChildren;
}> = ({ children }) => {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none"
    >
      <div className="pointer-events-auto">
        {children}
      </div>
    </div>
  );
};
