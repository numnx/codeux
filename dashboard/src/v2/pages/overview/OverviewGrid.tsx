import type { FunctionComponent } from "preact";
import { SourcesGrid } from "../../components/SourcesGrid.js";
import { TasksList } from "../../components/TasksList.js";
import { OverviewTelemetry } from "../../components/OverviewTelemetry.js";
import type { OverviewPageState } from "../../lib/overview-page-state.js";

interface OverviewGridProps {
    state: OverviewPageState;
}

export const OverviewGrid: FunctionComponent<OverviewGridProps> = ({ state }) => {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-20 flex-grow relative z-20">
            {/* Sources and Tasks */}
            <div className="xl:col-span-8 flex flex-col gap-24">
                <section className="w-full relative">
                    {/* Subtle signal glow — very restrained */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-signal-500/3 dark:bg-signal-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />
                    <SourcesGrid recentSources={state.recentSources} />
                </section>

                <section className="w-full relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[130%] bg-ember-500/3 dark:bg-ember-500/4 rounded-full blur-[80px] pointer-events-none -z-10" />
                    <TasksList tasks={state.tasks} />
                </section>
            </div>

            {/* Live Telemetry */}
            <div className="xl:col-span-4 h-full relative">
                <OverviewTelemetry telemetry={state.telemetry} error={state.telemetryError} />
            </div>
        </div>
    );
};
