import {
  queryExecutionInvocation,
  queryProviderInvocationUsage,
  queryLatestProviderInvocationUsageBySession
} from "./execution/execution-invocation-query.js";
import {
  queryExecutionInvocations,
  queryExecutionInvocationMessages
} from "./execution/execution-invocations-query.js";
import { randomUUID } from "crypto";
import { DatabaseAdapter } from "./db/database-adapter.js";
import { AppDbStorage } from "./app-db-storage.js";
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

function toNumber(value: number | string): number {
  return typeof value === "number" ? value : Number.parseInt(value, 10) || 0;
}

function parsePayloadJson(value: string | null): Record<string, unknown> | null {
  if (!value || !value.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
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
  private readonly db: DatabaseAdapter;

  constructor(
    private readonly storage: AppDbStorage = new AppDbStorage(),
    private readonly realtimeNotifier?: DashboardRealtimeMutationNotifier,
  ) {
    this.db = storage.getDatabase();
  }
























































  getProjectExecutionSnapshot(projectId: string): ExecutionDashboardSnapshot {
    requireProject(this.db, projectId);
    return queryProjectExecutionSnapshot(this.db, this.storage, projectId);
  }

  getProjectStatsSnapshot(
    projectId: string,
    input: ProjectStatsQuery | ProjectStatsWindow = "7d",
  ): ProjectExecutionStatsSnapshot {
    return queryProjectStatsSnapshot(this.db, projectId, input, {
      requireProject: (id) => requireProject(this.db, id),
      getWallTimeTotalsByTaskIdsForRange: (id, start, end, now) => this.getWallTimeTotalsByTaskIdsForRange(id, start, end, now),
      getWallTimeTotalsBySprintRunIdsForRange: (id, start, end, now) => this.getWallTimeTotalsBySprintRunIdsForRange(id, start, end, now),
      getTaskMetadata: (id) => this.getTaskMetadata(id),
      getSprintMetadata: (id) => this.getSprintMetadata(id),
      mapProviderInvocationUsageRow: (row: any) => mapProviderInvocationUsageRow(row as any),
      mergeUsageTotals: (target, source) => this.mergeUsageTotals(target, source),
      mergeUsageMap: (map, key, source) => this.mergeUsageMap(map, key, source),
      updateLastActivity: (map, key, date) => this.updateLastActivity(map, key, date),
    });
  }

  getOverviewTelemetrySnapshot(): OverviewTelemetrySnapshot {
    return new OverviewTelemetryQuery(this.db, this.storage).getOverviewTelemetrySnapshot();
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
        this.notifyRealtime(projectId, false);
      }
      return;
    }

    this.db.prepare(`
      DELETE FROM execution_leases
      WHERE scope_type = ? AND scope_id = ?
    `).run(scopeType, scopeId);
    if (projectId) {
      this.notifyRealtime(projectId, false);
    }
  }

  releaseStaleSprintLease(projectId: string, sprintId: string): boolean {
    requireProject(this.db, projectId);
    requireSprint(this.db, sprintId, projectId);

    const lease = this.getLease("sprint", sprintId);
    if (!lease) {
      return false;
    }

    const activeRun = (null as any) /* TODO FIX LEASE */;
    if (activeRun) {
      if (activeRun.status === "running" || activeRun.status === "queued") {
        return false;
      }
      if (activeRun.status === "cancel_requested" && false(activeRun.id)) {
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
    return row ? this.mapExecutionLeaseRow(row) : null;
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






  private withWallTime(usage: ExecutionUsageTotals | undefined, wallTimeMs: number): ExecutionUsageTotals {
    const next = cloneUsageTotals(usage);
    next.wallTimeMs = wallTimeMs;
    return next;
  }

  private mergeUsageMap(
    map: Map<string, ExecutionUsageTotals>,
    key: string | null | undefined,
    invocation: ProviderInvocationUsageRecord,
  ): void {
    if (!key) {
      return;
    }
    const existing = map.get(key) || createEmptyUsageTotals();
    this.mergeUsageTotals(existing, invocation);
    map.set(key, existing);
  }

  private mergeUsageTotals(target: ExecutionUsageTotals, invocation: ProviderInvocationUsageRecord): void {
    target.invocationCount += 1;
    target.activeTimeMs += invocation.durationMs || 0;
    target.inputTokens += invocation.inputTokens;
    target.cachedInputTokens += invocation.cachedInputTokens;
    target.outputTokens += invocation.outputTokens;
    target.reasoningOutputTokens += invocation.reasoningOutputTokens;
    target.totalTokens += invocation.totalTokens;
    switch (invocation.usageSource) {
      case "reported":
        target.reportedInvocationCount += 1;
        break;
      case "estimated":
        target.estimatedInvocationCount += 1;
        break;
      case "unsupported":
        target.unsupportedInvocationCount += 1;
        break;
      default:
        target.unavailableInvocationCount += 1;
        break;
    }
  }

  private getUsageTotalsByTaskIds(projectId: string, taskIds: string[]): Map<string, ExecutionUsageTotals> {
    if (taskIds.length === 0) {
      return new Map();
    }
    const rows = this.storage.executeChunkedInQuery<ProviderInvocationUsageRow>({
      sqlPrefix: "SELECT * FROM provider_invocations WHERE project_id = ? AND task_id",
      items: taskIds,
      bindParamsBefore: [projectId],
    });
    return this.groupUsageBy(rows.map((row) => mapProviderInvocationUsageRow(row)), (row) => row.taskId);
  }

  private getUsageTotalsBySprintRunIds(projectId: string, sprintRunIds: string[]): Map<string, ExecutionUsageTotals> {
    if (sprintRunIds.length === 0) {
      return new Map();
    }
    const rows = this.storage.executeChunkedInQuery<ProviderInvocationUsageRow>({
      sqlPrefix: "SELECT * FROM provider_invocations WHERE project_id = ? AND sprint_run_id",
      items: sprintRunIds,
      bindParamsBefore: [projectId],
    });
    return this.groupUsageBy(rows.map((row) => mapProviderInvocationUsageRow(row)), (row) => row.sprintRunId);
  }

  private groupUsageBy(
    rows: ProviderInvocationUsageRecord[],
    keySelector: (row: ProviderInvocationUsageRecord) => string | null,
  ): Map<string, ExecutionUsageTotals> {
    const map = new Map<string, ExecutionUsageTotals>();
    for (const row of rows) {
      const key = keySelector(row);
      if (!key) {
        continue;
      }
      const current = map.get(key) || createEmptyUsageTotals();
      this.mergeUsageTotals(current, row);
      map.set(key, current);
    }
    return map;
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

  private getTaskMetadata(projectId: string): Map<string, StatsEntityMetadata> {
    const rows = this.db.prepare(`
      SELECT t.id, t.task_key, t.title, t.status, s.name AS sprint_name
      FROM tasks t
      INNER JOIN sprints s ON s.id = t.sprint_id
      WHERE t.project_id = ?
    `).all(projectId) as unknown as Array<{ id: string; task_key: string; title: string; status: string; sprint_name: string }>;
    return new Map(rows.map((row) => [row.id, {
      label: `${row.task_key} ${row.title}`.trim(),
      secondaryLabel: row.sprint_name,
      status: row.status,
      provider: null,
      purpose: null,
      lastActivityAt: null,
    }] as const));
  }

  private getSprintMetadata(projectId: string): Map<string, StatsEntityMetadata> {
    const rows = this.db.prepare(`
      SELECT s.id AS sprint_id, sr.id AS sprint_run_id, s.name, s.number, sr.status
      FROM sprints s
      LEFT JOIN sprint_runs sr ON sr.sprint_id = s.id
      WHERE s.project_id = ?
    `).all(projectId) as unknown as Array<{
      sprint_id: string;
      sprint_run_id: string | null;
      name: string;
      number: number | string | null;
      status: string | null;
    }>;

    const map = new Map<string, StatsEntityMetadata>();

    for (const row of rows) {
      const summary = {
        label: row.number === null ? row.name : `Sprint ${toNumber(row.number)} · ${row.name}`,
        secondaryLabel: null,
        status: row.status,
        provider: null,
        purpose: null,
        lastActivityAt: null,
      } as const;
      map.set(row.sprint_id, summary);
      if (row.sprint_run_id) {
        map.set(row.sprint_run_id, summary);
      }
    }

    return map;
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

  private notifyRealtime(projectId: string, includeOverview: boolean): void {
    this.realtimeNotifier?.scheduleProjectExecutionRefresh(projectId, { includeOverview });
  }





  private notifyRealtimeForLease(scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string): void {
    const projectId = this.resolveLeaseProjectId(scopeType, scopeId);
    if (projectId) {
      this.notifyRealtime(projectId, false);
    }
  }

  private resolveLeaseProjectId(scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string): string | null {
    if (scopeType === "sprint") {
      const row = this.db.prepare(`
        SELECT project_id
        FROM sprints
        WHERE id = ?
      `).get(scopeId) as { project_id: string } | undefined;
      return row?.project_id || null;
    }

    if (scopeType === "task_dispatch") {
      const row = this.db.prepare(`
        SELECT project_id
        FROM task_dispatches
        WHERE id = ?
      `).get(scopeId) as { project_id: string } | undefined;
      return row?.project_id || null;
    }

    return null;
  }
}
