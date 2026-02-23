import { html } from '../utils.js';

export function StatsGrid({ stats }) {
    const items = [
        { label: 'Total Tasks', value: stats.total, color: 'text-white' },
        { label: 'Active', value: stats.running, color: 'text-sky-400', pulse: stats.running > 0 },
        { label: 'Completed', value: stats.completed, color: 'text-emerald-400' },
        { label: 'Failures', value: stats.failed, color: stats.failed > 0 ? 'text-red-400' : 'text-slate-500' }
    ];

    return html`
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            ${items.map(stat => html`
                <div class="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-4 rounded-2xl relative overflow-hidden group">
                    <div class="relative z-10">
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">${stat.label}</p>
                        <p class="text-3xl font-bold ${stat.color} tracking-tighter">
                            ${stat.value}
                            ${stat.pulse && html`<span class="inline-block w-2 h-2 rounded-full bg-sky-500 ml-2 animate-ping"></span>`}
                        </p>
                    </div>
                    <div class="absolute -right-2 -bottom-2 text-6xl opacity-[0.03] font-black pointer-events-none">${stat.value}</div>
                </div>
            `)}
        </div>
    `;
}
