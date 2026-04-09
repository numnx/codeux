import type { ProviderId } from "../../contracts/app-types.js";
import { randomUUID } from "crypto";
import type { DatabaseAdapter } from "../db/database-adapter.js";
import { AppDbStorage } from "../app-db-storage.js";
import type { DashboardRealtimeMutationNotifier } from "../../services/dashboard-realtime-service.js";
import type {
  TaskDispatchRecord, CreateTaskDispatchInput, UpdateTaskDispatchInput, TaskDispatchStatus,
  TaskRunRecord, CreateTaskRunInput, UpdateTaskRunInput, TaskRunEventRecord
} from "../../contracts/execution-types.js";
import {
  requireProject, requireSprint, requireTask, requireConnection,
  requireSprintRunScoped, requireTaskDispatch, requireTaskRun
} from "./execution-validators.js";
import { parsePayloadJson, toNumber } from "./execution-utils.js";
import { claimNextTaskDispatchTransaction } from "./task-dispatch-claim-query.js";
import type { ExecutionRepository } from "../execution-repository.js";

type TaskDispatchRow = any;
type TaskRunRow = any;
type TaskRunEventRow = any;

export class TaskRunRepository {
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

  private getSprintRun(id: string) {
    return (this.executionRepository as any).getSprintRun(id);
  }

  createTaskDispatch(input: CreateTaskDispatchInput): TaskDispatchRecord {
    requireProject(this.db, input.projectId);
    requireSprint(this.db, input.sprintId, input.projectId);
    requireTask(this.db, input.taskId, input.projectId, input.sprintId);
    requireSprintRunScoped((id: string) => this.getSprintRun(id), input.sprintRunId, input.projectId, input.sprintId);
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

    const created = requireTaskDispatch((id: string) => this.getTaskDispatch(id), id);
    this.notifyRealtime(created.projectId, true);
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

    return rows.map((row) => this.mapTaskDispatchRow(row));
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

    return rows.map((row) => this.mapTaskDispatchRow(row));
  }

  listStaleCancelRequestedDispatches(cutoffIso: string): TaskDispatchRecord[] {
    const rows = this.db.prepare(`
      SELECT *
      FROM task_dispatches
      WHERE status = 'cancel_requested'
        AND COALESCE(last_heartbeat_at, updated_at, started_at, queued_at) <= ?
      ORDER BY COALESCE(last_heartbeat_at, updated_at, started_at, queued_at) ASC
    `).all(cutoffIso) as unknown as TaskDispatchRow[];

    return rows.map((row) => this.mapTaskDispatchRow(row));
  }

  updateTaskDispatch(dispatchId: string, input: UpdateTaskDispatchInput): TaskDispatchRecord {
    const current = requireTaskDispatch((id: string) => this.getTaskDispatch(id), dispatchId);
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
    const updated = requireTaskDispatch((id: string) => this.getTaskDispatch(id), dispatchId);
    if (this.shouldPublishTaskDispatchUpdate(input)) {
      this.notifyRealtime(updated.projectId, true);
    }
    return updated;
  }

  getTaskDispatch(dispatchId: string): TaskDispatchRecord | null {
    const row = this.db.prepare(`
      SELECT *
      FROM task_dispatches
      WHERE id = ?
    `).get(dispatchId) as TaskDispatchRow | undefined;
    return row ? this.mapTaskDispatchRow(row) : null;
  }

  claimNextTaskDispatch(args: {
    projectId: string;
    executorType: TaskDispatchRecord["executorType"];
    connectionId?: string | null;
    sprintId?: string;
    sprintRunId?: string;
  }): TaskDispatchRecord | null {
    const nowIso = new Date().toISOString();
    const claimedId = claimNextTaskDispatchTransaction(this.db as any, {
      ...args,
      nowIso,
    });

    if (!claimedId) {
      return null;
    }

    const updated = requireTaskDispatch((id: string) => this.getTaskDispatch(id), claimedId);
    this.notifyRealtime(updated.projectId, true);
    return updated;
  }

  createTaskRun(input: CreateTaskRunInput): TaskRunRecord {
    requireProject(this.db, input.projectId);
    requireSprint(this.db, input.sprintId, input.projectId);
    requireTask(this.db, input.taskId, input.projectId, input.sprintId);
    if (input.sprintRunId) {
      requireSprintRunScoped((id: string) => this.getSprintRun(id), input.sprintRunId, input.projectId, input.sprintId);
    }
    if (input.dispatchId) {
      requireTaskDispatch((id: string) => this.getTaskDispatch(id), input.dispatchId);
    }
    if (input.connectionId) {
      requireConnection(this.db, input.connectionId);
    }

    const id = randomUUID();
    this.db.prepare(`
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

    const created = requireTaskRun((id: string) => this.getTaskRun(id), id);
    this.notifyRealtime(created.projectId, false);
    return created;
  }

  updateTaskRun(taskRunId: string, input: UpdateTaskRunInput): TaskRunRecord {
    const current = requireTaskRun((id: string) => this.getTaskRun(id), taskRunId);
    this.db.prepare(`
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
    const updated = requireTaskRun((id: string) => this.getTaskRun(id), taskRunId);
    this.notifyRealtime(updated.projectId, false);
    return updated;
  }

  getTaskRun(taskRunId: string): TaskRunRecord | null {
    const row = this.db.prepare(`
      SELECT *
      FROM task_runs
      WHERE id = ?
    `).get(taskRunId) as TaskRunRow | undefined;
    return row ? this.mapTaskRunRow(row) : null;
  }

  getTaskRunByDispatchId(dispatchId: string): TaskRunRecord | null {
    const row = this.db.prepare(`
      SELECT *
      FROM task_runs
      WHERE dispatch_id = ?
      ORDER BY rowid DESC
      LIMIT 1
    `).get(dispatchId) as TaskRunRow | undefined;
    return row ? this.mapTaskRunRow(row) : null;
  }

  getLatestTaskRun(taskId: string, sprintRunId?: string): TaskRunRecord | null {
    requireTask(this.db, taskId);
    const row = sprintRunId
      ? this.db.prepare(`
        SELECT *
        FROM task_runs
        WHERE task_id = ?
        AND sprint_run_id = ?
        ORDER BY rowid DESC
        LIMIT 1
      `).get(taskId, sprintRunId) as TaskRunRow | undefined
      : this.db.prepare(`
        SELECT *
        FROM task_runs
        WHERE task_id = ?
        ORDER BY rowid DESC
        LIMIT 1
      `).get(taskId) as TaskRunRow | undefined;
    return row ? this.mapTaskRunRow(row) : null;
  }

  listLatestTaskRuns(taskIds: string[], sprintRunId?: string): Map<string, TaskRunRecord> {
    const uniqueTaskIds = [...new Set(taskIds.map((taskId) => taskId.trim()).filter(Boolean))];
    if (uniqueTaskIds.length === 0) {
      return new Map();
    }

    const runClause = sprintRunId ? "AND sprint_run_id = ?" : "";
    const rows = this.storage.executeChunkedInQuery<TaskRunRow>({
      sqlPrefix: `SELECT tr.*
      FROM task_runs tr
      INNER JOIN (
        SELECT task_id, MAX(rowid) AS latest_rowid
        FROM task_runs
        WHERE task_id`,
      sqlSuffix: `${runClause}
        GROUP BY task_id
      ) latest ON latest.latest_rowid = tr.rowid
      ORDER BY tr.rowid DESC`,
      items: uniqueTaskIds,
      bindParamsAfter: sprintRunId ? [sprintRunId] : [],
    });

    const map = new Map<string, TaskRunRecord>();
    for (const row of rows) {
      if (!map.has(row.task_id)) {
        map.set(row.task_id, this.mapTaskRunRow(row));
      }
    }
    return map;
  }

  getLatestTaskRunBySessionId(sessionId: string): TaskRunRecord | null {
    const normalizedSessionId = sessionId.trim();
    if (!normalizedSessionId) {
      return null;
    }
    const row = this.db.prepare(`
      SELECT *
      FROM task_runs
      WHERE session_id = ?
      ORDER BY rowid DESC
      LIMIT 1
    `).get(normalizedSessionId) as TaskRunRow | undefined;
    return row ? this.mapTaskRunRow(row) : null;
  }

  appendTaskRunEvent(
    taskRunId: string,
    eventType: string,
    originator: string,
    payload: Record<string, unknown>,
    options?: { createdAt?: string; sourceEventKey?: string | null },
  ): boolean {
    const taskRun = requireTaskRun((id: string) => this.getTaskRun(id), taskRunId);
    const result = this.db.prepare(`
      INSERT OR IGNORE INTO task_run_events (id, task_run_id, event_type, originator, payload_json, source_event_key, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      taskRunId,
      eventType,
      originator,
      JSON.stringify(payload),
      options?.sourceEventKey ?? null,
      options?.createdAt || new Date().toISOString()
    );
    const inserted = Number((result as { changes?: number }).changes || 0) > 0;
    if (inserted) {
      this.notifyRealtime(taskRun.projectId, false);
    }
    return inserted;
  }

  listTaskRunEvents(taskRunId: string, limit: number = 50): TaskRunEventRecord[] {
    requireTaskRun((id: string) => this.getTaskRun(id), taskRunId);
    const rows = this.db.prepare(`
      SELECT *
      FROM task_run_events
      WHERE task_run_id = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT ?
    `).all(taskRunId, Math.max(1, limit)) as unknown as TaskRunEventRow[];
    return rows.map((row) => this.mapTaskRunEventRow(row));
  }

  countRunningTasksPerProvider(projectId: string): Map<ProviderId, number> {
    requireProject(this.db, projectId);
    const rows = this.db.prepare(`
      SELECT provider, COUNT(*) as count
      FROM task_runs
      WHERE project_id = ? AND state = 'RUNNING' AND provider IS NOT NULL
      GROUP BY provider
    `).all(projectId) as Array<{ provider: string; count: number | string }>;

    const map = new Map<ProviderId, number>();
    for (const row of rows) {
      if (row.provider) {
        map.set(row.provider as ProviderId, toNumber(row.count));
      }
    }
    return map;
  }

  listWorkerProjectAffinity(connectionId: string): string[] {
    void connectionId;
    return [];
  }

  private mapTaskDispatchRow(row: TaskDispatchRow): TaskDispatchRecord {
    return {
      id: row.id,
      projectId: row.project_id,
      sprintId: row.sprint_id,
      taskId: row.task_id,
      sprintRunId: row.sprint_run_id,
      connectionId: row.connection_id,
      executorType: row.executor_type as TaskDispatchRecord["executorType"],
      status: row.status as TaskDispatchRecord["status"],
      priority: toNumber(row.priority),
      queuedAt: row.queued_at,
      claimedAt: row.claimed_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      lastHeartbeatAt: row.last_heartbeat_at,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapTaskRunRow(row: TaskRunRow): TaskRunRecord {
    return {
      id: row.id,
      projectId: row.project_id,
      sprintId: row.sprint_id,
      taskId: row.task_id,
      sprintRunId: row.sprint_run_id,
      dispatchId: row.dispatch_id,
      connectionId: row.connection_id,
      provider: row.provider,
      mode: row.mode,
      sessionId: row.session_id,
      sessionName: row.session_name,
      state: row.state as TaskRunRecord["state"],
      workerBranch: row.worker_branch,
      prUrl: row.pr_url,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      durationMs: row.duration_ms === null ? null : toNumber(row.duration_ms),
    };
  }

  private mapTaskRunEventRow(row: TaskRunEventRow): TaskRunEventRecord {
    return {
      id: row.id,
      taskRunId: row.task_run_id,
      eventType: row.event_type,
      originator: row.originator,
      payload: parsePayloadJson(row.payload_json),
      sourceEventKey: row.source_event_key,
      createdAt: row.created_at,
    };
  }

  private shouldPublishTaskDispatchUpdate(input: UpdateTaskDispatchInput): boolean {
    return input.connectionId !== undefined
      || input.status !== undefined
      || input.claimedAt !== undefined
      || input.startedAt !== undefined
      || input.finishedAt !== undefined
      || input.errorMessage !== undefined;
  }

}
