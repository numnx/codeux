import { motion } from 'framer-motion';
import { TaskCard } from '../TaskCard';

export function ListView({ subtasks }) {
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4 max-w-4xl mx-auto"
        >
            {subtasks.length === 0 ? (
                <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/60 border-dashed p-12 rounded-3xl text-center">
                    <p className="text-slate-500 font-medium tracking-wide">Awaiting sprint decomposition...</p>
                </div>
            ) : (
                subtasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                ))
            )}
        </motion.div>
    );
}
