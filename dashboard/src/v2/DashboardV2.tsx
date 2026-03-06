import type { FunctionComponent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import gsap from "gsap";
import { Sidebar } from "./components/Sidebar.js";
import { TopNav } from "./components/TopNav.js";
import { HeaderStats } from "./components/HeaderStats.js";
import { SourcesGrid } from "./components/SourcesGrid.js";
import { TasksList } from "./components/TasksList.js";

export const DashboardV2: FunctionComponent = () => {
    const [isDark, setIsDark] = useState(true);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const splineRef = useRef<SVGPathElement>(null);

    useEffect(() => {
        const root = window.document.documentElement;
        if (isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [isDark]);

    useEffect(() => {
        if (mainContentRef.current) {
            gsap.fromTo(
                mainContentRef.current.children,
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: "power4.out", delay: 0.2 }
            );
        }

        // The Avant-Garde Background Spline Animation
        if (splineRef.current) {
            const tl = gsap.timeline({ repeat: -1, yoyo: true });
            tl.to(splineRef.current, {
                attr: { d: "M 0,200 C 200,600 400,-100 800,400 C 1200,900 1600,0 2000,300" },
                duration: 12,
                ease: "sine.inOut"
            }).to(splineRef.current, {
                attr: { d: "M 0,400 C 300,-100 500,800 1000,200 C 1400,-200 1800,700 2000,500" },
                duration: 15,
                ease: "sine.inOut"
            });
        }
    }, []);

    const toggleTheme = () => setIsDark(!isDark);

    return (
        <div className="flex h-screen overflow-hidden font-outfit text-slate-900 dark:text-slate-200 bg-slate-50 dark:bg-[#030303] transition-colors duration-700">
            {/* Elegant Background Grid & Animated Spline */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent dark:from-indigo-500/10 transition-colors duration-1000" />

                {/* The flowing avant-garde SVG line across the entire background */}
                <svg className="absolute w-[200vw] h-[100vh] top-[10%] left-[-10%] opacity-[0.03] dark:opacity-[0.05] drop-shadow-[0_0_20px_rgba(99,102,241,1)]" viewBox="0 0 2000 800" preserveAspectRatio="none">
                    <path
                        ref={splineRef}
                        d="M 0,300 C 300,100 600,700 1000,300 C 1400,-100 1800,600 2000,200"
                        fill="none"
                        stroke="url(#bg-gradient)"
                        strokeWidth="2"
                    />
                    <defs>
                        <linearGradient id="bg-gradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="50%" stopColor="#d946ef" />
                            <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            {/* Sidebar Container */}
            <Sidebar />

            /* Main App Area */
            <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
                <TopNav isDark={isDark} toggleTheme={toggleTheme} />

                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto dashboard-scrollbar">
                    <div ref={mainContentRef} className="max-w-[1700px] mx-auto px-12 py-12 flex flex-col gap-12">
                        {/* Page Header Area */}
                        <div className="flex items-end justify-between w-full">
                            <div>
                                <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">Orchestration Overview</h2>
                                <p className="text-base text-slate-500 dark:text-slate-400 font-medium">Real-time metrics and operational intelligence for your cluster.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse relative">
                                        <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-75" />
                                    </span>
                                    Cluster Optimal
                                </div>
                            </div>
                        </div>

                        <section className="w-full">
                            <HeaderStats />
                        </section>

                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 flex-grow">
                            {/* Main Area: Sources and Tasks */}
                            <div className="xl:col-span-8 flex flex-col gap-12">
                                <section className="w-full">
                                    <SourcesGrid />
                                </section>
                                <section className="bg-white/60 dark:bg-black/30 backdrop-blur-3xl border border-slate-200 dark:border-white/5 rounded-[2rem] p-10 shadow-[0_8px_40px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_40px_rgb(0,0,0,0.2)]">
                                    <TasksList />
                                </section>
                            </div>

                            {/* Sidebar Area: Live Activity / Status */}
                            <div className="xl:col-span-4 h-full relative">
                                <aside className="sticky top-12 bg-white/60 dark:bg-black/30 backdrop-blur-3xl border border-slate-200 dark:border-white/5 rounded-[2rem] p-10 shadow-[0_8px_40px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_40px_rgb(0,0,0,0.2)] flex flex-col h-[700px] overflow-hidden group">
                                    <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                                        <div className="relative flex items-center justify-center">
                                            <div className="absolute inset-0 bg-fuchsia-500 rounded-full blur-[4px] animate-pulse" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-fuchsia-500 relative z-10" />
                                        </div>
                                        Live Telemetry
                                    </h3>

                                    {/* Ridiculous Radar/Activity Animation */}
                                    <div className="flex-grow flex items-center justify-center border-2 border-dashed border-slate-200/50 dark:border-white/5 rounded-[1.5rem] relative overflow-hidden bg-slate-50/50 dark:bg-white/[0.01]">
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 dark:opacity-[0.05]">
                                            <div className="w-40 h-40 rounded-full border border-slate-900 dark:border-white animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                                            <div className="w-60 h-60 rounded-full border border-slate-900 dark:border-white absolute animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]" />
                                        </div>
                                        <div className="text-center relative z-10">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-xl mx-auto mb-6 flex items-center justify-center group-hover:rotate-[360deg] transition-transform duration-1000 ease-in-out">
                                                <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                            </div>
                                            <span className="text-slate-600 dark:text-slate-400 font-semibold text-sm tracking-wide block uppercase">Awaiting Stream</span>
                                            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-2 block">Socket offline</span>
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
