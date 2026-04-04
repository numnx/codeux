import type { ComponentChildren, FunctionComponent } from "preact";

export const NoticePanel: FunctionComponent<{
  tone?: "neutral" | "warning" | "success";
  title: string;
  children: ComponentChildren;
}> = ({ tone = "neutral", title, children }) => {
  const toneClass = tone === "warning"
    ? "border-status-red/20 bg-status-red/[0.06] text-status-red"
    : tone === "success"
      ? "border-signal-500/20 bg-signal-500/[0.07] text-signal-700 dark:text-signal-300"
      : "border-black/[0.06] bg-black/[0.03] text-slate-600 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-300";

  return (
    <div
      className={`rounded-[1.35rem] border px-5 py-4 ${toneClass}`}
      role="status"
      aria-live="polite"
    >
      <div className="text-[11px] font-bold uppercase tracking-[0.16em]">{title}</div>
      <div className="mt-2 text-sm font-medium leading-relaxed">{children}</div>
    </div>
  );
};
