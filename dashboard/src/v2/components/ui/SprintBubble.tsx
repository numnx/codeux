import type { FunctionComponent } from "preact";
import { useRef } from "preact/hooks";
import gsap from "gsap";
import { CalendarDays, Play, Square, Settings, Maximize2 } from "lucide-preact";
import type { Sprint } from "../../types.js";

interface SprintBubbleProps {
    sprint: Sprint;
    isEven: boolean;
    accentColor: string;
    playing?: boolean;
}

export const SprintBubble: FunctionComponent<SprintBubbleProps> = ({
    sprint,
    isEven,
    accentColor,
    playing = false,
}) => {
    const bubbleRef = useRef<HTMLDivElement>(null);
    const anim = isEven ? 'animate-organic' : 'animate-organic-reverse';

    const handleHoverEnter = () => {
        if (!bubbleRef.current) return;
        gsap.to(bubbleRef.current, {
            scale: 1.05,
            rotation: (Math.random() - 0.5) * 4,
            duration: 0.8,
            ease: "elastic.out(1, 0.5)",
            overwrite: "auto",
        });
    };

    const handleHoverLeave = () => {
        if (!bubbleRef.current) return;
        gsap.to(bubbleRef.current, {
            scale: 1,
            rotation: 0,
            duration: 1,
            ease: "elastic.out(1, 0.5)",
            overwrite: "auto",
        });
    };

    return (
        <div
            ref={bubbleRef}
            onMouseEnter={handleHoverEnter}
            onMouseLeave={handleHoverLeave}
            className="relative group cursor-pointer perspective-1000 flex items-center justify-center shrink-0 w-72 h-72 lg:w-80 lg:h-80"
        >
            {/* Shadow underlay */}
            <div className={`absolute inset-0 shadow-[0_24px_64px_rgba(0,0,0,0.07)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.4)] transition-all duration-700 pointer-events-none ${anim}`} />

            {/* Liquid container */}
            <div
                className={`absolute inset-0 bg-white/50 dark:bg-void-800/60 backdrop-blur-3xl transition-all duration-700 overflow-hidden transform-gpu border border-white/60 dark:border-white/[0.05] ${anim}`}
                style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)', backfaceVisibility: 'hidden' }}
            >
                <div className={`absolute inset-0 pointer-events-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] ${anim}`} />
            </div>

            {/* Content */}
            <div className="relative z-20 flex flex-col items-center justify-center text-center p-8 w-full h-full">
                <div className={`font-mono font-bold text-xs tracking-[0.15em] mb-3 opacity-70 group-hover:opacity-100 transition-opacity ${accentColor}`}>
                    {sprint.id.toUpperCase()}
                </div>

                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-2 px-4 group-hover:scale-105 transition-transform duration-500 font-display">
                    {sprint.name}
                </h3>

                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-500 mt-1.5 mb-7">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{sprint.date}</span>
                </div>

                <div className="flex gap-7 text-center group-hover:-translate-y-3 transition-transform duration-500">
                    <div className="flex flex-col items-center">
                        <div className={`text-2xl font-mono font-bold text-slate-900 dark:text-white group-hover:${accentColor} transition-colors`}>{sprint.tasksCount}</div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 mt-0.5">Tasks</div>
                    </div>
                    <div className="w-px h-10 bg-black/[0.08] dark:bg-white/[0.08]" />
                    <div className="flex flex-col items-center">
                        <div className={`text-2xl font-mono font-bold text-slate-900 dark:text-white group-hover:${accentColor} transition-colors`}>{sprint.completion}%</div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 mt-0.5">Done</div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-void-900/85 dark:bg-white/90 backdrop-blur-md rounded-full opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 delay-100 shadow-xl scale-95 group-hover:scale-100">
                    <button className="p-2 text-white dark:text-void-900 hover:bg-white/20 dark:hover:bg-black/10 rounded-full transition-colors" title="Play/Stop">
                        {playing ? <Square className="w-3 h-3" fill="currentColor" /> : <Play className="w-3 h-3" fill="currentColor" />}
                    </button>
                    <button className="p-2 text-white dark:text-void-900 hover:bg-white/20 dark:hover:bg-black/10 rounded-full transition-colors" title="Configure">
                        <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button className="pr-3 pl-1.5 text-[10px] font-bold text-white dark:text-void-900 hover:text-signal-400 dark:hover:text-signal-600 transition-colors flex items-center gap-1 uppercase tracking-widest" title="Open">
                        Open <Maximize2 className="w-2.5 h-2.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
