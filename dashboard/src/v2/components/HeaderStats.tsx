import type { FunctionComponent } from "preact";
import { useEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { mockStats } from "../lib/mockData.js";

// Mini Sparkline Chart Component using GSAP
const Sparkline = ({ points, color }: { points: number[], color: string }) => {
    const pathRef = useRef<SVGPathElement>(null);

    useEffect(() => {
        if (pathRef.current) {
            const length = pathRef.current.getTotalLength();
            gsap.set(pathRef.current, { strokeDasharray: length, strokeDashoffset: length });
            gsap.to(pathRef.current, { strokeDashoffset: 0, duration: 1.5, ease: "power3.inOut", delay: 0.5 });
        }
    }, [points]);

    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;
    const pathD = points.map((p, i) => {
        const x = (i / (points.length - 1)) * 100;
        const y = 100 - ((p - min) / range) * 80; // Leaving some padding
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
        <svg className="absolute bottom-0 left-0 w-full h-24 opacity-20 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path ref={pathRef} d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {/* Soft gradient fill below the line */}
            <path d={`${pathD} L 100 100 L 0 100 Z`} fill={`url(#gradient-${color})`} />
            <defs>
                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
        </svg>
    );
};

export const HeaderStats: FunctionComponent = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            gsap.fromTo(
                containerRef.current.children,
                { y: 30, opacity: 0, scale: 0.95 },
                {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 1,
                    stagger: 0.15,
                    ease: "elastic.out(1, 0.8)",
                    delay: 0.2
                }
            );
        }
    }, []);

    const formatTokens = (tokens: number) => {
        return (tokens / 1000000).toFixed(1) + "M";
    };

    return (
        <div
            ref={containerRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full"
        >
            {/* Elegant Metric Card: Daily Tokens */}
            <div className="relative overflow-hidden bg-white/60 dark:bg-black/40 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col justify-between group">
                <div className="absolute inset-0 bg-transparent group-hover:bg-indigo-50/30 dark:group-hover:bg-indigo-500/[0.02] transition-colors duration-500 pointer-events-none" />
                <Sparkline points={[20, 30, 25, 45, 60, 50, 80]} color="#6366f1" />
                <div className="relative z-10 flex items-center justify-between mb-8">
                    <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm tracking-wide group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Daily Tokens</h3>
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_12px_#6366f1]" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-baseline gap-3 mb-1">
                        <span className="text-4xl font-semibold font-mono text-slate-900 dark:text-white tracking-tighter group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] transition-all">
                            {formatTokens(mockStats.dailyTokens)}
                        </span>
                    </div>
                    <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium flex items-center gap-1 group-hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                        12% vs yesterday
                    </span>
                </div>
            </div>

            {/* Elegant Metric Card: Weekly Volume */}
            <div className="relative overflow-hidden bg-white/60 dark:bg-black/40 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col justify-between group">
                <div className="absolute inset-0 bg-transparent group-hover:bg-purple-50/30 dark:group-hover:bg-purple-500/[0.02] transition-colors duration-500 pointer-events-none" />
                <Sparkline points={[60, 50, 55, 45, 60, 40, 50]} color="#a855f7" />
                <div className="relative z-10 flex items-center justify-between mb-8">
                    <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm tracking-wide group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Weekly Volume</h3>
                    <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_12px_#a855f7]" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-baseline gap-3 mb-1">
                        <span className="text-4xl font-semibold font-mono text-slate-900 dark:text-white tracking-tighter group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] transition-all">
                            {formatTokens(mockStats.weeklyTokens)}
                        </span>
                    </div>
                    <span className="text-purple-600 dark:text-purple-400 text-sm font-medium group-hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all">
                        Stable throughput
                    </span>
                </div>
            </div>

            {/* Elegant Metric Card: Success Rate */}
            <div className="relative overflow-hidden bg-white/60 dark:bg-black/40 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col justify-between group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="flex items-center justify-between mb-8 relative z-10">
                    <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm tracking-wide group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Success Rate</h3>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-baseline gap-3 mb-1">
                        <span className="text-4xl font-semibold font-mono text-slate-900 dark:text-white tracking-tighter group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] transition-all">
                            {mockStats.successRate}%
                        </span>
                    </div>
                    {/* Pulsing GSAP style line */}
                    <div className="w-full h-1.5 mt-5 bg-slate-100 dark:bg-white/[0.05] rounded-full overflow-hidden shadow-inner relative">
                        <div className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full w-0 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all" style={{ width: `${mockStats.successRate}%`, transition: 'width 2s cubic-bezier(0.22, 1, 0.36, 1) 0.5s' }} />
                    </div>
                </div>
            </div>

            {/* Elegant Metric Card: Failed Jobs */}
            <div className="relative overflow-hidden bg-white/60 dark:bg-black/40 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col justify-between group cursor-pointer border-rose-100 dark:border-rose-900/30">
                <div className="absolute inset-0 bg-transparent group-hover:bg-rose-50/30 dark:group-hover:bg-rose-500/[0.02] transition-colors duration-500 pointer-events-none" />
                <Sparkline points={[5, 2, 8, 4, 12, 10, 15]} color="#f43f5e" />
                <div className="flex items-center justify-between mb-8 relative z-10">
                    <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm tracking-wide group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">Failed Jobs</h3>
                    <div className="relative">
                        <div className="w-2 h-2 rounded-full bg-rose-500 relative z-10 shadow-[0_0_12px_#f43f5e]" />
                        <div className="absolute inset-0 bg-rose-500 rounded-full animate-ping opacity-75" />
                    </div>
                </div>
                <div className="flex items-end justify-between relative z-10">
                    <span className="text-4xl font-semibold font-mono text-slate-900 dark:text-white tracking-tighter group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] transition-all">
                        {mockStats.failedJobs}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 text-sm font-medium flex items-center gap-1 mb-1 group-hover:drop-shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-all">
                        Review required
                    </span>
                </div>
            </div>
        </div>
    );
};
