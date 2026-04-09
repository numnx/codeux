import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkerTaskDispatchService } from "../../../src/services/worker-task-dispatch-service.js";

describe("WorkerTaskDispatchService", () => {
  let deps: any;
  let service: WorkerTaskDispatchService;

  beforeEach(() => {
    deps = {
      executionRepository: {
        getTaskDispatch: vi.fn(() => ({
          id: "dispatch-1",
          projectId: "project-1",
          sprintId: "sprint-1",
          taskId: "task-1",
          sprintRunId: "run-1",
          status: "running",
          startedAt: "2026-01-01T00:00:00.000Z",
          connectionId: null,
          errorMessage: null,
        })),
        getTaskRunByDispatchId: vi.fn(() => ({
          id: "task-run-1",
          provider: "codex",
          mode: "docker_cli",
          sessionId: null,
          sessionName: null,
          workerBranch: null,
          prUrl: null,
          startedAt: "2026-01-01T00:00:00.000Z",
          connectionId: null,
        })),
        getLease: vi.fn(() => ({ leaseToken: "lease-1" })),
        updateTaskDispatch: vi.fn((id: string, patch: Record<string, unknown>) => ({ id, ...patch })),
        updateTaskRun: vi.fn(),
        appendTaskRunEvent: vi.fn(),
        renewLease: vi.fn(),
        releaseLease: vi.fn(),
        finalizeSprintRunCancellationIfIdle: vi.fn(),
      },
      projectManagementRepository: {
        updateTask: vi.fn(),
        getTask: vi.fn(() => ({ id: "task-1", taskKey: "T01" })),
      },
      connectionChatRepository: {
        getConnectionByKey: vi.fn(() => ({ id: "conn-1", connectionKey: "worker-1", role: "worker" })),
        touchConnectionHeartbeat: vi.fn(),
      },
      workerEndpointRepository: {
        getWorkerEndpointByConnectionId: vi.fn(() => ({
          id: "worker-endpoint-1",
          endpointKey: "worker-1",
          capabilities: { canExecuteTasks: true },
        })),
        getWorkerEndpoint: vi.fn(() => ({
          id: "worker-endpoint-1",
          endpointKey: "worker-1",
        })),
      },
      projectWorkerAssignmentService: {
        noteWorkerActivity: vi.fn(),
      },
      projectAttentionService: {
        resolveItemsForDispatch: vi.fn(),
        openItem: vi.fn(),
      },
    };
    service = new WorkerTaskDispatchService(
      deps.executionRepository,
      deps.projectManagementRepository,
      deps.connectionChatRepository,
      deps.workerEndpointRepository,
      deps.projectWorkerAssignmentService,
      deps.projectAttentionService,
      (() => ({})) as any,
    );
  });

  it("does not return queued dispatches to connected workers anymore", () => {
    const result = service.pullNextDispatch({ connectionKey: "worker-1", projectId: "project-1" });

    expect(result).toBeNull();
    expect(deps.connectionChatRepository.touchConnectionHeartbeat).toHaveBeenCalledWith("conn-1", "listening");
  });

  it("updates dispatch state and resolves dispatch attention on completion", () => {
    const result = service.updateDispatch({
      connectionKey: "worker-1",
      dispatchId: "dispatch-1",
      leaseToken: "lease-1",
      state: "COMPLETED",
      summaryMarkdown: "done",
    });

    expect(deps.projectManagementRepository.updateTask).toHaveBeenCalledWith("task-1", { status: "coding_completed" });
    expect(deps.projectAttentionService.resolveItemsForDispatch).toHaveBeenCalledWith("dispatch-1", "worker_completed_dispatch");
    expect(deps.executionRepository.releaseLease).toHaveBeenCalledWith("task_dispatch", "dispatch-1", "lease-1");
    expect(result.controlAction).toBeNull();
  });

  it("opens a worker attention item when the worker reports BLOCKED", () => {
    service.updateDispatch({
      connectionKey: "worker-1",
      dispatchId: "dispatch-1",
      leaseToken: "lease-1",
      state: "BLOCKED",
      errorMessage: "waiting on human input",
    });

    expect(deps.projectAttentionService.openItem).toHaveBeenCalledWith(expect.objectContaining({
      attentionType: "worker_dispatch_blocked",
      ownerType: "worker",
      preferredWorkerEndpointId: "worker-endpoint-1",
    }));
  });
});
