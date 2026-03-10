import { afterEach, describe, expect, it } from "vitest";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { AppDbStorage } from "../../../src/repositories/app-db-storage.js";
import { ProjectManagementRepository } from "../../../src/repositories/project-management-repository.js";
import { ConnectionChatRepository } from "../../../src/repositories/connection-chat-repository.js";
import { ExecutionRepository } from "../../../src/repositories/execution-repository.js";
import { RuntimeCleanupService } from "../../../src/services/runtime-cleanup-service.js";

const tempDirs: string[] = [];

async function createRepositories(): Promise<{
  storage: AppDbStorage;
  projectRepository: ProjectManagementRepository;
  connectionRepository: ConnectionChatRepository;
  executionRepository: ExecutionRepository;
  cleanupService: RuntimeCleanupService;
}> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sprint-os-runtime-cleanup-"));
  tempDirs.push(dir);
  const storage = new AppDbStorage(path.join(dir, "app.db"));
  const projectRepository = new ProjectManagementRepository(storage);
  const connectionRepository = new ConnectionChatRepository(storage);
  const executionRepository = new ExecutionRepository(storage);
  const cleanupService = new RuntimeCleanupService(
    connectionRepository,
    executionRepository,
    projectRepository,
  );

  return {
    storage,
    projectRepository,
    connectionRepository,
    executionRepository,
    cleanupService,
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("RuntimeCleanupService", () => {
  it("blocks worker dispatches whose leases expire and resets the task for recovery", async () => {
    const {
      projectRepository,
      connectionRepository,
      executionRepository,
      cleanupService,
    } = await createRepositories();

    const project = projectRepository.createProject({
      name: "Cleanup Execution Project",
      sourceType: "local",
      sourceRef: "/workspace/cleanup-execution-project",
    });
    const sprint = projectRepository.createSprint(project.id, {
      name: "Cleanup Sprint",
      number: 12,
      status: "running",
    });
    const task = projectRepository.createTask(project.id, {
      sprintId: sprint.id,
      title: "Recover abandoned worker dispatch",
      status: "in_progress",
      executorType: "mcp_worker",
    });
    const worker = connectionRepository.upsertConnection({
      connectionKey: "cleanup-worker-1",
      displayName: "Cleanup Worker 1",
      role: "worker",
      transport: "stdio",
      status: "connected",
      projectIds: [project.id],
      activeProjectIds: [project.id],
    });

    const sprintRun = executionRepository.createSprintRun({
      projectId: project.id,
      sprintId: sprint.id,
      status: "cancel_requested",
      executorMode: "mcp_worker",
      triggerType: "dashboard",
    });
    const dispatch = executionRepository.createTaskDispatch({
      projectId: project.id,
      sprintId: sprint.id,
      taskId: task.id,
      sprintRunId: sprintRun.id,
      executorType: "mcp_worker",
      connectionId: worker.id,
      status: "running",
    });
    const taskRun = executionRepository.createTaskRun({
      projectId: project.id,
      sprintId: sprint.id,
      taskId: task.id,
      sprintRunId: sprintRun.id,
      dispatchId: dispatch.id,
      connectionId: worker.id,
      provider: "codex",
      mode: "mcp_worker",
      state: "RUNNING",
      startedAt: "2026-03-10T11:30:00.000Z",
    });

    executionRepository.acquireLease({
      scopeType: "task_dispatch",
      scopeId: dispatch.id,
      ownerKey: worker.connectionKey,
      leaseToken: "lease-dispatch-1",
      expiresAt: "2026-03-10T11:40:00.000Z",
    });

    const result = cleanupService.cleanup(new Date("2026-03-10T12:00:00.000Z"));
    expect(result.blockedDispatchIds).toEqual([dispatch.id]);

    const blockedDispatch = executionRepository.getTaskDispatch(dispatch.id);
    expect(blockedDispatch).toMatchObject({
      id: dispatch.id,
      status: "blocked",
      connectionId: null,
    });
    expect(blockedDispatch?.errorMessage).toContain("Worker lease expired");

    const blockedTaskRun = executionRepository.getTaskRun(taskRun.id);
    expect(blockedTaskRun).toMatchObject({
      id: taskRun.id,
      state: "BLOCKED",
      connectionId: null,
      finishedAt: "2026-03-10T12:00:00.000Z",
    });
    expect(blockedTaskRun?.durationMs).toBe(30 * 60 * 1000);

    const taskEvents = executionRepository.listTaskRunEvents(taskRun.id);
    expect(taskEvents[0]).toMatchObject({
      eventType: "worker_lease_expired",
      originator: "system",
    });

    const resetTask = projectRepository.getTask(task.id);
    expect(resetTask?.status).toBe("pending");
    expect(executionRepository.getLease("task_dispatch", dispatch.id)).toBeNull();

    const cancelledSprintRun = executionRepository.getSprintRun(sprintRun.id);
    expect(cancelledSprintRun).toMatchObject({
      id: sprintRun.id,
      status: "cancelled",
    });
    expect(cancelledSprintRun?.finishedAt).not.toBeNull();
  });
});
