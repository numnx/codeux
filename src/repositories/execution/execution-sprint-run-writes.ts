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

export function createSprintRun(repo: ExecutionRepository, input: CreateSprintRunInput): SprintRunRecord {
    try {
      requireProject(repo.db, input.projectId);
      requireSprint(repo.db, input.sprintId, input.projectId);
      const id = randomUUID();
      const now = new Date().toISOString();

      repo.db.prepare(`
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

      const created = requireSprintRun((id: string) => repo.getSprintRun(id), id);
      repo.notifyRealtime(created.projectId, true);
      return created;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      repo.logger.error("Operation failed", { error, projectId: input.projectId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
  }

export function updateSprintRun(repo: ExecutionRepository, runId: string, input: UpdateSprintRunInput): SprintRunRecord {
    try {
      const current = requireSprintRun((id: string) => repo.getSprintRun(id), runId);
      const now = new Date().toISOString();
      repo.db.prepare(`
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
      const updated = requireSprintRun((id: string) => repo.getSprintRun(id), runId);
      if (repo.shouldPublishSprintRunUpdate(input)) {
        repo.notifyRealtime(updated.projectId, true);
      }
      return updated;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      repo.logger.error("Operation failed", { error, runId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
  }

export function appendSprintRunEvent(repo: ExecutionRepository,
    sprintRunId: string,
    eventType: string,
    originator: string,
    payload: Record<string, unknown>,
    options?: { createdAt?: string; sourceEventKey?: string | null },
  ): boolean {
    const sprintRun = requireSprintRun((id: string) => repo.getSprintRun(id), sprintRunId);
    const result = repo.db.prepare(`
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
      repo.notifyRealtime(sprintRun.projectId, true);
    }
    return inserted;
  }

export function finalizeSprintRunCancellationIfIdle(repo: ExecutionRepository, sprintRunId: string): SprintRunRecord | null {
    const sprintRun = repo.getSprintRun(sprintRunId);
    if (!sprintRun || sprintRun.status !== "cancel_requested" || repo.hasActiveTaskDispatches(sprintRunId)) {
      return null;
    }

    const now = new Date().toISOString();
    const updated = repo.updateSprintRun(sprintRunId, {
      status: "cancelled",
      finishedAt: now,
      lastHeartbeatAt: now,
    });
    repo.appendSprintRunEvent(sprintRunId, "sprint_cancelled", "system", {
      reason: "cancel_request_completed",
    }, {
      sourceEventKey: `sprint-cancelled:${sprintRunId}:cancel-request-completed`,
    });
    repo.releaseStaleSprintLease(updated.projectId, updated.sprintId);
    return updated;
  }
