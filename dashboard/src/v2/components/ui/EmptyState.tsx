import type { FunctionComponent, ComponentChildren } from "preact";

export interface EmptyStateProps {
  icon?: ComponentChildren;
  title: string;
  description?: string;
  children?: ComponentChildren;
}

export const EmptyState: FunctionComponent<EmptyStateProps> = ({
  icon,
  title,
  description,
  children,
}) => {
  return (
    <div className="flex w-full flex-col items-center justify-center p-12 text-center">
      {icon && (
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 shadow-sm ring-1 ring-slate-900/5 dark:bg-white/[0.04] dark:text-slate-400 dark:ring-white/[0.06]">
          {icon}
        </div>
      )}
      <h3 className="mb-2 font-display text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h3>
      {description && (
        <p className="mb-8 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
};
