import type { FunctionComponent } from "preact";
import { useEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { FolderGit2, ArrowUpRight } from "lucide-preact";
import { mockSources } from "../lib/mockData.js";

export const SourcesGrid: FunctionComponent = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (containerRef.current) {
            gsap.fromTo(
                containerRef.current.children,
                { y: 30, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    stagger: 0.1,
                    ease: "power3.out",
                    delay: 0.3
                }
            );
        }
    }, []);

    // Get the most recent 6 sources
    const recentSources = [...mockSources].sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ).slice(0, 6);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                    Active Sources
                </h2>
                <button className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1.5 group">
                    View Library
                    <ArrowUpRight className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform duration-300" strokeWidth={2} />
                </button>
            </div>

            <div
                ref={containerRef}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {recentSources.map((source, index) => (
                    <div
                        key={source.id}
                        ref={el => { if (el) cardsRef.current[index] = el; }}
                        className="relative bg-white/60 dark:bg-black/40 backdrop-blur-3xl rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] group overflow-hidden flex flex-col justify-between"
                    >
                        {/* High-Performance Glowing border effect (pseudo-element) */}
                        <div className="absolute inset-0 rounded-[2rem] border border-slate-200/60 dark:border-white/10 pointer-events-none transition-colors duration-500 z-10" />

                        {/* Magnetic Ambient Hover Background */}
                        <div className="absolute inset-[-1px] rounded-[calc(2rem+1px)] bg-gradient-to-br from-indigo-500/0 via-purple-500/0 to-fuchsia-500/0 group-hover:from-indigo-500/20 group-hover:via-purple-500/20 group-hover:to-fuchsia-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none -z-10 blur-xl" />

                        {/* Background Mask */}
                        <div className="absolute inset-0 bg-white/90 dark:bg-[#070707]/90 rounded-[2rem] z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        {/* Inner stroke for depth */}
                        <div className="absolute inset-0 rounded-[2rem] pointer-events-none transition-all duration-300 shadow-none group-hover:shadow-[inset_0_0_0_1px_rgba(99,102,241,0.1)] dark:group-hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] z-10" />

                        <div className="relative z-20 flex flex-col h-full">
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-100 dark:group-hover:border-indigo-500/20 group-hover:scale-[1.05] group-hover:rotate-3 transition-all duration-500 ease-out shadow-sm">
                                        <FolderGit2 className="w-6 h-6" strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight truncate max-w-[150px] group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors duration-300" title={source.name}>
                                            {source.name}
                                        </h3>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                                            {source.sprintsCount} {source.sprintsCount === 1 ? 'Sprint' : 'Sprints'} Active
                                        </p>
                                    </div>
                                </div>

                                {/* Active Indicator integrated smoothly */}
                                {source.isRunning && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-white/5 relative">
                                <div className="flex gap-8">
                                    <div className="group/stat cursor-default">
                                        <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider group-hover/stat:text-indigo-500 transition-colors">Open</div>
                                        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white group-hover/stat:text-indigo-600 dark:group-hover/stat:text-indigo-400 transition-colors">{source.openTasks}</div>
                                    </div>
                                    <div className="group/stat cursor-default">
                                        <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider group-hover/stat:text-emerald-500 transition-colors">Done</div>
                                        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white group-hover/stat:text-emerald-600 dark:group-hover/stat:text-emerald-400 transition-colors">{source.completedTasks}</div>
                                    </div>
                                </div>

                                <button className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-indigo-600 group-hover:border-transparent group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-[0_4px_14px_rgba(99,102,241,0.39)]">
                                    <ArrowUpRight className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" strokeWidth={2} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
