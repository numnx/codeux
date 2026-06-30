import type { FunctionComponent } from "preact";
import { Check } from "lucide-preact";
import type { NormalizedChartSeries } from "../chart-view-models.js";

export const UsageSeriesSidebar: FunctionComponent<{
  series: NormalizedChartSeries[];
  enabledSeries: Record<string, boolean>;
  setEnabledSeries: (val: Record<string, boolean> | ((curr: Record<string, boolean>) => Record<string, boolean>)) => void;
  activeIndex: number;
}> = ({ series, enabledSeries, setEnabledSeries, activeIndex }) => {
  // Show all series so they can be toggled via sidebar
  const visibleSeries = series;

  const activeSeriesCount = Object.values(enabledSeries).filter(Boolean).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:flex xl:flex-col gap-4">
      {visibleSeries.map((s) => {
        const currentValue = s.values[activeIndex] || 0;
        const isActive = enabledSeries[s.id] || false;
        const disabled = activeSeriesCount === 1 && isActive;

        return (
          <button
            key={s.id}
            type="button"
            role="switch"
            aria-checked={isActive}
            aria-disabled={disabled ? "true" : undefined}
            onClick={() => {
              if (activeSeriesCount === 1 && isActive) return;
              setEnabledSeries((curr) => ({ ...curr, [s.id]: !curr[s.id] }));
            }}
            className={`text-left rounded-[1.25rem] border ${isActive ? 'border-[var(--stats-card-border)] ring-1 ring-signal-500/20' : 'border-transparent opacity-60'} bg-[var(--stats-card-bg)]/40 px-5 py-4 shadow-sm transition-all hover:bg-[var(--stats-card-bg)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center h-4 w-4 rounded-full ring-2 ring-white/10 shrink-0"
                style={{ backgroundColor: isActive ? s.accentHex : 'transparent', border: isActive ? 'none' : `1px solid ${s.accentHex}` }}
              >
                {isActive && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--stats-label-color)] truncate">{s.label}</span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div className="text-xl font-black text-[var(--stats-value-color)] truncate">{s.formatter(currentValue)}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--stats-detail-color)] opacity-70">{s.signalLabel || 'Metric'}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
