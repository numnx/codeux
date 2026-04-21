import type { FunctionComponent } from "preact";
import { useLayoutEffect, useRef, useMemo } from "preact/hooks";
import gsap from "gsap";
import { Activity, Zap } from "lucide-preact";
import { SectionHeader } from "./ui/SectionHeader.js";
import { SourceCell } from "./ui/SourceCell.js";
import { SkeletonCard } from "./ui/ListSkeletons.js";
import { Button } from "./ui/Button.js";
import { useProjectData } from "../context/project-data.js";
import { useReducedMotion } from "../hooks/use-reduced-motion.js";

export const SourcesGrid: FunctionComponent = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const emptyIconRef = useRef<SVGSVGElement>(null);
    const { projects, loading: projectsLoading } = useProjectData();
    const prefersReducedMotion = useReducedMotion();

    useLayoutEffect(() => {
        if (containerRef.current && projects.length > 0) {
            if (prefersReducedMotion) {
                gsap.set(containerRef.current.children, { y: 0, opacity: 1, scale: 1 });
            } else {
                gsap.fromTo(
                    containerRef.current.children,
                    { y: 50, opacity: 0, scale: 0.9 },
                    {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        duration: 1.1,
                        stagger: { amount: 0.7, from: "center" },
                        ease: "elastic.out(1, 0.7)",
                        delay: 0.1
                    }
                );
            }
        }
    }, [prefersReducedMotion, projects.length]);

    useLayoutEffect(() => {
        if (emptyIconRef.current && !projectsLoading && projects.length === 0) {
            gsap.fromTo(emptyIconRef.current,
                { y: 10, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }
            );

            gsap.to(emptyIconRef.current, {
                y: -8,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
        }
    }, [projectsLoading, projects.length]);

    const recentSources = useMemo(() => {
        return [...projects].sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ).slice(0, 6);
    }, [projects]);

    return (
        <div className="w-full relative z-10" tabIndex={0}>
            <SectionHeader
                watermark="DATA"
                icon={<Activity className="w-5 h-5 text-signal-500" strokeWidth={2.5} />}
                title="Projects & Sources"
            />

            <div
                ref={containerRef}
                className="flex flex-wrap justify-center gap-10 md:gap-14 lg:gap-20 min-h-[200px]"
            >
                {projectsLoading ? (
                    <>
                        <div className="w-[18rem]"><SkeletonCard index={0} /></div>
                        <div className="w-[18rem]"><SkeletonCard index={1} /></div>
                        <div className="w-[18rem]"><SkeletonCard index={2} /></div>
                    </>
                ) : recentSources.length > 0 ? (
                    recentSources.map((source, index) => (
                        <SourceCell
                            key={source.id}
                            source={source}
                            isEven={index % 2 === 0}
                            animDelay={index * 0.5}
                        />
                    ))
                ) : (
                    <div className="w-full flex flex-col items-center justify-center py-16 text-center">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 blur-3xl bg-ember-500/10 dark:bg-ember-500/5 rounded-full" />
                            <Zap ref={emptyIconRef} className="w-12 h-12 text-ember-500 relative z-10" fill="currentColor" strokeWidth={1} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">No projects found</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-[320px] mx-auto leading-relaxed">
                            It looks like you haven't connected any projects yet. Start by initializing your first project source.
                        </p>
                        <Button
                            variant="signal"
                            size="md"
                            className="mt-8"
                        >
                            Initialize First Project
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

