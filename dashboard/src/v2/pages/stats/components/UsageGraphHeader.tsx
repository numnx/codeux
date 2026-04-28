import type { FunctionComponent } from 'preact';
import { Activity, Filter } from 'lucide-preact';
import { CHIP_CLASS } from './StatsShared.js';

export const UsageGraphHeader: FunctionComponent<{
  title: string;
  description: string;
  onOpenFilters: () => void;
  isFilterActive?: boolean;
}> = ({ title, description, onOpenFilters, isFilterActive }) => {
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/72 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:border-white/[0.06] dark:bg-void-900/55 dark:text-slate-300">
          <Activity className="h-3.5 w-3.5 text-signal-500" strokeWidth={2.2} />
          Usage Graph
        </div>
        <div className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {title}
        </div>
        <div className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenFilters}
          className={`group flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition-all hover:bg-slate-50 dark:hover:bg-void-800 ${CHIP_CLASS} ${
            isFilterActive ? 'border-signal-500/30 bg-signal-500/[0.03] text-signal-600 dark:text-signal-400' : 'text-slate-500 dark:text-slate-300'
          }`}
        >
          <Filter className={`h-3.5 w-3.5 transition-colors ${isFilterActive ? 'text-signal-500' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`} strokeWidth={2.2} />
          Filters
        </button>
      </div>
    </div>
  );
};
