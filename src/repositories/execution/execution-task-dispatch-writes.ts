import { randomUUID } from "node:crypto";
import { CreateTaskDispatchInput, UpdateTaskDispatchInput, TaskDispatchRecord } from "../../contracts/execution-types.js";
import { RepositoryError } from "../repository-utils.js";
import { requireProject, requireSprint, requireTask, requireSprintRunScoped, requireTaskDispatch, requireConnection } from "./execution-validators.js";
import { claimNextTaskDispatchTransaction } from "./task-dispatch-claim-query.js";
import { DatabaseAdapter } from "../db/database-adapter.js";
import { ExecutionWriteContext } from "./execution-repository-types.js";

export function createTaskDispatchWrite(db: DatabaseAdapter, input: CreateTaskDispatchInput, ctx: ExecutionWriteContext): TaskDispatchRecord {
    try {
      requireProject(db, input.projectId);
      requireSprint(db, input.sprintId, input.projectId);
      requireTask(db, input.taskId, input.projectId, input.sprintId);
      requireSprintRunScoped((id: string) => ctx.getSprintRun(id), input.sprintRunId, input.projectId, input.sprintId);
      if (input.connectionId) {
        requireConnection(db, input.connectionId);
      }

      const id = randomUUID();
      const now = new Date().toISOString();
      const queuedAt = input.queuedAt || now;
      db.prepare(`
        INSERT INTO task_dispatches (
          id, project_id, sprint_id, task_id, sprint_run_id, connection_id, executor_type, status, priority,
          queued_at, claimed_at, started_at, finished_at, last_heartbeat_at, error_message, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.projectId,
        input.sprintId,
        input.taskId,
        input.sprintRunId,
        input.connectionId || null,
        input.executorType,
        input.status || "queued",
        input.priority || 0,
        queuedAt,
        null,
        null,
        null,
        null,
        null,
        now,
        now
      );

      const created = requireTaskDispatch((id: string) => ctx.getTaskDispatch(id), id);
      ctx.notifyRealtime(created.projectId, true);
      return created;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      ctx.logger.error("Operation failed", { error, projectId: input.projectId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
}

export function updateTaskDispatchesBatchWrite(db: DatabaseAdapter, dispatches: Array<{id: string} & UpdateTaskDispatchInput>, ctx: ExecutionWriteContext): void {
    if (dispatches.length === 0) return;
    db.transaction(() => {
      for (const dispatch of dispatches) {
        updateTaskDispatchWrite(db, dispatch.id, dispatch, ctx);
      }
    });
}

export function updateTaskDispatchWrite(db: DatabaseAdapter, dispatchId: string, input: UpdateTaskDispatchInput, ctx: ExecutionWriteContext): TaskDispatchRecord {
    try {
      const current = requireTaskDispatch((id: string) => ctx.getTaskDispatch(id), dispatchId);
      if (input.connectionId) {
        requireConnection(db, input.connectionId);
      }
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE task_dispatches
        SET connection_id = ?, status = ?, claimed_at = ?, started_at = ?, finished_at = ?, last_heartbeat_at = ?, error_message = ?, updated_at = ?
        WHERE id = ?
      `).run(
        input.connectionId === undefined ? current.connectionId : input.connectionId,
        input.status || current.status,
        input.claimedAt || current.claimedAt,
        input.startedAt || current.startedAt,
        input.finishedAt || current.finishedAt,
        input.lastHeartbeatAt || current.lastHeartbeatAt,
        input.errorMessage === undefined ? current.errorMessage : input.errorMessage,
        now,
        dispatchId
      );
      const updated = requireTaskDispatch((id: string) => ctx.getTaskDispatch(id), dispatchId);
      if (ctx.shouldPublishTaskDispatchUpdate(input)) {
        ctx.notifyRealtime(updated.projectId, true);
      }
      return updated;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      ctx.logger.error("Operation failed", { error, dispatchId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
}

export function claimNextTaskDispatchWrite(db: DatabaseAdapter, args: {
        projectId: string;
        executorType: TaskDispatchRecord["executorType"];
        connectionId?: string | null;
        sprintId?: string;
        sprintRunId?: string;
      }, ctx: ExecutionWriteContext): TaskDispatchRecord | null {
    const nowIso = new Date().toISOString();
    const claimedId = claimNextTaskDispatchTransaction(db, {
      ...args,
      nowIso,
    });

    if (!claimedId) {
      return null;
    }

    const updated = requireTaskDispatch((id: string) => ctx.getTaskDispatch(id), claimedId);
    ctx.notifyRealtime(updated.projectId, true);
    return updated;
}
