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

export function acquireLease(repo: ExecutionRepository, input: AcquireExecutionLeaseInput): ExecutionLeaseRecord {
    try {
      const existing = repo.getLease(input.scopeType, input.scopeId);
      const now = new Date().toISOString();

      if (existing && existing.expiresAt > now && existing.leaseToken !== input.leaseToken) {
        throw new ConcurrencyConflictError(`Lease already held for ${input.scopeType}:${input.scopeId}`);
      }

      if (existing) {
        repo.db.prepare(`
          UPDATE execution_leases
          SET owner_key = ?, lease_token = ?, acquired_at = ?, expires_at = ?, last_heartbeat_at = ?
          WHERE scope_type = ? AND scope_id = ?
        `).run(
          input.ownerKey,
          input.leaseToken,
          now,
          input.expiresAt,
          now,
          input.scopeType,
          input.scopeId
        );
        const updated = requireLease((type: ExecutionLeaseRecord["scopeType"], id: string) => repo.getLease(type, id), input.scopeType, input.scopeId);
        repo.notifyRealtimeForLease(input.scopeType, input.scopeId);
        return updated;
      }

      const id = randomUUID();
      repo.db.prepare(`
        INSERT INTO execution_leases (id, scope_type, scope_id, owner_key, lease_token, acquired_at, expires_at, last_heartbeat_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.scopeType,
        input.scopeId,
        input.ownerKey,
        input.leaseToken,
        now,
        input.expiresAt,
        now
      );
      const created = requireLease((type: ExecutionLeaseRecord["scopeType"], id: string) => repo.getLease(type, id), input.scopeType, input.scopeId);
      repo.notifyRealtimeForLease(input.scopeType, input.scopeId);
      return created;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      repo.logger.error("Operation failed", { error, scopeType: input.scopeType, scopeId: input.scopeId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
  }

export function renewLease(repo: ExecutionRepository, input: RenewExecutionLeaseInput): ExecutionLeaseRecord {
    try {
      const current = requireLease((type: ExecutionLeaseRecord["scopeType"], id: string) => repo.getLease(type, id), input.scopeType, input.scopeId);
      if (current.leaseToken !== input.leaseToken) {
        throw new ConcurrencyConflictError(`Lease token mismatch for ${input.scopeType}:${input.scopeId}`);
      }
      const now = new Date().toISOString();
      repo.db.prepare(`
        UPDATE execution_leases
        SET expires_at = ?, last_heartbeat_at = ?
        WHERE scope_type = ? AND scope_id = ? AND lease_token = ?
      `).run(input.expiresAt, now, input.scopeType, input.scopeId, input.leaseToken);
      return requireLease((type: ExecutionLeaseRecord["scopeType"], id: string) => repo.getLease(type, id), input.scopeType, input.scopeId);
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      repo.logger.error("Operation failed", { error, scopeType: input.scopeType, scopeId: input.scopeId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
  }

export function releaseLease(repo: ExecutionRepository, scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string, leaseToken?: string): void {
    try {
      const projectId = repo.resolveLeaseProjectId(scopeType, scopeId);
      repo.leaseProjectCache.delete(`${scopeType}:${scopeId}`);

      if (leaseToken) {
        repo.db.prepare(`
          DELETE FROM execution_leases
          WHERE scope_type = ? AND scope_id = ? AND lease_token = ?
        `).run(scopeType, scopeId, leaseToken);
        if (projectId) {
          repo.notifyRealtime(projectId, false);
        }
        return;
      }

      repo.db.prepare(`
        DELETE FROM execution_leases
        WHERE scope_type = ? AND scope_id = ?
      `).run(scopeType, scopeId);
      if (projectId) {
        repo.notifyRealtime(projectId, false);
      }
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      repo.logger.error("Operation failed", { error, scopeType, scopeId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
  }

export function releaseStaleSprintLease(repo: ExecutionRepository, projectId: string, sprintId: string): boolean {
    try {
      requireProject(repo.db, projectId);
      requireSprint(repo.db, sprintId, projectId);

      const lease = repo.getLease("sprint", sprintId);
      if (!lease) {
        return false;
      }

      const activeRun = repo.findActiveSprintRun(projectId, sprintId);
      if (activeRun) {
        if (activeRun.status === "running" || activeRun.status === "queued") {
          return false;
        }
        if (activeRun.status === "cancel_requested" && repo.hasActiveTaskDispatches(activeRun.id)) {
          return false;
        }
      }

      repo.releaseLease("sprint", sprintId, lease.leaseToken);
      return true;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      repo.logger.error("Operation failed", { error, projectId, sprintId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
  }
