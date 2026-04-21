import { randomUUID } from "crypto";
import { DatabaseAdapter } from "../db/database-adapter.js";
import {
  requireProject,
  requireSprint,
  requireTask,
  requireSprintRun,
  requireSprintRunScoped,
  requireTaskDispatch,
  requireConnection,
  requireLease,
} from "./execution-validators.js";
import {
  mapSprintRunRow,
  mapTaskDispatchRow,
  mapExecutionLeaseRow,
  mapSprintRunEventRow,
} from "./execution-read-model-mappers.js";
import { toNumber } from "./execution-utils.js";
import type {
  CreateSprintRunInput,
  SprintRunRecord,
  SprintRunStatus,
  UpdateSprintRunInput,
  CreateTaskDispatchInput,
  TaskDispatchRecord,
  TaskDispatchStatus,
  UpdateTaskDispatchInput,
  SprintRunEventRecord,
  AcquireExecutionLeaseInput,
  ExecutionLeaseRecord,
  RenewExecutionLeaseInput,
} from "../../contracts/execution-types.js";
import type {
  SprintRunRow,
  TaskDispatchRow,
  ExecutionLeaseRow,
  SprintRunEventRow,
} from "./execution-repository-types.js";
import { claimNextTaskDispatchTransaction } from "./task-dispatch-claim-query.js";

export class SprintRunRepository {
  constructor(
    private readonly db: DatabaseAdapter,
    private readonly onNotifyRealtime: (projectId: string, includeOverview: boolean) => void,
  ) {}

  createSprintRun(input: CreateSprintRunInput): SprintRunRecord {
    requireProject(this.db, input.projectId);
    requireSprint(this.db, input.sprintId, input.projectId);
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
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

    const created = requireSprintRun((id) => this.getSprintRun(id), id);
    this.onNotifyRealtime(created.projectId, true);
    return created;
  }

  listSprintRuns(projectId: string, sprintId?: string): SprintRunRecord[] {
    requireProject(this.db, projectId);
    const rows = sprintId
      ? this.db.prepare(`
        SELECT *
        FROM sprint_runs
        WHERE project_id = ? AND sprint_id = ?
        ORDER BY created_at DESC, rowid DESC
      `).all(projectId, sprintId)
      : this.db.prepare(`
        SELECT *
        FROM sprint_runs
        WHERE project_id = ?
        ORDER BY created_at DESC, rowid DESC
      `).all(projectId);
    return (rows as unknown as SprintRunRow[]).map((row) => mapSprintRunRow(row));
  }

  listSprintRunsByStatus(
    statuses: SprintRunStatus[],
    options?: { projectId?: string; sprintId?: string },
  ): SprintRunRecord[] {
    const normalizedStatuses = Array.from(new Set(statuses.map((status) => String(status || "").trim()).filter(Boolean)));
    if (normalizedStatuses.length === 0) {
      return [];
    }

    const clauses = [`status IN (${normalizedStatuses.map(() => "?").join(", ")})`];
    const values: string[] = [...normalizedStatuses];

    if (options?.projectId) {
      requireProject(this.db, options.projectId);
      clauses.push("project_id = ?");
      values.push(options.projectId);
    }

    if (options?.sprintId) {
      if (options.projectId) {
        requireSprint(this.db, options.sprintId, options.projectId);
      }
      clauses.push("sprint_id = ?");
      values.push(options.sprintId);
    }

    const rows = this.db.prepare(`
      SELECT *
      FROM sprint_runs
      WHERE ${clauses.join(" AND ")}
      ORDER BY created_at DESC, rowid DESC
    `).all(...values) as unknown as SprintRunRow[];

    return rows.map((row) => mapSprintRunRow(row));
  }

  getSprintRun(runId: string): SprintRunRecord | null {
    const row = this.db.prepare(`
      SELECT *
      FROM sprint_runs
      WHERE id = ?
    `).get(runId) as SprintRunRow | undefined;
    return row ? mapSprintRunRow(row) : null;
  }

  findActiveSprintRun(projectId: string, sprintId: string): SprintRunRecord | null {
    requireProject(this.db, projectId);
    requireSprint(this.db, sprintId, projectId);
    const row = this.db.prepare(`
      SELECT *
      FROM sprint_runs
      WHERE project_id = ? AND sprint_id = ? AND status IN ('queued', 'running', 'paused', 'cancel_requested')
      ORDER BY created_at DESC, rowid DESC
      LIMIT 1
    `).get(projectId, sprintId) as SprintRunRow | undefined;
    return row ? mapSprintRunRow(row) : null;
  }

  updateSprintRun(runId: string, input: UpdateSprintRunInput): SprintRunRecord {
    const current = requireSprintRun((id) => this.getSprintRun(id), runId);
    const now = new Date().toISOString();
    this.db.prepare(`
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
    const updated = requireSprintRun((id) => this.getSprintRun(id), runId);
    if (this.shouldPublishSprintRunUpdate(input)) {
      this.onNotifyRealtime(updated.projectId, true);
    }
    return updated;
  }

  createTaskDispatch(input: CreateTaskDispatchInput): TaskDispatchRecord {
    requireProject(this.db, input.projectId);
    requireSprint(this.db, input.sprintId, input.projectId);
    requireTask(this.db, input.taskId, input.projectId, input.sprintId);
    requireSprintRunScoped((id) => this.getSprintRun(id), input.sprintRunId, input.projectId, input.sprintId);
    if (input.connectionId) {
      requireConnection(this.db, input.connectionId);
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const queuedAt = input.queuedAt || now;
    this.db.prepare(`
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

    const created = requireTaskDispatch((id) => this.getTaskDispatch(id), id);
    this.onNotifyRealtime(created.projectId, true);
    return created;
  }

  listTaskDispatches(args: { projectId: string; sprintId?: string; sprintRunId?: string; taskId?: string }): TaskDispatchRecord[] {
    requireProject(this.db, args.projectId);
    const clauses = ["project_id = ?"];
    const values: string[] = [args.projectId];
    if (args.sprintId) {
      clauses.push("sprint_id = ?");
      values.push(args.sprintId);
    }
    if (args.sprintRunId) {
      clauses.push("sprint_run_id = ?");
      values.push(args.sprintRunId);
    }
    if (args.taskId) {
      clauses.push("task_id = ?");
      values.push(args.taskId);
    }

    const rows = this.db.prepare(`
      SELECT *
      FROM task_dispatches
      WHERE ${clauses.join(" AND ")}
      ORDER BY priority DESC, queued_at ASC, created_at ASC
    `).all(...values) as unknown as TaskDispatchRow[];

    return rows.map((row) => mapTaskDispatchRow(row));
  }

  listTaskDispatchesByStatus(
    statuses: TaskDispatchStatus[],
    options?: { projectId?: string; sprintId?: string; sprintRunId?: string; taskId?: string; executorType?: TaskDispatchRecord["executorType"] },
  ): TaskDispatchRecord[] {
    const normalizedStatuses = Array.from(new Set(statuses.map((status) => String(status || "").trim()).filter(Boolean)));
    if (normalizedStatuses.length === 0) {
      return [];
    }

    const clauses = [`status IN (${normalizedStatuses.map(() => "?").join(", ")})`];
    const values: string[] = [...normalizedStatuses];

    if (options?.projectId) {
      requireProject(this.db, options.projectId);
      clauses.push("project_id = ?");
      values.push(options.projectId);
    }
    if (options?.sprintId) {
      clauses.push("sprint_id = ?");
      values.push(options.sprintId);
    }
    if (options?.sprintRunId) {
      clauses.push("sprint_run_id = ?");
      values.push(options.sprintRunId);
    }
    if (options?.taskId) {
      clauses.push("task_id = ?");
      values.push(options.taskId);
    }
    if (options?.executorType) {
      clauses.push("executor_type = ?");
      values.push(options.executorType);
    }

    const rows = this.db.prepare(`
      SELECT *
      FROM task_dispatches
      WHERE ${clauses.join(" AND ")}
      ORDER BY priority DESC, queued_at ASC, created_at ASC
    `).all(...values) as unknown as TaskDispatchRow[];

    return rows.map((row) => mapTaskDispatchRow(row));
  }

  listStaleCancelRequestedDispatches(cutoffIso: string): TaskDispatchRecord[] {
    const rows = this.db.prepare(`
      SELECT *
      FROM task_dispatches
      WHERE status = 'cancel_requested'
        AND COALESCE(last_heartbeat_at, updated_at, started_at, queued_at) <= ?
      ORDER BY COALESCE(last_heartbeat_at, updated_at, started_at, queued_at) ASC
    `).all(cutoffIso) as unknown as TaskDispatchRow[];

    return rows.map((row) => mapTaskDispatchRow(row));
  }

  updateTaskDispatch(dispatchId: string, input: UpdateTaskDispatchInput): TaskDispatchRecord {
    const current = requireTaskDispatch((id) => this.getTaskDispatch(id), dispatchId);
    if (input.connectionId) {
      requireConnection(this.db, input.connectionId);
    }
    const now = new Date().toISOString();
    this.db.prepare(`
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
    const updated = requireTaskDispatch((id) => this.getTaskDispatch(id), dispatchId);
    if (this.shouldPublishTaskDispatchUpdate(input)) {
      this.onNotifyRealtime(updated.projectId, true);
    }
    return updated;
  }

  getTaskDispatch(dispatchId: string): TaskDispatchRecord | null {
    const row = this.db.prepare(`
      SELECT *
      FROM task_dispatches
      WHERE id = ?
    `).get(dispatchId) as TaskDispatchRow | undefined;
    return row ? mapTaskDispatchRow(row) : null;
  }

  claimNextTaskDispatch(args: {
    projectId: string;
    executorType: TaskDispatchRecord["executorType"];
    connectionId?: string | null;
    sprintId?: string;
    sprintRunId?: string;
  }): TaskDispatchRecord | null {
    const nowIso = new Date().toISOString();
    const claimedId = claimNextTaskDispatchTransaction(this.db, {
      ...args,
      nowIso,
    });

    if (!claimedId) {
      return null;
    }

    const updated = requireTaskDispatch((id) => this.getTaskDispatch(id), claimedId);
    this.onNotifyRealtime(updated.projectId, true);
    return updated;
  }

  appendSprintRunEvent(
    sprintRunId: string,
    eventType: string,
    originator: string,
    payload: Record<string, unknown>,
    options?: { createdAt?: string; sourceEventKey?: string | null },
  ): boolean {
    const sprintRun = requireSprintRun((id) => this.getSprintRun(id), sprintRunId);
    const result = this.db.prepare(`
      INSERT OR IGNORE INTO sprint_run_events (id, sprint_run_id, event_type, originator, payload_json, source_event_key, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      sprintRunId,
      eventType,
      originator,
      JSON.stringify(payload),
      options?.sourceEventKey ?? null,
      options?.createdAt || new Date().toISOString(),
    );
    const inserted = Number((result as { changes?: number }).changes || 0) > 0;
    if (inserted) {
      this.onNotifyRealtime(sprintRun.projectId, true);
    }
    return inserted;
  }

  listSprintRunEvents(sprintRunId: string, limit: number = 50): SprintRunEventRecord[] {
    requireSprintRun((id) => this.getSprintRun(id), sprintRunId);
    const rows = this.db.prepare(`
      SELECT *
      FROM sprint_run_events
      WHERE sprint_run_id = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT ?
    `).all(sprintRunId, Math.max(1, limit)) as unknown as SprintRunEventRow[];
    return rows.map((row) => mapSprintRunEventRow(row));
  }

  acquireLease(input: AcquireExecutionLeaseInput): ExecutionLeaseRecord {
    const existing = this.getLease(input.scopeType, input.scopeId);
    const now = new Date().toISOString();

    if (existing && existing.expiresAt > now && existing.leaseToken !== input.leaseToken) {
      throw new Error(`Lease already held for ${input.scopeType}:${input.scopeId}`);
    }

    if (existing) {
      this.db.prepare(`
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
      const updated = requireLease((type, id) => this.getLease(type, id), input.scopeType, input.scopeId);
      this.notifyRealtimeForLease(input.scopeType, input.scopeId);
      return updated;
    }

    const id = randomUUID();
    this.db.prepare(`
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
    const created = requireLease((type, id) => this.getLease(type, id), input.scopeType, input.scopeId);
    this.notifyRealtimeForLease(input.scopeType, input.scopeId);
    return created;
  }

  renewLease(input: RenewExecutionLeaseInput): ExecutionLeaseRecord {
    const current = requireLease((type, id) => this.getLease(type, id), input.scopeType, input.scopeId);
    if (current.leaseToken !== input.leaseToken) {
      throw new Error(`Lease token mismatch for ${input.scopeType}:${input.scopeId}`);
    }
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE execution_leases
      SET expires_at = ?, last_heartbeat_at = ?
      WHERE scope_type = ? AND scope_id = ? AND lease_token = ?
    `).run(input.expiresAt, now, input.scopeType, input.scopeId, input.leaseToken);
    return requireLease((type, id) => this.getLease(type, id), input.scopeType, input.scopeId);
  }

  releaseLease(scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string, leaseToken?: string): void {
    const projectId = this.resolveLeaseProjectId(scopeType, scopeId);
    if (leaseToken) {
      this.db.prepare(`
        DELETE FROM execution_leases
        WHERE scope_type = ? AND scope_id = ? AND lease_token = ?
      `).run(scopeType, scopeId, leaseToken);
      if (projectId) {
        this.onNotifyRealtime(projectId, false);
      }
      return;
    }

    this.db.prepare(`
      DELETE FROM execution_leases
      WHERE scope_type = ? AND scope_id = ?
    `).run(scopeType, scopeId);
    if (projectId) {
      this.onNotifyRealtime(projectId, false);
    }
  }

  releaseStaleSprintLease(projectId: string, sprintId: string): boolean {
    requireProject(this.db, projectId);
    requireSprint(this.db, sprintId, projectId);

    const lease = this.getLease("sprint", sprintId);
    if (!lease) {
      return false;
    }

    const activeRun = this.findActiveSprintRun(projectId, sprintId);
    if (activeRun) {
      if (activeRun.status === "running" || activeRun.status === "queued") {
        return false;
      }
      if (activeRun.status === "cancel_requested" && this.hasActiveTaskDispatches(activeRun.id)) {
        return false;
      }
    }

    this.releaseLease("sprint", sprintId, lease.leaseToken);
    return true;
  }

  getLease(scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string): ExecutionLeaseRecord | null {
    const row = this.db.prepare(`
      SELECT *
      FROM execution_leases
      WHERE scope_type = ? AND scope_id = ?
    `).get(scopeType, scopeId) as ExecutionLeaseRow | undefined;
    return row ? mapExecutionLeaseRow(row) : null;
  }

  listExpiredLeases(scopeType?: ExecutionLeaseRecord["scopeType"], now = new Date()): ExecutionLeaseRecord[] {
    const nowIso = now.toISOString();
    const rows = scopeType
      ? this.db.prepare(`
        SELECT *
        FROM execution_leases
        WHERE scope_type = ?
          AND expires_at <= ?
        ORDER BY expires_at ASC
      `).all(scopeType, nowIso)
      : this.db.prepare(`
        SELECT *
        FROM execution_leases
        WHERE expires_at <= ?
        ORDER BY expires_at ASC
      `).all(nowIso);

    return (rows as unknown as ExecutionLeaseRow[]).map((row) => mapExecutionLeaseRow(row));
  }

  hasActiveTaskDispatches(sprintRunId: string): boolean {
    const row = this.db.prepare(`
      SELECT COUNT(*) AS total
      FROM task_dispatches
      WHERE sprint_run_id = ?
        AND status IN ('queued', 'claimed', 'running', 'cancel_requested')
    `).get(sprintRunId) as { total: number | string } | undefined;
    return toNumber(row?.total || 0) > 0;
  }

  finalizeSprintRunCancellationIfIdle(sprintRunId: string): SprintRunRecord | null {
    const sprintRun = this.getSprintRun(sprintRunId);
    if (!sprintRun || sprintRun.status !== "cancel_requested" || this.hasActiveTaskDispatches(sprintRunId)) {
      return null;
    }

    const now = new Date().toISOString();
    const updated = this.updateSprintRun(sprintRunId, {
      status: "cancelled",
      finishedAt: now,
      lastHeartbeatAt: now,
    });
    this.appendSprintRunEvent(sprintRunId, "sprint_cancelled", "system", {
      reason: "cancel_request_completed",
    }, {
      sourceEventKey: `sprint-cancelled:${sprintRunId}:cancel-request-completed`,
    });
    this.releaseStaleSprintLease(updated.projectId, updated.sprintId);
    return updated;
  }

  private resolveLeaseProjectId(scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string): string | null {
    if (scopeType === "sprint") {
      const row = this.db.prepare("SELECT project_id FROM sprints WHERE id = ?").get(scopeId) as { project_id: string } | undefined;
      return row?.project_id || null;
    }
    if (scopeType === "task_dispatch") {
      const row = this.db.prepare("SELECT project_id FROM task_dispatches WHERE id = ?").get(scopeId) as { project_id: string } | undefined;
      return row?.project_id || null;
    }
    return null;
  }

  private notifyRealtimeForLease(scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string): void {
    const projectId = this.resolveLeaseProjectId(scopeType, scopeId);
    if (projectId) {
      this.onNotifyRealtime(projectId, false);
    }
  }

  private shouldPublishSprintRunUpdate(input: UpdateSprintRunInput): boolean {
    return !!(input.status || input.executorMode || input.finishedAt);
  }

  private shouldPublishTaskDispatchUpdate(input: UpdateTaskDispatchInput): boolean {
    return !!(input.status || input.finishedAt || input.errorMessage);
  }
}
