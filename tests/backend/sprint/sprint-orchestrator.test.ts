import { describe, it, expect, vi } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { SprintOrchestrator } from "../../../src/sprint/sprint-orchestrator.js";
import { buildMockSettings } from "../../builders/settings-builder.js";
import { buildMockSubtask } from "../../builders/subtask-builder.js";

const buildDeps = () => {
  return {
    settings: { maxFailures: 5 },
    getDashboardSettings: () => buildMockSettings(),
    renderInstruction: vi.fn().mockResolvedValue(""),
    isJulesApiConfigured: () => true,
    loadSubtasks: vi.fn().mockResolvedValue([]),
    listSessions: vi.fn().mockResolvedValue({ sessions: [] }),
    updateLastStatus: vi.fn(),
    completedSprints: new Set<number>(),
    getCiStatusForScope: vi.fn().mockResolvedValue(null),
    isActionRequiredState: (state?: string) => state === "AWAITING_PLAN_APPROVAL" || state === "AWAITING_USER_FEEDBACK" || state === "PAUSED",
    resolveSessionName: (s: any) => s.name,
    extractSessionId: (s: any) => s.id,
    fetchRecentActivities: vi.fn().mockResolvedValue([]),
    listSessions,
    loadSubtasks,
    startTask: vi.fn(),
    getGuideContent,
    updateLastStatus: vi.fn(),
    getDashboardSettings: () => DEFAULT_DASHBOARD_SETTINGS,
    isJulesApiConfigured: () => true,
    approveSessionPlan: vi.fn().mockResolvedValue({}),
    sendSessionMessage: vi.fn().mockResolvedValue({}),
    getCiStatusForScope: vi.fn().mockResolvedValue(null),
    autoMergeFeaturePr: vi.fn().mockResolvedValue({ ok: true }),
    renderInstruction: vi.fn(async (templateId: string, variables: Record<string, unknown>) => {
      if (templateId === "planningMissing" && typeof variables.subtasks_dir === "string") {
        return `### 🛑 ACTION REQUIRED: Sprint Planning Missing\n\nNo subtasks found in \`${variables.subtasks_dir}\`.`;
      }
      if (templateId === "branchMissing" && typeof variables.feature_branch === "string") {
        return `### 🛑 ACTION REQUIRED: Branch Configuration Missing\n\nThe feature branch \`${variables.feature_branch}\` is not ready.`;
      }
      if (templateId === "actionRequiredAgentHeader") {
        return "\n### 🤖 AGENT INTERVENTION NEEDED\n";
      }
      if (templateId === "actionRequiredAgentTask" || templateId === "actionRequiredHumanTask") {
        return `- **Task ${variables.task_id}** is \`${variables.session_state}\`.`;
      }
      if (templateId === "actionRequiredHumanHeader") {
        return "\n### ✋ HUMAN INTERVENTION NEEDED\n";
      }
      if (templateId === "watchHeader") {
        return "### Sprint Header";
      }
      return "";
    }),
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    },
  };
};

describe("SprintOrchestrator - Core", () => {
  it("forces single-cycle execution for status even when wait=true", async () => {
    const deps = buildDeps();
    const orchestrator = new SprintOrchestrator(deps as any);

    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "sprint-orch-status-core-"));
    const subtasksDir = path.join(tmpRoot, ".jules-subagents", "sprints", "sprint1-subtasks");
    await fs.mkdir(subtasksDir, { recursive: true });
    await fs.writeFile(path.join(subtasksDir, "01-task.md"), "title: test\nprompt: x\n", "utf-8");

    (deps.loadSubtasks as any).mockResolvedValue([buildMockSubtask({ id: "01-task", status: "RUNNING" })]);

    const result = await orchestrator.execute({
      sprint_number: 1,
      repo_path: tmpRoot,
      source_id: "sources/123",
      action: "status",
      wait: true,
    });

    expect(result.content[0].text).toContain("Status Action is Instant");
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });
});
