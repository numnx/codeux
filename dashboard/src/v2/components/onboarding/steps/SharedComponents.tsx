import type { FunctionComponent } from "preact";
import { Check, ChevronRight } from "lucide-preact";

export const Choice: FunctionComponent<{
  title: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}> = ({ title, value, options, onChange }) => (
  <div data-onboarding-card className="rounded-3xl border border-black/[0.06] bg-white/75 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.04)] dark:border-white/[0.06] dark:bg-white/[0.04]">
    <div className="text-sm font-black text-slate-900 dark:text-white">{title}</div>
    <div className="mt-4 flex flex-wrap gap-2">
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          type="button"
          onClick={() => onChange(optionValue)}
          className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold transition-colors ${value === optionValue ? "border-signal-500/30 bg-signal-500/12 text-signal-700 dark:text-signal-200" : "border-black/[0.06] bg-white text-slate-500 hover:text-slate-800 dark:border-white/[0.06] dark:bg-white/[0.04] dark:text-slate-300"}`}
        >
          {value === optionValue ? <Check className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {label}
        </button>
      ))}
    </div>
  </div>
);

export const ToggleRow: FunctionComponent<{
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ title, description, checked, onChange }) => (
  <div data-onboarding-card className="flex items-center justify-between gap-4 rounded-3xl border border-black/[0.06] bg-white/75 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.04)] dark:border-white/[0.06] dark:bg-white/[0.04]">
    <div>
      <div className="text-sm font-black text-slate-900 dark:text-white">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</div>
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 overflow-hidden rounded-full border transition-colors ${checked ? "border-signal-500/30 bg-signal-500" : "border-black/[0.12] bg-slate-200 dark:border-white/[0.12] dark:bg-white/[0.08]"}`}
      aria-pressed={checked}
    >
      <span className={`absolute left-1 top-1 block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  </div>
);
