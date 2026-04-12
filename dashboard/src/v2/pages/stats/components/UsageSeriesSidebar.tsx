import type { FunctionComponent } from "preact";
import type { NormalizedChartSeries } from "../chart-view-models.js";

export const UsageSeriesSidebar: FunctionComponent<{
  series: NormalizedChartSeries[];
  enabledSeries: Record<string, boolean>;
  activeIndex: number;
  onToggleSeries?: (id: string) => void;
}> = ({ series, enabledSeries, activeIndex, onToggleSeries }) => {
  const visibleSeries = series.filter(s => enabledSeries[s.id]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 mb-2 max-h-32 overflow-y-auto dashboard-scrollbar pr-2 pb-2">
        {series.map(s => {
          const isEnabled = enabledSeries[s.id];
          return (
            <button
              key={s.id}
              onClick={() => onToggleSeries && onToggleSeries(s.id)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-all border rounded-xl ${
                isEnabled
                  ? 'border-signal-500 bg-signal-500/10 text-signal-700 dark:text-signal-400'
                  : 'border-black/[0.06] text-slate-400 hover:border-black/[0.12] dark:border-white/[0.06] dark:text-slate-500 dark:hover:border-white/[0.12]'
              }`}
            >
              {s.label}
            </button>
          )
        })}
      </div>
      {visibleSeries.map((s) => {
        const currentValue = s.values[activeIndex] || 0;

        return (
          <div
            key={s.id}
            className="rounded-[1.25rem] border border-signal-500/18 bg-white/68 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.045)] transition-all dark:bg-void-900/35"
          >
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.accentHex }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{s.label}</span>
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div className="text-lg font-black text-slate-900 dark:text-white">{s.formatter(currentValue)}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{s.signalLabel || 'Metric'}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
