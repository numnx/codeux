import { useState } from 'preact/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MessageSquare, ExternalLink, Merge } from 'lucide-preact';
import { getStatusColor, formatTime, cn } from '../utils';
import { marked } from 'marked';

export function TaskCard({ task, compact = false }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showLogs, setShowLogs] = useState(false);

    const renderMarkdown = (text) => {
        if (!text) return '';
        return marked.parse(text);
    };

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "group relative bg-slate-900/40 backdrop-blur-sm border border-slate-800/60 rounded-2xl overflow-hidden transition-all duration-500",
                task.status === 'RUNNING' && "border-sky-500/30 shadow-[0_0_20px_rgba(56,189,248,0.05)]",
                compact ? "p-4" : "p-5"
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-slate-800 rounded text-slate-500">#{task.id}</span>
                        <h3 
                            className="font-semibold text-white group-hover:text-blue-400 transition-colors cursor-pointer truncate"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {task.title}
                        </h3>
                    </div>
                    
                    {!compact && (
                        <div 
                            className={cn(
                                "transition-all duration-500 overflow-hidden",
                                isExpanded ? "max-h-[1000px] opacity-100 mt-4" : "max-h-6 opacity-40 mt-2"
                            )}
                            onClick={() => !isExpanded && setIsExpanded(true)}
                        >
                            <div 
                                className={cn(
                                    "prose prose-sm prose-invert max-w-none prose-headings:text-slate-200 prose-a:text-blue-400 prose-code:text-sky-300 prose-code:bg-slate-800/40 prose-code:px-1 prose-code:rounded",
                                    !isExpanded && "line-clamp-1 pointer-events-none"
                                )}
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(task.prompt) }}
                            />
                        </div>
                    )}

                    <AnimatePresence>
                        {showLogs && task.session_id && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mt-4"
                            >
                                <div className="space-y-3 p-4 bg-slate-950/40 rounded-xl border border-slate-800/40">
                                    <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                                        Live Feed
                                    </h4>
                                    {(!task.activities || task.activities.length === 0) ? (
                                        <p className="text-[10px] text-slate-600 italic">Syncing session...</p>
                                    ) : (
                                        task.activities.map((activity, idx) => (
                                            <div key={idx} className="flex gap-3 text-[10px] border-l border-slate-800 pl-3 py-1">
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className={cn("font-bold uppercase", activity.originator === 'agent' ? 'text-sky-400' : 'text-slate-500')}>
                                                            {activity.originator}
                                                        </span>
                                                        <span className="text-[8px] text-slate-600 font-mono">{formatTime(activity.createTime)}</span>
                                                    </div>
                                                    <div className="text-slate-400 font-mono line-clamp-2 leading-relaxed">
                                                        {activity.agentAction?.thought || activity.agentAction?.toolCall?.name || activity.userInput?.prompt || 'System activity...'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-slate-800/40">
                        <div className="flex gap-1.5">
                            {task.depends_on.map(dep => (
                                <span key={dep} className="text-[8px] px-1.5 py-0.5 bg-slate-800/40 rounded border border-slate-700/40 text-slate-500 font-mono">{dep}</span>
                            ))}
                        </div>
                        {task.is_merged && (
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
                                <Merge size={10} />
                                Merged
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all duration-500 uppercase",
                        getStatusColor(task.status)
                    )}>
                        {task.status}
                    </span>
                    <div className="flex gap-1">
                        {task.session_id && (
                            <button 
                                onClick={() => setShowLogs(!showLogs)}
                                className={cn(
                                    "p-1.5 rounded-lg border transition-all duration-300",
                                    showLogs ? "bg-sky-500/10 border-sky-500/30 text-sky-400" : "bg-slate-800/40 border-slate-700/40 text-slate-500 hover:text-white"
                                )}
                            >
                                <MessageSquare size={14} />
                            </button>
                        )}
                        {!compact && (
                            <button 
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={cn(
                                    "p-1.5 rounded-lg border border-slate-700/40 bg-slate-800/40 text-slate-500 hover:text-white transition-all duration-300",
                                    isExpanded && "rotate-180"
                                )}
                            >
                                <ChevronDown size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
