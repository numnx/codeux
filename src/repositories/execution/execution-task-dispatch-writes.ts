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
import { claimNextTaskDispatchTransaction } from "./task-dispatch-claim-query.js";

export function createTaskDispatch(repo: ExecutionRepository, input: CreateTaskDispatchInput): TaskDispatchRecord {
    try {
      requireProject(repo.db, input.projectId);
      requireSprint(repo.db, input.sprintId, input.projectId);
      requireTask(repo.db, input.taskId, input.projectId, input.sprintId);
      requireSprintRunScoped((id: string) => repo.getSprintRun(id), input.sprintRunId, input.projectId, input.sprintId);
      if (input.connectionId) {
        requireConnection(repo.db, input.connectionId);
      }

      const id = randomUUID();
      const now = new Date().toISOString();
      const queuedAt = input.queuedAt || now;
      repo.db.prepare(`
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
        input.connectionId ?? null,
        input.executorType,
        input.status || "queued",
        input.priority ?? 0,
        queuedAt,
        null,
        null,
        null,
        null,
        null,
        now,
        now
      );

      const created = requireTaskDispatch((id: string) => repo.getTaskDispatch(id), id);
      repo.notifyRealtime(created.projectId, true);
      return created;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      repo.logger.error("Operation failed", { error, projectId: input.projectId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
  }

export function updateTaskDispatch(repo: ExecutionRepository, dispatchId: string, input: UpdateTaskDispatchInput): TaskDispatchRecord {
    try {
      const current = requireTaskDispatch((id: string) => repo.getTaskDispatch(id), dispatchId);
      if (input.connectionId) {
        requireConnection(repo.db, input.connectionId);
      }
      const now = new Date().toISOString();
      repo.db.prepare(`
        UPDATE task_dispatches
        SET connection_id = ?, status = ?, claimed_at = ?, started_at = ?, finished_at = ?, last_heartbeat_at = ?, error_message = ?, updated_at = ?
        WHERE id = ?
      `).run(
        input.connectionId === undefined ? current.connectionId : input.connectionId,
        input.status || current.status,
        input.claimedAt === undefined ? current.claimedAt : input.claimedAt,
        input.startedAt === undefined ? current.startedAt : input.startedAt,
        input.finishedAt === undefined ? current.finishedAt : input.finishedAt,
        input.lastHeartbeatAt === undefined ? current.lastHeartbeatAt : input.lastHeartbeatAt,
        input.errorMessage === undefined ? current.errorMessage : input.errorMessage,
        now,
        dispatchId
      );
      const updated = requireTaskDispatch((id: string) => repo.getTaskDispatch(id), dispatchId);
      if (repo.shouldPublishTaskDispatchUpdate(input)) {
        repo.notifyRealtime(updated.projectId, true);
      }
      return updated;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      repo.logger.error("Operation failed", { error, dispatchId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
  }

export function updateTaskDispatchesBatch(repo: ExecutionRepository, dispatches: Array<{id: string} & UpdateTaskDispatchInput>): void {
    if (dispatches.length === 0) return;
    repo.db.transaction(() => {
      for (const dispatch of dispatches) {
        repo.updateTaskDispatch(dispatch.id, dispatch);
      }
    });
  }

export function claimNextTaskDispatch(repo: ExecutionRepository, args: {
    projectId: string;
    executorType: TaskDispatchRecord["executorType"];
    connectionId?: string | null;
    sprintId?: string;
    sprintRunId?: string;
  }): TaskDispatchRecord | null {
    const nowIso = new Date().toISOString();
    const claimedId = claimNextTaskDispatchTransaction(repo.db, {
      ...args,
      nowIso,
    });

    if (!claimedId) {
      return null;
    }

    const updated = requireTaskDispatch((id: string) => repo.getTaskDispatch(id), claimedId);
    repo.notifyRealtime(updated.projectId, true);
    return updated;
  }
