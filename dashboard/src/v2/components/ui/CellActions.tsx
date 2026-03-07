import type { FunctionComponent } from "preact";
import { Play, Square, Maximize2, Settings } from "lucide-preact";

interface CellActionsProps {
    isRunning: boolean;
}

/**
 * Shared bottom action bar for organic blob cells (SourceCell, SprintBubble).
 * Appears on hover: [play/stop circle] [Open pill] [settings circle]
 */
export const CellActions: FunctionComponent<CellActionsProps> = ({ isRunning }) => (
    <div className="absolute bottom-5 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 w-full">
        <button
            className="flex items-center justify-center w-9 h-9 bg-black/[0.06] dark:bg-white/[0.07] hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-slate-800 dark:text-white transition-colors"
            title={isRunning ? "Stop" : "Play"}
        >
            {isRunning
                ? <Square className="w-3.5 h-3.5" fill="currentColor" />
                : <Play className="w-3.5 h-3.5" fill="currentColor" />
            }
        </button>
        <button className="flex items-center gap-1.5 px-4 h-9 bg-slate-900 dark:bg-white hover:opacity-85 rounded-full text-white dark:text-void-900 font-bold text-xs tracking-wide transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
            Open <Maximize2 className="w-3 h-3" />
        </button>
        <button
            className="flex items-center justify-center w-9 h-9 bg-black/[0.06] dark:bg-white/[0.07] hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-slate-800 dark:text-white transition-colors"
            title="Settings"
        >
            <Settings className="w-3.5 h-3.5" />
        </button>
    </div>
);
