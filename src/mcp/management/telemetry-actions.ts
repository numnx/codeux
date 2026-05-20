import type { ManageCodeUxArgs, ManagementResponseEnvelope } from "../../contracts/internal-management-types.js";
import type { ExecutionRepository } from "../../repositories/execution-repository.js";

export class TelemetryActions {
  constructor(private readonly executionRepository: ExecutionRepository) {}

  async handleTelemetryAction(args: ManageCodeUxArgs): Promise<ManagementResponseEnvelope> {
    const { action, payload } = args;
    const safePayload = payload || {};

    try {
      switch (action) {
        case "get_project_execution_snapshot":
          return await this.getProjectExecutionSnapshot(safePayload);
        case "get_project_stats_snapshot":
          return await this.getProjectStatsSnapshot(safePayload);
        case "list_sprint_runs":
          return await this.listSprintRuns(safePayload);
        case "list_task_dispatches":
          return await this.listTaskDispatches(safePayload);
        case "list_execution_invocations":
          return await this.listExecutionInvocations(safePayload);
        case "list_execution_invocation_messages":
          return await this.listExecutionInvocationMessages(safePayload);
        default:
          throw new Error(`Unknown telemetry action: ${action}`);
      }
    } catch (error) {
      throw new Error(`Telemetry action '${action}' failed: ${(error as Error).message}`);
    }
  }

  private async getProjectExecutionSnapshot(payload: Record<string, unknown>): Promise<ManagementResponseEnvelope> {
    const projectId = typeof payload.projectId === "string" ? payload.projectId : undefined;
    if (!projectId) {
      throw new Error("Missing required 'projectId' for get_project_execution_snapshot");
    }
    const snapshot = await this.executionRepository.getProjectExecutionSnapshot(projectId);
    return {
      result: {
        status: "success",
        domain: "telemetry",
        action: "get_project_execution_snapshot",
        data: snapshot,
      },
    };
  }

  private async getProjectStatsSnapshot(payload: Record<string, unknown>): Promise<ManagementResponseEnvelope> {
    const projectId = typeof payload.projectId === "string" ? payload.projectId : undefined;
    if (!projectId) {
      throw new Error("Missing required 'projectId' for get_project_stats_snapshot");
    }
    const snapshot = await this.executionRepository.getProjectStatsSnapshot(projectId);
    return {
      result: {
        status: "success",
        domain: "telemetry",
        action: "get_project_stats_snapshot",
        data: snapshot,
      },
    };
  }

  private async listSprintRuns(payload: Record<string, unknown>): Promise<ManagementResponseEnvelope> {
    const projectId = typeof payload.projectId === "string" ? payload.projectId : undefined;
    const sprintId = typeof payload.sprintId === "string" ? payload.sprintId : undefined;
    if (!projectId || !sprintId) {
      throw new Error("Missing required 'projectId' or 'sprintId' for list_sprint_runs");
    }
    const runs = await this.executionRepository.listSprintRuns(projectId, sprintId);
    // keep response compact
    const compactRuns = runs.map((run) => ({
      id: run.id,
      sprintId: run.sprintId,
      status: run.status,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    }));
    return {
      result: {
        status: "success",
        domain: "telemetry",
        action: "list_sprint_runs",
        data: compactRuns,
      },
    };
  }

  private async listTaskDispatches(payload: Record<string, unknown>): Promise<ManagementResponseEnvelope> {
    const projectId = typeof payload.projectId === "string" ? payload.projectId : undefined;
    const sprintId = typeof payload.sprintId === "string" ? payload.sprintId : undefined;
    const taskId = typeof payload.taskId === "string" ? payload.taskId : undefined;
    if (!projectId || !sprintId || !taskId) {
      throw new Error("Missing required 'projectId', 'sprintId', or 'taskId' for list_task_dispatches");
    }
    const dispatches = await this.executionRepository.listTaskDispatches({ projectId, sprintId, taskId });
    const compactDispatches = dispatches.map((d) => ({
      id: d.id,
      taskId: d.taskId,
      status: d.status,
      assignedWorkerId: null, // assignedWorkerId doesn't exist on TaskDispatchRecord
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
    return {
      result: {
        status: "success",
        domain: "telemetry",
        action: "list_task_dispatches",
        data: compactDispatches,
      },
    };
  }

  private async listExecutionInvocations(payload: Record<string, unknown>): Promise<ManagementResponseEnvelope> {
    const projectId = typeof payload.projectId === "string" ? payload.projectId : undefined;
    const taskId = typeof payload.taskId === "string" ? payload.taskId : undefined;

    if (!projectId) {
      throw new Error("Missing required 'projectId' for list_execution_invocations");
    }

    const invocations = await this.executionRepository.listExecutionInvocations({ projectId, taskRunId: taskId });
    const compactInvocations = invocations.map((i) => ({
      id: i.id,
      type: i.type,
      status: i.status,
      provider: i.provider,
      messageCount: i.messageCount,
      lastMessageAt: i.lastMessageAt,
      createdAt: i.createdAt,
    }));
    return {
      result: {
        status: "success",
        domain: "telemetry",
        action: "list_execution_invocations",
        data: compactInvocations,
      },
    };
  }

  private async listExecutionInvocationMessages(payload: Record<string, unknown>): Promise<ManagementResponseEnvelope> {
    const invocationId = typeof payload.invocationId === "string" ? payload.invocationId : undefined;
    if (!invocationId) {
      throw new Error("Missing required 'invocationId' for list_execution_invocation_messages");
    }
    const messages = await this.executionRepository.listExecutionInvocationMessages(invocationId);
    const compactMessages = messages.map((m) => ({
      id: m.id,
      invocationId: m.invocationId,
      role: m.role,
      hasToolCalls: false, // toolCalls is not a property
      createdAt: m.createdAt,
    }));
    return {
      result: {
        status: "success",
        domain: "telemetry",
        action: "list_execution_invocation_messages",
        data: compactMessages,
      },
    };
  }
}
