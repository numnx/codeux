import type { FunctionComponent } from "preact";

export interface ContentPlaceholderProps {
  mode: "card" | "table-row" | "pill" | "panel-copy";
  className?: string;
}

export const ContentPlaceholder: FunctionComponent<ContentPlaceholderProps> = ({ mode, className = "" }) => {
  const baseClasses = "animate-pulse bg-slate-200 dark:bg-void-700/50 rounded";

  if (mode === "card") {
    return (
      <div className={`flex flex-col gap-4 p-4 border border-slate-200 dark:border-void-700/50 rounded-lg ${className}`}>
        <div className={`h-6 w-1/3 ${baseClasses}`} />
        <div className={`h-4 w-1/2 ${baseClasses}`} />
        <div className={`h-20 w-full mt-2 ${baseClasses}`} />
      </div>
    );
  }

  if (mode === "table-row") {
    return (
      <div className={`flex items-center gap-4 py-3 border-b border-slate-100 dark:border-void-800 ${className}`}>
        <div className={`h-5 w-8 ${baseClasses}`} />
        <div className={`h-5 w-1/4 ${baseClasses}`} />
        <div className={`h-5 w-1/3 ${baseClasses}`} />
        <div className={`h-5 w-16 ml-auto ${baseClasses}`} />
      </div>
    );
  }

  if (mode === "pill") {
    return (
      <div className={`h-6 w-16 rounded-full ${baseClasses} ${className}`} />
    );
  }

  if (mode === "panel-copy") {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className={`h-4 w-full ${baseClasses}`} />
        <div className={`h-4 w-[90%] ${baseClasses}`} />
        <div className={`h-4 w-[80%] ${baseClasses}`} />
        <div className={`h-4 w-[85%] ${baseClasses}`} />
      </div>
    );
  }

  return null;
};
