import type { FunctionComponent } from "preact";
import { useEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { HeaderStats } from "./components/HeaderStats.js";
import { SourcesGrid } from "./components/SourcesGrid.js";
import { TasksList } from "./components/TasksList.js";

export const DashboardV2: FunctionComponent = () => {
    const mainContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (mainContentRef.current) {
            gsap.fromTo(
                mainContentRef.current.children,
                { opacity: 0, y: 50 },
                { opacity: 1, y: 0, duration: 1.2, stagger: 0.15, ease: "power4.out", delay: 0.1 }
            );
        }
    }, []);

    return (
        <div ref={mainContentRef} className="max-w-[2400px] mx-auto px-8 md:px-24 py-32 flex flex-col gap-32">
            {/* Page Header Area with Immense Whitespace */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between w-full gap-8">
                <div>
                    <h2 className="text-6xl md:text-7xl font-black tracking-tighter text-slate-900 dark:text-white mb-6">
                        Overview.
                    </h2>
                    <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed">
                        Real-time metrics and operational intelligence for your entire cluster.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="px-6 py-3 text-sm font-bold uppercase tracking-widest rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.15)] backdrop-blur-md">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse relative">
                            <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-75" />
                        </span>
                        Cluster Optimal
                    </div>
                </div>
            </div>

            {/* Metrics Section */}
            <section className="w-full relative z-20">
                <HeaderStats />
            </section>

            {/* Architectural Section Separation Divider */}
            <div className="w-full flex items-center justify-center py-6 md:py-12 relative z-10">
                <div className="absolute w-[200vw] h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent left-1/2 -translate-x-1/2" />
                <div className="bg-slate-50 dark:bg-obsidian-900 px-8 py-2 border border-slate-200 dark:border-white/10 rounded-full shadow-lg relative z-10 text-xs font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                    Data Streams
                </div>
            </div>

            {/* Huge Grid Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-24 flex-grow relative z-20">
                {/* Main Area: Sources and Tasks */}
                <div className="xl:col-span-8 flex flex-col gap-32">
                    <section className="w-full relative">
                        {/* Ambient Glow behind Sources */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
                        <SourcesGrid />
                    </section>

                    <section className="w-full relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[150%] bg-fuchsia-500/5 dark:bg-fuchsia-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />
                        <TasksList />
                    </section>
                </div>

                {/* Live Telemetry Floating Widget */}
                <div className="xl:col-span-4 h-full relative">
                    <aside className="sticky top-24 flex flex-col h-[800px] overflow-hidden group">
                        <h3 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white mb-16 flex items-center gap-6">
                            <div className="relative flex items-center justify-center">
                                <div className="absolute inset-0 bg-rose-500 rounded-full blur-[12px] animate-[pulse_2s_ease-in-out_infinite]" />
                                <div className="w-4 h-4 rounded-full bg-rose-500 relative z-10" />
                            </div>
                            Telemetry.
                        </h3>

                        {/* Holographic Radar Animation */}
                        <div className="flex-grow flex items-center justify-center relative overflow-hidden bg-transparent">
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-64 h-64 rounded-full border border-slate-900/10 dark:border-white/10 animate-[ping_4s_cubic-bezier(0.1,0.5,0.8,1)_infinite]" />
                                <div className="w-96 h-96 rounded-full border border-slate-900/5 dark:border-white/5 absolute animate-[ping_6s_cubic-bezier(0.1,0.5,0.8,1)_infinite]" />
                                <div className="w-full h-full absolute bg-[radial-gradient(circle_at_center,_transparent_40%,_rgb(0,0,0,0.5)_100%)] dark:bg-[radial-gradient(circle_at_center,_transparent_40%,_rgb(3,3,3,1)_100%)]" />
                            </div>
                            <div className="text-center relative z-10 backdrop-blur-xl p-12 rounded-[3rem] border border-white/10 shadow-2xl">
                                <div className="w-24 h-24 rounded-[2.5rem] bg-white/10 dark:bg-black/40 border border-slate-200/50 dark:border-white/10 shadow-[0_0_40px_rgba(244,63,94,0.2)] mx-auto mb-8 flex items-center justify-center group-hover:rotate-[180deg] group-hover:scale-110 transition-all duration-1000 ease-out">
                                    <svg className="w-12 h-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <span className="text-slate-900 dark:text-white font-bold text-xl tracking-widest block uppercase drop-shadow-lg">Awaiting Stream</span>
                                <span className="text-base text-rose-500 dark:text-rose-400 font-mono mt-4 block animate-pulse">Socket offline</span>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};
