import { randomUUID } from "node:crypto";
import { RepositoryError, ConcurrencyConflictError, EntityNotFoundError } from "../repository-utils.js";
import {
  requireProject,
  requireSprint,
  requireSprintRun,
  requireSprintRunScoped,
  requireTask,
  requireTaskDispatch,
  requireConnection,
  requireTaskRun,
  requireLease,
  requireProviderInvocationUsage
} from "./execution-validators.js";
import { serializePayloadJson } from "../repository-utils.js";
import type { ExecutionRepository } from "../execution-repository.js";
import type {
  SprintRunRecord, CreateSprintRunInput, UpdateSprintRunInput,
  TaskRunRecord, CreateTaskRunInput, UpdateTaskRunInput,
  TaskDispatchRecord, CreateTaskDispatchInput, UpdateTaskDispatchInput,
  ExecutionLeaseRecord, AcquireExecutionLeaseInput, RenewExecutionLeaseInput,
  CreateProviderInvocationUsageInput, UpdateProviderInvocationUsageInput, ProviderInvocationUsageRecord
} from "../../contracts/execution-types.js";
import type {
  ExecutionInvocationRecord,
  ExecutionInvocationMessageRecord,
  CreateExecutionInvocationInput,
  UpdateExecutionInvocationInput,
  AppendExecutionInvocationMessageInput
} from "../../contracts/invocation-types.js";

export function createTaskRun(repo: ExecutionRepository, input: CreateTaskRunInput): TaskRunRecord {
    try {
      requireProject(repo.db, input.projectId);
      requireSprint(repo.db, input.sprintId, input.projectId);
      requireTask(repo.db, input.taskId, input.projectId, input.sprintId);
      if (input.sprintRunId) {
        requireSprintRunScoped((id: string) => repo.getSprintRun(id), input.sprintRunId, input.projectId, input.sprintId);
      }
      if (input.dispatchId) {
        requireTaskDispatch((id: string) => repo.getTaskDispatch(id), input.dispatchId);
      }
      if (input.connectionId) {
        requireConnection(repo.db, input.connectionId);
      }

      const id = randomUUID();
      repo.db.prepare(`
        INSERT INTO task_runs (
          id, project_id, sprint_id, task_id, sprint_run_id, dispatch_id, connection_id, provider, mode,
          session_id, session_name, state, worker_branch, pr_url, started_at, finished_at, duration_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.projectId,
        input.sprintId,
        input.taskId,
        input.sprintRunId ?? null,
        input.dispatchId ?? null,
        input.connectionId ?? null,
        input.provider ?? null,
        input.mode ?? null,
        input.sessionId ?? null,
        input.sessionName ?? null,
        input.state,
        input.workerBranch ?? null,
        input.prUrl ?? null,
        input.startedAt ?? null,
        input.finishedAt ?? null,
        input.durationMs ?? null
      );

      const created = requireTaskRun((id: string) => repo.getTaskRun(id), id);
      if (created.taskId) repo.taskWallTimeCache.delete(created.taskId);
      if (created.sprintRunId) repo.sprintRunWallTimeCache.delete(created.sprintRunId);
      repo.notifyRealtime(created.projectId, false);
      return created;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      repo.logger.error("Operation failed", { error, projectId: input.projectId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
  }

export function updateTaskRun(repo: ExecutionRepository, taskRunId: string, input: UpdateTaskRunInput): TaskRunRecord {
    try {
      const current = requireTaskRun((id: string) => repo.getTaskRun(id), taskRunId);
      repo.db.prepare(`
        UPDATE task_runs
        SET connection_id = ?, provider = ?, mode = ?, session_id = ?, session_name = ?, state = ?, worker_branch = ?,
            pr_url = ?, started_at = ?, finished_at = ?, duration_ms = ?
        WHERE id = ?
      `).run(
        input.connectionId === undefined ? current.connectionId : input.connectionId,
        input.provider === undefined ? current.provider : input.provider,
        input.mode === undefined ? current.mode : input.mode,
        input.sessionId === undefined ? current.sessionId : input.sessionId,
        input.sessionName === undefined ? current.sessionName : input.sessionName,
        input.state === undefined ? current.state : input.state,
        input.workerBranch === undefined ? current.workerBranch : input.workerBranch,
        input.prUrl === undefined ? current.prUrl : input.prUrl,
        input.startedAt === undefined ? current.startedAt : input.startedAt,
        input.finishedAt === undefined ? current.finishedAt : input.finishedAt,
        input.durationMs === undefined ? current.durationMs : input.durationMs,
        taskRunId
      );
      const updated = requireTaskRun((id: string) => repo.getTaskRun(id), taskRunId);
      if (updated.taskId) repo.taskWallTimeCache.delete(updated.taskId);
      if (updated.sprintRunId) repo.sprintRunWallTimeCache.delete(updated.sprintRunId);
      repo.notifyRealtime(updated.projectId, false);
      return updated;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      repo.logger.error("Operation failed", { error, taskRunId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
  }

export function updateTaskRunsBatch(repo: ExecutionRepository, runs: Array<{id: string} & UpdateTaskRunInput>): void {
    if (runs.length === 0) return;
    repo.db.transaction(() => {
      for (const run of runs) {
        repo.updateTaskRun(run.id, run);
      }
    });
  }

export function appendTaskRunEvent(repo: ExecutionRepository,
    taskRunId: string,
    eventType: string,
    originator: string,
    payload: Record<string, unknown>,
    options?: { createdAt?: string; sourceEventKey?: string | null },
  ): boolean {
    const taskRun = requireTaskRun((id: string) => repo.getTaskRun(id), taskRunId);
    if (taskRun.taskId) repo.taskWallTimeCache.delete(taskRun.taskId);
    if (taskRun.sprintRunId) repo.sprintRunWallTimeCache.delete(taskRun.sprintRunId);
    const result = repo.db.prepare(`
      INSERT OR IGNORE INTO task_run_events (id, task_run_id, event_type, originator, payload_json, source_event_key, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      taskRunId,
      eventType,
      originator,
      serializePayloadJson(payload),
      options?.sourceEventKey ?? null,
      options?.createdAt || new Date().toISOString()
    );
    const inserted = Number((result as { changes?: number }).changes || 0) > 0;
    if (inserted) {
      repo.notifyRealtime(taskRun.projectId, false);
    }
    return inserted;
  }
