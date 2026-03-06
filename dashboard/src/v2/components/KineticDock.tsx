import type { FunctionComponent } from "preact";
import { useRef, useEffect } from "preact/hooks";
import { Link, useRouterState } from "@tanstack/react-router";
import { Hexagon, Layers, Zap, Settings, Inbox, Cpu } from "lucide-preact";
import gsap from "gsap";

const DOCK_ITEMS = [
    { icon: Hexagon, label: "Overview", path: "/",        color: "text-signal-500" },
    { icon: Layers,  label: "Sprints",  path: "/sprints", color: "text-ember-500" },
    { icon: Cpu,     label: "Agents",   path: "/agents",  color: "text-signal-400" },
    { icon: Inbox,   label: "Memory",   path: "/memory",  color: "text-ember-400" },
    { icon: Zap,     label: "Live",     path: "/live",    color: "text-status-red" },
    { icon: Settings,label: "Config",   path: "/config",  color: "text-slate-400 dark:text-slate-400" }
];

export const KineticDock: FunctionComponent = () => {
    const dockRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

    const matches = useRouterState({ select: (s) => s.matches });
    const currentPath = matches[matches.length - 1]?.pathname || "/";
    const activeIndex = Math.max(0, DOCK_ITEMS.findIndex(i => i.path === currentPath));

    useEffect(() => {
        if (dockRef.current) {
            gsap.fromTo(dockRef.current,
                { y: 100, opacity: 0, scale: 0.8 },
                { y: 0, opacity: 1, scale: 1, duration: 1.4, ease: "elastic.out(1, 0.7)", delay: 0.2 }
            );
        }
    }, []);

    const handleMouseMove = (e: MouseEvent) => {
        if (!dockRef.current) return;
        const dockRect = dockRef.current.getBoundingClientRect();
        const mouseX = e.clientX;

        itemRefs.current.forEach((item) => {
            if (!item) return;
            const itemCenterX = dockRect.left + item.offsetLeft + (item.offsetWidth / 2);
            const dist = Math.abs(mouseX - itemCenterX);
            const maxDist = 110;

            if (dist < maxDist) {
                const ratio = 1 - Math.pow(dist / maxDist, 1.5);
                gsap.to(item, {
                    scale: 1 + (0.45 * ratio),
                    y: -18 * ratio,
                    duration: 0.35,
                    ease: "power2.out",
                    overwrite: "auto"
                });
            } else {
                gsap.to(item, { scale: 1, y: 0, duration: 0.35, ease: "power2.out", overwrite: "auto" });
            }
        });
    };

    const handleMouseLeave = () => {
        itemRefs.current.forEach(item => {
            if (!item) return;
            gsap.to(item, { scale: 1, y: 0, duration: 0.55, ease: "elastic.out(1, 0.5)", overwrite: "auto" });
        });
    };

    return (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 flex justify-center items-end h-28 pointer-events-none">
            <div
                ref={dockRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="pointer-events-auto flex items-center gap-1.5 p-2.5 bg-white/60 dark:bg-void-800/70 backdrop-blur-3xl border border-black/[0.06] dark:border-white/[0.08] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative before:absolute before:inset-0 before:rounded-[2rem] before:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:before:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]"
            >
                {/* Active Signal Indicator */}
                <div
                    className="absolute bottom-2 h-[3px] rounded-full bg-signal-500 shadow-[0_0_12px_rgba(0,224,160,0.8)] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    style={{
                        width: '28px',
                        left: `${(activeIndex * 60) + 26}px`
                    }}
                />

                {DOCK_ITEMS.map((item, index) => {
                    const isActive = activeIndex === index;
                    return (
                        <Link
                            key={item.label}
                            to={item.path}
                            ref={(el: HTMLAnchorElement | null) => { if (el) itemRefs.current[index] = el; }}
                            className="relative group flex flex-col items-center justify-center w-[52px] h-[52px] rounded-[1.4rem] transition-colors duration-300 decoration-none"
                        >
                            <div className="absolute inset-0 bg-transparent group-hover:bg-black/[0.04] dark:group-hover:bg-white/[0.05] rounded-[1.4rem] pointer-events-none transition-colors duration-300" />

                            <item.icon
                                className={`w-5 h-5 relative z-10 transition-all duration-300 ${isActive ? item.color : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}
                                strokeWidth={isActive ? 2 : 1.5}
                            />

                            {/* Tooltip */}
                            <span className="absolute -top-11 px-2.5 py-1 bg-void-900/95 dark:bg-white/95 text-white dark:text-void-900 text-[11px] font-bold tracking-wide rounded-xl opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 -translate-y-1 group-hover:-translate-y-0 pointer-events-none transition-all duration-250 ease-out shadow-xl backdrop-blur-md whitespace-nowrap">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};
