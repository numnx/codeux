import { randomUUID } from "crypto";
import { CreateExecutionInvocationInput, UpdateExecutionInvocationInput, AppendExecutionInvocationMessageInput, CreateSprintRunInput, UpdateSprintRunInput, CreateTaskDispatchInput, UpdateTaskDispatchInput, CreateTaskRunInput, UpdateTaskRunInput, CreateProviderInvocationUsageInput, UpdateProviderInvocationUsageInput, AcquireExecutionLeaseInput, RenewExecutionLeaseInput, SprintRunRecord, TaskDispatchRecord, TaskRunRecord, TaskRunEventRecord, SprintRunEventRecord, ProviderInvocationUsageRecord, ExecutionLeaseRecord } from "../../contracts/execution-types.js";
import { ExecutionInvocationRecord, ExecutionInvocationMessageRecord } from "../../contracts/invocation-types.js";
import { ConcurrencyConflictError, EntityNotFoundError, RepositoryError, ValidationError, serializePayloadJson } from "../repository-utils.js";
import { requireProject, requireSprint, requireTask, requireConnection, requireSprintRun, requireSprintRunScoped, requireTaskDispatch, requireTaskRun, requireProviderInvocationUsage, requireLease } from "./execution-validators.js";
import { DatabaseAdapter } from "../db/database-adapter.js";
import { ExecutionWriteContext } from "./execution-repository-types.js";
import { releaseStaleSprintLeaseWrite } from "./execution-lease-writes.js";

export function createSprintRunWrite(db: DatabaseAdapter, input: CreateSprintRunInput, ctx: ExecutionWriteContext): SprintRunRecord {
    try {
      requireProject(db, input.projectId);
      requireSprint(db, input.sprintId, input.projectId);
      const id = randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO sprint_runs (
          id, project_id, sprint_id, status, trigger_type, triggered_by, executor_mode,
          started_at, finished_at, last_heartbeat_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.projectId,
        input.sprintId,
        input.status || "queued",
        input.triggerType || "manual",
        input.triggeredBy ?? null,
        input.executorMode || "mixed",
        null,
        null,
        null,
        now,
        now
      );

      const created = requireSprintRun((id: string) => ctx.getSprintRun(id), id);
      ctx.notifyRealtime(created.projectId, true);
      return created;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      ctx.logger.error("Operation failed", { error, projectId: input.projectId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
}

export function updateSprintRunWrite(db: DatabaseAdapter, runId: string, input: UpdateSprintRunInput, ctx: ExecutionWriteContext): SprintRunRecord {
    try {
      const current = requireSprintRun((id: string) => ctx.getSprintRun(id), runId);
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE sprint_runs
        SET status = ?, executor_mode = ?, started_at = ?, finished_at = ?, last_heartbeat_at = ?, updated_at = ?
        WHERE id = ?
      `).run(
        input.status || current.status,
        input.executorMode || current.executorMode,
        input.startedAt === undefined ? current.startedAt : input.startedAt,
        input.finishedAt === undefined ? current.finishedAt : input.finishedAt,
        input.lastHeartbeatAt === undefined ? current.lastHeartbeatAt : input.lastHeartbeatAt,
        now,
        runId
      );
      const updated = requireSprintRun((id: string) => ctx.getSprintRun(id), runId);
      if (ctx.shouldPublishSprintRunUpdate(input)) {
        ctx.notifyRealtime(updated.projectId, true);
      }
      return updated;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      ctx.logger.error("Operation failed", { error, runId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
}

export function appendSprintRunEventWrite(db: DatabaseAdapter, sprintRunId: string, eventType: string, originator: string, payload: Record<string, unknown>, options: { createdAt?: string; sourceEventKey?: string | null } | undefined, ctx: ExecutionWriteContext): boolean {
    const sprintRun = requireSprintRun((id: string) => ctx.getSprintRun(id), sprintRunId);
    const result = db.prepare(`
      INSERT OR IGNORE INTO sprint_run_events (id, sprint_run_id, event_type, originator, payload_json, source_event_key, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      sprintRunId,
      eventType,
      originator,
      serializePayloadJson(payload),
      options?.sourceEventKey ?? null,
      options?.createdAt || new Date().toISOString(),
    );
    const inserted = Number((result as { changes?: number }).changes || 0) > 0;
    if (inserted) {
      ctx.notifyRealtime(sprintRun.projectId, true);
    }
    return inserted;
}

export function finalizeSprintRunCancellationIfIdleWrite(db: DatabaseAdapter, sprintRunId: string, ctx: ExecutionWriteContext): SprintRunRecord | null {
    const sprintRun = ctx.getSprintRun(sprintRunId);
    if (!sprintRun || sprintRun.status !== "cancel_requested" || ctx.hasActiveTaskDispatches(sprintRunId)) {
      return null;
    }

    const now = new Date().toISOString();
    const updated = updateSprintRunWrite(db, sprintRunId, {
      status: "cancelled",
      finishedAt: now,
      lastHeartbeatAt: now,
    }, ctx);
    appendSprintRunEventWrite(db, sprintRunId, "sprint_cancelled", "system", {
      reason: "cancel_request_completed",
    }, {
      sourceEventKey: `sprint-cancelled:${sprintRunId}:cancel-request-completed`,
    }, ctx);
    releaseStaleSprintLeaseWrite(db, updated.projectId, updated.sprintId, ctx);
    return updated;
}
