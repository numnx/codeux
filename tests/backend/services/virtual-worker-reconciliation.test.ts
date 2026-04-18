import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { AppDbStorage } from "../../../src/repositories/app-db-storage.js";
import { SettingsRepository } from "../../../src/repositories/settings-repository.js";
import { SessionTrackingRepository } from "../../../src/repositories/session-tracking-repository.js";
import { ProjectManagementRepository } from "../../../src/repositories/project-management-repository.js";
import { ExecutionRepository } from "../../../src/repositories/execution-repository.js";
import { WorkerEndpointRepository } from "../../../src/repositories/worker-endpoint-repository.js";
import { ProjectWorkerAssignmentRepository } from "../../../src/repositories/project-worker-assignment-repository.js";
import { ProjectAttentionRepository } from "../../../src/repositories/project-attention-repository.js";
import { ProjectWorkerAssignmentService } from "../../../src/domain/workers/project-worker-assignment-service.js";
import { ProjectAttentionService } from "../../../src/domain/workers/project-attention-service.js";
import { WorkerTaskDispatchService } from "../../../src/services/worker-task-dispatch-service.js";
import { VirtualWorkerService } from "../../../src/services/virtual-worker-service.js";
import { DEFAULT_DASHBOARD_SETTINGS } from "../../../src/repositories/settings-defaults.js";
import { DashboardRealtimeEventRepository } from "../../../src/repositories/dashboard-realtime-event-repository.js";
import { DashboardRealtimeService } from "../../../src/services/dashboard-realtime-service.js";

const tempDirs: string[] = [];

async function createFixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "virtual-worker-reconciliation-"));
  tempDirs.push(dir);
  const appStorage = new AppDbStorage(path.join(dir, "app.db"));
  const settingsRepository = new SettingsRepository(path.join(dir, "settings.db"));
  const sessionTracking = new SessionTrackingRepository(path.join(dir, "session-tracking.db"));
  const dashboardRealtimeEventRepository = new DashboardRealtimeEventRepository(appStorage);
  const dashboardRealtimeService = new DashboardRealtimeService(
    dashboardRealtimeEventRepository,
    { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } as any,
  );
  const projectManagementRepository = new ProjectManagementRepository(appStorage, dashboardRealtimeService);
  const executionRepository = new ExecutionRepository(appStorage, dashboardRealtimeService);
  const workerEndpointRepository = new WorkerEndpointRepository(appStorage);
  const projectWorkerAssignmentRepository = new ProjectWorkerAssignmentRepository(appStorage);
  const projectAttentionRepository = new ProjectAttentionRepository(appStorage, dashboardRealtimeService);
  const projectWorkerAssignmentService = new ProjectWorkerAssignmentService(
    projectWorkerAssignmentRepository,
    workerEndpointRepository,
  );
  const projectAttentionService = new ProjectAttentionService(
    projectAttentionRepository,
    projectWorkerAssignmentRepository,
    () => "VIRTUAL",
  );
  const workerTaskDispatchService = new WorkerTaskDispatchService(
    executionRepository,
    projectManagementRepository,
    {} as any,
    workerEndpointRepository,
    projectWorkerAssignmentService,
    projectAttentionService,
    () => DEFAULT_DASHBOARD_SETTINGS,
    () => "VIRTUAL",
  );

  return {
    dir,
    settingsRepository,
    sessionTracking,
    projectManagementRepository,
    executionRepository,
    workerEndpointRepository,
    projectWorkerAssignmentRepository,
    projectAttentionService,
    workerTaskDispatchService,
    dashboardRealtimeService,
    projectAttentionRepository,
  };
}

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("VirtualWorkerService Event-Driven Reconciliation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("schedules project when project.structure.updated event is received", async () => {
    const {
      projectManagementRepository,
      dashboardRealtimeService,
      settingsRepository,
      sessionTracking,
      executionRepository,
      workerEndpointRepository,
      projectWorkerAssignmentRepository,
      projectAttentionService,
      workerTaskDispatchService,
    } = await createFixture();

    const project = projectManagementRepository.createProject({
      name: "Test Project",
      sourceType: "local",
      sourceRef: "/workspace/test-project",
      defaultBranch: "main",
    });

    // Add attention item so project needs virtual worker
    projectAttentionService.openItem({
        projectId: project.id,
        sprintId: null,
        taskId: null,
        sprintRunId: null,
        dispatchId: null,
        attentionType: "action_required",
        severity: "high",
        ownerType: "worker",
        title: "Test attention",
        summaryMarkdown: "Needs worker action.",
        payload: null,
    });

    const virtualWorkerService = new VirtualWorkerService({
      settingsRepository,
      sessionTracking,
      executionRepository,
      projectManagementRepository,
      workerEndpointRepository,
      projectWorkerAssignmentRepository,
      projectWorkerAssignmentService: new ProjectWorkerAssignmentService(
        projectWorkerAssignmentRepository,
        workerEndpointRepository,
      ),
      projectAttentionService,
      workerTaskDispatchService,
      dashboardRealtimeService,
      cliWorkflowService: { startTask: vi.fn() } as any,
      sprintExecutionStateService: {} as any,
      workerInboxReplyService: {} as any,
      instructionService: {} as any,
      approveSessionPlan: vi.fn(),
      sendSessionMessage: vi.fn(),
    });

    const scheduleSpy = vi.spyOn(virtualWorkerService, "scheduleProject");
    const cycleSpy = vi.spyOn(virtualWorkerService as any, "runProjectCycle");

    virtualWorkerService.start();

    // Trigger event
    dashboardRealtimeService.publishRawEvent({
        scopeType: "project",
        scopeId: project.id,
        eventType: "project.structure.updated",
        entityType: "project",
        entityId: project.id,
        projectId: project.id,
        payload: { projectId: project.id, updatedAt: new Date().toISOString() },
        replayable: false,
    });

    expect(scheduleSpy).toHaveBeenCalledWith(project.id, "realtime:project.structure.updated");
    
    // Check if it actually scheduled (debounce)
    await vi.advanceTimersByTimeAsync(100);
    expect(cycleSpy).toHaveBeenCalled();
  });

  it("schedules project when project.execution.updated event is received", async () => {
    const {
      projectManagementRepository,
      dashboardRealtimeService,
      settingsRepository,
      sessionTracking,
      executionRepository,
      workerEndpointRepository,
      projectWorkerAssignmentRepository,
      projectAttentionService,
      workerTaskDispatchService,
    } = await createFixture();

    const project = projectManagementRepository.createProject({
      name: "Test Project",
      sourceType: "local",
      sourceRef: "/workspace/test-project",
      defaultBranch: "main",
    });

    // Add attention item
    projectAttentionService.openItem({
        projectId: project.id,
        sprintId: null,
        taskId: null,
        sprintRunId: null,
        dispatchId: null,
        attentionType: "action_required",
        severity: "high",
        ownerType: "worker",
        title: "Test attention",
        summaryMarkdown: "Needs worker action.",
        payload: null,
    });

    const virtualWorkerService = new VirtualWorkerService({
      settingsRepository,
      sessionTracking,
      executionRepository,
      projectManagementRepository,
      workerEndpointRepository,
      projectWorkerAssignmentRepository,
      projectWorkerAssignmentService: new ProjectWorkerAssignmentService(
        projectWorkerAssignmentRepository,
        workerEndpointRepository,
      ),
      projectAttentionService,
      workerTaskDispatchService,
      dashboardRealtimeService,
      cliWorkflowService: { startTask: vi.fn() } as any,
      sprintExecutionStateService: {} as any,
      workerInboxReplyService: {} as any,
      instructionService: {} as any,
      approveSessionPlan: vi.fn(),
      sendSessionMessage: vi.fn(),
    });

    const scheduleSpy = vi.spyOn(virtualWorkerService, "scheduleProject");

    virtualWorkerService.start();

    // Trigger event
    dashboardRealtimeService.publishRawEvent({
        scopeType: "project",
        scopeId: project.id,
        eventType: "project.execution.updated",
        entityType: "project",
        entityId: project.id,
        projectId: project.id,
        payload: {},
        replayable: false,
    });

    expect(scheduleSpy).toHaveBeenCalledWith(project.id, "realtime:project.execution.updated");
  });

  it("periodic reconciliation still works with longer interval", async () => {
    const {
      projectManagementRepository,
      dashboardRealtimeService,
      settingsRepository,
      sessionTracking,
      executionRepository,
      workerEndpointRepository,
      projectWorkerAssignmentRepository,
      projectAttentionService,
      workerTaskDispatchService,
    } = await createFixture();

    const project = projectManagementRepository.createProject({
      name: "Test Project",
      sourceType: "local",
      sourceRef: "/workspace/test-project",
      defaultBranch: "main",
    });

    projectAttentionService.openItem({
        projectId: project.id,
        sprintId: null,
        taskId: null,
        sprintRunId: null,
        dispatchId: null,
        attentionType: "action_required",
        severity: "high",
        ownerType: "worker",
        title: "Test attention",
        summaryMarkdown: "Needs worker action.",
        payload: null,
    });

    const virtualWorkerService = new VirtualWorkerService({
      settingsRepository,
      sessionTracking,
      executionRepository,
      projectManagementRepository,
      workerEndpointRepository,
      projectWorkerAssignmentRepository,
      projectWorkerAssignmentService: new ProjectWorkerAssignmentService(
        projectWorkerAssignmentRepository,
        workerEndpointRepository,
      ),
      projectAttentionService,
      workerTaskDispatchService,
      dashboardRealtimeService,
      cliWorkflowService: { startTask: vi.fn() } as any,
      sprintExecutionStateService: {} as any,
      workerInboxReplyService: {} as any,
      instructionService: {} as any,
      approveSessionPlan: vi.fn(),
      sendSessionMessage: vi.fn(),
    });

    virtualWorkerService.start();
    
    // Clear initial reconcile call
    await vi.advanceTimersByTimeAsync(100);
    await vi.runAllTicks();
    expect(workerEndpointRepository.listWorkerEndpoints().filter(e => e.endpointType === "virtual_cli")).toHaveLength(0); // Cycle finished and endpoint deleted

    const reconcileSpy = vi.spyOn(virtualWorkerService, "reconcile");
    
    // Advance by 30s - should NOT reconcile yet
    await vi.advanceTimersByTimeAsync(30000);
    expect(reconcileSpy).not.toHaveBeenCalled();

    // Advance by another 30s - should reconcile now
    await vi.advanceTimersByTimeAsync(30000);
    expect(reconcileSpy).toHaveBeenCalled();
  });
});
