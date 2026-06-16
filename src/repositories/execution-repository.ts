import {
  queryExecutionInvocation,
  queryProviderInvocationUsage,
  queryLatestProviderInvocationUsageBySession,
  queryRunningProviderInvocationUsages,
} from "./execution/execution-invocation-query.js";
import {
  queryExecutionInvocations,
  queryExecutionInvocationMessages,
  queryExecutionInvocationsByProviderInvocationId,
  queryRunningRetryExecutionInvocations,
} from "./execution/execution-invocations-query.js";
import { createLogger, type Logger } from "../shared/logging/logger.js";
import { RepositoryError, toNumber, parsePayloadJson } from "./repository-utils.js";
import { DatabaseAdapter } from "./db/database-adapter.js";
import { AppDbStorage } from "./app-db-storage.js";
import { queryProjectExecutionSnapshot } from "./execution/project-execution-snapshot-query.js";
import {
  mapProviderInvocationUsageRow,
  mapExecutionSprintRunSummaryRow,
  mapExecutionRuntimeEventSummaryRow,
  mapSprintRunRow,
  mapTaskDispatchRow,
  mapExecutionLeaseRow,
  mapTaskRunRow,
  mapTaskRunEventRow,
  mapSprintRunEventRow
} from "./execution/execution-read-model-mappers.js";


import type {
  ExecutionInvocationRecord,
  ExecutionInvocationMessageRecord,
  CreateExecutionInvocationInput,
  UpdateExecutionInvocationInput,
  AppendExecutionInvocationMessageInput
} from "../contracts/execution-types.js";

import type {
  AcquireExecutionLeaseInput,
  CreateProviderInvocationUsageInput,
  SprintRunStatus,
  TaskDispatchStatus,
  CreateTaskRunInput,
  CreateSprintRunInput,
  CreateTaskDispatchInput,
  ExecutionLeaseRecord,
  ProviderInvocationUsageRecord,
  SprintRunEventRecord,
  RenewExecutionLeaseInput,
  SprintRunRecord,
  TaskRunRecord,
  TaskRunEventRecord,
  TaskDispatchRecord,
  UpdateProviderInvocationUsageInput,
  UpdateTaskRunInput,
  UpdateSprintRunInput,
  UpdateTaskDispatchInput,
} from "../contracts/execution-types.js";
import type {
  ExecutionDashboardSnapshot,
  ExecutionUsageTotals,
  OverviewTelemetrySnapshot,
  ProjectExecutionStatsSnapshot,
  ProjectStatsQuery,
  ProjectStatsWindow,
  ExecutionRuntimeEventSummary,
  ExecutionSprintRunSummary,
  ExecutionTaskDispatchSummary,
} from "../contracts/app-types.js";
import type { DashboardRealtimeMutationNotifier } from "../services/dashboard-realtime-service.js";
import type { ProviderId } from "../contracts/app-types.js";
import { createExecutionInvocationWrite, updateExecutionInvocationWrite, listExecutionInvocationMessagesWrite, clearExecutionInvocationMessagesWrite, appendExecutionInvocationMessageWrite } from "./execution/execution-invocation-writes.js";
import { createSprintRunWrite, updateSprintRunWrite, appendSprintRunEventWrite, finalizeSprintRunCancellationIfIdleWrite } from "./execution/execution-sprint-run-writes.js";
import { createTaskDispatchWrite, updateTaskDispatchesBatchWrite, updateTaskDispatchWrite, claimNextTaskDispatchWrite } from "./execution/execution-task-dispatch-writes.js";
import { createTaskRunWrite, updateTaskRunsBatchWrite, updateTaskRunWrite, appendTaskRunEventWrite } from "./execution/execution-task-run-writes.js";
import { createProviderInvocationUsageWrite, tryCreateProviderInvocationUsageWrite, updateProviderInvocationUsageWrite } from "./execution/execution-provider-invocation-writes.js";
import { acquireLeaseWrite, renewLeaseWrite, releaseLeaseWrite, releaseStaleSprintLeaseWrite } from "./execution/execution-lease-writes.js";
import { ExecutionWriteContext, SprintRunRow, TaskDispatchRow, ExecutionLeaseRow, TaskRunRow, TaskRunEventRow, SprintRunEventRow, ExecutionTaskDispatchSummaryRow, ExecutionRuntimeEventSummaryRow, ProjectAttentionSummaryRow } from "./execution/execution-repository-types.js";
import { queryExecutionSprintRuns } from "./execution/execution-sprint-runs-query.js";
import { queryExecutionTaskDispatches } from "./execution/execution-task-dispatches-query.js";
import { queryExecutionRuntimeEvents } from "./execution/execution-runtime-events-query.js";
import { queryProjectStatsSnapshot } from "./execution/project-stats-snapshot-query.js";
import { OverviewTelemetryQuery } from "./execution/overview-telemetry-query.js";
import { createEmptyUsageTotals } from "./execution/stats-buckets.js";
import {
  requireProject,
  requireSprint,
  requireTask,
  requireSprintRun,
  requireTaskRun,
  requireProviderInvocationUsage,
} from "./execution/execution-validators.js";
import {
    queryWallTimeTotalsByTaskIds,
    queryWallTimeTotalsBySprintRunIds,
    queryWallTimeTotalsByTaskIdsForRange,
    queryWallTimeTotalsBySprintRunIdsForRange,
    queryTaskMetadata,
    querySprintMetadata,
    StatsEntityMetadata
} from "./execution/execution-stats-query.js";
import { queryActiveAttentionRowsForProject } from "./execution/execution-attention-query.js";

export class ExecutionRepository {
  public readonly db: DatabaseAdapter;
  public readonly taskWallTimeCache = new Map<string, { finishedMs: number, hasActive: boolean }>();
  public readonly sprintRunWallTimeCache = new Map<string, { finishedMs: number, hasActive: boolean }>();
  private readonly pendingRealtimeProjectRefreshes = new Map<string, { includeOverview: boolean }>();
  public readonly leaseProjectCache = new Map<string, string>();
  private realtimeProjectRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly storage: AppDbStorage = new AppDbStorage(),
    private readonly realtimeNotifier?: DashboardRealtimeMutationNotifier,
    public readonly logger: Logger = createLogger({ bindings: { component: "ExecutionRepository" } })
  ) {
    this.db = storage.getDatabase();
  }


  createExecutionInvocation(input: CreateExecutionInvocationInput): ExecutionInvocationRecord {
      return createExecutionInvocationWrite(this.db, input, this.getWriteContext());
  }

  updateExecutionInvocation(id: string, input: UpdateExecutionInvocationInput): ExecutionInvocationRecord {
      return updateExecutionInvocationWrite(this.db, id, input, this.getWriteContext());
  }

  getExecutionInvocation(id: string): ExecutionInvocationRecord | null {
    return queryExecutionInvocation(this.db, id);
  }

  listExecutionInvocations(params: {
    projectId: string;
    sprintRunId?: string;
    taskRunId?: string;
    limit?: number;
    offset?: number;
  }): ExecutionInvocationRecord[] {
    return queryExecutionInvocations(this.db, params);
  }

  listRunningRetryExecutionInvocations(): ExecutionInvocationRecord[] {
    return queryRunningRetryExecutionInvocations(this.db);
  }

  listExecutionInvocationMessages(invocationId: string): ExecutionInvocationMessageRecord[] {
      return listExecutionInvocationMessagesWrite(this.db, invocationId, this.getWriteContext());
  }

  clearExecutionInvocationMessages(invocationId: string): void {
      return clearExecutionInvocationMessagesWrite(this.db, invocationId, this.getWriteContext());
  }


  appendExecutionInvocationMessage(invocationId: string, input: AppendExecutionInvocationMessageInput): ExecutionInvocationMessageRecord {
      return appendExecutionInvocationMessageWrite(this.db, invocationId, input, this.getWriteContext());
  }

  createSprintRun(input: CreateSprintRunInput): SprintRunRecord {
      return createSprintRunWrite(this.db, input, this.getWriteContext());
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
      return updateSprintRunWrite(this.db, runId, input, this.getWriteContext());
  }

  createTaskDispatch(input: CreateTaskDispatchInput): TaskDispatchRecord {
      return createTaskDispatchWrite(this.db, input, this.getWriteContext());
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

  updateTaskDispatchesBatch(dispatches: Array<{id: string} & UpdateTaskDispatchInput>): void {
      return updateTaskDispatchesBatchWrite(this.db, dispatches, this.getWriteContext());
  }

  updateTaskDispatch(dispatchId: string, input: UpdateTaskDispatchInput): TaskDispatchRecord {
      return updateTaskDispatchWrite(this.db, dispatchId, input, this.getWriteContext());
  }

  createTaskRun(input: CreateTaskRunInput): TaskRunRecord {
      return createTaskRunWrite(this.db, input, this.getWriteContext());
  }

  createProviderInvocationUsage(input: CreateProviderInvocationUsageInput): ProviderInvocationUsageRecord {
      return createProviderInvocationUsageWrite(this.db, input, this.getWriteContext());
  }

  /**
   * Attempts to claim a provider invocation slot atomically.
   * Returns the created record if a slot was available, or null if the limit was reached.
   */
  tryCreateProviderInvocationUsage(input: CreateProviderInvocationUsageInput, limit: number): ProviderInvocationUsageRecord | null {
      return tryCreateProviderInvocationUsageWrite(this.db, input, limit, this.getWriteContext());
  }

  updateProviderInvocationUsage(invocationId: string, input: UpdateProviderInvocationUsageInput): ProviderInvocationUsageRecord {
      return updateProviderInvocationUsageWrite(this.db, invocationId, input, this.getWriteContext());
  }

  getTaskRun(taskRunId: string): TaskRunRecord | null {
    const row = this.db.prepare(`
      SELECT *
      FROM task_runs
      WHERE id = ?
    `).get(taskRunId) as TaskRunRow | undefined;
    return row ? mapTaskRunRow(row) : null;
  }

  getProviderInvocationUsage(invocationId: string): ProviderInvocationUsageRecord | null {
    return queryProviderInvocationUsage(this.db, invocationId);
  }

  getLatestProviderInvocationUsageBySession(
    sessionId: string,
    purpose?: ProviderInvocationUsageRecord["purpose"],
  ): ProviderInvocationUsageRecord | null {
    return queryLatestProviderInvocationUsageBySession(this.db, sessionId, purpose);
  }

  listRunningProviderInvocationUsages(providers?: string[]): ProviderInvocationUsageRecord[] {
    return queryRunningProviderInvocationUsages(this.db, providers);
  }

  listExecutionInvocationsByProviderInvocationId(providerInvocationId: string): ExecutionInvocationRecord[] {
    return queryExecutionInvocationsByProviderInvocationId(this.db, providerInvocationId);
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
    return row ? mapTaskRunRow(row) : null;
  }

  isSessionTerminal(sessionName: string): boolean {
    const normalized = sessionName.trim();
    if (!normalized) {
      return false;
    }
    const rawId = normalized.replace(/^sessions\//, "");
    const prefixedName = `sessions/${rawId}`;

    const row = this.db.prepare(`
      SELECT state
      FROM task_runs
      WHERE session_name = ? OR session_id = ?
         OR session_name = ? OR session_id = ?
      ORDER BY rowid DESC
      LIMIT 1
    `).get(normalized, normalized, prefixedName, rawId) as { state: string } | undefined;
    return row ? (row.state === "COMPLETED" || row.state === "FAILED") : false;
  }



  getTaskDispatch(dispatchId: string): TaskDispatchRecord | null {
    const row = this.db.prepare(`
      SELECT *
      FROM task_dispatches
      WHERE id = ?
    `).get(dispatchId) as TaskDispatchRow | undefined;
    return row ? mapTaskDispatchRow(row) : null;
  }

  getTaskRunByDispatchId(dispatchId: string): TaskRunRecord | null {
    const row = this.db.prepare(`
      SELECT *
      FROM task_runs
      WHERE dispatch_id = ?
      ORDER BY rowid DESC
      LIMIT 1
    `).get(dispatchId) as TaskRunRow | undefined;
    return row ? mapTaskRunRow(row) : null;
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
    return row ? mapTaskRunRow(row) : null;
  }

  getProjectExecutionSnapshot(projectId: string): ExecutionDashboardSnapshot {
    requireProject(this.db, projectId);
    return queryProjectExecutionSnapshot(this.db, this.storage, projectId, {
      getUsageTotalsByTaskIds: (pId, tIds) => this.getUsageTotalsByTaskIds(pId, tIds),
      getUsageTotalsBySprintRunIds: (pId, sIds) => this.getUsageTotalsBySprintRunIds(pId, sIds),
      getWallTimeTotalsByTaskIds: (pId, tIds, now) => this.getWallTimeTotalsByTaskIds(pId, tIds, now),
      getWallTimeTotalsBySprintRunIds: (pId, sIds, now) => this.getWallTimeTotalsBySprintRunIds(pId, sIds, now),
    });
  }

  getProjectStatsSnapshot(
    projectId: string,
    input: ProjectStatsQuery | ProjectStatsWindow = "7d",
  ): ProjectExecutionStatsSnapshot {
    const taskMetaCache = new Map<string, StatsEntityMetadata>();
    const sprintMetaCache = new Map<string, StatsEntityMetadata>();

    return queryProjectStatsSnapshot(this.db, projectId, input, {
      requireProject: (id) => requireProject(this.db, id),
      getWallTimeTotalsByTaskIdsForRange: (id, start, end, now) => this.getWallTimeTotalsByTaskIdsForRange(id, start, end, now),
      getWallTimeTotalsBySprintRunIdsForRange: (id, start, end, now) => this.getWallTimeTotalsBySprintRunIdsForRange(id, start, end, now),
      getTaskMetadata: (id, ids) => {
        const missing = ids.filter(i => !taskMetaCache.has(i));
        if (missing.length > 0) {
          const fresh = this.getTaskMetadata(id, missing);
          for (const [k, v] of fresh.entries()) taskMetaCache.set(k, v);
        }
        return new Map(ids.filter(i => taskMetaCache.has(i)).map(i => [i, taskMetaCache.get(i)!] as const));
      },
      getSprintMetadata: (id, ids) => {
        const missing = ids.filter(i => !sprintMetaCache.has(i));
        if (missing.length > 0) {
          const fresh = this.getSprintMetadata(id, missing);
          for (const [k, v] of fresh.entries()) sprintMetaCache.set(k, v);
        }
        return new Map(ids.filter(i => sprintMetaCache.has(i)).map(i => [i, sprintMetaCache.get(i)!] as const));
      },
      updateLastActivity: (map, key, date) => this.updateLastActivity(map, key, date),
    });
  }

  getOverviewTelemetrySnapshot(): OverviewTelemetrySnapshot {
    return new OverviewTelemetryQuery(this.db, this.storage).getOverviewTelemetrySnapshot();
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

  updateTaskRunsBatch(runs: Array<{id: string} & UpdateTaskRunInput>): void {
      return updateTaskRunsBatchWrite(this.db, runs, this.getWriteContext());
  }

  updateTaskRun(taskRunId: string, input: UpdateTaskRunInput): TaskRunRecord {
      return updateTaskRunWrite(this.db, taskRunId, input, this.getWriteContext());
  }


  listLatestTaskRuns(taskIds: string[], sprintRunId?: string): Map<string, TaskRunRecord> {
    const uniqueTaskIds = [...new Set(taskIds.map((taskId) => taskId.trim()).filter(Boolean))];
    if (uniqueTaskIds.length === 0) {
      return new Map();
    }

    const syntheticBlockedStatusSyncPredicate = `
        state = 'BLOCKED'
        AND mode = 'legacy-orchestrator'
        AND dispatch_id IS NULL
        AND connection_id IS NULL
        AND provider IS NULL
        AND session_id IS NULL
        AND session_name IS NULL
        AND worker_branch IS NULL
        AND pr_url IS NULL
        AND EXISTS (
          SELECT 1
          FROM task_run_events status_sync_events
          WHERE status_sync_events.task_run_id = task_runs.id
            AND status_sync_events.event_type = 'status_sync'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM task_run_events non_status_sync_events
          WHERE non_status_sync_events.task_run_id = task_runs.id
            AND non_status_sync_events.event_type != 'status_sync'
        )`;

    if (sprintRunId) {
      const rows = this.storage.executeChunkedInQuery<TaskRunRow>({
        sqlPrefix: `SELECT *
        FROM task_runs
        WHERE task_id`,
        sqlSuffix: `AND (sprint_run_id = ? OR sprint_run_id IS NULL)
        AND NOT (${syntheticBlockedStatusSyncPredicate})
        ORDER BY task_id ASC,
          CASE WHEN sprint_run_id = ? THEN 0 ELSE 1 END ASC,
          rowid DESC`,
        items: uniqueTaskIds,
        bindParamsAfter: [sprintRunId, sprintRunId],
      });

      const map = new Map<string, TaskRunRecord>();
      for (const row of rows) {
        if (!map.has(row.task_id)) {
          map.set(row.task_id, mapTaskRunRow(row));
        }
      }
      return map;
    }

    const runClause = sprintRunId ? "AND sprint_run_id = ?" : "";
    const rows = this.storage.executeChunkedInQuery<TaskRunRow>({
      sqlPrefix: `SELECT tr.*
      FROM task_runs tr
      INNER JOIN (
        SELECT task_id, MAX(rowid) AS latest_rowid
        FROM task_runs
        WHERE task_id`,
      sqlSuffix: `AND NOT (${syntheticBlockedStatusSyncPredicate})
        ${runClause}
        GROUP BY task_id
      ) latest ON latest.latest_rowid = tr.rowid
      ORDER BY tr.rowid DESC`,
      items: uniqueTaskIds,
      bindParamsAfter: [],
    });

    const map = new Map<string, TaskRunRecord>();
    for (const row of rows) {
      if (!map.has(row.task_id)) {
        map.set(row.task_id, mapTaskRunRow(row));
      }
    }
    return map;
  }

  appendTaskRunEvent(
    taskRunId: string,
    eventType: string,
    originator: string,
    payload: Record<string, unknown>,
    options?: { createdAt?: string; sourceEventKey?: string | null },
  ): boolean {
      return appendTaskRunEventWrite(this.db, taskRunId, eventType, originator, payload, options, this.getWriteContext());
  }

  appendSprintRunEvent(
    sprintRunId: string,
    eventType: string,
    originator: string,
    payload: Record<string, unknown>,
    options?: { createdAt?: string; sourceEventKey?: string | null },
  ): boolean {
      return appendSprintRunEventWrite(this.db, sprintRunId, eventType, originator, payload, options, this.getWriteContext());
  }

  listTaskRunEvents(taskRunId: string, limit: number = 50): TaskRunEventRecord[] {
    requireTaskRun((id) => this.getTaskRun(id), taskRunId);
    const rows = this.db.prepare(`
      SELECT *
      FROM task_run_events
      WHERE task_run_id = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT ?
    `).all(taskRunId, Math.max(1, limit)) as unknown as TaskRunEventRow[];
    return rows.map((row) => mapTaskRunEventRow(row));
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

  claimNextTaskDispatch(args: {
    projectId: string;
    executorType: TaskDispatchRecord["executorType"];
    connectionId?: string | null;
    sprintId?: string;
    sprintRunId?: string;
  }): TaskDispatchRecord | null {
      return claimNextTaskDispatchWrite(this.db, args, this.getWriteContext());
  }

  listWorkerProjectAffinity(connectionId: string): string[] {
    void connectionId;
    return [];
  }

  acquireLease(input: AcquireExecutionLeaseInput): ExecutionLeaseRecord {
      return acquireLeaseWrite(this.db, input, this.getWriteContext());
  }

  renewLease(input: RenewExecutionLeaseInput): ExecutionLeaseRecord {
      return renewLeaseWrite(this.db, input, this.getWriteContext());
  }

  releaseLease(scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string, leaseToken?: string): void {
      return releaseLeaseWrite(this.db, scopeType, scopeId, leaseToken, this.getWriteContext());
  }

  releaseStaleSprintLease(projectId: string, sprintId: string): boolean {
      return releaseStaleSprintLeaseWrite(this.db, projectId, sprintId, this.getWriteContext());
  }

  getLease(scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string): ExecutionLeaseRecord | null {
    const row = this.db.prepare(`
      SELECT *
      FROM execution_leases
      WHERE scope_type = ? AND scope_id = ?
    `).get(scopeType, scopeId) as ExecutionLeaseRow | undefined;
    return row ? mapExecutionLeaseRow(row) : null;
  }

  listAllLeases(scopeType?: ExecutionLeaseRecord["scopeType"]): ExecutionLeaseRecord[] {
    const rows = scopeType
      ? this.db.prepare(`
        SELECT *
        FROM execution_leases
        WHERE scope_type = ?
      `).all(scopeType)
      : this.db.prepare(`
        SELECT *
        FROM execution_leases
      `).all();

    return (rows as unknown as ExecutionLeaseRow[]).map((row) => mapExecutionLeaseRow(row));
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
      return finalizeSprintRunCancellationIfIdleWrite(this.db, sprintRunId, this.getWriteContext());
  }


  private getUsageTotalsByTaskIds(projectId: string, taskIds: string[]): Map<string, ExecutionUsageTotals> {
    if (taskIds.length === 0) {
      return new Map();
    }
    const rows = this.storage.executeChunkedInQuery<any>({
      sqlPrefix: `
        SELECT
          task_id,
          COUNT(*) as invocationCount,
          SUM(COALESCE(duration_ms, 0)) as activeTimeMs,
          SUM(input_tokens) as inputTokens,
          SUM(cached_input_tokens) as cachedInputTokens,
          SUM(output_tokens) as outputTokens,
          SUM(reasoning_output_tokens) as reasoningOutputTokens,
          SUM(total_tokens) as totalTokens,
          SUM(CASE WHEN usage_source = 'reported' THEN 1 ELSE 0 END) as reportedInvocationCount,
          SUM(CASE WHEN usage_source = 'estimated' THEN 1 ELSE 0 END) as estimatedInvocationCount,
          SUM(CASE WHEN usage_source = 'unsupported' THEN 1 ELSE 0 END) as unsupportedInvocationCount,
          SUM(CASE WHEN usage_source NOT IN ('reported', 'estimated', 'unsupported') THEN 1 ELSE 0 END) as unavailableInvocationCount
        FROM provider_invocations
        WHERE project_id = ? AND task_id`,
      items: taskIds,
      bindParamsBefore: [projectId],
      sqlSuffix: "GROUP BY task_id"
    });

    const map = new Map<string, ExecutionUsageTotals>();
    for (const row of rows) {
      map.set(row.task_id, {
        invocationCount: toNumber(row.invocationCount),
        activeTimeMs: toNumber(row.activeTimeMs),
        wallTimeMs: 0,
        inputTokens: toNumber(row.inputTokens),
        cachedInputTokens: toNumber(row.cachedInputTokens),
        outputTokens: toNumber(row.outputTokens),
        reasoningOutputTokens: toNumber(row.reasoningOutputTokens),
        totalTokens: toNumber(row.totalTokens),
        reportedInvocationCount: toNumber(row.reportedInvocationCount),
        estimatedInvocationCount: toNumber(row.estimatedInvocationCount),
        unsupportedInvocationCount: toNumber(row.unsupportedInvocationCount),
        unavailableInvocationCount: toNumber(row.unavailableInvocationCount),
      });
    }
    return map;
  }

  private getUsageTotalsBySprintRunIds(projectId: string, sprintRunIds: string[]): Map<string, ExecutionUsageTotals> {
    if (sprintRunIds.length === 0) {
      return new Map();
    }
    const rows = this.storage.executeChunkedInQuery<any>({
      sqlPrefix: `
        SELECT
          sprint_run_id,
          COUNT(*) as invocationCount,
          SUM(COALESCE(duration_ms, 0)) as activeTimeMs,
          SUM(input_tokens) as inputTokens,
          SUM(cached_input_tokens) as cachedInputTokens,
          SUM(output_tokens) as outputTokens,
          SUM(reasoning_output_tokens) as reasoningOutputTokens,
          SUM(total_tokens) as totalTokens,
          SUM(CASE WHEN usage_source = 'reported' THEN 1 ELSE 0 END) as reportedInvocationCount,
          SUM(CASE WHEN usage_source = 'estimated' THEN 1 ELSE 0 END) as estimatedInvocationCount,
          SUM(CASE WHEN usage_source = 'unsupported' THEN 1 ELSE 0 END) as unsupportedInvocationCount,
          SUM(CASE WHEN usage_source NOT IN ('reported', 'estimated', 'unsupported') THEN 1 ELSE 0 END) as unavailableInvocationCount
        FROM provider_invocations
        WHERE project_id = ? AND sprint_run_id`,
      items: sprintRunIds,
      bindParamsBefore: [projectId],
      sqlSuffix: "GROUP BY sprint_run_id"
    });

    const map = new Map<string, ExecutionUsageTotals>();
    for (const row of rows) {
      map.set(row.sprint_run_id, {
        invocationCount: toNumber(row.invocationCount),
        activeTimeMs: toNumber(row.activeTimeMs),
        wallTimeMs: 0,
        inputTokens: toNumber(row.inputTokens),
        cachedInputTokens: toNumber(row.cachedInputTokens),
        outputTokens: toNumber(row.outputTokens),
        reasoningOutputTokens: toNumber(row.reasoningOutputTokens),
        totalTokens: toNumber(row.totalTokens),
        reportedInvocationCount: toNumber(row.reportedInvocationCount),
        estimatedInvocationCount: toNumber(row.estimatedInvocationCount),
        unsupportedInvocationCount: toNumber(row.unsupportedInvocationCount),
        unavailableInvocationCount: toNumber(row.unavailableInvocationCount),
      });
    }
    return map;
  }

  private getWallTimeTotalsByTaskIds(projectId: string, taskIds: string[], nowIso: string): Map<string, number> {
      return queryWallTimeTotalsByTaskIds(this.storage, this.taskWallTimeCache, projectId, taskIds, nowIso);
  }

  private getWallTimeTotalsBySprintRunIds(projectId: string, sprintRunIds: string[], nowIso: string): Map<string, number> {
      return queryWallTimeTotalsBySprintRunIds(this.storage, this.sprintRunWallTimeCache, projectId, sprintRunIds, nowIso);
  }

  private getWallTimeTotalsByTaskIdsForRange(projectId: string, rangeStartIso: string, rangeEndIso: string, nowIso: string): Map<string, number> {
      return queryWallTimeTotalsByTaskIdsForRange(this.db, projectId, rangeStartIso, rangeEndIso, nowIso);
  }

  private getWallTimeTotalsBySprintRunIdsForRange(projectId: string, rangeStartIso: string, rangeEndIso: string, nowIso: string): Map<string, number> {
      return queryWallTimeTotalsBySprintRunIdsForRange(this.db, projectId, rangeStartIso, rangeEndIso, nowIso);
  }

  private getTaskMetadata(projectId: string, ids: string[]): Map<string, StatsEntityMetadata> {
      return queryTaskMetadata(this.db, projectId, ids);
  }

  private getSprintMetadata(projectId: string, ids: string[]): Map<string, StatsEntityMetadata> {
      return querySprintMetadata(this.db, projectId, ids);
  }


  private updateLastActivity(map: Map<string, string>, key: string | null | undefined, value: string | null | undefined): void {
    if (!key || !value) {
      return;
    }
    const current = map.get(key);
    if (!current || new Date(value).getTime() > new Date(current).getTime()) {
      map.set(key, value);
    }
  }


  public notifyRealtime(projectId: string, includeOverview: boolean): void {
    const normalizedProjectId = String(projectId || "").trim();
    if (!normalizedProjectId || !this.realtimeNotifier) {
      return;
    }

    const existing = this.pendingRealtimeProjectRefreshes.get(normalizedProjectId);
    this.pendingRealtimeProjectRefreshes.set(normalizedProjectId, {
      includeOverview: Boolean(existing?.includeOverview) || includeOverview,
    });

    if (this.realtimeProjectRefreshTimer) {
      return;
    }

    this.realtimeProjectRefreshTimer = setTimeout(() => {
      this.realtimeProjectRefreshTimer = null;
      this.flushPendingRealtimeProjectRefreshes();
    }, 0);
  }

  private flushPendingRealtimeProjectRefreshes(): void {
    if (!this.realtimeNotifier || this.pendingRealtimeProjectRefreshes.size === 0) {
      this.pendingRealtimeProjectRefreshes.clear();
      return;
    }

    const pendingEntries = [...this.pendingRealtimeProjectRefreshes.entries()];
    this.pendingRealtimeProjectRefreshes.clear();

    for (const [projectId, options] of pendingEntries) {
      this.realtimeNotifier.scheduleProjectExecutionRefresh(projectId, {
        includeOverview: options.includeOverview,
      });
    }
  }

  public shouldPublishSprintRunUpdate(input: UpdateSprintRunInput): boolean {
    return input.status !== undefined
      || input.executorMode !== undefined
      || input.startedAt !== undefined
      || input.finishedAt !== undefined;
  }

  public shouldPublishTaskDispatchUpdate(input: UpdateTaskDispatchInput): boolean {
    return input.connectionId !== undefined
      || input.status !== undefined
      || input.claimedAt !== undefined
      || input.startedAt !== undefined
      || input.finishedAt !== undefined
      || input.errorMessage !== undefined;
  }

  public notifyRealtimeForLease(scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string): void {
    const projectId = this.resolveLeaseProjectId(scopeType, scopeId);
    if (projectId) {
      this.notifyRealtime(projectId, false);
    }
  }

  public resolveLeaseProjectId(scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string): string | null {
    const cacheKey = `${scopeType}:${scopeId}`;
    const cached = this.leaseProjectCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    let projectId: string | null = null;

    if (scopeType === "sprint") {
      const row = this.db.prepare(`
        SELECT project_id
        FROM sprints
        WHERE id = ?
      `).get(scopeId) as { project_id: string } | undefined;
      projectId = row?.project_id || null;
    } else if (scopeType === "task_dispatch") {
      const row = this.db.prepare(`
        SELECT project_id
        FROM task_dispatches
        WHERE id = ?
      `).get(scopeId) as { project_id: string } | undefined;
      projectId = row?.project_id || null;
    }

    if (projectId !== null) {
      if (this.leaseProjectCache.size >= 1000) {
        this.leaseProjectCache.delete(this.leaseProjectCache.keys().next().value!);
      }
      this.leaseProjectCache.set(cacheKey, projectId);
    }

    return projectId;
  }

    private getWriteContext(): ExecutionWriteContext {

                 return {
                   logger: this.logger,
                   notifyRealtime: this.notifyRealtime.bind(this),
                   getTaskRun: this.getTaskRun.bind(this),
                   getSprintRun: this.getSprintRun.bind(this),
                   getTaskDispatch: this.getTaskDispatch.bind(this),
                   getExecutionInvocation: this.getExecutionInvocation.bind(this),
                   shouldPublishSprintRunUpdate: this.shouldPublishSprintRunUpdate.bind(this),
                   shouldPublishTaskDispatchUpdate: this.shouldPublishTaskDispatchUpdate.bind(this),
                   notifyRealtimeForLease: this.notifyRealtimeForLease.bind(this),
                   getLease: this.getLease.bind(this),
                   resolveLeaseProjectId: this.resolveLeaseProjectId.bind(this),
                   findActiveSprintRun: this.findActiveSprintRun.bind(this),
                   hasActiveTaskDispatches: this.hasActiveTaskDispatches.bind(this),
                   getProviderInvocationUsage: this.getProviderInvocationUsage.bind(this),
                   taskWallTimeCache: this.taskWallTimeCache,
                   sprintRunWallTimeCache: this.sprintRunWallTimeCache,
                   leaseProjectCache: this.leaseProjectCache
                 };
    }
}
