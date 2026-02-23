import { LayoutList, Kanban, Network, RefreshCw } from 'lucide-preact';
import { cn } from '../utils';

export function Header({ sprint_number, feature_branch, timestamp, activeView, onViewChange }) {
    const views = [
        { id: 'list', label: 'List', icon: LayoutList },
        { id: 'kanban', label: 'Kanban', icon: Kanban },
        { id: 'graph', label: 'Relations', icon: Network },
    ];

    return (
        <header className="sticky top-0 z-50 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 py-4">
            <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 text-xl">J</div>
                    <div>
                        <h1 className="font-bold text-white tracking-tight">Sprint {sprint_number || '?'}</h1>
                        <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{feature_branch || 'initializing...'}</p>
                    </div>
                </div>

                <div className="flex items-center bg-slate-950/50 p-1 rounded-xl border border-slate-800">
                    {views.map(view => (
                        <button
                            key={view.id}
                            onClick={() => onViewChange(view.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                                activeView === view.id 
                                    ? "bg-slate-800 text-white shadow-inner shadow-slate-900" 
                                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"
                            )}
                        >
                            <view.icon size={16} />
                            <span>{view.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex gap-4">
                        <div className="text-right border-l border-slate-800 pl-4">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Sync</p>
                            <div className="flex items-center gap-2 justify-end">
                                <span className="text-xs font-medium text-slate-300">{timestamp ? 'Live' : 'Polling'}</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
