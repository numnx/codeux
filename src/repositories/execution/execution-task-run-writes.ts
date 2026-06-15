import { randomUUID } from "crypto";
import { CreateExecutionInvocationInput, UpdateExecutionInvocationInput, AppendExecutionInvocationMessageInput, CreateSprintRunInput, UpdateSprintRunInput, CreateTaskDispatchInput, UpdateTaskDispatchInput, CreateTaskRunInput, UpdateTaskRunInput, CreateProviderInvocationUsageInput, UpdateProviderInvocationUsageInput, AcquireExecutionLeaseInput, RenewExecutionLeaseInput, SprintRunRecord, TaskDispatchRecord, TaskRunRecord, TaskRunEventRecord, SprintRunEventRecord, ProviderInvocationUsageRecord, ExecutionLeaseRecord } from "../../contracts/execution-types.js";
import { ExecutionInvocationRecord, ExecutionInvocationMessageRecord } from "../../contracts/invocation-types.js";
import { ConcurrencyConflictError, EntityNotFoundError, RepositoryError, ValidationError, serializePayloadJson } from "../repository-utils.js";
import { requireProject, requireSprint, requireTask, requireConnection, requireSprintRun, requireSprintRunScoped, requireTaskDispatch, requireTaskRun, requireProviderInvocationUsage, requireLease } from "./execution-validators.js";
import { DatabaseAdapter } from "../db/database-adapter.js";
import { ExecutionWriteContext } from "./execution-repository-types.js";

export function createTaskRunWrite(db: DatabaseAdapter, input: CreateTaskRunInput, ctx: ExecutionWriteContext): TaskRunRecord {
    try {
      requireProject(db, input.projectId);
      requireSprint(db, input.sprintId, input.projectId);
      requireTask(db, input.taskId, input.projectId, input.sprintId);
      if (input.sprintRunId) {
        requireSprintRunScoped((id: string) => ctx.getSprintRun(id), input.sprintRunId, input.projectId, input.sprintId);
      }
      if (input.dispatchId) {
        requireTaskDispatch((id: string) => ctx.getTaskDispatch(id), input.dispatchId);
      }
      if (input.connectionId) {
        requireConnection(db, input.connectionId);
      }

      const id = randomUUID();
      db.prepare(`
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

      const created = requireTaskRun((id: string) => ctx.getTaskRun(id), id);
      if (created.taskId) ctx.taskWallTimeCache.delete(created.taskId);
      if (created.sprintRunId) ctx.sprintRunWallTimeCache.delete(created.sprintRunId);
      ctx.notifyRealtime(created.projectId, false);
      return created;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      ctx.logger.error("Operation failed", { error, projectId: input.projectId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
}

export function updateTaskRunsBatchWrite(db: DatabaseAdapter, runs: Array<{id: string} & UpdateTaskRunInput>, ctx: ExecutionWriteContext): void {
    if (runs.length === 0) return;
    db.transaction(() => {
      for (const run of runs) {
        updateTaskRunWrite(db, run.id, run, ctx);
      }
    });
}

export function updateTaskRunWrite(db: DatabaseAdapter, taskRunId: string, input: UpdateTaskRunInput, ctx: ExecutionWriteContext): TaskRunRecord {
    try {
      const current = requireTaskRun((id: string) => ctx.getTaskRun(id), taskRunId);
      db.prepare(`
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
      const updated = requireTaskRun((id: string) => ctx.getTaskRun(id), taskRunId);
      if (updated.taskId) ctx.taskWallTimeCache.delete(updated.taskId);
      if (updated.sprintRunId) ctx.sprintRunWallTimeCache.delete(updated.sprintRunId);
      ctx.notifyRealtime(updated.projectId, false);
      return updated;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      ctx.logger.error("Operation failed", { error, taskRunId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
}

export function appendTaskRunEventWrite(db: DatabaseAdapter, taskRunId: string, eventType: string, originator: string, payload: Record<string, unknown>, options: { createdAt?: string; sourceEventKey?: string | null } | undefined, ctx: ExecutionWriteContext): boolean {
    const taskRun = requireTaskRun((id: string) => ctx.getTaskRun(id), taskRunId);
    if (taskRun.taskId) ctx.taskWallTimeCache.delete(taskRun.taskId);
    if (taskRun.sprintRunId) ctx.sprintRunWallTimeCache.delete(taskRun.sprintRunId);
    const result = db.prepare(`
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
      ctx.notifyRealtime(taskRun.projectId, false);
    }
    return inserted;
}
