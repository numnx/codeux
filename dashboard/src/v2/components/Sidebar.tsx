import type { FunctionComponent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import gsap from "gsap";
import { LayoutDashboard, FolderGit2, ListTodo, Settings, Sparkles, Activity } from "lucide-preact";

export const Sidebar: FunctionComponent = () => {
    const sidebarRef = useRef<HTMLElement>(null);
    const lineRef = useRef<SVGPathElement>(null);
    const navRef = useRef<HTMLElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const navItems = [
        { icon: LayoutDashboard, label: "Overview" },
        { icon: FolderGit2, label: "Sources" },
        { icon: ListTodo, label: "Sprints" },
        { icon: Activity, label: "Live Data" },
        { icon: Sparkles, label: "Automations" },
    ];

    // Entrance Animation
    useEffect(() => {
        if (sidebarRef.current) {
            gsap.fromTo(sidebarRef.current, { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 1.2, ease: "power4.out" });
        }
    }, []);

    // Optimized High-Performance SVG Curved Line Animation
    useEffect(() => {
        if (lineRef.current && navRef.current) {
            // Get the specific button's exact position relative to the nav container
            const button = navRef.current.children[activeIndex + 1] as HTMLElement; // +1 to skip the "Space" header
            if (button) {
                // Calculate precise Y position using the button's offset
                const targetY = button.offsetTop + (button.offsetHeight / 2);

                // Create a butter-smooth, tight bezier curve tracking the active state
                const path = `M0,0 C10,${targetY - 30} 24,${targetY - 15} 24,${targetY} C24,${targetY + 15} 10,${targetY + 30} 0,800`;

                gsap.to(lineRef.current, {
                    attr: { d: path },
                    duration: 0.6,
                    ease: "power2.out" // Switched from elastic to power2.out to eliminate jitter/jumping
                });
            }
        }
    }, [activeIndex]);

    return (
        <aside
            ref={sidebarRef}
            className="w-[280px] h-screen shrink-0 border-r border-slate-200/50 dark:border-white/[0.04] bg-slate-50/50 dark:bg-[#030303] flex flex-col justify-between py-8 relative z-40"
        >
            {/* The High-Performance Animated SVG Spline */}
            <svg
                className="absolute left-[0px] top-[0] w-[40px] h-full pointer-events-none drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]"
                viewBox="0 0 40 800"
                fill="none"
                preserveAspectRatio="none"
            >
                <path
                    ref={lineRef}
                    d="M0,0 C10,0 24,0 24,0 C24,0 10,0 0,800"
                    stroke="url(#sidebar-gradient)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                />
                <defs>
                    <linearGradient id="sidebar-gradient" x1="0" y1="0" x2="0" y2="800" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
                        <stop offset="20%" stopColor="#6366f1" />
                        <stop offset="80%" stopColor="#d946ef" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Logo area */}
            <div className="px-8 mb-12 flex items-center gap-3 group cursor-pointer relative z-10 w-fit">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-fuchsia-600 p-[1px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow duration-500">
                    <div className="w-full h-full bg-white dark:bg-black rounded-2xl flex items-center justify-center inner-shadow">
                        <div className="w-4 h-4 rounded-full bg-slate-900 dark:bg-white relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white dark:bg-black group-hover:scale-[2] transition-transform duration-500 ease-out" />
                        </div>
                    </div>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex flex-col leading-none">
                    Jules <span className="text-[9px] uppercase font-bold font-mono tracking-[0.2em] text-indigo-500 dark:text-indigo-400 mt-1 opacity-90">Agent OS</span>
                </h1>
            </div>

            {/* Main Navigation */}
            {/* Removed the CSS scale transform that was causing layout shift/jumping on hover */}
            <nav ref={navRef} className="flex-1 px-4 flex flex-col relative z-10">
                <div className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Space</div>
                {navItems.map((item, idx) => {
                    const isActive = activeIndex === idx;
                    return (
                        <button
                            key={item.label}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className="relative flex items-center gap-4 px-6 py-3.5 rounded-2xl transition-colors duration-200 w-full text-left group overflow-hidden mb-1"
                        >
                            {/* Persistent Hitbox Background */}
                            <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none ${isActive ? 'bg-indigo-50/50 dark:bg-white/[0.03] opacity-100' : 'bg-transparent opacity-0 group-hover:bg-slate-100/50 dark:group-hover:bg-white/[0.02] group-hover:opacity-100'}`} />

                            {/* Active subtle border using box-shadow to prevent layout shift */}
                            <div className={`absolute inset-0 rounded-2xl pointer-events-none transition-all duration-300 ${isActive ? 'shadow-[inset_0_0_0_1px_rgba(99,102,241,0.1)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]' : 'shadow-none'}`} />

                            <item.icon className={`relative z-10 w-5 h-5 transition-all duration-300 ${isActive ? 'text-indigo-600 dark:text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-slate-300'}`} strokeWidth={isActive ? 2 : 1.5} />

                            <span className={`relative z-10 font-medium text-sm tracking-wide transition-colors duration-300 ${isActive ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>
                                {item.label}
                            </span>
                        </button>
                    )
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="px-4 relative z-10">
                <button className="relative w-full flex items-center gap-4 px-6 py-3.5 rounded-2xl transition-colors duration-200 text-left group overflow-hidden">
                    <div className="absolute inset-0 rounded-2xl bg-transparent group-hover:bg-slate-100/50 dark:group-hover:bg-white/[0.02] transition-opacity duration-300 pointer-events-none opacity-0 group-hover:opacity-100" />
                    <Settings className="relative z-10 w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 group-hover:rotate-90 transition-all duration-700 ease-in-out" strokeWidth={1.5} />
                    <span className="relative z-10 font-medium text-sm tracking-wide text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors duration-300">Settings</span>
                </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-slate-50 dark:from-[#030303] to-transparent pointer-events-none z-0" />
        </aside>
    );
};
