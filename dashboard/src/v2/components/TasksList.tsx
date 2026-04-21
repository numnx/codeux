import type { FunctionComponent } from "preact";
import { useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { Search } from "lucide-preact";

gsap.registerPlugin(Flip);
import { TaskRow } from "./ui/TaskRow.js";
import { FilterStrip } from "./ui/FilterStrip.js";
import { SkeletonRow } from "./ui/ListSkeletons.js";
import { Button } from "./ui/Button.js";
import { deriveActiveSprintIds, filterTasksToActiveSprints } from "../lib/overview-streams.js";
import { useReducedMotion } from "../hooks/use-reduced-motion.js";
type TaskFilter = "All Tasks" | "Running" | "Queued" | "Completed";

const FILTER_OPTIONS = ["All Tasks", "Running", "Queued", "Completed"] as const;

export const TasksList: FunctionComponent<{ pageData: ReturnType<typeof import("../hooks/use-overview-page-data.js").useOverviewPageData> }> = ({ pageData }) => {
    const listRef = useRef<HTMLDivElement>(null);
    const emptyStateIconRef = useRef<SVGSVGElement>(null);
    const [activeFilter, setActiveFilter] = useState<TaskFilter>("All Tasks");
    const flipStateRef = useRef<any>(null);

    const handleFilterChange = (newFilter: TaskFilter) => {
        if (listRef.current) {
            flipStateRef.current = Flip.getState(listRef.current.children);
        }
        setActiveFilter(newFilter);
    };

    const handleClearFilter = () => {
        if (listRef.current) {
            flipStateRef.current = Flip.getState(listRef.current.children);
        }
        setActiveFilter("All Tasks");
    };
    const reducedMotion = useReducedMotion();
    const { sprints, tasks, isLoading } = pageData;

    const activeSprintIds = useMemo(() => deriveActiveSprintIds(sprints), [sprints]);
    const activeTasks = useMemo(() => filterTasksToActiveSprints(tasks, activeSprintIds), [tasks, activeSprintIds]);

    const filteredTasks = useMemo(() => activeTasks.filter(task => {
        if (activeFilter === "All Tasks") return true;
        if (activeFilter === "Running") return task.status === "in_progress";
        if (activeFilter === "Queued") return task.status === "pending";
        if (activeFilter === "Completed") return task.status === "completed";
        return true;
    }), [activeTasks, activeFilter]);

    const initialMountRef = useRef(true);

    useLayoutEffect(() => {
        if (listRef.current && filteredTasks.length > 0) {
            if (reducedMotion) {
                gsap.set(listRef.current.children, { y: 0, opacity: 1, scale: 1 });
            } else if (flipStateRef.current) {
                Flip.from(flipStateRef.current, {
                    targets: listRef.current.children,
                    duration: 0.3,
                    ease: "power2.out",
                    stagger: 0.02,
                    scale: true,
                    absolute: true,
                    onEnter: (elements: Element[]) => gsap.fromTo(elements, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.02 }),
                    onLeave: (elements: Element[]) => gsap.to(elements, { opacity: 0, duration: 0.2 })
                });
                flipStateRef.current = null;
            } else if (initialMountRef.current) {
                initialMountRef.current = false;
                gsap.fromTo(
                    listRef.current.children,
                    { y: 15, opacity: 0, scale: 0.99 },
                    { y: 0, opacity: 1, scale: 1, duration: 0.25, stagger: 0.04, ease: "power2.out", delay: 0.05 }
                );
            }
        }
    }, [activeFilter, reducedMotion, filteredTasks]);

    useLayoutEffect(() => {
        if (emptyStateIconRef.current && !isLoading && filteredTasks.length === 0) {
            gsap.fromTo(emptyStateIconRef.current,
                { rotate: -10, scale: 0.9, opacity: 0 },
                { rotate: 0, scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)" }
            );

            gsap.to(emptyStateIconRef.current, {
                rotate: 5,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                delay: 0.6
            });
        }
    }, [isLoading, filteredTasks.length]);

    return (
        <div className="w-full relative z-10 px-2">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-12 gap-6 sm:gap-8">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-display">Active Streams</h2>
                    <div className="w-full sm:w-auto">
                        <FilterStrip
                            options={FILTER_OPTIONS}
                            active={activeFilter}
                            onChange={handleFilterChange}
                            showClear={activeFilter !== "All Tasks"}
                            onClear={handleClearFilter}
                        />
                    </div>
                </div>
                <div className="text-xs font-semibold text-slate-400 dark:text-slate-600 font-mono hidden sm:block">
                    {filteredTasks.length} active
                </div>
            </div>

            {/* Task rows */}
            <div ref={listRef} className="flex flex-col w-full space-y-3 min-h-[400px]">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <SkeletonRow key={i} index={i} />
                    ))
                ) : filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => (
                        <div key={task.id} data-flip-id={task.id} className="task-flip-item"><TaskRow task={task} /></div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center rounded-[2rem] border border-dashed border-slate-200 dark:border-white/[0.08] bg-black/[0.01] dark:bg-white/[0.01]">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 blur-2xl bg-signal-500/10 dark:bg-signal-500/5 rounded-full" />
                            <Search ref={emptyStateIconRef} className="w-12 h-12 text-slate-300 dark:text-slate-600 relative z-10" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">No matches found</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-[280px] mx-auto leading-relaxed">
                            We couldn't find any tasks matching "{activeFilter.toLowerCase()}" in your active sprints.
                        </p>
                        {activeFilter !== "All Tasks" && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleClearFilter}
                                className="mt-6"
                            >
                                Reset Filters
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

