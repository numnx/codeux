import type { FunctionComponent } from "preact";
import { useLayoutEffect, useMemo, useRef, useState, useCallback } from "preact/hooks";
import gsap from "gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(Flip);
import { TaskRow } from "./ui/TaskRow.js";
import { FilterStrip } from "./ui/FilterStrip.js";
import { SkeletonRow } from "./ui/ListSkeletons.js";
import { deriveActiveSprintIds, filterTasksToActiveSprints } from "../lib/overview-streams.js";
import { useReducedMotion } from "../hooks/use-reduced-motion.js";
import { useTaskMutations, type TaskMutationDraft } from "../hooks/use-task-mutations.js";
import { ActionFeedbackRegion } from "./ui/ActionFeedbackRegion.js";
import { TaskComposer } from "./ui/TaskComposer.js";
import { RerunTaskModal } from "./ui/RerunTaskModal.js";
import { toSubtask } from "../lib/view-models.js";
import type { Task } from "../types.js";

type TaskFilter = "All Tasks" | "Running" | "Queued" | "Completed";

const FILTER_OPTIONS = ["All Tasks", "Running", "Queued", "Completed"] as const;

export const TasksList: FunctionComponent<{ pageData: ReturnType<typeof import("../hooks/use-overview-page-data.js").useOverviewPageData> }> = ({ pageData }) => {
    const listRef = useRef<HTMLDivElement>(null);
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
    const { sprints, tasks, isLoading, refetch } = pageData;

    const onMutationSuccess = useCallback(async () => {
        await refetch();
    }, [refetch]);

    const { create, update, remove, rerun, pendingActionIds } = useTaskMutations({
        projectId: pageData.projectId || null,
        onSuccess: onMutationSuccess,
    });

    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [rerunningTask, setRerunningTask] = useState<Task | null>(null);
    const composerRef = useRef<HTMLDivElement>(null);

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
        if (listRef.current) {
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

    const handleEditClick = useCallback((task: Task) => {
        setEditingTask(task);
        setTimeout(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }, []);

    const handleDeleteClick = useCallback(async (task: Task) => {
        await remove.execute(task.recordId);
        setEditingTask(prev => prev?.recordId === task.recordId ? null : prev);
    }, [remove]);

    const handleRerunClick = useCallback((task: Task) => {
        setRerunningTask(task);
    }, []);

    const handleTaskSubmit = useCallback(async (draft: TaskMutationDraft) => {
        if (!editingTask) return;
        await update.execute(editingTask.recordId, draft);
        setEditingTask(null);
    }, [editingTask, update]);

    const handleRerunConfirm = useCallback(async (options: Parameters<typeof rerun.execute>[1]) => {
        if (!rerunningTask) return;
        await rerun.execute(rerunningTask.recordId, options);
        setRerunningTask(null);
    }, [rerunningTask, rerun]);

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

            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] w-full max-w-xl px-6 pointer-events-none">
                <div className="pointer-events-auto flex flex-col gap-2">
                    <ActionFeedbackRegion
                        status={update.feedback.status}
                        message={update.feedback.message}
                        onDismiss={update.reset}
                    />
                    <ActionFeedbackRegion
                        status={remove.feedback.status}
                        message={remove.feedback.message}
                        onDismiss={remove.reset}
                    />
                    <ActionFeedbackRegion
                        status={rerun.feedback.status}
                        message={rerun.feedback.message}
                        onDismiss={rerun.reset}
                    />
                </div>
            </div>

            {rerunningTask && (
                <RerunTaskModal
                    task={toSubtask(rerunningTask)}
                    allTasks={tasks.map(toSubtask)}
                    onClose={() => setRerunningTask(null)}
                    onConfirm={handleRerunConfirm}
                />
            )}

            {editingTask && (
                <div ref={composerRef} className="mb-8 scroll-mt-8">
                    <TaskComposer
                        key={editingTask.recordId}
                        sprints={sprints}
                        availableTasks={tasks}
                        initialTask={editingTask}
                        onClose={() => setEditingTask(null)}
                        onSubmit={handleTaskSubmit}
                    />
                </div>
            )}

            {/* Task rows */}
            <div ref={listRef} className="flex flex-col w-full space-y-3">
                {isLoading ? (
                    <>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                    </>
                ) : filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => (
                        <div key={task.id} data-flip-id={task.id} className="task-flip-item">
                            <TaskRow 
                                task={task} 
                                isPending={pendingActionIds.has(task.recordId)}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                onRerun={handleRerunClick}
                            />
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                        <svg className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">No Results Found</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">There are no tasks currently matching the selected filter in active sprints.</div>
                    </div>
                )}
            </div>
        </div>
    );
};
