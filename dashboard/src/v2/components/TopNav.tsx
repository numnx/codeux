import type { FunctionComponent } from "preact";
import { useEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { Bell, Command, Search, Moon, Sun } from "lucide-preact";

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
            className="sticky top-0 z-50 flex items-center justify-between w-full h-20 px-10 bg-white/40 dark:bg-black/40 backdrop-blur-2xl border-b border-slate-200/50 dark:border-white/[0.04]"
        >
            <div className="flex items-center gap-6 flex-1">
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
                <button className="relative w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-transparent dark:border-white/[0.02]">
                    <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" strokeWidth={1.5} />
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-black" />
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
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[2px]">
                        <div className="w-full h-full rounded-full bg-white dark:bg-black flex items-center justify-center overflow-hidden border border-white/20">
                            <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=transparent" alt="Avatar" className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
