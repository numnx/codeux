import type { FunctionComponent, ComponentChildren } from "preact";

export interface EmptyStateProps {
  icon?: ComponentChildren;
  title: string;
  description?: string;
  /**
   * The primary action to take from this empty state.
   * If provided alongside `children`, `children` will be treated as secondary actions
   * and visually de-emphasized to ensure the primary action stands out.
   */
  primaryAction?: ComponentChildren;
  children?: ComponentChildren;
}

export const EmptyState: FunctionComponent<EmptyStateProps> = ({
  icon,
  title,
  description,
  primaryAction,
  children,
}) => {
  let step = 0;
  const delays = [
    "",
    "motion-safe:[animation-delay:50ms]",
    "motion-safe:[animation-delay:100ms]",
    "motion-safe:[animation-delay:150ms]",
  ];

  const getDelayClass = () => {
    return delays[step++] || delays[delays.length - 1];
  };

  return (
    <div className="flex w-full flex-col items-center justify-center p-12 text-center">
      {icon && (
        <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 shadow-sm ring-1 ring-slate-900/5 dark:bg-white/[0.04] dark:text-slate-400 dark:ring-white/[0.06] motion-safe:animate-form-slide-down ${getDelayClass()}`}>
          {icon}
        </div>
      )}
      <h3 className={`mb-2 font-display text-xl font-semibold tracking-tight text-slate-900 dark:text-white motion-safe:animate-form-slide-down ${getDelayClass()}`}>
        {title}
      </h3>
      {description && (
        <p className={`mb-8 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400 motion-safe:animate-form-slide-down ${getDelayClass()}`}>
          {description}
        </p>
      )}
      {(primaryAction || children) && (
        <div className={`mt-2 flex flex-col sm:flex-row items-center justify-center gap-4 motion-safe:animate-form-slide-down ${getDelayClass()}`}>
          {primaryAction && (
            <div className="flex-shrink-0">
              {primaryAction}
            </div>
          )}
          {children && (
            <div className={primaryAction ? "flex items-center gap-3 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100" : "flex items-center gap-3"}>
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
