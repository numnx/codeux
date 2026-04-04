import { afterEach, describe, expect, it } from "vitest";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { AppDbStorage } from "../../../src/repositories/app-db-storage.js";
import { ExecutionRepository } from "../../../src/repositories/execution-repository.js";
import { ProjectManagementRepository } from "../../../src/repositories/project-management-repository.js";
import { QualityAssuranceService } from "../../../src/services/quality-assurance-service.js";
import { DEFAULT_DASHBOARD_SETTINGS } from "../../../src/repositories/settings-defaults.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("QualityAssuranceService", () => {
  it("builds sprint review prompts with the full task instructions", async () => {
    const service = new QualityAssuranceService({
      projectManagementRepository: {} as any,
      executionRepository: {} as any,
      sessionTracking: {} as any,
      qaReviewRepository: {} as any,
      taskService: {} as any,
      agentPresetSyncService: {} as any,
      providerRunner: {} as any,
      getDashboardSettings: () => DEFAULT_DASHBOARD_SETTINGS,
      getGithubToken: () => undefined,
      sendSessionMessage: async () => ({}),
    });

    const prompt = (service as any).buildReviewPrompt({
      triggerType: "sprint_completion",
      projectName: "QA Project",
      sprintGoal: "Ship safely",
      agentInstructions: "Review the full sprint.",
      subtasks: [
        {
          id: "T1",
          title: "First task",
          prompt: "Implement the API contract end to end.",
          depends_on: [],
          is_independent: true,
          status: "COMPLETED",
          activities: [],
        },
        {
          id: "T2",
          title: "Second task",
          prompt: "Wire the dashboard to the new backend endpoint.",
          depends_on: ["T1"],
          is_independent: false,
          status: "COMPLETED",
          activities: [],
        },
      ],
      currentTask: null,
    });

    expect(prompt).toContain("## FULL TASK INSTRUCTIONS");
    expect(prompt).toContain("Implement the API contract end to end.");
    expect(prompt).toContain("Wire the dashboard to the new backend endpoint.");
    expect(prompt).toContain('"followUpTasks"');
  });

  it("creates sprint follow-up tasks from QA output", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "qa-service-"));
    tempDirs.push(dir);
    const storage = new AppDbStorage(path.join(dir, "app.db"));
    const projectRepository = new ProjectManagementRepository(storage);

    const project = projectRepository.createProject({
      name: "QA Project",
      sourceType: "local",
      sourceRef: dir,
    });
    const sprint = projectRepository.createSprint(project.id, {
      name: "Sprint 1",
      goal: "Ship safely",
      status: "running",
      featureBranch: "feature/sprint-1",
    });
    const task = projectRepository.createTask(project.id, {
      sprintId: sprint.id,
      taskKey: "T1",
      title: "Initial task",
      promptMarkdown: "Implement the initial feature.",
      status: "completed",
      isIndependent: true,
    });
    const service = new QualityAssuranceService({
      projectManagementRepository: projectRepository,
      executionRepository: new ExecutionRepository(storage),
      sessionTracking: {} as any,
      qaReviewRepository: {} as any,
      taskService: {} as any,
      agentPresetSyncService: {} as any,
      providerRunner: {} as any,
      getDashboardSettings: () => DEFAULT_DASHBOARD_SETTINGS,
      getGithubToken: () => undefined,
      sendSessionMessage: async () => ({}),
    });

    const createdTasks = (service as any).createSprintFollowUpTasks({
      projectId: project.id,
      sprintId: sprint.id,
      targetTask: null,
      fixInstructions: null,
      review: {
        verdict: "changes_requested",
        summary: "Need one more hardening pass.",
        findings: ["Missing rollback coverage."],
        fixInstructions: null,
        targetTaskKey: null,
        shouldHavePr: null,
        followUpTasks: [
          {
            title: "Add rollback coverage",
            promptMarkdown: "Add integration coverage for the rollback path and verify cleanup semantics.",
            description: "Cover the regression that QA found.",
            dependsOnTaskKeys: ["T1"],
            priority: "high",
          },
        ],
        raw: {},
      },
      existingSubtasks: [
        {
          record_id: task.id,
          project_id: project.id,
          sprint_id: sprint.id,
          id: "T1",
          title: "Initial task",
          prompt: "Implement the initial feature.",
          depends_on: [],
          is_independent: true,
          status: "COMPLETED",
        },
      ],
      sourceRunId: "qa-run-1",
    });

    const tasks = projectRepository.listTasks(project.id, sprint.id);
    expect(createdTasks).toHaveLength(1);
    expect(tasks).toHaveLength(2);
    expect(tasks[1]?.title).toBe("Add rollback coverage");
    expect(tasks[1]?.promptMarkdown).toContain("rollback path");
    expect(tasks[1]?.dependsOnTaskIds).toEqual([task.id]);
  });
});
