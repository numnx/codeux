import type { FunctionComponent } from "preact";
import { memo } from "preact/compat";
import { useRef } from "preact/hooks";
import { FolderGit2, Clock, Target, Settings, Trash2 } from "lucide-preact";
import { WaveFluid } from "../ui/WaveFluid.js";
import { BorderTrace } from "../ui/BorderTrace.js";
import type { Task } from "../../types.js";
import type { DependentTaskMetadata } from "../../lib/task-relations.js";
import { PRIORITY_CFG, STATUS_CFG, EXECUTOR_LABEL, timeAgo } from "../../lib/tasks-constants.js";
import { useTaskCardMotion } from "../../lib/motion/task-card-motion.js";
import { useReducedMotion } from "../../hooks/use-reduced-motion.js";
import './kanban-task-card.css';

export const KanbanTaskCard: FunctionComponent<{
  task: Task;
  dependents: DependentTaskMetadata[];
  index?: number;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}> = memo(({ task, dependents, index = 0, onEdit, onDelete }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const pri = PRIORITY_CFG[task.priority];
  const isReducedMotion = useReducedMotion();

  useTaskCardMotion(cardRef, task.status, isReducedMotion, index);

  return (
    <div
      ref={cardRef}
      tabIndex={0}
      className={`kanban-card group relative flex flex-col bg-[var(--v2-bg-layer-2)] rounded-[1.75rem] p-7 shadow-[0_2px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] overflow-hidden cursor-default ${task.isOptimistic ? "border-dashed border-2 border-slate-300 dark:border-slate-600 opacity-60 pointer-events-none" : "border border-black/[0.06] dark:border-white/[0.06]"} ${isReducedMotion ? 'kanban-card-reduced-motion' : ''}`}
    >
      <div className="absolute inset-0 pointer-events-none transition-colors duration-300 group-hover:bg-signal-500/[0.03] dark:group-hover:bg-signal-500/[0.05]" />
      <WaveFluid accentHex={STATUS_CFG[task.status].hex} />
      <BorderTrace accentHex={STATUS_CFG[task.status].hex} />

      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="font-mono text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.1em]">
          {task.id.toUpperCase()}
        </span>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-[0.14em] ${pri.bg} ${pri.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pri.dot}`} />
          {pri.label}
        </div>
      </div>

      <h4 className={`text-[15px] font-bold tracking-tight leading-snug mb-4 relative z-10 group-hover:translate-x-0.5 transition-transform duration-300 ${
        task.status === "completed" ? "text-slate-400 dark:text-slate-500 line-through decoration-slate-300 dark:decoration-slate-700" : "text-slate-900 dark:text-white"
      }`}>
        {task.title}
      </h4>

      <div className="relative z-10 mb-4 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
        <span className="rounded-full border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.03] px-2.5 py-1">
          {EXECUTOR_LABEL[task.executorType]}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-auto relative z-10">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          <FolderGit2 className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-signal-500 transition-colors" strokeWidth={2} />
          <span className="font-mono truncate max-w-[100px]">{task.source}</span>
        </div>

        <span className="text-slate-200 dark:text-slate-700 text-[9px]">·</span>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-black/[0.03] dark:bg-white/[0.03]">
            <span className="text-[9px] font-black font-display text-slate-500 dark:text-slate-400">
              {task.assignee[0]}
            </span>
          </div>
          <span className="font-medium">{task.assignee}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.04] relative z-10">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-300 dark:text-slate-600">
          <Clock className="w-3 h-3" strokeWidth={2} />
          <span className="font-mono">{task.time}</span>
        </div>
        <span className="text-[9px] font-mono text-slate-300 dark:text-slate-700">{timeAgo(task.createdAt)}</span>
      </div>

      {task.dependsOnTaskIds.length > 0 && (
        <div className="relative z-10 mt-3 text-[10px] uppercase tracking-[0.14em] text-slate-400">
          Depends on {task.dependsOnTaskIds.length} task{task.dependsOnTaskIds.length > 1 ? "s" : ""}
        </div>
      )}

      {dependents.length > 0 && (
        <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
          {dependents.map((dep) => (
            <div
              key={dep.recordId}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-[0.14em] ${
                dep.status === "completed"
                  ? "bg-status-green/[0.08] border-status-green/20 text-status-green"
                  : dep.status === "coding_completed" || dep.status === "in_progress"
                  ? "bg-signal-500/[0.08] border-signal-500/20 text-signal-500"
                  : "bg-slate-400/[0.08] border-slate-400/20 text-slate-500"
              }`}
            >
              <Target className="w-2.5 h-2.5" strokeWidth={2.5} />
              <span>{dep.id}</span>
            </div>
          ))}
        </div>
      )}

      <div className="absolute top-3 right-3 flex items-center gap-1 p-1 bg-white/90 dark:bg-void-700/95 backdrop-blur-md rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)] border border-black/[0.05] dark:border-white/[0.08] translate-y-[-8px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 focus-within:opacity-100 focus-within:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] z-20">
        <button
          type="button"
          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-signal-600 dark:hover:text-signal-400 rounded-full transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/30"
          title="Edit task"
          onClick={() => onEdit(task)}
        >
          <Settings className="w-3 h-3" />
        </button>
        <button
          type="button"
          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-status-red rounded-full transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-red/30"
          title="Delete task"
          onClick={() => onDelete(task)}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.task.recordId === next.task.recordId &&
         prev.task.status === next.task.status &&
         prev.task.priority === next.task.priority &&
         prev.task.title === next.task.title &&
         prev.dependents === next.dependents &&
         prev.onEdit === next.onEdit &&
         prev.onDelete === next.onDelete;
});
