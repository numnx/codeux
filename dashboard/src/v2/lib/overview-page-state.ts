import type { Source, Sprint, Task } from "../types.js";
import type { OverviewTelemetrySnapshot } from "../../types.js";
import { computeOverviewStats, type OverviewStats } from "./overview-stats.js";

export interface OverviewPageStateInput {
    projects: Source[];
    selectedProject: Source | null;
    sprints: Sprint[];
    tasks: Task[];
    telemetry: OverviewTelemetrySnapshot;
    telemetryError: string | null;
}

export interface OverviewPageState {
    stats: OverviewStats;
    recentSources: Source[];
    tasks: Task[];
    telemetry: OverviewTelemetrySnapshot;
    telemetryError: string | null;
    selectedProjectName: string | null;
}

export function computeOverviewPageState(input: OverviewPageStateInput): OverviewPageState {
    const stats = computeOverviewStats(input.projects, input.sprints, input.tasks);

    const recentSources = [...input.projects].sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ).slice(0, 6);

    return {
        stats,
        recentSources,
        tasks: input.tasks,
        telemetry: input.telemetry,
        telemetryError: input.telemetryError,
        selectedProjectName: input.selectedProject?.name || null
    };
}
