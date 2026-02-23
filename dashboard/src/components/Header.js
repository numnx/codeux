import { html } from '../utils.js';

export function Header({ sprint_number, feature_branch, timestamp }) {
    return html`
        <header class="sticky top-0 z-50 bg-slate-900/50 backdrop-blur-md border border-slate-800 border-x-0 border-t-0 py-4">
            <div class="max-w-7xl mx-auto px-6 flex justify-between items-center">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">J</div>
                    <div>
                        <h1 class="font-bold text-white tracking-tight">Sprint ${sprint_number || '?'}</h1>
                        <p class="text-xs text-slate-400 font-mono">${feature_branch || 'initializing...'}</p>
                    </div>
                </div>
                <div class="flex items-center gap-6">
                    <div class="hidden md:flex gap-4">
                        <div class="text-right">
                            <p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Health</p>
                            <p class="text-sm font-medium text-emerald-400">Optimal</p>
                        </div>
                        <div class="text-right border-l border-slate-800 pl-4">
                            <p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Sync</p>
                            <p class="text-sm font-medium text-slate-300">${timestamp ? 'Live' : 'Polling'}</p>
                        </div>
                    </div>
                    <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                </div>
            </div>
        </header>
    `;
}
