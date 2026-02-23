import { motion } from 'framer-motion';
import { TaskCard } from '../TaskCard';
import { cn } from '../../utils';

export function KanbanView({ subtasks }) {
    const columns = [
        { id: 'PENDING', label: 'Pending', statuses: ['PENDING', 'BLOCKED'] },
        { id: 'RUNNING', label: 'In Progress', statuses: ['RUNNING'] },
        { id: 'COMPLETED', label: 'Done', statuses: ['COMPLETED'] },
        { id: 'FAILED', label: 'Failed', statuses: ['FAILED'] },
    ];

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex gap-6 h-[calc(100vh-200px)] overflow-x-auto pb-6 px-2"
        >
            {columns.map(col => {
                const colTasks = subtasks.filter(t => col.statuses.includes(t.status));
                return (
                    <div key={col.id} className="flex-shrink-0 w-80 flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                {col.label}
                                <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">{colTasks.length}</span>
                            </h3>
                            <div className={cn(
                                "w-1 h-1 rounded-full",
                                col.id === 'RUNNING' ? "bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]" : "bg-slate-700"
                            )} />
                        </div>
                        <div className="flex-grow bg-slate-900/20 rounded-3xl border border-slate-800/40 p-3 overflow-y-auto space-y-4 scrollbar-hide">
                            {colTasks.map(task => (
                                <TaskCard key={task.id} task={task} compact />
                            ))}
                        </div>
                    </div>
                );
            })}
        </motion.div>
    );
}
