import type { FunctionComponent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import gsap from "gsap";
import { FolderGit2, CheckCircle2, Circle, PlayCircle, Clock, Play, Square, Settings, Maximize2 } from "lucide-preact";
import { mockTasks } from "../lib/mockData.js";

type TaskFilter = "All Tasks" | "Running" | "Queued";

export const TasksList: FunctionComponent = () => {
    const listRef = useRef<HTMLDivElement>(null);
    const [activeFilter, setActiveFilter] = useState<TaskFilter>("All Tasks");

    useEffect(() => {
        if (listRef.current) {
            gsap.fromTo(
                listRef.current.children,
                { y: 40, opacity: 0, scale: 0.98 },
                {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 0.8,
                    stagger: 0.05,
                    ease: "power3.out",
                    delay: 0.2
                }
            );
        }
    }, [activeFilter]);

    const filteredTasks = mockTasks.filter(task => {
        if (activeFilter === "All Tasks") return true;
        if (activeFilter === "Running") return task.status === "in_progress";
        if (activeFilter === "Queued") return task.status === "pending";
        return true;
    });

    return (
        <div className="w-full relative z-10 px-4">
            {/* Minimal Cinematic Header */}
            <div className="flex items-center justify-between mb-16">
                <div className="flex items-center gap-12">
                    <h2 className="text-4xl font-bold tracking-tighter text-slate-900 dark:text-white">Active Streams</h2>

                    <div className="flex gap-4">
                        {(["All Tasks", "Running", "Queued"] as TaskFilter[]).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`text-lg font-medium transition-all duration-300 relative px-2 py-1 ${activeFilter === filter
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                            >
                                {filter}
                                {activeFilter === filter && (
                                    <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="text-sm font-semibold text-slate-400 dark:text-slate-500 font-mono">
                    {filteredTasks.length} Streams Active
                </div>
            </div>

            {/* Cinematic Borderless Liquid Rows */}
            <div ref={listRef} className="flex flex-col w-full relative">
                {filteredTasks.map((task) => (
                    <div
                        key={task.id}
                        className="group relative flex items-center justify-between py-6 cursor-pointer border-b border-white/5 dark:border-white/[0.02] last:border-0"
                    >
                        {/* The Liquid Hover Backdrop */}
                        <div className="absolute inset-y-0 -inset-x-6 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 dark:from-indigo-500/0 dark:via-indigo-500/10 dark:to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 rounded-2xl blur-md" />
                        <div className="absolute inset-y-1 -inset-x-4 bg-white/40 dark:bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-all duration-300 -z-10 rounded-[1.5rem] transform scale-y-50 group-hover:scale-y-100" />

                        {/* Content Grid */}
                        <div className="flex-1 grid grid-cols-12 gap-6 items-center">
                            {/* ID */}
                            <div className="col-span-2 md:col-span-1 font-mono text-xs font-bold text-slate-400 dark:text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity">
                                #{task.id.split('-')[0].substring(0, 4)}
                            </div>

                            {/* Task Title - Massive Typography */}
                            <div className="col-span-5 flex items-center gap-4">
                                <span className={`text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate group-hover:translate-x-2 transition-transform duration-300 ease-out ${task.status === 'completed' ? 'opacity-50' : ''
                                    }`}>
                                    {task.title}
                                </span>
                            </div>

                            {/* Source */}
                            <div className="col-span-2 flex items-center gap-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                                <FolderGit2 className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" strokeWidth={2} />
                                <span className="truncate group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">{task.source}</span>
                            </div>

                            {/* Status Indicator (Cinematic) */}
                            <div className="col-span-2 flex items-center gap-2">
                                {task.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-500" strokeWidth={2} />}
                                {task.status === 'in_progress' && (
                                    <div className="relative flex items-center justify-center w-5 h-5">
                                        <div className="absolute inset-0 rounded-full bg-aura-500 animate-[spin_3s_linear_infinite] opacity-30 shadow-[0_0_15px_#FF3366] pointer-events-none" style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%', clipPath: 'inset(-2px)' }} />
                                        <PlayCircle className="w-5 h-5 text-aura-500 relative z-10 drop-shadow-[0_0_5px_rgba(255,51,102,0.8)]" strokeWidth={2} />
                                    </div>
                                )}
                                {task.status === 'pending' && <Circle className="w-5 h-5 text-slate-400" strokeWidth={2} />}

                                <span className={`text-sm font-bold uppercase tracking-widest ${task.status === 'completed' ? 'text-emerald-500' :
                                    task.status === 'in_progress' ? 'text-aura-500' :
                                        'text-slate-400'
                                    }`}>
                                    {task.status.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Quick Actions (Hover Reveal) & Time */}
                            <div className="col-span-2 md:col-span-2 flex items-center justify-end gap-2 text-sm font-mono text-slate-400 dark:text-slate-500 h-full relative overflow-hidden">
                                {/* Time display (fades out on hover) */}
                                <div className="flex items-center gap-3 absolute right-0 transition-all duration-300 opacity-100 group-hover:opacity-0 group-hover:translate-x-4">
                                    <Clock className="w-4 h-4 opacity-50" strokeWidth={2} />
                                    {task.time}
                                </div>

                                {/* AAA Quick Actions Bar (slides from right on hover) */}
                                <div className="flex items-center gap-1.5 p-1 bg-white/80 dark:bg-obsidian-900/90 backdrop-blur-md rounded-full shadow-[0_0_15px_rgba(0,0,0,0.05)] dark:shadow-[0_0_15px_rgba(0,0,0,0.4)] border border-slate-200/50 dark:border-white/10 absolute right-0 translate-x-[110%] opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-400 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] pr-2">
                                    <button className="p-2 text-slate-600 dark:text-slate-300 hover:text-aura-600 dark:hover:text-aura-500 rounded-full transition-colors" title="Play/Stop Stream">
                                        {task.status === 'in_progress' ? <Square className="w-3.5 h-3.5" fill="currentColor" /> : <Play className="w-3.5 h-3.5" fill="currentColor" />}
                                    </button>
                                    <button className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full transition-colors" title="Configure Stream">
                                        <Settings className="w-3.5 h-3.5" />
                                    </button>
                                    <button className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-full transition-colors" title="Expand View">
                                        <Maximize2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
