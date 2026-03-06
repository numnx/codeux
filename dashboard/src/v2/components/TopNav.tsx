import type { FunctionComponent } from "preact";
import { useEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { Bell, Command, Search, Moon, Sun, ChevronDown, Activity } from "lucide-preact";

interface TopNavProps {
    isDark: boolean;
    toggleTheme: () => void;
}

export const TopNav: FunctionComponent<TopNavProps> = ({ isDark, toggleTheme }) => {
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (navRef.current) {
            gsap.fromTo(navRef.current, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "power3.out" });
        }
    }, []);

    return (
        <header
            ref={navRef}
            className="sticky top-0 z-50 flex items-center justify-between w-full h-20 px-8 md:px-12 bg-white/40 dark:bg-obsidian-900/60 backdrop-blur-3xl border-b border-slate-200/50 dark:border-white/[0.02]"
        >
            <div className="flex items-center gap-12 flex-1">
                {/* Sprint OS Animated Logo */}
                <div className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative w-8 h-8 flex items-center justify-center bg-obsidian-900 dark:bg-white rounded-xl overflow-hidden shadow-[0_0_20px_rgba(255,51,102,0.3)] dark:shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-aura-500 to-aura-600 opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-md" />
                        <Activity className="w-5 h-5 text-white dark:text-obsidian-900 relative z-10 group-hover:scale-110 transition-transform duration-500" strokeWidth={2.5} />
                    </div>
                    <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                        Sprint<span className="text-transparent bg-clip-text bg-gradient-to-r from-aura-500 to-aura-600">OS</span>
                    </span>
                </div>

                {/* Search Bar - Premium Edge */}
                <div className="relative group w-full max-w-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" strokeWidth={2} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search commands, sources, sprints..."
                        className="w-full h-11 pl-11 pr-14 bg-slate-100/50 dark:bg-white/[0.03] border border-transparent hover:border-slate-200 dark:hover:border-white/10 focus:border-indigo-500/50 dark:focus:border-indigo-500/50 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-medium text-slate-400 border border-slate-200 dark:border-white/10 rounded-lg">
                            <Command className="w-3 h-3" /> K
                        </kbd>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Project Selector */}
                <div className="relative group cursor-pointer hidden md:flex items-center gap-3 px-4 py-2 bg-slate-100/50 dark:bg-white/[0.02] border border-transparent hover:border-slate-200 dark:hover:border-white/10 rounded-2xl transition-all">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Production App</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                </div>

                <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-2 hidden md:block" />

                <button className="relative w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-transparent dark:border-white/[0.02] group">
                    <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" strokeWidth={1.5} />
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-aura-500 shadow-[0_0_10px_#FF3366] ring-2 ring-white dark:ring-obsidian-900" />
                </button>

                <button
                    onClick={toggleTheme}
                    className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-transparent dark:border-white/[0.02]"
                >
                    {isDark ? <Sun className="w-5 h-5 text-slate-500 dark:text-slate-400" strokeWidth={1.5} /> : <Moon className="w-5 h-5 text-slate-500 dark:text-slate-400" strokeWidth={1.5} />}
                </button>

                <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-2" />

                {/* Avatar */}
                <div className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-aura-500 to-aura-600 p-[2px] shadow-[0_0_20px_rgba(255,51,102,0.2)]">
                        <div className="w-full h-full rounded-full bg-white dark:bg-obsidian-900 flex items-center justify-center overflow-hidden border border-white/10">
                            <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=transparent" alt="Avatar" className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
