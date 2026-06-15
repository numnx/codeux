import { randomUUID } from "crypto";
import { CreateExecutionInvocationInput, UpdateExecutionInvocationInput, AppendExecutionInvocationMessageInput, CreateSprintRunInput, UpdateSprintRunInput, CreateTaskDispatchInput, UpdateTaskDispatchInput, CreateTaskRunInput, UpdateTaskRunInput, CreateProviderInvocationUsageInput, UpdateProviderInvocationUsageInput, AcquireExecutionLeaseInput, RenewExecutionLeaseInput, SprintRunRecord, TaskDispatchRecord, TaskRunRecord, TaskRunEventRecord, SprintRunEventRecord, ProviderInvocationUsageRecord, ExecutionLeaseRecord } from "../../contracts/execution-types.js";
import { ExecutionInvocationRecord, ExecutionInvocationMessageRecord } from "../../contracts/invocation-types.js";
import { ConcurrencyConflictError, EntityNotFoundError, RepositoryError, ValidationError, serializePayloadJson } from "../repository-utils.js";
import { requireProject, requireSprint, requireTask, requireConnection, requireSprintRun, requireSprintRunScoped, requireTaskDispatch, requireTaskRun, requireProviderInvocationUsage, requireLease } from "./execution-validators.js";
import { DatabaseAdapter } from "../db/database-adapter.js";
import { ExecutionWriteContext } from "./execution-repository-types.js";

export function acquireLeaseWrite(db: DatabaseAdapter, input: AcquireExecutionLeaseInput, ctx: ExecutionWriteContext): ExecutionLeaseRecord {
    try {
      const existing = ctx.getLease(input.scopeType, input.scopeId);
      const now = new Date().toISOString();

      if (existing && existing.expiresAt > now && existing.leaseToken !== input.leaseToken) {
        throw new ConcurrencyConflictError(`Lease already held for ${input.scopeType}:${input.scopeId}`);
      }

      if (existing) {
        db.prepare(`
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
        const updated = requireLease((type, id) => ctx.getLease(type, id), input.scopeType, input.scopeId);
        ctx.notifyRealtimeForLease(input.scopeType, input.scopeId);
        return updated;
      }

      const id = randomUUID();
      db.prepare(`
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
      const created = requireLease((type, id) => ctx.getLease(type, id), input.scopeType, input.scopeId);
      ctx.notifyRealtimeForLease(input.scopeType, input.scopeId);
      return created;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      ctx.logger.error("Operation failed", { error, scopeType: input.scopeType, scopeId: input.scopeId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
}

export function renewLeaseWrite(db: DatabaseAdapter, input: RenewExecutionLeaseInput, ctx: ExecutionWriteContext): ExecutionLeaseRecord {
    try {
      const current = requireLease((type, id) => ctx.getLease(type, id), input.scopeType, input.scopeId);
      if (current.leaseToken !== input.leaseToken) {
        throw new ConcurrencyConflictError(`Lease token mismatch for ${input.scopeType}:${input.scopeId}`);
      }
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE execution_leases
        SET expires_at = ?, last_heartbeat_at = ?
        WHERE scope_type = ? AND scope_id = ? AND lease_token = ?
      `).run(input.expiresAt, now, input.scopeType, input.scopeId, input.leaseToken);
      return requireLease((type, id) => ctx.getLease(type, id), input.scopeType, input.scopeId);
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      ctx.logger.error("Operation failed", { error, scopeType: input.scopeType, scopeId: input.scopeId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
}

export function releaseLeaseWrite(db: DatabaseAdapter, scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string, leaseToken: string | undefined, ctx: ExecutionWriteContext): void {
    try {
      const projectId = ctx.resolveLeaseProjectId(scopeType, scopeId);
      ctx.leaseProjectCache.delete(`${scopeType}:${scopeId}`);

      if (leaseToken) {
        db.prepare(`
          DELETE FROM execution_leases
          WHERE scope_type = ? AND scope_id = ? AND lease_token = ?
        `).run(scopeType, scopeId, leaseToken);
        if (projectId) {
          ctx.notifyRealtime(projectId, false);
        }
        return;
      }

      db.prepare(`
        DELETE FROM execution_leases
        WHERE scope_type = ? AND scope_id = ?
      `).run(scopeType, scopeId);
      if (projectId) {
        ctx.notifyRealtime(projectId, false);
      }
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      ctx.logger.error("Operation failed", { error, scopeType, scopeId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
}

export function releaseStaleSprintLeaseWrite(db: DatabaseAdapter, projectId: string, sprintId: string, ctx: ExecutionWriteContext): boolean {
    try {
      requireProject(db, projectId);
      requireSprint(db, sprintId, projectId);

      const lease = ctx.getLease("sprint", sprintId);
      if (!lease) {
        return false;
      }

      const activeRun = ctx.findActiveSprintRun(projectId, sprintId);
      if (activeRun) {
        if (activeRun.status === "running" || activeRun.status === "queued") {
          return false;
        }
        if (activeRun.status === "cancel_requested" && ctx.hasActiveTaskDispatches(activeRun.id)) {
          return false;
        }
      }

      releaseLeaseWrite(db, "sprint", sprintId, lease.leaseToken, ctx);
      return true;
      } catch (error) {
      if (error instanceof RepositoryError) throw error;
      ctx.logger.error("Operation failed", { error, projectId, sprintId });
      throw new RepositoryError(error instanceof Error ? error.message : "Operation failed", error);
    }
}
