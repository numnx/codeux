import type { FunctionComponent } from "preact";
import { useRef, useEffect } from "preact/hooks";
import { Link, useRouterState } from "@tanstack/react-router";
import { Hexagon, Layers, Zap, Settings, Inbox, Cpu } from "lucide-preact";
import gsap from "gsap";

const DOCK_ITEMS = [
    { icon: Hexagon, label: "Overview", path: "/", color: "text-indigo-500" },
    { icon: Layers, label: "Sprints", path: "/sprints", color: "text-fuchsia-500" },
    { icon: Cpu, label: "Agents", path: "/agents", color: "text-emerald-500" },
    { icon: Inbox, label: "Memory", path: "/memory", color: "text-amber-500" },
    { icon: Zap, label: "Live", path: "/live", color: "text-rose-500" },
    { icon: Settings, label: "Config", path: "/config", color: "text-slate-500 dark:text-slate-400" }
];

export const KineticDock: FunctionComponent = () => {
    const dockRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

    // Get active route for the glow indicator
    const matches = useRouterState({ select: (s) => s.matches });
    const currentPath = matches[matches.length - 1]?.pathname || "/";
    const activeIndex = Math.max(0, DOCK_ITEMS.findIndex(i => i.path === currentPath));

    useEffect(() => {
        // Entrance animation
        if (dockRef.current) {
            gsap.fromTo(dockRef.current,
                { y: 100, opacity: 0, scale: 0.8 },
                { y: 0, opacity: 1, scale: 1, duration: 1.5, ease: "elastic.out(1, 0.7)", delay: 0.2 }
            );
        }
    }, []);

    // Absolute buttery smooth GSAP hover tracking on the parent container
    const handleMouseMove = (e: MouseEvent) => {
        if (!dockRef.current) return;

        const dockRect = dockRef.current.getBoundingClientRect();
        const mouseX = e.clientX;

        itemRefs.current.forEach((item) => {
            if (!item) return;
            // Calculate item's center X relative to the viewport
            // Using offsetLeft provides a stable static baseline so it doesn't jump as scale increases
            const itemCenterX = dockRect.left + item.offsetLeft + (item.offsetWidth / 2);

            const dist = Math.abs(mouseX - itemCenterX);
            const maxDist = 120; // Magnetic field radius

            if (dist < maxDist) {
                const ratio = 1 - Math.pow(dist / maxDist, 1.5); // Smoother falloff
                const scale = 1 + (0.5 * ratio); // Max scale 1.5x
                const y = -20 * ratio; // Lift up 20px

                gsap.to(item, {
                    scale: scale,
                    y: y,
                    duration: 0.4,
                    ease: "power2.out",
                    overwrite: "auto"
                });
            } else {
                gsap.to(item, {
                    scale: 1,
                    y: 0,
                    duration: 0.4,
                    ease: "power2.out",
                    overwrite: "auto"
                });
            }
        });
    };

    const handleMouseLeave = () => {
        itemRefs.current.forEach(item => {
            if (!item) return;
            gsap.to(item, {
                scale: 1,
                y: 0,
                duration: 0.6,
                ease: "elastic.out(1, 0.5)",
                overwrite: "auto"
            });
        });
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex justify-center items-end h-32 pointer-events-none">
            {/* The Dock Glass Container */}
            <div
                ref={dockRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="pointer-events-auto flex items-center gap-2 p-3 bg-white/40 dark:bg-[#030303]/60 backdrop-blur-3xl border border-slate-200/50 dark:border-white/10 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative before:absolute before:inset-0 before:rounded-[2.5rem] before:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] dark:before:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
            >
                {/* Active Indicator Glow */}
                <div
                    className="absolute bottom-2 h-1 rounded-full bg-indigo-500 shadow-[0_0_15px_#6366f1] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    style={{
                        width: '32px',
                        left: `${(activeIndex * 64) + 28}px`
                    }}
                />

                {DOCK_ITEMS.map((item, index) => {
                    const isActive = activeIndex === index;
                    return (
                        <Link
                            key={item.label}
                            to={item.path}
                            ref={(el: HTMLAnchorElement | null) => { if (el) itemRefs.current[index] = el; }}
                            className="relative group flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-colors duration-300 decoration-none"
                        >
                            <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 dark:group-hover:bg-white/5 rounded-2xl pointer-events-none transition-colors duration-300" />

                            <item.icon
                                className={`w-6 h-6 relative z-10 transition-colors duration-300 ${isActive ? item.color : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'}`}
                                strokeWidth={isActive ? 2 : 1.5}
                            />

                            {/* Tooltip Label */}
                            <span className="absolute -top-12 px-3 py-1.5 bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-xs font-bold tracking-wide rounded-xl opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 -translate-y-2 group-hover:-translate-y-0 pointer-events-none transition-all duration-300 ease-out shadow-xl backdrop-blur-md">
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </div>
    );
};
