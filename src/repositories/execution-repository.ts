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
import { randomUUID } from "crypto";
import { createLogger, type Logger } from "../shared/logging/logger.js";
import { ConcurrencyConflictError, EntityNotFoundError, RepositoryError, ValidationError, serializePayloadJson } from "./repository-utils.js";
import { DatabaseAdapter } from "./db/database-adapter.js";
import { AppDbStorage } from "./app-db-storage.js";
import { toNumber, parsePayloadJson } from "./repository-utils.js";
import { queryProjectExecutionSnapshot } from "./execution/project-execution-snapshot-query.js";
import {
  mapProviderInvocationUsageRow,
  mapExecutionSprintRunSummaryRow,
  mapExecutionRuntimeEventSummaryRow
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
  ExecutionStatsEntitySummary,
  ExecutionHumanInterventionSummary,
  ExecutionUsageBucketSummary,
  ExecutionUsageTotals,
  ProjectExecutionStatsChartSeries,
  OverviewTelemetryProjectSummary,
  OverviewTelemetrySnapshot,
  ProjectExecutionStatsSnapshot,
  ProjectStatsQuery,
  ProjectStatsResolution,
  ProjectStatsWindow,
  ExecutionRuntimeEventSummary,
  ExecutionSprintRunSummary,
  ExecutionTaskDispatchSummary,
  ExecutionGitMetrics,
} from "../contracts/app-types.js";
import type { DashboardRealtimeMutationNotifier } from "../services/dashboard-realtime-service.js";
import type { ProviderId } from "../contracts/app-types.js";
import { createSprintRun, updateSprintRun, appendSprintRunEvent, finalizeSprintRunCancellationIfIdle } from "./execution/execution-sprint-run-writes.js";
import { createTaskRun, updateTaskRun, updateTaskRunsBatch, appendTaskRunEvent } from "./execution/execution-task-run-writes.js";
import { createTaskDispatch, updateTaskDispatch, updateTaskDispatchesBatch, claimNextTaskDispatch } from "./execution/execution-task-dispatch-writes.js";
import { acquireLease, renewLease, releaseLease, releaseStaleSprintLease } from "./execution/execution-lease-writes.js";
import { createExecutionInvocation, updateExecutionInvocation, appendExecutionInvocationMessage, clearExecutionInvocationMessages, createProviderInvocationUsage, tryCreateProviderInvocationUsage, updateProviderInvocationUsage } from "./execution/execution-invocation-writes.js";
import { queryExecutionSprintRuns } from "./execution/execution-sprint-runs-query.js";
import { queryExecutionTaskDispatches } from "./execution/execution-task-dispatches-query.js";
import { queryExecutionRuntimeEvents } from "./execution/execution-runtime-events-query.js";
import { normalizeProjectStatsQuery } from "./execution/project-stats-query.js";
import { queryProjectStatsSnapshot } from "./execution/project-stats-snapshot-query.js";
import { OverviewTelemetryQuery } from "./execution/overview-telemetry-query.js";
import { createUsageBuckets, createEmptyUsageTotals } from "./execution/stats-buckets.js";
import { claimNextTaskDispatchTransaction } from "./execution/task-dispatch-claim-query.js";
import {
  requireProject,
  requireSprint,
  requireTask,
  requireConnection,
  requireSprintRun,
  requireSprintRunScoped,
  requireTaskDispatch,
  requireTaskRun,
  requireProviderInvocationUsage,
  requireLease
} from "./execution/execution-validators.js";

import type {
  ExecutionSprintRunSummaryRow,
  ExecutionTaskDispatchSummaryRow,
  ExecutionRuntimeEventSummaryRow,
  ProviderInvocationUsageRow,
  ProjectAttentionSummaryRow
} from "./execution/execution-repository-types.js";


interface SprintRunRow {
  id: string;
  project_id: string;
  sprint_id: string;
  status: string;
  trigger_type: string;
  triggered_by: string | null;
  executor_mode: string;
  started_at: string | null;
  finished_at: string | null;
  last_heartbeat_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TaskDispatchRow {
  id: string;
  project_id: string;
  sprint_id: string;
  task_id: string;
  sprint_run_id: string;
  connection_id: string | null;
  executor_type: string;
  status: string;
  priority: number | string;
  queued_at: string;
  claimed_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  last_heartbeat_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface ExecutionLeaseRow {
  id: string;
  scope_type: string;
  scope_id: string;
  owner_key: string;
  lease_token: string;
  acquired_at: string;
  expires_at: string;
  last_heartbeat_at: string | null;
}

interface TaskRunRow {
  id: string;
  project_id: string;
  sprint_id: string;
  task_id: string;
  sprint_run_id: string | null;
  dispatch_id: string | null;
  connection_id: string | null;
  provider: string | null;
  mode: string | null;
  session_id: string | null;
  session_name: string | null;
  state: string;
  worker_branch: string | null;
  pr_url: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | string | null;
}

interface TaskRunEventRow {
  id: string;
  task_run_id: string;
  event_type: string;
  originator: string | null;
  payload_json: string | null;
  source_event_key: string | null;
  created_at: string;
}

interface SprintRunEventRow {
  id: string;
  sprint_run_id: string;
  event_type: string;
  originator: string | null;
  payload_json: string | null;
  source_event_key: string | null;
  created_at: string;
}

export interface StatsEntityMetadata {
  label: string;
  secondaryLabel: string | null;
  status: string | null;
  provider: string | null;
  purpose: string | null;
  lastActivityAt: string | null;
}

interface WorkerProjectAffinityRow {
  project_id: string;
  active_count: number | string;
  last_seen_at: string | null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_>#~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cloneUsageTotals(input?: ExecutionUsageTotals | null): ExecutionUsageTotals {
  return {
    ...createEmptyUsageTotals(),
    ...(input || {}),
  };
}

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
    return createExecutionInvocation(this, input);
  }

  updateExecutionInvocation(id: string, input: UpdateExecutionInvocationInput): ExecutionInvocationRecord {
    return updateExecutionInvocation(this, id, input);
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
    return queryExecutionInvocationMessages(this.db, invocationId);
  }

  clearExecutionInvocationMessages(invocationId: string): void {
    return clearExecutionInvocationMessages(this, invocationId);
  }


  appendExecutionInvocationMessage(invocationId: string, input: AppendExecutionInvocationMessageInput): ExecutionInvocationMessageRecord {
    return appendExecutionInvocationMessage(this, invocationId, input);
  }

  createSprintRun(input: CreateSprintRunInput): SprintRunRecord {
    return createSprintRun(this, input);
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
    return updateSprintRun(this, runId, input);
  }

  createTaskDispatch(input: CreateTaskDispatchInput): TaskDispatchRecord {
    return createTaskDispatch(this, input);
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

  updateTaskDispatchesBatch(dispatches: Array<{id: string} & UpdateTaskDispatchInput>): void {
    return updateTaskDispatchesBatch(this, dispatches);
  }

  updateTaskDispatch(dispatchId: string, input: UpdateTaskDispatchInput): TaskDispatchRecord {
    return updateTaskDispatch(this, dispatchId, input);
  }

  createTaskRun(input: CreateTaskRunInput): TaskRunRecord {
    return createTaskRun(this, input);
  }

  createProviderInvocationUsage(input: CreateProviderInvocationUsageInput): ProviderInvocationUsageRecord {
    return createProviderInvocationUsage(this, input);
  }

  /**
   * Attempts to claim a provider invocation slot atomically.
   * Returns the created record if a slot was available, or null if the limit was reached.
   */
  tryCreateProviderInvocationUsage(input: CreateProviderInvocationUsageInput, limit: number): ProviderInvocationUsageRecord | null {
    return tryCreateProviderInvocationUsage(this, input, limit);
  }

  updateProviderInvocationUsage(invocationId: string, input: UpdateProviderInvocationUsageInput): ProviderInvocationUsageRecord {
    return updateProviderInvocationUsage(this, invocationId, input);
  }

  getTaskRun(taskRunId: string): TaskRunRecord | null {
    const row = this.db.prepare(`
      SELECT *
      FROM task_runs
      WHERE id = ?
    `).get(taskRunId) as TaskRunRow | undefined;
    return row ? this.mapTaskRunRow(row) : null;
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
    return row ? this.mapTaskRunRow(row) : null;
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
    return row ? this.mapTaskDispatchRow(row) : null;
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
    return updateTaskRunsBatch(this, runs);
  }

  updateTaskRun(taskRunId: string, input: UpdateTaskRunInput): TaskRunRecord {
    return updateTaskRun(this, taskRunId, input);
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
          map.set(row.task_id, this.mapTaskRunRow(row));
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
        map.set(row.task_id, this.mapTaskRunRow(row));
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
    return appendTaskRunEvent(this, taskRunId, eventType, originator, payload, options);
  }

  appendSprintRunEvent(
    sprintRunId: string,
    eventType: string,
    originator: string,
    payload: Record<string, unknown>,
    options?: { createdAt?: string; sourceEventKey?: string | null },
  ): boolean {
    return appendSprintRunEvent(this, sprintRunId, eventType, originator, payload, options);
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
    return rows.map((row) => this.mapTaskRunEventRow(row));
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
    return rows.map((row) => this.mapSprintRunEventRow(row));
  }

  claimNextTaskDispatch(args: {
    projectId: string;
    executorType: TaskDispatchRecord["executorType"];
    connectionId?: string | null;
    sprintId?: string;
    sprintRunId?: string;
  }): TaskDispatchRecord | null {
    return claimNextTaskDispatch(this, args);
  }

  listWorkerProjectAffinity(connectionId: string): string[] {
    void connectionId;
    return [];
  }

  acquireLease(input: AcquireExecutionLeaseInput): ExecutionLeaseRecord {
    return acquireLease(this, input);
  }

  renewLease(input: RenewExecutionLeaseInput): ExecutionLeaseRecord {
    return renewLease(this, input);
  }

  releaseLease(scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string, leaseToken?: string): void {
    return releaseLease(this, scopeType, scopeId, leaseToken);
  }

  releaseStaleSprintLease(projectId: string, sprintId: string): boolean {
    return releaseStaleSprintLease(this, projectId, sprintId);
  }

  getLease(scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string): ExecutionLeaseRecord | null {
    const row = this.db.prepare(`
      SELECT *
      FROM execution_leases
      WHERE scope_type = ? AND scope_id = ?
    `).get(scopeType, scopeId) as ExecutionLeaseRow | undefined;
    return row ? this.mapExecutionLeaseRow(row) : null;
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

    return (rows as unknown as ExecutionLeaseRow[]).map((row) => this.mapExecutionLeaseRow(row));
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

    return (rows as unknown as ExecutionLeaseRow[]).map((row) => this.mapExecutionLeaseRow(row));
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
    return finalizeSprintRunCancellationIfIdle(this, sprintRunId);
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
    if (taskIds.length === 0) return new Map();
    const result = new Map<string, number>();
    const missingTaskIds: string[] = [];
    const activeTaskIds: string[] = [];

    for (const taskId of taskIds) {
      if (this.taskWallTimeCache.has(taskId)) {
        const cache = this.taskWallTimeCache.get(taskId)!;
        result.set(taskId, cache.finishedMs);
        if (cache.hasActive) {
          activeTaskIds.push(taskId);
        }
      } else {
        missingTaskIds.push(taskId);
      }
    }

    if (missingTaskIds.length > 0) {
      const activeRows = this.storage.executeChunkedInQuery<{ task_id: string; c: number | string }>({
        sqlPrefix: `SELECT task_id, COUNT(*) as c FROM task_runs WHERE finished_at IS NULL AND started_at IS NOT NULL AND task_id`,
        sqlSuffix: "GROUP BY task_id",
        items: missingTaskIds,
      });
      const activeMap = new Set(activeRows.map(r => r.task_id));

      const finishedRows = this.storage.executeChunkedInQuery<{ task_id: string; total_duration_ms: number | string }>({
        sqlPrefix: `SELECT task_id, SUM(CASE WHEN duration_ms IS NOT NULL AND duration_ms > 0 THEN duration_ms ELSE 0 END) AS total_duration_ms FROM task_runs WHERE task_id`,
        sqlSuffix: "GROUP BY task_id",
        items: missingTaskIds,
      });
      const finishedMap = new Map(finishedRows.map(r => [r.task_id, Math.max(0, Number(r.total_duration_ms) || 0)]));

      for (const taskId of missingTaskIds) {
        const finishedMs = finishedMap.get(taskId) || 0;
        const hasActive = activeMap.has(taskId);
        this.taskWallTimeCache.set(taskId, { finishedMs, hasActive });
        result.set(taskId, finishedMs);
        if (hasActive) {
          activeTaskIds.push(taskId);
        }
      }
    }

    if (activeTaskIds.length > 0) {
      const activeTimeRows = this.storage.executeChunkedInQuery<{ task_id: string; total_duration_ms: number | string }>({
        sqlPrefix: `SELECT task_id, SUM(CAST((julianday(?) - julianday(started_at)) * 86400000 AS INTEGER)) AS total_duration_ms FROM task_runs WHERE finished_at IS NULL AND started_at IS NOT NULL AND task_id`,
        sqlSuffix: "GROUP BY task_id",
        items: activeTaskIds,
        bindParamsBefore: [nowIso]
      });
      for (const row of activeTimeRows) {
        result.set(row.task_id, (result.get(row.task_id) || 0) + Math.max(0, Number(row.total_duration_ms) || 0));
      }
    }

    return result;
  }

  private getWallTimeTotalsBySprintRunIds(projectId: string, sprintRunIds: string[], nowIso: string): Map<string, number> {
    if (sprintRunIds.length === 0) return new Map();
    const result = new Map<string, number>();
    const missingIds: string[] = [];
    const activeIds: string[] = [];

    for (const sprintRunId of sprintRunIds) {
      if (this.sprintRunWallTimeCache.has(sprintRunId)) {
        const cache = this.sprintRunWallTimeCache.get(sprintRunId)!;
        result.set(sprintRunId, cache.finishedMs);
        if (cache.hasActive) {
          activeIds.push(sprintRunId);
        }
      } else {
        missingIds.push(sprintRunId);
      }
    }

    if (missingIds.length > 0) {
      const activeRows = this.storage.executeChunkedInQuery<{ sprint_run_id: string; c: number | string }>({
        sqlPrefix: `SELECT sprint_run_id, COUNT(*) as c FROM task_runs WHERE finished_at IS NULL AND started_at IS NOT NULL AND sprint_run_id`,
        sqlSuffix: "GROUP BY sprint_run_id",
        items: missingIds,
      });
      const activeMap = new Set(activeRows.map(r => r.sprint_run_id));

      const finishedRows = this.storage.executeChunkedInQuery<{ sprint_run_id: string; total_duration_ms: number | string }>({
        sqlPrefix: `SELECT sprint_run_id, SUM(CASE WHEN duration_ms IS NOT NULL AND duration_ms > 0 THEN duration_ms ELSE 0 END) AS total_duration_ms FROM task_runs WHERE sprint_run_id`,
        sqlSuffix: "GROUP BY sprint_run_id",
        items: missingIds,
      });
      const finishedMap = new Map(finishedRows.map(r => [r.sprint_run_id, Math.max(0, Number(r.total_duration_ms) || 0)]));

      for (const sprintRunId of missingIds) {
        const finishedMs = finishedMap.get(sprintRunId) || 0;
        const hasActive = activeMap.has(sprintRunId);
        this.sprintRunWallTimeCache.set(sprintRunId, { finishedMs, hasActive });
        result.set(sprintRunId, finishedMs);
        if (hasActive) {
          activeIds.push(sprintRunId);
        }
      }
    }

    if (activeIds.length > 0) {
      const activeTimeRows = this.storage.executeChunkedInQuery<{ sprint_run_id: string; total_duration_ms: number | string }>({
        sqlPrefix: `SELECT sprint_run_id, SUM(CAST((julianday(?) - julianday(started_at)) * 86400000 AS INTEGER)) AS total_duration_ms FROM task_runs WHERE finished_at IS NULL AND started_at IS NOT NULL AND sprint_run_id`,
        sqlSuffix: "GROUP BY sprint_run_id",
        items: activeIds,
        bindParamsBefore: [nowIso]
      });
      for (const row of activeTimeRows) {
        result.set(row.sprint_run_id, (result.get(row.sprint_run_id) || 0) + Math.max(0, Number(row.total_duration_ms) || 0));
      }
    }

    return result;
  }

  private getWallTimeTotalsByTaskIdsForRange(projectId: string, rangeStartIso: string, rangeEndIso: string, nowIso: string): Map<string, number> {
    const rows = this.db.prepare(`
      SELECT
        task_id,
        SUM(
          CASE
            WHEN duration_ms IS NOT NULL AND duration_ms > 0 THEN duration_ms
            WHEN started_at IS NOT NULL AND finished_at IS NULL THEN CAST((julianday(?) - julianday(started_at)) * 86400000 AS INTEGER)
            ELSE 0
          END
        ) AS total_duration_ms
      FROM task_runs
      WHERE project_id = ?
        AND task_id IS NOT NULL
        AND COALESCE(finished_at, started_at) >= ?
        AND COALESCE(finished_at, started_at) < ?
      GROUP BY task_id
    `).all(nowIso, projectId, rangeStartIso, rangeEndIso) as unknown as Array<{ task_id: string; total_duration_ms: number | string }>;

    return new Map(rows.map((row) => [row.task_id, Math.max(0, toNumber(row.total_duration_ms))] as const));
  }

  private getWallTimeTotalsBySprintRunIdsForRange(projectId: string, rangeStartIso: string, rangeEndIso: string, nowIso: string): Map<string, number> {
    const rows = this.db.prepare(`
      SELECT
        sprint_run_id,
        SUM(
          CASE
            WHEN duration_ms IS NOT NULL AND duration_ms > 0 THEN duration_ms
            WHEN started_at IS NOT NULL AND finished_at IS NULL THEN CAST((julianday(?) - julianday(started_at)) * 86400000 AS INTEGER)
            ELSE 0
          END
        ) AS total_duration_ms
      FROM task_runs
      WHERE project_id = ?
        AND sprint_run_id IS NOT NULL
        AND COALESCE(finished_at, started_at) >= ?
        AND COALESCE(finished_at, started_at) < ?
      GROUP BY sprint_run_id
    `).all(nowIso, projectId, rangeStartIso, rangeEndIso) as unknown as Array<{ sprint_run_id: string; total_duration_ms: number | string }>;

    return new Map(rows.map((row) => [row.sprint_run_id, Math.max(0, toNumber(row.total_duration_ms))] as const));
  }

  private getTaskMetadata(projectId: string, ids: string[]): Map<string, StatsEntityMetadata> {
    if (ids.length === 0) {
      return new Map();
    }
    const chunkMap = new Map<string, StatsEntityMetadata>();
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const placeholders = chunk.map(() => "?").join(",");
      const rows = this.db.prepare(`
        SELECT t.id, t.task_key, t.title, t.status, s.name AS sprint_name
        FROM tasks t
        INNER JOIN sprints s ON s.id = t.sprint_id
        WHERE t.project_id = ? AND t.id IN (${placeholders})
      `).all(projectId, ...chunk) as unknown as Array<{ id: string; task_key: string; title: string; status: string; sprint_name: string }>;
      for (const row of rows) {
        chunkMap.set(row.id, {
          label: `${row.task_key} ${row.title}`.trim(),
          secondaryLabel: row.sprint_name,
          status: row.status,
          provider: null,
          purpose: null,
          lastActivityAt: null,
        });
      }
    }
    return chunkMap;
  }

  private getSprintMetadata(projectId: string, ids: string[]): Map<string, StatsEntityMetadata> {
    if (ids.length === 0) {
      return new Map();
    }
    const chunkMap = new Map<string, StatsEntityMetadata>();
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const placeholders = chunk.map(() => "?").join(",");
      const rows = this.db.prepare(`
        SELECT s.id AS sprint_id, sr.id AS sprint_run_id, s.name, s.number, sr.status
        FROM sprints s
        LEFT JOIN sprint_runs sr ON sr.sprint_id = s.id
        WHERE s.project_id = ? AND (s.id IN (${placeholders}) OR sr.id IN (${placeholders}))
      `).all(projectId, ...chunk, ...chunk) as unknown as Array<{
        sprint_id: string;
        sprint_run_id: string | null;
        name: string;
        number: number | string | null;
        status: string | null;
      }>;

      for (const row of rows) {
        const summary = {
          label: row.number === null ? row.name : `Sprint ${toNumber(row.number)} · ${row.name}`,
          secondaryLabel: null,
          status: row.status,
          provider: null,
          purpose: null,
          lastActivityAt: null,
        } as const;
        chunkMap.set(row.sprint_id, summary);
        if (row.sprint_run_id) {
          chunkMap.set(row.sprint_run_id, summary);
        }
      }
    }
    return chunkMap;
  }


  private withLastActivityMetadata(
    metadata: Map<string, StatsEntityMetadata>,
    lastActivityMap: Map<string, string>,
  ): Map<string, StatsEntityMetadata> {
    const next = new Map(metadata);
    for (const [id, lastActivityAt] of lastActivityMap.entries()) {
      const current = next.get(id);
      if (current) {
        next.set(id, { ...current, lastActivityAt });
        continue;
      }
      next.set(id, {
        label: id,
        secondaryLabel: null,
        status: null,
        provider: null,
        purpose: null,
        lastActivityAt,
      });
    }
    return next;
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

  private mapExecutionLeaseRow(row: ExecutionLeaseRow): ExecutionLeaseRecord {
    return {
      id: row.id,
      scopeType: row.scope_type as ExecutionLeaseRecord["scopeType"],
      scopeId: row.scope_id,
      ownerKey: row.owner_key,
      leaseToken: row.lease_token,
      acquiredAt: row.acquired_at,
      expiresAt: row.expires_at,
      lastHeartbeatAt: row.last_heartbeat_at,
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



  private listActiveAttentionRowsForProject(projectId: string): ProjectAttentionSummaryRow[] {
    return this.db.prepare(`
      SELECT
        id,
        project_id,
        sprint_id,
        sprint_run_id,
        attention_type,
        severity,
        owner_type,
        status,
        title,
        summary_markdown,
        payload_json,
        updated_at
      FROM project_attention_items
      WHERE project_id = ?
        AND status IN ('open', 'claimed')
      ORDER BY updated_at DESC, opened_at DESC, id DESC
    `).all(projectId) as unknown as ProjectAttentionSummaryRow[];
  }

  private compareExecutionTaskDispatchSummaryRows(
    left: ExecutionTaskDispatchSummaryRow,
    right: ExecutionTaskDispatchSummaryRow,
  ): number {
    const leftRecency = left.last_heartbeat_at || left.started_at || left.claimed_at || left.queued_at;
    const rightRecency = right.last_heartbeat_at || right.started_at || right.claimed_at || right.queued_at;

    return this.executionTaskDispatchStatusRank(left.status) - this.executionTaskDispatchStatusRank(right.status)
      || toNumber(right.priority) - toNumber(left.priority)
      || rightRecency.localeCompare(leftRecency)
      || right.id.localeCompare(left.id);
  }

  private executionTaskDispatchStatusRank(status: string): number {
    switch (status) {
      case "running":
        return 0;
      case "cancel_requested":
        return 1;
      case "claimed":
        return 2;
      case "queued":
        return 3;
      case "blocked":
        return 4;
      case "failed":
        return 5;
      case "completed":
        return 6;
      default:
        return 7;
    }
  }

  private compareExecutionRuntimeEventSummaryRows(
    left: ExecutionRuntimeEventSummaryRow,
    right: ExecutionRuntimeEventSummaryRow,
  ): number {
    return right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id);
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
}
