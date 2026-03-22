import { describe, expect, it } from "vitest";
import { computeOverviewPageState } from "../../../dashboard/src/v2/lib/overview-page-state.js";

describe("overview-page-state", () => {
    it("computes stats, recent sources, and passes through telemetry", () => {
        const result = computeOverviewPageState({
            projects: [
                { id: "p1", updatedAt: "2024-01-01T00:00:00Z" },
                { id: "p2", updatedAt: "2024-01-02T00:00:00Z" }
            ] as any,
            selectedProject: { id: "p2", name: "Project Two" } as any,
            sprints: [],
            tasks: [{ id: "t1" }] as any,
            telemetry: { activeProjects: [] } as any,
            telemetryError: "Some error"
        });

        expect(result.selectedProjectName).toBe("Project Two");
        expect(result.recentSources[0].id).toBe("p2");
        expect(result.tasks.length).toBe(1);
        expect(result.telemetryError).toBe("Some error");
        expect(result.stats.totalProjects).toBe(2);
    });
});
