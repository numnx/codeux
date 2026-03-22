import type { FunctionComponent } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { HeaderStats } from "./components/HeaderStats.js";
import { OverviewHero } from "./pages/overview/OverviewHero.js";
import { OverviewGrid } from "./pages/overview/OverviewGrid.js";
import { useOverviewPageData } from "./pages/overview/use-overview-page-data.js";

export const DashboardV2: FunctionComponent = () => {
    const mainContentRef = useRef<HTMLDivElement>(null);
    const pageState = useOverviewPageData();

    useLayoutEffect(() => {
        if (mainContentRef.current) {
            gsap.fromTo(
                mainContentRef.current.children,
                { opacity: 0, y: 40 },
                { opacity: 1, y: 0, duration: 1, stagger: 0.12, ease: "power4.out", delay: 0.05 }
            );
        }
    }, []);

    return (
        <div ref={mainContentRef} className="max-w-[2400px] mx-auto px-8 md:px-20 py-24 flex flex-col gap-24">
            {/* Page Header */}
            <OverviewHero />

            {/* Metrics Section */}
            <section className="w-full relative z-20">
                <HeaderStats stats={pageState.stats} selectedProjectName={pageState.selectedProjectName} />
            </section>

            {/* Section Divider */}
            <div className="w-full flex items-center justify-center py-4 relative z-10 overflow-hidden">
                <div className="absolute inset-y-1/2 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/[0.06] dark:via-white/[0.06] to-transparent" />
                <div className="bg-[#F9F8F4] dark:bg-void-900 px-6 py-1.5 border border-black/[0.06] dark:border-white/[0.06] rounded-full shadow-sm relative z-10 text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-600">
                    Data Streams
                </div>
            </div>

            {/* Main Grid */}
            <OverviewGrid state={pageState} />
        </div>
    );
};
