import type { ManageCodeUxArgs, ManagementResponseEnvelope } from "../../contracts/internal-management-types.js";
import type { ProjectManagementRepository } from "../../repositories/project-management-repository.js";
import type { ExecutionControlService } from "../../services/execution-control-service.js";
import type { ExecutionRepository } from "../../repositories/execution-repository.js";
import type { TaskRerunService } from "../../services/task-rerun-service.js";
import type { CreateTaskInput, TaskExecutorType, TaskPriority, TaskStatus, UpdateTaskInput } from "../../contracts/project-management-types.js";
import type { ProviderId } from "../../contracts/app-types.js";

const VALID_PRIORITIES: TaskPriority[] = ["critical", "high", "medium", "low"];
const VALID_TASK_STATUSES: TaskStatus[] = ["pending", "in_progress", "coding_completed", "completed", "QA_REVIEW_FAILED"];
const VALID_EXECUTOR_TYPES: TaskExecutorType[] = ["auto", "docker_cli", "jules"];

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  return typeof payload[key] === "string" ? payload[key].trim() : undefined;
}

function readNullableString(payload: Record<string, unknown>, key: string): string | null | undefined {
  if (!(key in payload)) {
    return undefined;
  }
  if (payload[key] === null) {
    return null;
  }
  return typeof payload[key] === "string" ? payload[key].trim() : undefined;
}

function readRequiredString(payload: Record<string, unknown>, key: string): string {
  const value = readString(payload, key);
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function readStringAlias(payload: Record<string, unknown>, primaryKey: string, aliasKey: string): string | undefined {
  return readString(payload, primaryKey) || readString(payload, aliasKey);
}

function parsePriority(val: unknown): TaskPriority | undefined {
  if (typeof val === "string") {
    const normalized = val.toLowerCase();
    if (VALID_PRIORITIES.includes(normalized as TaskPriority)) {
      return normalized as TaskPriority;
    }
  }
  return undefined;
}

function parseStatus(val: unknown): TaskStatus | undefined {
  return typeof val === "string" && VALID_TASK_STATUSES.includes(val as TaskStatus)
    ? val as TaskStatus
    : undefined;
}

function parseExecutorType(val: unknown): TaskExecutorType | undefined {
  return typeof val === "string" && VALID_EXECUTOR_TYPES.includes(val as TaskExecutorType)
    ? val as TaskExecutorType
    : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const output = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return output;
}

function readSortOrder(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export class TaskActions {
  constructor(
    private readonly projectManagementRepository: ProjectManagementRepository,
    private readonly executionControlService: ExecutionControlService,
    private readonly executionRepository: ExecutionRepository,
    private readonly taskRerunService: TaskRerunService,
  ) {}

  async handleTaskAction(args: ManageCodeUxArgs): Promise<ManagementResponseEnvelope> {
    const payload = args.payload || {};

    switch (args.action) {
      case "list":
        return this.listTasks(payload);
      case "get":
        return this.getTask(payload);
      case "create":
        return this.createTask(payload);
      case "update":
        return this.updateTask(payload);
      case "delete":
        return this.deleteTask(args);
      case "start":
        return this.startTask(payload);
      case "stop":
        return this.stopTask(payload);
      case "force_stop":
        return this.forceStopTask(payload);
      case "pause":
        return this.pauseTask(payload);
      case "inspect_run":
        return this.inspectRun(payload);
      default:
        throw new Error(`Unknown task action: ${args.action}`);
    }
  }

  private listTasks(payload: Record<string, unknown>): ManagementResponseEnvelope {
    const projectId = readRequiredString(payload, "projectId");
    const sprintId = readString(payload, "sprintId");

    const tasks = this.projectManagementRepository.listTasks(projectId, sprintId);
    return { result: { tasks } };
  }

  private getTask(payload: Record<string, unknown>): ManagementResponseEnvelope {
    const taskId = readRequiredString(payload, "taskId");

    const task = this.projectManagementRepository.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return { result: { task } };
  }

  private createTask(payload: Record<string, unknown>): ManagementResponseEnvelope {
    const projectId = readRequiredString(payload, "projectId");
    const sprintId = readRequiredString(payload, "sprintId");

    const input: CreateTaskInput = {
      sprintId,
      title: readStringAlias(payload, "title", "name") || "New Task",
      promptMarkdown: readString(payload, "promptMarkdown") || "",
      description: readString(payload, "description") || "",
      priority: parsePriority(payload.priority) || "medium",
      executorType: parseExecutorType(payload.executorType) || "auto",
      status: parseStatus(payload.status) || "pending",
      dependsOnTaskIds: readStringArray(payload.dependsOnTaskIds) || [],
    };
    const taskKey = readString(payload, "taskKey");
    const agentPresetId = readNullableString(payload, "agentPresetId");
    const model = readNullableString(payload, "model");
    const sortOrder = readSortOrder(payload.sortOrder);

    if (taskKey) input.taskKey = taskKey;
    if (agentPresetId !== undefined) input.agentPresetId = agentPresetId;
    if (model !== undefined) input.model = model;
    if (sortOrder !== undefined) input.sortOrder = sortOrder;
    if (typeof payload.isIndependent === "boolean") input.isIndependent = payload.isIndependent;
    if (typeof payload.isMerged === "boolean") input.isMerged = payload.isMerged;

    const task = this.projectManagementRepository.createTask(projectId, input);

    return { result: { task } };
  }

  private updateTask(payload: Record<string, unknown>): ManagementResponseEnvelope {
    const taskId = readRequiredString(payload, "taskId");

    const updateInput: UpdateTaskInput = {};
    const title = readStringAlias(payload, "title", "name");
    const promptMarkdown = readString(payload, "promptMarkdown");
    const description = readString(payload, "description");
    const agentPresetId = readNullableString(payload, "agentPresetId");
    const model = readNullableString(payload, "model");
    const status = parseStatus(payload.status);
    const executorType = parseExecutorType(payload.executorType);
    const sortOrder = readSortOrder(payload.sortOrder);

    if (title) updateInput.title = title;
    if (promptMarkdown !== undefined) updateInput.promptMarkdown = promptMarkdown;
    if (description !== undefined) updateInput.description = description;
    if (status) updateInput.status = status;
    if (executorType) updateInput.executorType = executorType;
    if (agentPresetId !== undefined) updateInput.agentPresetId = agentPresetId;
    if (model !== undefined) updateInput.model = model;
    if (sortOrder !== undefined) updateInput.sortOrder = sortOrder;
    if (typeof payload.isIndependent === "boolean") updateInput.isIndependent = payload.isIndependent;
    if (typeof payload.isMerged === "boolean") updateInput.isMerged = payload.isMerged;

    const priority = parsePriority(payload.priority);
    if (priority) {
      updateInput.priority = priority;
    }

    const dependsOnTaskIds = readStringArray(payload.dependsOnTaskIds);
    if (dependsOnTaskIds) {
      updateInput.dependsOnTaskIds = dependsOnTaskIds;
    }

    const task = this.projectManagementRepository.updateTask(taskId, updateInput);
    if (!task) {
        throw new Error(`Task not found: ${taskId}`);
    }

    return { result: { task } };
  }

  private deleteTask(args: ManageCodeUxArgs): ManagementResponseEnvelope {
    const taskId = readRequiredString(args.payload || {}, "taskId");

    if (args.approval?.confirmed !== true) {
      return {
        approvalRequired: true,
        approvalMessage: `Are you sure you want to delete task ${taskId}?`,
      };
    }

    this.projectManagementRepository.deleteTask(taskId);
    return { result: { success: true } };
  }

  private async startTask(payload: Record<string, unknown>): Promise<ManagementResponseEnvelope> {
    const taskId = readRequiredString(payload, "taskId");

    const providerStr = readString(payload, "provider");
    const providerId = providerStr as ProviderId | undefined;

    const task = await this.taskRerunService.rerunTask(taskId, {
        provider: providerId,
    });
    return { result: { task } };
  }

  private async stopTask(payload: Record<string, unknown>): Promise<ManagementResponseEnvelope> {
    const taskId = readRequiredString(payload, "taskId");

    const task = this.projectManagementRepository.getTask(taskId);
    if (!task) {
        throw new Error(`Task not found: ${taskId}`);
    }

    const dispatches = this.executionRepository.listTaskDispatches({ projectId: task.projectId });
    const latestDispatch = dispatches.filter(d => d.taskId === taskId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!latestDispatch) {
        throw new Error(`No dispatch found for task: ${taskId}`);
    }

    const dispatch = await this.executionControlService.cancelTaskDispatch(latestDispatch.id);
    return { result: { dispatch } };
  }

  private async forceStopTask(payload: Record<string, unknown>): Promise<ManagementResponseEnvelope> {
    const taskId = readRequiredString(payload, "taskId");

    const task = this.projectManagementRepository.getTask(taskId);
    if (!task) {
        throw new Error(`Task not found: ${taskId}`);
    }

    const dispatches = this.executionRepository.listTaskDispatches({ projectId: task.projectId });
    const latestDispatch = dispatches.filter(d => d.taskId === taskId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!latestDispatch) {
        throw new Error(`No dispatch found for task: ${taskId}`);
    }

    const dispatch = await this.executionControlService.forceCancelTaskDispatch(latestDispatch.id);
    return { result: { dispatch } };
  }

  private async pauseTask(payload: Record<string, unknown>): Promise<ManagementResponseEnvelope> {
    const taskId = readRequiredString(payload, "taskId");

    const task = this.projectManagementRepository.getTask(taskId);
    if (!task) {
        throw new Error(`Task not found: ${taskId}`);
    }

    const dispatches = this.executionRepository.listTaskDispatches({ projectId: task.projectId });
    const latestDispatch = dispatches.filter(d => d.taskId === taskId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!latestDispatch) {
        throw new Error(`No dispatch found for task: ${taskId}`);
    }

    const dispatch = await this.executionControlService.pauseTaskDispatch(latestDispatch.id);
    return { result: { dispatch } };
  }

  private inspectRun(payload: Record<string, unknown>): ManagementResponseEnvelope {
    const taskId = readRequiredString(payload, "taskId");

    const task = this.projectManagementRepository.getTask(taskId);
    if (!task) {
        throw new Error(`Task not found: ${taskId}`);
    }

    const dispatches = this.executionRepository.listTaskDispatches({ projectId: task.projectId });
    const latestDispatch = dispatches.filter(d => d.taskId === taskId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!latestDispatch) {
        return { result: { task, dispatch: null, taskRun: null } };
    }

    const taskRun = this.executionRepository.getTaskRunByDispatchId(latestDispatch.id);
    return { result: { task, dispatch: latestDispatch, taskRun } };
  }
}
