import type { FunctionComponent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import gsap from "gsap";
import { Search, Filter, MoreHorizontal, Clock, CheckCircle2, Circle, ArrowRight, PlayCircle, FolderGit2 } from "lucide-preact";
import { mockTasks } from "../lib/mockData.js";

type TaskFilter = "All Tasks" | "Running" | "Queued";

export const TasksList: FunctionComponent = () => {
    const listRef = useRef<HTMLDivElement>(null);
    const [activeFilter, setActiveFilter] = useState<TaskFilter>("All Tasks");

    useEffect(() => {
        if (listRef.current) {
            gsap.fromTo(
                listRef.current.children,
                { y: 20, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    stagger: 0.05,
                    ease: "power2.out",
                    delay: 0.5
                }
            );
        }
    }, [activeFilter]); // Re-animate on filter change

    const filteredTasks = mockTasks.filter(task => {
        if (activeFilter === "All Tasks") return true;
        if (activeFilter === "Running") return task.status === "in_progress";
        if (activeFilter === "Queued") return task.status === "pending";
        return true;
    });

    return (
        <div className="w-full flex flex-col h-full font-outfit">
            {/* Header / Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div className="flex gap-2 p-1.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 rounded-2xl w-fit">
                    {(["All Tasks", "Running", "Queued"] as TaskFilter[]).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`relative px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${activeFilter === filter
                                ? 'text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/[0.02]'
                                }`}
                        >
                            {activeFilter === filter && (
                                <div className="absolute inset-0 bg-white dark:bg-white/[0.06] rounded-xl border border-slate-200/50 dark:border-white/5 -z-10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.12)]" />
                            )}
                            {filter}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 group">
                        <Filter className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" strokeWidth={2} />
                        Filter
                    </button>
                    <div className="relative group max-w-[240px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" strokeWidth={2} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-300"
                        />
                    </div>
                </div>
            </div>

            {/* Premium Editorial Table Area */}
            <div className="flex-1 overflow-hidden relative">
                {/* Headers */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-200/60 dark:border-white/10 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest sticky top-0 bg-white/80 dark:bg-transparent backdrop-blur-xl z-10 transition-colors">
                    <div className="col-span-1">ID</div>
                    <div className="col-span-4">Task Ref</div>
                    <div className="col-span-2">Source</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Time</div>
                    <div className="col-span-1 text-right">Action</div>
                </div>

                <div ref={listRef} className="overflow-y-auto max-h-[500px] dashboard-scrollbar pt-2 pb-4 pr-2">
                    {filteredTasks.map((task) => (
                        <div
                            key={task.id}
                            className="group grid grid-cols-12 gap-4 px-6 py-5 items-center bg-white/40 dark:bg-transparent hover:bg-indigo-50/40 dark:hover:bg-white/[0.02] border border-transparent hover:border-indigo-100 dark:hover:border-white/[0.05] rounded-2xl transition-all duration-300 mb-2 hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] cursor-pointer"
                        >
                            {/* ID */}
                            <div className="col-span-1 font-mono text-xs font-semibold text-slate-400 dark:text-slate-500">
                                {task.id.split('-')[0].substring(0, 6)}
                            </div>

                            {/* Task Title */}
                            <div className="col-span-4 flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : task.status === 'in_progress' ? 'bg-indigo-500 shadow-[0_0_8px_#6366f1] animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                <span className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                                    {task.title}
                                </span>
                            </div>

                            {/* Source */}
                            <div className="col-span-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                                <FolderGit2 className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                                <span className="truncate">{task.source}</span>
                            </div>

                            {/* Status Badge */}
                            <div className="col-span-2">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                                    task.status === 'in_progress' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.15)]' :
                                        'bg-slate-50 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10'
                                    } transition-colors duration-300`}>
                                    {task.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />}
                                    {task.status === 'in_progress' && <PlayCircle className="w-3.5 h-3.5" strokeWidth={2.5} />}
                                    {task.status === 'pending' && <Circle className="w-3.5 h-3.5" strokeWidth={2.5} />}
                                    {task.status.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Time / Metrics */}
                            <div className="col-span-2 flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                                <Clock className="w-3.5 h-3.5 opacity-70" strokeWidth={2} />
                                <span className="font-mono">{task.time}</span>
                            </div>

                            {/* Action Request */}
                            <div className="col-span-1 flex justify-end">
                                <button className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-[#0c0c0c] dark:hover:text-indigo-400 transition-all duration-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-white/10">
                                    <ArrowRight className="w-4 h-4" strokeWidth={2} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Fade Gradient for Scroll Area */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white/80 dark:from-[#050505]/80 to-transparent pointer-events-none" />
            </div>
        </div>
    );
};
