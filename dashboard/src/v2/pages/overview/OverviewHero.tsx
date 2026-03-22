import type { FunctionComponent } from "preact";

export const OverviewHero: FunctionComponent = () => {
    return (
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between w-full gap-6">
            <div>
                <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white mb-4 font-display leading-[0.95]">
                    Overview.
                </h2>
                <p className="text-lg text-slate-500 dark:text-slate-500 font-medium max-w-xl leading-relaxed">
                    Real-time metrics and operational intelligence across your cluster.
                </p>
            </div>
            <div className="flex items-center gap-2">
                <div className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-full bg-signal-500/8 dark:bg-signal-500/10 text-signal-600 dark:text-signal-400 border border-signal-500/15 dark:border-signal-500/20 flex items-center gap-2.5 shadow-[0_0_20px_rgba(0,224,160,0.08)] backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-signal-500 relative">
                        <span className="absolute inset-0 rounded-full animate-ping bg-signal-400 opacity-60" />
                    </span>
                    Cluster Optimal
                </div>
            </div>
        </div>
    );
};
