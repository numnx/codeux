import { describe, expect, it, vi } from "vitest";
import { SprintOrchestrator } from "../../../src/sprint/sprint-orchestrator.js";

describe("sprint-orchestrator", () => {
    it("handles renderMainMergeCiFeedback when getCiStatusForScope is not provided", async () => {
        const deps = {
            logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
            settings: { dashboardPort: 3000 },
            completedSprints: new Set(),
            renderInstruction: vi.fn().mockResolvedValue(""),
            getDashboardSettings: vi.fn().mockReturnValue({ sprintLoopSteps: { planningPreflight: false }, ciIntelligence: {}, aiProvider: { providers: {} } }),
        };
        const orch = new SprintOrchestrator(deps as any);

        const feedback = await (orch as any).renderMainMergeCiFeedback({ repoPath: "path", featureBranch: "a", defaultBranch: "b", featureBranchPrefix: "c" });
        expect(feedback).toBe("");
    });

    it("returns message if sprint already completed", async () => {
        const deps = {
            logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
            settings: { dashboardPort: 3000 },
            completedSprints: new Set([1]),
            renderInstruction: vi.fn().mockResolvedValue(""),
            getDashboardSettings: vi.fn().mockReturnValue({ sprintLoopSteps: { planningPreflight: false }, ciIntelligence: {}, aiProvider: { providers: { gemini: { enabled: true } } } }),
        };
        const orch = new SprintOrchestrator(deps as any);

        const res = await orch.execute({ sprint_number: 1, action: "status" } as any);
        expect(res.content[0].text).toContain("already been finished");
    });
});
