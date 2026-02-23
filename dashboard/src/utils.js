import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const getStatusColor = (s) => {
    switch(s) {
        case 'RUNNING': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
        case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        case 'FAILED': return 'bg-red-500/10 text-red-400 border-red-500/20';
        case 'BLOCKED': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        default: return 'bg-slate-800/50 text-slate-400 border-slate-700';
    }
};

export const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
