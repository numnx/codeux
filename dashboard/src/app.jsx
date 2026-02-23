import { useState, useEffect } from 'preact/hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from './components/Header';
import { ListView } from './components/views/ListView';
import { KanbanView } from './components/views/KanbanView';
import { GraphView } from './components/views/GraphView';

export function App() {
    const [status, setStatus] = useState({ subtasks: [], timestamp: null });
    const [activeView, setActiveView] = useState('list');
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            setStatus(data);
            setError(null);
        } catch (err) {
            setError('Unable to connect to Orchestrator API');
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 4000);
        return () => clearInterval(interval);
    }, []);

    if (error) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950">
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-3xl text-center max-w-md">
                <div className="text-red-400 text-5xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold mb-2 text-white">Connection Lost</h2>
                <p className="text-slate-400 text-sm">{error}</p>
            </div>
        </div>
    );

    return (
        <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-200">
            {/* Background Ambient Glows */}
            <div className="fixed top-0 -left-4 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[128px] pointer-events-none" />
            <div className="fixed bottom-0 -right-4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[128px] pointer-events-none" />

            <Header 
                sprint_number={status.sprint_number}
                feature_branch={status.feature_branch}
                timestamp={status.timestamp}
                activeView={activeView}
                onViewChange={setActiveView}
            />

            <main className="flex-grow max-w-7xl mx-auto px-6 py-10 w-full overflow-hidden">
                <AnimatePresence mode="wait">
                    {activeView === 'list' && (
                        <ListView key="list" subtasks={status.subtasks} />
                    )}
                    {activeView === 'kanban' && (
                        <KanbanView key="kanban" subtasks={status.subtasks} />
                    )}
                    {activeView === 'graph' && (
                        <GraphView key="graph" subtasks={status.subtasks} />
                    )}
                </AnimatePresence>
            </main>

            <footer className="py-6 text-center border-t border-slate-900">
                <p className="text-[10px] text-slate-600 font-medium tracking-widest uppercase">
                    Jules Subagents Protocol v1.2.0 • Session Alpha
                </p>
            </footer>
        </div>
    );
}
