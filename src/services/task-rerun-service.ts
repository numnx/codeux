import type { ProviderId, Subtask } from "../contracts/app-types.js";
import type { StartSprintDispatchResult } from "./sprint-task-dispatch-service.js";
import type { Logger } from "../shared/logging/logger.js";

export interface TaskRerunContext {
  task: Subtask;
  projectId: string;
  sprintId: string;
  sprintNumber: number;
  sourceId?: string;
  repoPath: string;
  featureBranch: string;
}

export interface TaskRerunOptions {
  provider?: ProviderId;
  clearWorktree?: boolean;
}

export interface TaskRerunServiceDependencies {
  resolveTaskContext: (taskId: string) => TaskRerunContext | null;
  updateTaskPlanningStatus: (taskId: string, status: "pending" | "in_progress" | "coding_completed" | "completed") => void;
  resolveSprintRunId: (args: {
    projectId: string;
    sprintId: string;
    sprintNumber: number;
    featureBranch: string;
  }) => Promise<string>;
  startTask: (args: {
    task: Subtask;
    projectId: string;
    sprintId: string;
    sprintRunId: string;
    sourceId?: string;
    featureBranch: string;
    repoPath: string;
    sprintNumber: number;
  }) => Promise<StartSprintDispatchResult>;
  resolveSessionName: (session: { id?: string; name?: string }) => string | undefined;
  extractSessionId: (session: { id?: string; name?: string }) => string | undefined;
  persistMergedFlag: (args: { taskId: string; merged: boolean }) => Promise<void>;
  clearTaskWorktree?: (args: { taskId: string; repoPath: string }) => Promise<void>;
  updateTaskExecutorOverride?: (taskId: string, provider: ProviderId) => void;
  cancelActiveDispatch?: (taskId: string, projectId: string) => Promise<void>;
  logger?: Logger;
}

const resetTaskState = (task: Subtask): Subtask => ({
  ...task,
  status: "PENDING",
  session_id: undefined,
  session_name: undefined,
  session_state: undefined,
  provider: undefined,
  worker_branch: undefined,
  pr_url: undefined,
  activities: [],
  is_merged: false,
  merge_indicator: undefined,
  intervention_owner: undefined,
  intervention_hint: undefined,
});

export class TaskRerunService {
  constructor(private readonly deps: TaskRerunServiceDependencies) {}

  async rerunTask(taskId: string, options?: TaskRerunOptions): Promise<Subtask> {
    const context = this.deps.resolveTaskContext(taskId);
    if (!context) {
      throw new Error("Cannot rerun task: sprint context is incomplete. Run orchestration/status first.");
    }

    // Cancel any active dispatch for this task before rerunning
    if (this.deps.cancelActiveDispatch) {
      try {
        await this.deps.cancelActiveDispatch(context.task.record_id || taskId, context.projectId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.deps.logger?.warn("Failed to cancel active dispatch during rerun", { taskId, message });
      }
    }

    // Apply provider override if requested
    if (options?.provider && this.deps.updateTaskExecutorOverride) {
      this.deps.updateTaskExecutorOverride(context.task.record_id || taskId, options.provider);
    }

    // Clear worktree if requested
    if (options?.clearWorktree && this.deps.clearTaskWorktree) {
      try {
        await this.deps.clearTaskWorktree({
          taskId: context.task.record_id || taskId,
          repoPath: context.repoPath,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.deps.logger?.warn("Failed to clear worktree during rerun", { taskId, message });
      }
    }

    const resetTask = resetTaskState(context.task);
    // Apply provider override to the reset task so dispatch picks it up
    if (options?.provider) {
      resetTask.provider = options.provider;
    }
    this.deps.updateTaskPlanningStatus(resetTask.record_id || taskId, "pending");

    try {
      await this.deps.persistMergedFlag({
        taskId: resetTask.record_id || resetTask.id,
        merged: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.deps.logger?.warn("Failed to persist merged=false while rerunning task", {
        taskId,
        message,
      });
    }

    try {
      const sprintRunId = await this.deps.resolveSprintRunId({
        projectId: context.projectId,
        sprintId: context.sprintId,
        sprintNumber: context.sprintNumber,
        featureBranch: context.featureBranch,
      });
      const session = await this.deps.startTask({
        task: resetTask,
        projectId: context.projectId,
        sprintId: context.sprintId,
        sprintRunId,
        sourceId: context.sourceId,
        featureBranch: context.featureBranch,
        repoPath: context.repoPath,
        sprintNumber: context.sprintNumber,
      });
      const restartedTask: Subtask = {
        ...resetTask,
        status: "RUNNING",
        session_name: this.deps.resolveSessionName(session),
        session_id: this.deps.extractSessionId(session),
        provider:
          session.provider === "jules" || session.provider === "gemini" || session.provider === "codex" || session.provider === "claude-code"
            ? session.provider
            : undefined,
      };
      return restartedTask;
    } catch (error) {
      throw error;
    }
  }
}
