import { motion } from 'framer-motion';
import { useMemo } from 'preact/hooks';
import { getStatusColor, cn } from '../../utils';

export function GraphView({ subtasks }) {
    // Basic force-directed layout simulation (simplified for static DAG)
    const nodes = useMemo(() => {
        const levels = {};
        const visited = new Set();
        
        const getLevel = (id) => {
            if (levels[id] !== undefined) return levels[id];
            const task = subtasks.find(t => t.id === id);
            if (!task || task.depends_on.length === 0) return 0;
            return Math.max(...task.depends_on.map(getLevel)) + 1;
        };

        const result = subtasks.map((task, i) => {
            const level = getLevel(task.id);
            const levelTasks = subtasks.filter(t => getLevel(t.id) === level);
            const levelIdx = levelTasks.findIndex(t => t.id === task.id);
            
            return {
                ...task,
                x: 100 + (level * 250),
                y: 100 + (levelIdx * 120),
            };
        });

        return result;
    }, [subtasks]);

    const edges = useMemo(() => {
        const result = [];
        nodes.forEach(task => {
            task.depends_on.forEach(depId => {
                const dep = nodes.find(n => n.id === depId);
                if (dep) {
                    result.push({ from: dep, to: task });
                }
            });
        });
        return result;
    }, [nodes]);

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full h-[calc(100vh-250px)] bg-slate-950/40 rounded-[3rem] border border-slate-800/60 overflow-hidden cursor-grab active:cursor-grabbing"
        >
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="20" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#334155" />
                    </marker>
                </defs>
                {edges.map((edge, i) => (
                    <motion.path
                        key={`${edge.from.id}-${edge.to.id}`}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        d={`M ${edge.from.x + 180} ${edge.from.y + 35} C ${edge.from.x + 220} ${edge.from.y + 35}, ${edge.to.x - 40} ${edge.to.y + 35}, ${edge.to.x} ${edge.to.y + 35}`}
                        fill="none"
                        stroke={edge.to.status === 'RUNNING' ? '#38bdf8' : '#334155'}
                        strokeWidth="1.5"
                        markerEnd="url(#arrowhead)"
                        className={edge.to.status === 'RUNNING' ? 'animate-pulse' : ''}
                    />
                ))}
            </svg>

            {nodes.map((node) => (
                <motion.div
                    key={node.id}
                    layoutId={node.id}
                    className={cn(
                        "absolute w-48 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl z-10 transition-colors duration-500",
                        node.status === 'RUNNING' && "border-sky-500/50 shadow-sky-500/10",
                        node.status === 'COMPLETED' && "border-emerald-500/30"
                    )}
                    style={{ left: node.x, top: node.y }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[8px] font-mono font-bold text-slate-500">#{node.id}</span>
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            getStatusColor(node.status).split(' ')[0].replace('bg-', 'bg-')
                        )} />
                    </div>
                    <h4 className="text-[10px] font-bold text-white truncate mb-1">{node.title}</h4>
                    <span className={cn(
                        "text-[7px] font-bold uppercase tracking-widest",
                        getStatusColor(node.status).split(' ')[1]
                    )}>{node.status}</span>
                </motion.div>
            ))}
        </motion.div>
    );
}
