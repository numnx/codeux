import type { FunctionComponent } from "preact";
import { useEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { mockStats } from "../lib/mockData.js";

// ── Fluid wave at bottom of card ──────────────────────────────────────────────
// Both layers are 200% wide with exactly 2 wave cycles in the viewBox.
// translateX(-50%) = exactly one cycle width → zero-jump seamless loop.
// Layer 2 runs in reverse with a negative delay to create a natural counter-drift.
const WaveFluid = ({ accentHex }: { accentHex: string }) => (
    <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out">
        {/* Primary wave — 2 cycles, drifts left */}
        <svg
            style={{
                position: 'absolute', bottom: 0,
                width: '200%', height: '100%', left: 0,
                animation: 'wave-drift 6s linear infinite',
            }}
            viewBox="0 0 200 64"
            preserveAspectRatio="none"
        >
            <path
                d="M 0 32 C 12.5 16 37.5 16 50 32 C 62.5 48 87.5 48 100 32 C 112.5 16 137.5 16 150 32 C 162.5 48 187.5 48 200 32 L 200 64 L 0 64 Z"
                fill={accentHex}
                fillOpacity="0.10"
            />
        </svg>
        {/* Secondary wave — 2 cycles, shallower, counter-drifts via reverse + phase offset */}
        <svg
            style={{
                position: 'absolute', bottom: 0,
                width: '200%', height: '72%', left: 0,
                animation: 'wave-drift 9s linear infinite reverse',
                animationDelay: '-3.5s',
            }}
            viewBox="0 0 200 64"
            preserveAspectRatio="none"
        >
            <path
                d="M 0 38 C 12.5 26 37.5 26 50 38 C 62.5 50 87.5 50 100 38 C 112.5 26 137.5 26 150 38 C 162.5 50 187.5 50 200 38 L 200 64 L 0 64 Z"
                fill={accentHex}
                fillOpacity="0.065"
            />
        </svg>
    </div>
);

// ── Elegant border trace — bottom expands, sides grow up ──────────────────────
const BorderTrace = ({ accentHex }: { accentHex: string }) => (
    <>
        {/* Bottom — expands from center */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] overflow-hidden">
            <div
                className="h-full w-full origin-center scale-x-0 group-hover:scale-x-100 transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{ background: `linear-gradient(90deg, transparent, ${accentHex}80, ${accentHex}CC, ${accentHex}80, transparent)` }}
            />
        </div>
        {/* Left — grows upward from corner, 200ms delay */}
        <div className="absolute left-0 top-0 bottom-0 w-[1px] overflow-hidden">
            <div
                className="w-full h-full origin-bottom scale-y-0 group-hover:scale-y-[0.7] transition-transform duration-500 ease-out delay-200"
                style={{ background: `linear-gradient(0deg, ${accentHex}70, transparent)` }}
            />
        </div>
        {/* Right — grows upward from corner, 200ms delay */}
        <div className="absolute right-0 top-0 bottom-0 w-[1px] overflow-hidden">
            <div
                className="w-full h-full origin-bottom scale-y-0 group-hover:scale-y-[0.7] transition-transform duration-500 ease-out delay-200"
                style={{ background: `linear-gradient(0deg, ${accentHex}70, transparent)` }}
            />
        </div>
    </>
);

// ── Sparkline with smooth bezier curves + GSAP hover effects ─────────────────
const Sparkline = ({ points, color }: { points: number[], color: string }) => {
    const pathRef = useRef<SVGPathElement>(null);
    const svgRef  = useRef<SVGSVGElement>(null);

    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;

    // Smooth cubic bezier path (tension 0.35)
    const pathD = points.map((p, i) => {
        const x = (i / (points.length - 1)) * 100;
        const y = 100 - ((p - min) / range) * 80;
        if (i === 0) return `M ${x} ${y}`;
        const prevX = ((i - 1) / (points.length - 1)) * 100;
        const prevY = 100 - ((points[i - 1] - min) / range) * 80;
        const dx = x - prevX;
        return `C ${prevX + dx * 0.35} ${prevY} ${x - dx * 0.35} ${y} ${x} ${y}`;
    }).join(' ');

    const gradId = `sg-${color.replace('#', '')}`;

    // Mount: draw the line
    useEffect(() => {
        if (!pathRef.current) return;
        const len = pathRef.current.getTotalLength();
        gsap.set(pathRef.current, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(pathRef.current, { strokeDashoffset: 0, duration: 1.4, ease: "power3.inOut", delay: 0.4 });
    }, []);

    // Hover: re-draw from mid-point + glow the whole SVG
    useEffect(() => {
        const group = svgRef.current?.closest('.group') as HTMLElement | null;
        if (!group) return;

        const onEnter = () => {
            if (!pathRef.current || !svgRef.current) return;
            const len = pathRef.current.getTotalLength();
            gsap.fromTo(pathRef.current,
                { strokeDashoffset: len * 0.5 },
                { strokeDashoffset: 0, duration: 0.85, ease: "power2.out" }
            );
            gsap.to(svgRef.current, {
                filter: `drop-shadow(0 0 5px ${color})`,
                opacity: 0.55,
                duration: 0.4,
            });
        };

        const onLeave = () => {
            if (!svgRef.current) return;
            gsap.to(svgRef.current, {
                filter: 'none',
                opacity: 0.2,
                duration: 0.5,
            });
        };

        group.addEventListener('mouseenter', onEnter);
        group.addEventListener('mouseleave', onLeave);
        return () => {
            group.removeEventListener('mouseenter', onEnter);
            group.removeEventListener('mouseleave', onLeave);
        };
    }, [color]);

    return (
        <svg
            ref={svgRef}
            className="absolute bottom-0 left-0 w-full h-20 pointer-events-none"
            style={{ opacity: 0.2 }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
        >
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.55" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            {/* Area fill */}
            <path d={`${pathD} L 100 100 L 0 100 Z`} fill={`url(#${gradId})`} />
            {/* Smooth line */}
            <path
                ref={pathRef}
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

// ── Card wrapper ──────────────────────────────────────────────────────────────
const MetricCard = ({ children, hoverTint, accentHex }: {
    children: preact.ComponentChildren;
    hoverTint: string;
    accentHex: string;
}) => (
    <div className="relative overflow-hidden bg-white/70 dark:bg-void-800/60 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.06] rounded-[1.75rem] p-7 shadow-[0_2px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] flex flex-col justify-between group">
        {/* Hover tint */}
        <div className={`absolute inset-0 bg-transparent ${hoverTint} transition-colors duration-500 pointer-events-none`} />
        {/* Wave fluid */}
        <WaveFluid accentHex={accentHex} />
        {/* Border trace */}
        <BorderTrace accentHex={accentHex} />
        {children}
    </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export const HeaderStats: FunctionComponent = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            gsap.fromTo(
                containerRef.current.children,
                { y: 24, opacity: 0, scale: 0.97 },
                { y: 0, opacity: 1, scale: 1, duration: 0.9, stagger: 0.12, ease: "power3.out", delay: 0.15 }
            );
        }
    }, []);

    const formatTokens = (n: number) => (n / 1_000_000).toFixed(1) + "M";

    return (
        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 w-full">

            {/* Card 1: Daily Tokens */}
            <MetricCard hoverTint="group-hover:bg-signal-500/[0.025]" accentHex="#00E0A0">
                <Sparkline points={[20, 30, 25, 45, 60, 50, 80]} color="#00E0A0" />
                <div className="relative z-10 flex items-center justify-between mb-6">
                    <h3 className="text-slate-500 dark:text-slate-500 font-medium text-xs tracking-widest uppercase group-hover:text-signal-600 dark:group-hover:text-signal-400 transition-colors">Daily Tokens</h3>
                    <div className="w-2 h-2 rounded-full bg-signal-500 shadow-[0_0_10px_rgba(0,224,160,0.6)]" />
                </div>
                <div className="relative z-10">
                    <span className="text-[2.25rem] font-semibold font-mono text-slate-900 dark:text-white tracking-tighter">
                        {formatTokens(mockStats.dailyTokens)}
                    </span>
                    <div className="flex flex-col gap-1 mt-4 border-t border-black/[0.06] dark:border-white/[0.06] pt-4">
                        <div className="flex justify-between items-center text-xs font-mono font-medium">
                            <span className="text-slate-400">IN</span>
                            <span className="text-slate-700 dark:text-slate-300">{formatTokens(mockStats.dailyTokens * 0.4)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-mono font-medium">
                            <span className="text-slate-400">OUT</span>
                            <span className="text-slate-700 dark:text-slate-300">{formatTokens(mockStats.dailyTokens * 0.6)}</span>
                        </div>
                    </div>
                </div>
            </MetricCard>

            {/* Card 2: Weekly Volume */}
            <MetricCard hoverTint="group-hover:bg-ember-500/[0.025]" accentHex="#FFB800">
                <Sparkline points={[60, 50, 55, 45, 60, 40, 50]} color="#FFB800" />
                <div className="relative z-10 flex items-center justify-between mb-6">
                    <h3 className="text-slate-500 dark:text-slate-500 font-medium text-xs tracking-widest uppercase group-hover:text-ember-600 dark:group-hover:text-ember-400 transition-colors">Weekly Volume</h3>
                    <div className="w-2 h-2 rounded-full bg-ember-500 shadow-[0_0_10px_rgba(255,184,0,0.6)]" />
                </div>
                <div className="relative z-10">
                    <span className="text-[2.25rem] font-semibold font-mono text-slate-900 dark:text-white tracking-tighter">
                        {formatTokens(mockStats.weeklyTokens)}
                    </span>
                    <div className="flex flex-col gap-1 mt-4 border-t border-black/[0.06] dark:border-white/[0.06] pt-4">
                        <div className="flex justify-between items-center text-xs font-mono font-medium">
                            <span className="text-slate-400">IN</span>
                            <span className="text-slate-700 dark:text-slate-300">{formatTokens(mockStats.weeklyTokens * 0.42)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-mono font-medium">
                            <span className="text-slate-400">OUT</span>
                            <span className="text-slate-700 dark:text-slate-300">{formatTokens(mockStats.weeklyTokens * 0.58)}</span>
                        </div>
                    </div>
                </div>
            </MetricCard>

            {/* Card 3: Succeeded Jobs */}
            <MetricCard hoverTint="group-hover:bg-status-green/[0.04]" accentHex="#00AB84">
                <Sparkline points={[60, 75, 80, 85, 95, 90, 110]} color="#00AB84" />
                <div className="relative z-10 flex items-center justify-between mb-6">
                    <h3 className="text-slate-500 dark:text-slate-500 font-medium text-xs tracking-widest uppercase group-hover:text-status-green transition-colors">Succeeded Jobs</h3>
                    <div className="w-2 h-2 rounded-full bg-status-green shadow-[0_0_10px_rgba(0,171,132,0.7)] animate-pulse" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-end justify-between mb-1">
                        <span className="text-[2.25rem] font-semibold font-mono text-slate-900 dark:text-white tracking-tighter">6,842</span>
                        <span className="text-status-green text-xs font-bold font-mono">{mockStats.successRate}%</span>
                    </div>
                    <div className="flex flex-col gap-1 mt-4 border-t border-black/[0.06] dark:border-white/[0.06] pt-4">
                        <div className="flex justify-between items-center text-xs font-mono font-medium">
                            <span className="text-slate-400">DAILY</span>
                            <span className="text-slate-700 dark:text-slate-300">{mockStats.dailySuccess.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-mono font-medium">
                            <span className="text-slate-400">WEEKLY</span>
                            <span className="text-slate-700 dark:text-slate-300">{mockStats.weeklySuccess.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </MetricCard>

            {/* Card 4: Failed Jobs */}
            <MetricCard hoverTint="group-hover:bg-status-red/[0.03]" accentHex="#E3000F">
                <Sparkline points={[5, 2, 8, 4, 12, 10, 15]} color="#E3000F" />
                <div className="relative z-10 flex items-center justify-between mb-6">
                    <h3 className="text-slate-500 dark:text-slate-500 font-medium text-xs tracking-widest uppercase group-hover:text-status-red transition-colors">Failed Jobs</h3>
                    <div className="relative w-2 h-2">
                        <div className="w-full h-full rounded-full bg-status-red relative z-10 shadow-[0_0_10px_rgba(227,0,15,0.7)]" />
                        <div className="absolute inset-0 bg-status-red rounded-full animate-ping opacity-60" />
                    </div>
                </div>
                <div className="relative z-10">
                    <div className="flex items-end justify-between mb-1">
                        <span className="text-[2.25rem] font-semibold font-mono text-slate-900 dark:text-white tracking-tighter">{mockStats.failedJobs}</span>
                        <span className="text-status-red text-xs font-bold font-mono">{(100 - mockStats.successRate).toFixed(1)}%</span>
                    </div>
                    <div className="flex flex-col gap-1 mt-4 border-t border-status-red/10 pt-4">
                        <div className="flex justify-between items-center text-xs font-mono font-medium">
                            <span className="text-slate-400">DAILY</span>
                            <span className="text-slate-700 dark:text-slate-300">{mockStats.dailyFailed}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-mono font-medium">
                            <span className="text-slate-400">WEEKLY</span>
                            <span className="text-slate-700 dark:text-slate-300">{mockStats.weeklyFailed}</span>
                        </div>
                    </div>
                </div>
            </MetricCard>

        </div>
    );
};
