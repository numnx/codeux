import type { FunctionComponent } from "preact";
import { useEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { Target, Maximize2, CalendarDays, Play, Square, Settings } from "lucide-preact";
import { mockSprints } from "./lib/mockData.js";

export const SprintsPage: FunctionComponent = () => {
    const mainRef = useRef<HTMLDivElement>(null);
    const bubblesRef = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (mainRef.current) {
            gsap.fromTo(mainRef.current.children,
                { opacity: 0, y: 40 },
                { opacity: 1, y: 0, stagger: 0.12, duration: 1, ease: "power4.out", delay: 0.15 }
            );
        }
    }, []);

    const handleHoverEnter = (index: number) => {
        if (!bubblesRef.current[index]) return;
        gsap.to(bubblesRef.current[index], {
            scale: 1.05,
            rotation: (Math.random() - 0.5) * 4,
            duration: 0.8,
            ease: "elastic.out(1, 0.5)",
            overwrite: "auto"
        });
    };

    const handleHoverLeave = (index: number) => {
        if (!bubblesRef.current[index]) return;
        gsap.to(bubblesRef.current[index], {
            scale: 1,
            rotation: 0,
            duration: 1,
            ease: "elastic.out(1, 0.5)",
            overwrite: "auto"
        });
    };

    return (
        <div ref={mainRef} className="max-w-[1920px] mx-auto px-8 md:px-20 py-24 flex flex-col gap-20 relative z-10">

            {/* Page Header */}
            <div className="flex flex-col gap-5 max-w-3xl">
                <div className="flex items-center gap-2.5 text-signal-500 font-bold tracking-[0.15em] uppercase text-xs font-mono">
                    <Target className="w-4 h-4" strokeWidth={2.5} />
                    Iteration Cycles
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 dark:text-white leading-[0.92] font-display">
                    Active <br />
                    <span className="text-signal-500">Sprints.</span>
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-500 font-medium max-w-xl mt-2 leading-relaxed">
                    Liquid execution streams mapping your source integrations in real-time.
                </p>
            </div>

            {/* Organic Sprint Bubbles */}
            <div className="flex flex-wrap gap-14 justify-center lg:justify-start">
                {mockSprints?.map((sprint, index) => {
                    const isEven = index % 2 === 0;
                    // Alternate between signal and ember accent for variety
                    const accentColor = index % 3 === 0 ? 'text-signal-500' : index % 3 === 1 ? 'text-ember-500' : 'text-status-green';

                    return (
                        <div
                            key={sprint.id}
                            ref={el => { if (el) bubblesRef.current[index] = el; }}
                            onMouseEnter={() => handleHoverEnter(index)}
                            onMouseLeave={() => handleHoverLeave(index)}
                            className="relative group cursor-pointer perspective-1000 flex items-center justify-center shrink-0 w-72 h-72 lg:w-80 lg:h-80"
                            style={{ animationDelay: `${index * 0.3}s` }}
                        >
                            {/* Shadow */}
                            <div className={`absolute inset-0 shadow-[0_24px_64px_rgba(0,0,0,0.07)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.4)] transition-all duration-700 pointer-events-none ${isEven ? 'animate-organic' : 'animate-organic-reverse'}`} />

                            {/* Liquid container */}
                            <div
                                className={`absolute inset-0 bg-white/50 dark:bg-void-800/60 backdrop-blur-3xl transition-all duration-700 overflow-hidden transform-gpu border border-white/60 dark:border-white/[0.05] ${isEven ? 'animate-organic' : 'animate-organic-reverse'}`}
                                style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)', backfaceVisibility: 'hidden' }}
                            >
                                <div className={`absolute inset-0 pointer-events-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] ${isEven ? 'animate-organic' : 'animate-organic-reverse'}`} />
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
                                        {index % 2 === 0 ? <Play className="w-3 h-3" fill="currentColor" /> : <Square className="w-3 h-3" fill="currentColor" />}
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
                })}
            </div>
        </div>
    );
};
