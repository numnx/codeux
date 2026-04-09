import { randomUUID } from "crypto";
import type { DatabaseAdapter } from "../db/database-adapter.js";
import { AppDbStorage } from "../app-db-storage.js";
import type { DashboardRealtimeMutationNotifier } from "../../services/dashboard-realtime-service.js";
import type {
  SprintRunRecord, CreateSprintRunInput, UpdateSprintRunInput, SprintRunEventRecord, SprintRunStatus
} from "../../contracts/execution-types.js";
import { requireProject, requireSprint, requireSprintRun } from "./execution-validators.js";
import { parsePayloadJson, toNumber } from "./execution-utils.js";
import type { ExecutionRepository } from "../execution-repository.js";

type SprintRunRow = any;
type SprintRunEventRow = any;

export class SprintRunRepository {
  private readonly db: DatabaseAdapter;

  constructor(
    private readonly executionRepository: ExecutionRepository,
    private readonly storage: AppDbStorage = new AppDbStorage(),
    private readonly realtimeNotifier?: DashboardRealtimeMutationNotifier,
  ) {
    this.db = storage.getDatabase();
  }

  private notifyRealtime(projectId: string, includeOverview: boolean): void {
    (this.executionRepository as any).notifyRealtime(projectId, includeOverview);
  }

  private releaseStaleSprintLease(projectId: string, sprintId: string): void {
    (this.executionRepository as any).releaseStaleSprintLease(projectId, sprintId);
  }

  // To fix requireTaskDispatch which is needed inside hasActiveTaskDispatches? No it just does a SQL query.

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

    const created = requireSprintRun((id: string) => this.getSprintRun(id), id);
    this.notifyRealtime(created.projectId, true);
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
    return (rows as unknown as SprintRunRow[]).map((row) => this.mapSprintRunRow(row));
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

    return rows.map((row) => this.mapSprintRunRow(row));
  }

  getSprintRun(runId: string): SprintRunRecord | null {
    const row = this.db.prepare(`
      SELECT *
      FROM sprint_runs
      WHERE id = ?
    `).get(runId) as SprintRunRow | undefined;
    return row ? this.mapSprintRunRow(row) : null;
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
    return row ? this.mapSprintRunRow(row) : null;
  }

  updateSprintRun(runId: string, input: UpdateSprintRunInput): SprintRunRecord {
    const current = requireSprintRun((id: string) => this.getSprintRun(id), runId);
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
    const updated = requireSprintRun((id: string) => this.getSprintRun(id), runId);
    if (this.shouldPublishSprintRunUpdate(input)) {
      this.notifyRealtime(updated.projectId, true);
    }
    return updated;
  }

  appendSprintRunEvent(
    sprintRunId: string,
    eventType: string,
    originator: string,
    payload: Record<string, unknown>,
    options?: { createdAt?: string; sourceEventKey?: string | null },
  ): boolean {
    const sprintRun = requireSprintRun((id: string) => this.getSprintRun(id), sprintRunId);
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
      this.notifyRealtime(sprintRun.projectId, true);
    }
    return inserted;
  }

  listSprintRunEvents(sprintRunId: string, limit: number = 50): SprintRunEventRecord[] {
    requireSprintRun((id: string) => this.getSprintRun(id), sprintRunId);
    const rows = this.db.prepare(`
      SELECT *
      FROM sprint_run_events
      WHERE sprint_run_id = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT ?
    `).all(sprintRunId, Math.max(1, limit)) as unknown as SprintRunEventRow[];
    return rows.map((row) => this.mapSprintRunEventRow(row));
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

  private mapSprintRunRow(row: SprintRunRow): SprintRunRecord {
    return {
      id: row.id,
      projectId: row.project_id,
      sprintId: row.sprint_id,
      status: row.status as SprintRunRecord["status"],
      triggerType: row.trigger_type as SprintRunRecord["triggerType"],
      triggeredBy: row.triggered_by,
      executorMode: row.executor_mode as SprintRunRecord["executorMode"],
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      lastHeartbeatAt: row.last_heartbeat_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapSprintRunEventRow(row: SprintRunEventRow): SprintRunEventRecord {
    return {
      id: row.id,
      sprintRunId: row.sprint_run_id,
      eventType: row.event_type,
      originator: row.originator,
      payload: parsePayloadJson(row.payload_json),
      sourceEventKey: row.source_event_key,
      createdAt: row.created_at,
    };
  }

  private shouldPublishSprintRunUpdate(input: UpdateSprintRunInput): boolean {
    return input.status !== undefined
      || input.executorMode !== undefined
      || input.startedAt !== undefined
      || input.finishedAt !== undefined;
  }

}
