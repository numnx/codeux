import type { FunctionComponent } from "preact";

export const IdleRuntimeState: FunctionComponent<{
    title: string;
    subtitle: string;
}> = ({ title, subtitle }) => (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-black/[0.06] dark:border-white/[0.06] bg-white/70 dark:bg-void-800/60 backdrop-blur-2xl p-10 min-h-[18rem] flex items-center justify-center">
        <div className="relative z-10 text-center">
            <div className="relative flex items-center justify-center w-16 h-16 mx-auto mb-5">
                <div className="relative w-4 h-4 rounded-full bg-signal-500" />
            </div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-signal-500">{title}</div>
            <div className="mt-3 text-sm text-slate-500 dark:text-slate-500 font-medium">{subtitle}</div>
        </div>
    </div>
);
