import type { FunctionComponent } from "preact";
import { useEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { Target } from "lucide-preact";
import { mockSprints } from "./lib/mockData.js";
import { SprintBubble } from "./components/ui/SprintBubble.js";

const ACCENT_CYCLE = ['text-signal-500', 'text-ember-500', 'text-status-green'] as const;

export const SprintsPage: FunctionComponent = () => {
    const mainRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (mainRef.current) {
            gsap.fromTo(mainRef.current.children,
                { opacity: 0, y: 40 },
                { opacity: 1, y: 0, stagger: 0.12, duration: 1, ease: "power4.out", delay: 0.15 }
            );
        }
    }, []);

    return (
        <div ref={mainRef} className="max-w-[1920px] mx-auto px-8 md:px-20 py-24 flex flex-col gap-20 relative z-10">

            {/* Page Header */}
            <div className="flex flex-col gap-5 max-w-3xl">
                <div className="flex items-center gap-2.5 text-signal-500 font-bold tracking-[0.15em] uppercase text-xs font-mono">
                    <Target className="w-4 h-4" strokeWidth={2.5} />
                    Iteration Cycles
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 dark:text-white leading-[0.92] font-display">
                    Active <br />
                    <span className="text-signal-500">Sprints.</span>
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-500 font-medium max-w-xl mt-2 leading-relaxed">
                    Liquid execution streams mapping your source integrations in real-time.
                </p>
            </div>

            {/* Organic Sprint Bubbles */}
            <div className="flex flex-wrap gap-14 justify-center lg:justify-start">
                {mockSprints?.map((sprint, index) => (
                    <SprintBubble
                        key={sprint.id}
                        sprint={sprint}
                        isEven={index % 2 === 0}
                        accentColor={ACCENT_CYCLE[index % 3]}
                    />
                ))}
            </div>
        </div>
    );
};
