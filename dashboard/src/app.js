import { h } from 'https://esm.sh/preact';
import { useState, useEffect, useMemo } from 'https://esm.sh/preact/hooks';
import { html } from './utils.js';
import { Header } from './components/Header.js';
import { StatsGrid } from './components/StatsGrid.js';
import { TaskCard } from './components/TaskCard.js';
import { ActivitySidebar } from './components/ActivitySidebar.js';

export function App() {
    const [status, setStatus] = useState({ subtasks: [], timestamp: null });
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

    const stats = useMemo(() => {
        const tasks = status.subtasks || [];
        return {
            total: tasks.length,
            running: tasks.filter(t => t.status === 'RUNNING').length,
            completed: tasks.filter(t => t.status === 'COMPLETED').length,
            failed: tasks.filter(t => t.status === 'FAILED').length,
        };
    }, [status.subtasks]);

    if (error) return html`
        <div class="flex items-center justify-center min-h-screen">
            <div class="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-2xl text-center max-w-md">
                <div class="text-red-400 text-5xl mb-4">⚠️</div>
                <h2 class="text-xl font-bold mb-2 text-white">Connection Lost</h2>
                <p class="text-slate-400">${error}</p>
            </div>
        </div>
    `;

    return html`
        <div class="relative min-h-screen flex flex-col">
            <!-- Background Ambient Glow -->
            <div class="fixed top-0 -left-4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px] pointer-events-none"></div>
            <div class="fixed bottom-0 -right-4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px] pointer-events-none"></div>

            <${Header} 
                sprint_number=${status.sprint_number} 
                feature_branch=${status.feature_branch} 
                timestamp=${status.timestamp} 
            />

            <main class="flex-grow max-w-7xl mx-auto px-6 py-8 w-full">
                <${StatsGrid} stats=${stats} />

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <!-- Pipeline -->
                    <div class="lg:col-span-8">
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-xl font-bold text-white flex items-center gap-2">
                                Task Pipeline
                                <span class="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400 font-mono">${stats.total}</span>
                            </h2>
                        </div>

                        <div class="space-y-4">
                            ${stats.total === 0 ? html`
                                <div class="bg-slate-900/50 backdrop-blur-md border border-slate-800 border-dashed p-12 rounded-2xl text-center">
                                    <p class="text-slate-500">Awaiting sprint decomposition...</p>
                                </div>
                            ` : status.subtasks.map(task => html`<${TaskCard} key=${task.id} task=${task} />`)}
                        </div>
                    </div>

                    <!-- Activity Sidebar -->
                    <div class="lg:col-span-4">
                        <${ActivitySidebar} 
                            reportText=${status.reportText} 
                            instructions=${status.instructions} 
                        />
                    </div>
                </div>
            </main>
        </div>
    `;
}
