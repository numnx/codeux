import type { Subtask } from "../../../contracts/app-types.js";
import type { MemoryCategory } from "../../../contracts/memory-types.js";
import type { TaskStatus as PlanningTaskStatus } from "../../../contracts/project-management-types.js";
import type { SprintOrchestratorDependencies } from "../../../sprint/sprint-orchestrator.js";

export interface TaskStateSnapshot {
  id: string;
  status: Subtask["status"];
  isMerged: boolean;
  mergeIndicator: Subtask["merge_indicator"];
}

export function snapshotTaskState(subtasks: Subtask[]): Map<string, TaskStateSnapshot> {
  return new Map(subtasks.map((task) => [task.id, {
    id: task.id,
    status: task.status,
    isMerged: Boolean(task.is_merged),
    mergeIndicator: task.merge_indicator,
  }]));
}

export function hasMergeStateChanges(previous: Map<string, TaskStateSnapshot>, subtasks: Subtask[]): boolean {
  return subtasks.some((task) => {
    const earlier = previous.get(task.id);
    if (!earlier) {
      return true;
    }
    return earlier.isMerged !== Boolean(task.is_merged);
  });
}

export async function captureTaskCompletionMemories(
  subtasks: Subtask[],
  preDerivationStates: Map<string, Subtask["status"]>,
  deps: {
    memoryService: SprintOrchestratorDependencies["memoryService"];
    logger: SprintOrchestratorDependencies["logger"];
  },
  context: {
    projectId: string;
    sprintId: string;
    planningAgentPresetId?: string;
  },
  settings: {
    memory?: { enabled: boolean; autoCaptureSprint: boolean };
  },
): Promise<void> {
  const memoryService = deps.memoryService;
  if (!memoryService || !settings?.memory?.enabled || !settings?.memory?.autoCaptureSprint) return;

  const pendingCaptures: { taskId: string; promise: Promise<void> }[] = [];
  for (const task of subtasks) {
    const prev = preDerivationStates.get(task.id);
    if (prev === task.status) continue;

    let category: MemoryCategory;
    let content: string;
    let strength: number;

    if (task.status === "COMPLETED" && prev !== "COMPLETED") {
      category = "context";
      content = `Task completed: ${task.id} — ${task.title}. ${task.prompt}`;
      strength = 0.7;
    } else if (task.status === "FAILED" && prev !== "FAILED") {
      category = "error";
      content = `Task failed: ${task.id} — ${task.title}. ${task.prompt}`;
      strength = 0.8;
    } else {
      continue;
    }

    pendingCaptures.push({
      taskId: task.id,
      promise: memoryService.createMemory(context.projectId, {
        scope: "sprint",
        sprintId: context.sprintId,
        agentPresetId: context.planningAgentPresetId ?? null,
        content,
        category,
        strength,
        source: {
          type: "auto_capture",
          originType: "task_status_change",
          originId: task.record_id || task.id,
        },
      }).then(() => {}),
    });
  }

  await captureMemoriesForTasks(pendingCaptures, deps.logger);
}

export async function captureCiFailureMemories(
  subtasks: Subtask[],
  preGateStates: Map<string, TaskStateSnapshot>,
  deps: {
    memoryService: SprintOrchestratorDependencies["memoryService"];
    logger: SprintOrchestratorDependencies["logger"];
  },
  context: {
    projectId: string;
    sprintId: string;
    planningAgentPresetId?: string;
  },
  settings: {
    memory?: { enabled: boolean; autoCaptureSprint: boolean };
  },
): Promise<void> {
  const memoryService = deps.memoryService;
  if (!memoryService || !settings?.memory?.enabled || !settings?.memory?.autoCaptureSprint) return;

  const pendingCaptures: { taskId: string; promise: Promise<void> }[] = [];
  for (const task of subtasks) {
    if (task.merge_indicator !== "CI") continue;
    const prev = preGateStates.get(task.id);
    if (prev && prev.mergeIndicator === "CI") continue; // already known

    const content = `CI failure detected for task ${task.id} — ${task.title}. Branch: ${task.worker_branch || "unknown"}. PR: ${task.pr_url || "none"}.`;

    pendingCaptures.push({
      taskId: task.id,
      promise: memoryService.createMemory(context.projectId, {
        scope: "sprint",
        sprintId: context.sprintId,
        agentPresetId: context.planningAgentPresetId ?? null,
        content,
        category: "error",
        strength: 0.7,
        source: {
          type: "auto_capture",
          originType: "ci_failure",
          originId: task.record_id || task.id,
        },
      }).then(() => {}),
    });
  }

  await captureMemoriesForTasks(pendingCaptures, deps.logger);
}

export async function reviewCompletedTasks(
  subtasks: Subtask[],
  preDerivationStates: Map<string, Subtask["status"]>,
  deps: {
    qualityAssuranceService: SprintOrchestratorDependencies["qualityAssuranceService"];
    logger: SprintOrchestratorDependencies["logger"];
  },
  context: {
    projectId: string;
    sprintId: string;
    sprintRunId?: string;
    repoPath: string;
  },
  settings: {
    agents: { qualityAssurance: { enabled: boolean } };
  },
): Promise<void> {
  if (!deps.qualityAssuranceService || !settings.agents.qualityAssurance.enabled) {
    return;
  }

  for (const task of subtasks) {
    const prev = preDerivationStates.get(task.id);
    if (task.status !== "COMPLETED" || prev === "COMPLETED") {
      continue;
    }

    const outcome = await deps.qualityAssuranceService.reviewCompletedTask({
      projectId: context.projectId,
      sprintId: context.sprintId,
      sprintRunId: context.sprintRunId,
      repoPath: context.repoPath,
      task,
      subtasks,
    });

    if (outcome.reopenedTask) {
      deps.logger.info("QA reopened completed task for follow-up fixes", {
        projectId: context.projectId,
        sprintId: context.sprintId,
        taskId: task.record_id || task.id,
        taskKey: task.id,
      });
    }
  }
}

async function captureMemoriesForTasks(
  captures: { taskId: string; promise: Promise<void> }[],
  logger: SprintOrchestratorDependencies["logger"],
): Promise<void> {
  if (captures.length === 0) return;

  const results = await Promise.allSettled(captures.map(p => p.promise));
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      logger.warn("Failed to auto-capture task memory", {
        taskId: captures[index].taskId,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  });
}

export function persistCiGateTaskStateChanges(
  previous: Map<string, TaskStateSnapshot>,
  subtasks: Subtask[],
  deps: {
    projectManagementRepository: SprintOrchestratorDependencies["projectManagementRepository"];
  },
): void {
  for (const task of subtasks) {
    const earlier = previous.get(task.id);
    if (!earlier || !task.record_id) {
      continue;
    }

    const statusChanged = earlier.status !== task.status;
    const mergeChanged = earlier.isMerged !== Boolean(task.is_merged);
    const mergeIndicatorChanged = earlier.mergeIndicator !== task.merge_indicator;
    if (!statusChanged && !mergeChanged && !mergeIndicatorChanged) {
      continue;
    }

    deps.projectManagementRepository.updateTask(task.record_id, {
      status: mapSubtaskStatusToPlanningStatus(task.status),
      isMerged: Boolean(task.is_merged),
      mergeIndicator: task.merge_indicator || null,
    });
  }
}

function mapSubtaskStatusToPlanningStatus(status: Subtask["status"]): PlanningTaskStatus {
  switch (status) {
    case "RUNNING":
      return "in_progress";
    case "COMPLETED":
      return "completed";
    case "PENDING":
    case "FAILED":
    case "BLOCKED":
    case "QUOTA":
    default:
      return "pending";
  }
}
