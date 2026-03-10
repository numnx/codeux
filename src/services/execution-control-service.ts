import type { Subtask } from "../contracts/app-types.js";
import type { TaskDispatchRecord, SprintRunRecord, TaskRunRecord } from "../contracts/execution-types.js";
import type { ProjectManagementRepository } from "../repositories/project-management-repository.js";
import type { ProjectRuntimeRepository } from "../repositories/project-runtime-repository.js";
import type { ExecutionRepository } from "../repositories/execution-repository.js";
import type { TaskRerunService } from "./task-rerun-service.js";
import type { SprintOrchestrator } from "../sprint/sprint-orchestrator.js";
import type { Logger } from "../shared/logging/logger.js";

interface ExecutionControlServiceDeps {
  projectManagementRepository: ProjectManagementRepository;
  projectRuntimeRepository: ProjectRuntimeRepository;
  executionRepository: ExecutionRepository;
  taskRerunService: TaskRerunService;
  sprintOrchestrator: SprintOrchestrator;
  logger?: Logger;
}

export class ExecutionControlService {
  constructor(private readonly deps: ExecutionControlServiceDeps) {}

  async orchestrateSprint(projectId: string, sprintId: string): Promise<{ ok: true }> {
    const project = this.deps.projectManagementRepository.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    const sprint = this.deps.projectManagementRepository.getSprint(sprintId);
    if (!sprint || sprint.projectId !== projectId) {
      throw new Error(`Sprint not found in project: ${sprintId}`);
    }

    void this.deps.sprintOrchestrator.execute({
      action: "orchestrate",
      project_id: projectId,
      sprint_id: sprintId,
      wait: true,
    }).catch((error) => {
      this.deps.logger?.error("Dashboard-triggered sprint orchestration failed", {
        projectId,
        sprintId,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return { ok: true };
  }

  pauseSprintRun(sprintRunId: string): SprintRunRecord {
    const sprintRun = this.requireSprintRun(sprintRunId);
    if (sprintRun.status === "completed" || sprintRun.status === "failed" || sprintRun.status === "cancelled") {
      throw new Error(`Sprint run ${sprintRunId} is already terminal.`);
    }
    const now = new Date().toISOString();
    const updated = this.deps.executionRepository.updateSprintRun(sprintRunId, {
      status: "paused",
      lastHeartbeatAt: now,
    });
    this.deps.executionRepository.appendSprintRunEvent(sprintRunId, "sprint_pause_requested", "user", {
      requestedBy: "dashboard",
    }, {
      sourceEventKey: `dashboard-pause:${sprintRunId}`,
    });
    return updated;
  }

  cancelSprintRun(sprintRunId: string): SprintRunRecord {
    const sprintRun = this.requireSprintRun(sprintRunId);
    if (sprintRun.status === "completed" || sprintRun.status === "failed" || sprintRun.status === "cancelled") {
      throw new Error(`Sprint run ${sprintRunId} is already terminal.`);
    }

    const now = new Date().toISOString();
    const updated = this.deps.executionRepository.updateSprintRun(sprintRunId, {
      status: "cancelled",
      finishedAt: now,
      lastHeartbeatAt: now,
    });
    this.deps.executionRepository.appendSprintRunEvent(sprintRunId, "sprint_cancel_requested", "user", {
      requestedBy: "dashboard",
    }, {
      sourceEventKey: `dashboard-cancel:${sprintRunId}`,
    });

    for (const dispatch of this.deps.executionRepository.listTaskDispatches({
      projectId: sprintRun.projectId,
      sprintRunId,
    })) {
      if (dispatch.status === "queued" || dispatch.status === "claimed") {
        this.cancelDispatchInternal(dispatch, now, "Sprint run was cancelled from the dashboard.");
      }
    }

    return updated;
  }

  cancelTaskDispatch(dispatchId: string): TaskDispatchRecord {
    const dispatch = this.requireTaskDispatch(dispatchId);
    if (dispatch.status !== "queued" && dispatch.status !== "claimed") {
      throw new Error(`Only queued or claimed dispatches can be cancelled. Current status: ${dispatch.status}`);
    }

    const now = new Date().toISOString();
    return this.cancelDispatchInternal(dispatch, now, "Dispatch was cancelled from the dashboard.");
  }

  async retryTaskDispatch(dispatchId: string): Promise<Subtask> {
    const dispatch = this.requireTaskDispatch(dispatchId);
    if (dispatch.status === "queued" || dispatch.status === "claimed" || dispatch.status === "running") {
      throw new Error(`Only terminal dispatches can be retried. Current status: ${dispatch.status}`);
    }

    const task = this.deps.projectManagementRepository.getTask(dispatch.taskId);
    if (!task) {
      throw new Error(`Task not found for dispatch: ${dispatchId}`);
    }

    this.deps.executionRepository.appendTaskRunEvent(
      this.requireTaskRunForDispatch(dispatchId)?.id || this.ensureSyntheticTaskRun(dispatch),
      "dispatch_retry_requested",
      "user",
      {
        dispatchId,
        requestedBy: "dashboard",
      },
      {
        sourceEventKey: `dashboard-retry:${dispatchId}`,
      },
    );

    return await this.deps.taskRerunService.rerunTask(task.id);
  }

  private cancelDispatchInternal(dispatch: TaskDispatchRecord, now: string, message: string): TaskDispatchRecord {
    const updated = this.deps.executionRepository.updateTaskDispatch(dispatch.id, {
      status: "cancelled",
      finishedAt: now,
      lastHeartbeatAt: now,
      errorMessage: message,
    });
    const taskRun = this.requireTaskRunForDispatch(dispatch.id);
    if (taskRun) {
      this.deps.executionRepository.updateTaskRun(taskRun.id, {
        state: "BLOCKED",
        finishedAt: now,
        durationMs: this.calculateDurationMs(taskRun, now),
      });
      this.deps.executionRepository.appendTaskRunEvent(taskRun.id, "dispatch_cancelled", "user", {
        dispatchId: dispatch.id,
        requestedBy: "dashboard",
        reason: message,
      }, {
        sourceEventKey: `dashboard-dispatch-cancel:${dispatch.id}`,
      });
    }
    this.updateSelectedProjectStatus(dispatch.taskId, {
      status: "BLOCKED",
      session_state: "CANCELLED",
      intervention_owner: "HUMAN",
      intervention_hint: message,
    });
    return updated;
  }

  private updateSelectedProjectStatus(taskId: string, patch: Partial<Subtask>): void {
    const task = this.deps.projectManagementRepository.getTask(taskId);
    if (!task) {
      return;
    }
    const selectedStatus = this.deps.projectRuntimeRepository.getSelectedProjectStatus();
    if (selectedStatus.project_id !== task.projectId) {
      return;
    }
    const subtasks = Array.isArray(selectedStatus.subtasks) ? selectedStatus.subtasks : [];
    const updatedSubtasks = subtasks.map((subtask) => (
      subtask.record_id === taskId || subtask.id === task.taskKey
        ? { ...subtask, ...patch }
        : subtask
    ));
    this.deps.projectRuntimeRepository.syncDashboardStatus({
      ...selectedStatus,
      subtasks: updatedSubtasks,
      timestamp: new Date().toLocaleTimeString(),
    });
  }

  private ensureSyntheticTaskRun(dispatch: TaskDispatchRecord): string {
    const taskRun = this.deps.executionRepository.createTaskRun({
      projectId: dispatch.projectId,
      sprintId: dispatch.sprintId,
      taskId: dispatch.taskId,
      sprintRunId: dispatch.sprintRunId,
      dispatchId: dispatch.id,
      state: "BLOCKED",
      startedAt: dispatch.startedAt || dispatch.queuedAt,
      finishedAt: dispatch.finishedAt || new Date().toISOString(),
    });
    return taskRun.id;
  }

  private requireSprintRun(sprintRunId: string): SprintRunRecord {
    const sprintRun = this.deps.executionRepository.getSprintRun(sprintRunId);
    if (!sprintRun) {
      throw new Error(`Sprint run not found: ${sprintRunId}`);
    }
    return sprintRun;
  }

  private requireTaskDispatch(dispatchId: string): TaskDispatchRecord {
    const dispatch = this.deps.executionRepository.getTaskDispatch(dispatchId);
    if (!dispatch) {
      throw new Error(`Task dispatch not found: ${dispatchId}`);
    }
    return dispatch;
  }

  private requireTaskRunForDispatch(dispatchId: string): TaskRunRecord | null {
    return this.deps.executionRepository.getTaskRunByDispatchId(dispatchId);
  }

  private calculateDurationMs(taskRun: TaskRunRecord, finishedAt: string): number | null {
    if (!taskRun.startedAt) {
      return null;
    }
    return Math.max(0, new Date(finishedAt).getTime() - new Date(taskRun.startedAt).getTime());
  }
}
