import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { AppDbStorage } from "../../../src/repositories/app-db-storage.js";
import { ProjectManagementRepository } from "../../../src/repositories/project-management-repository.js";
import { ExecutionRepository } from "../../../src/repositories/execution-repository.js";
import { SprintActions } from "../../../src/mcp/management/sprint-actions.js";
import { TaskActions } from "../../../src/mcp/management/task-actions.js";
import type { ExecutionControlService } from "../../../src/services/execution-control-service.js";
import type { PlanningAgentService } from "../../../src/services/planning-agent-service.js";
import type { SprintIssueService } from "../../../src/services/sprint-issue-service.js";
import type { TaskRerunService } from "../../../src/services/task-rerun-service.js";

const tempDirs: string[] = [];

async function createHarness(): Promise<{
  projectRepository: ProjectManagementRepository;
  sprintActions: SprintActions;
  taskActions: TaskActions;
}> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "code-ux-mcp-management-"));
  tempDirs.push(dir);
  const storage = new AppDbStorage(path.join(dir, "app.db"));
  const projectRepository = new ProjectManagementRepository(storage);
  const executionRepository = new ExecutionRepository(storage);
  const executionControlService = {
    orchestrateSprint: vi.fn().mockResolvedValue({ ok: true }),
  } as unknown as ExecutionControlService;
  const sprintActions = new SprintActions({
    projectManagementRepository: projectRepository,
    executionControlService,
    executionRepository,
    planningAgentService: { planSprint: vi.fn() } as unknown as PlanningAgentService,
    sprintIssueService: { searchIssues: vi.fn() } as unknown as SprintIssueService,
  });
  const taskActions = new TaskActions(
    projectRepository,
    executionControlService,
    executionRepository,
    { rerunTask: vi.fn() } as unknown as TaskRerunService,
  );

  return { projectRepository, sprintActions, taskActions };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("MCP management actions with repository persistence", () => {
  it("creates and updates sprints from public MCP field aliases", async () => {
    const { projectRepository, sprintActions } = await createHarness();
    const project = projectRepository.createProject({
      name: "MCP Project",
      sourceType: "local",
      sourceRef: "/workspace/mcp-project",
    });

    const created = await sprintActions.handleSprintAction({
      domain: "sprints",
      action: "create",
      payload: {
        projectId: project.id,
        title: "MCP Sprint",
        goalMarkdown: "Build through MCP",
      },
    });
    const sprint = (created.result as { id: string; name: string; goal: string });

    expect(sprint.name).toBe("MCP Sprint");
    expect(sprint.goal).toBe("Build through MCP");

    const updated = await sprintActions.handleSprintAction({
      domain: "sprints",
      action: "update",
      payload: {
        sprintId: sprint.id,
        title: "Updated MCP Sprint",
        goalMarkdown: "Updated through MCP",
      },
    });

    expect(updated.result).toMatchObject({
      id: sprint.id,
      name: "Updated MCP Sprint",
      goal: "Updated through MCP",
    });
  });

  it("creates and updates tasks from public MCP payloads", async () => {
    const { projectRepository, sprintActions, taskActions } = await createHarness();
    const project = projectRepository.createProject({
      name: "MCP Task Project",
      sourceType: "local",
      sourceRef: "/workspace/mcp-task-project",
    });
    const sprintResult = await sprintActions.handleSprintAction({
      domain: "sprints",
      action: "create",
      payload: { projectId: project.id, title: "Task Sprint" },
    });
    const sprint = sprintResult.result as { id: string };

    const created = await taskActions.handleTaskAction({
      domain: "tasks",
      action: "create",
      payload: {
        projectId: project.id,
        sprintId: sprint.id,
        title: "MCP Task",
        promptMarkdown: "Implement it",
        priority: "high",
      },
    });
    const task = (created.result as { task: { id: string; title: string; priority: string } }).task;

    expect(task.title).toBe("MCP Task");
    expect(task.priority).toBe("high");

    const updated = await taskActions.handleTaskAction({
      domain: "tasks",
      action: "update",
      payload: {
        taskId: task.id,
        name: "Updated MCP Task",
        status: "completed",
      },
    });

    expect(updated.result).toMatchObject({
      task: {
        id: task.id,
        title: "Updated MCP Task",
        status: "completed",
      },
    });
  });
});
