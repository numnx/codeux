import { DatabaseAdapter } from "./db/database-adapter.js";
import { AppDbStorage } from "./app-db-storage.js";
import type { DashboardRealtimeMutationNotifier } from "../services/dashboard-realtime-service.js";
import { HotCache } from "../shared/cache/hot-entity-cache.js";

import type {
  ExecutionInvocationRecord,
  ExecutionInvocationMessageRecord,
  CreateExecutionInvocationInput,
  UpdateExecutionInvocationInput,
  AppendExecutionInvocationMessageInput
} from "../contracts/invocation-types.js";

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
  ProviderId,
} from "../contracts/app-types.js";

import { SprintRunRepository } from "./execution/sprint-run-repository.js";
import { TaskRunRepository } from "./execution/task-run-repository.js";
import { InvocationRepository } from "./execution/invocation-repository.js";
import { requireProject, requireSprint, requireTask } from "./execution/execution-validators.js";
import { queryProjectExecutionSnapshot } from "./execution/project-execution-snapshot-query.js";
import { queryProjectStatsSnapshot } from "./execution/project-stats-snapshot-query.js";
import { OverviewTelemetryQuery } from "./execution/overview-telemetry-query.js";
import { createEmptyUsageTotals } from "./execution/stats-buckets.js";
import { mapProviderInvocationUsageRow } from "./execution/execution-read-model-mappers.js";
import { toNumber } from "./execution/execution-utils.js";
import type { ProviderInvocationUsageRow } from "./execution/execution-repository-types.js";
import { StatsEntityMetadata } from "./execution/execution-stats-types.js";

export class ExecutionRepository {
  private readonly db: DatabaseAdapter;
  private readonly sprintRunRepo: SprintRunRepository;
  private readonly taskRunRepo: TaskRunRepository;
  private readonly invocationRepo: InvocationRepository;

  private readonly taskUsageCache = new HotCache<string, ExecutionUsageTotals>(500);
  private readonly sprintRunUsageCache = new HotCache<string, ExecutionUsageTotals>(500);
  private readonly taskWallTimeCache = new HotCache<string, { finishedMs: number, hasActive: boolean }>(500);
  private readonly sprintRunWallTimeCache = new HotCache<string, { finishedMs: number, hasActive: boolean }>(500);

  constructor(
    private readonly storage: AppDbStorage = new AppDbStorage(),
    private readonly realtimeNotifier?: DashboardRealtimeMutationNotifier,
  ) {
    this.db = storage.getDatabase();
    
    const onNotifyRealtime = (projectId: string, includeOverview: boolean) => {
      this.realtimeNotifier?.scheduleProjectExecutionRefresh(projectId, { includeOverview });
    };

    this.sprintRunRepo = new SprintRunRepository(this.db, onNotifyRealtime);
    this.taskRunRepo = new TaskRunRepository(this.db, this.storage, this.sprintRunRepo, onNotifyRealtime);
    this.invocationRepo = new InvocationRepository(this.db, this.sprintRunRepo, this.taskRunRepo, onNotifyRealtime);
  }

  // Invocation Methods
  createExecutionInvocation(input: CreateExecutionInvocationInput): ExecutionInvocationRecord {
    return this.invocationRepo.createExecutionInvocation(input);
  }
  updateExecutionInvocation(id: string, input: UpdateExecutionInvocationInput): ExecutionInvocationRecord {
    return this.invocationRepo.updateExecutionInvocation(id, input);
  }
  getExecutionInvocation(id: string): ExecutionInvocationRecord | null {
    return this.invocationRepo.getExecutionInvocation(id);
  }
  listExecutionInvocations(params: {
    projectId: string;
    sprintRunId?: string;
    taskRunId?: string;
    limit?: number;
    offset?: number;
  }): ExecutionInvocationRecord[] {
    return this.invocationRepo.listExecutionInvocations(params);
  }
  listExecutionInvocationMessages(invocationId: string): ExecutionInvocationMessageRecord[] {
    return this.invocationRepo.listExecutionInvocationMessages(invocationId);
  }
  appendExecutionInvocationMessage(invocationId: string, input: AppendExecutionInvocationMessageInput): ExecutionInvocationMessageRecord {
    return this.invocationRepo.appendExecutionInvocationMessage(invocationId, input);
  }

  // Sprint Run Methods
  createSprintRun(input: CreateSprintRunInput): SprintRunRecord {
    return this.sprintRunRepo.createSprintRun(input);
  }
  listSprintRuns(projectId: string, sprintId?: string): SprintRunRecord[] {
    return this.sprintRunRepo.listSprintRuns(projectId, sprintId);
  }
  listSprintRunsByStatus(statuses: SprintRunStatus[], options?: { projectId?: string; sprintId?: string }): SprintRunRecord[] {
    return this.sprintRunRepo.listSprintRunsByStatus(statuses, options);
  }
  getSprintRun(runId: string): SprintRunRecord | null {
    return this.sprintRunRepo.getSprintRun(runId);
  }
  findActiveSprintRun(projectId: string, sprintId: string): SprintRunRecord | null {
    return this.sprintRunRepo.findActiveSprintRun(projectId, sprintId);
  }
  updateSprintRun(runId: string, input: UpdateSprintRunInput): SprintRunRecord {
    return this.sprintRunRepo.updateSprintRun(runId, input);
  }

  // Task Dispatch Methods
  createTaskDispatch(input: CreateTaskDispatchInput): TaskDispatchRecord {
    return this.sprintRunRepo.createTaskDispatch(input);
  }
  listTaskDispatches(args: { projectId: string; sprintId?: string; sprintRunId?: string; taskId?: string }): TaskDispatchRecord[] {
    return this.sprintRunRepo.listTaskDispatches(args);
  }
  listTaskDispatchesByStatus(statuses: TaskDispatchStatus[], options?: { projectId?: string; sprintId?: string; sprintRunId?: string; taskId?: string; executorType?: TaskDispatchRecord["executorType"] }): TaskDispatchRecord[] {
    return this.sprintRunRepo.listTaskDispatchesByStatus(statuses, options);
  }
  listStaleCancelRequestedDispatches(cutoffIso: string): TaskDispatchRecord[] {
    return this.sprintRunRepo.listStaleCancelRequestedDispatches(cutoffIso);
  }
  updateTaskDispatch(dispatchId: string, input: UpdateTaskDispatchInput): TaskDispatchRecord {
    return this.sprintRunRepo.updateTaskDispatch(dispatchId, input);
  }
  getTaskDispatch(dispatchId: string): TaskDispatchRecord | null {
    return this.sprintRunRepo.getTaskDispatch(dispatchId);
  }
  claimNextTaskDispatch(args: { projectId: string; executorType: TaskDispatchRecord["executorType"]; connectionId?: string | null; sprintId?: string; sprintRunId?: string }): TaskDispatchRecord | null {
    return this.sprintRunRepo.claimNextTaskDispatch(args);
  }

  // Task Run Methods
  createTaskRun(input: CreateTaskRunInput): TaskRunRecord {
    const created = this.taskRunRepo.createTaskRun(input);
    if (created.taskId) this.taskWallTimeCache.delete(created.taskId);
    if (created.sprintRunId) this.sprintRunWallTimeCache.delete(created.sprintRunId);
    return created;
  }
  updateTaskRun(taskRunId: string, input: UpdateTaskRunInput): TaskRunRecord {
    const updated = this.taskRunRepo.updateTaskRun(taskRunId, input);
    if (updated.taskId) this.taskWallTimeCache.delete(updated.taskId);
    if (updated.sprintRunId) this.sprintRunWallTimeCache.delete(updated.sprintRunId);
    return updated;
  }
  getTaskRun(taskRunId: string): TaskRunRecord | null {
    return this.taskRunRepo.getTaskRun(taskRunId);
  }
  getLatestTaskRunBySessionId(sessionId: string): TaskRunRecord | null {
    return this.taskRunRepo.getLatestTaskRunBySessionId(sessionId);
  }
  getTaskRunByDispatchId(dispatchId: string): TaskRunRecord | null {
    return this.taskRunRepo.getTaskRunByDispatchId(dispatchId);
  }
  getLatestTaskRun(taskId: string, sprintRunId?: string): TaskRunRecord | null {
    return this.taskRunRepo.getLatestTaskRun(taskId, sprintRunId);
  }
  listLatestTaskRuns(taskIds: string[], sprintRunId?: string): Map<string, TaskRunRecord> {
    return this.taskRunRepo.listLatestTaskRuns(taskIds, sprintRunId);
  }
  countRunningTasksPerProvider(projectId: string): Map<ProviderId, number> {
    return this.taskRunRepo.countRunningTasksPerProvider(projectId);
  }

  // Usage Methods
  createProviderInvocationUsage(input: CreateProviderInvocationUsageInput): ProviderInvocationUsageRecord {
    const created = this.invocationRepo.createProviderInvocationUsage(input);
    if (created.taskId) this.taskUsageCache.delete(created.taskId);
    if (created.sprintRunId) this.sprintRunUsageCache.delete(created.sprintRunId);
    return created;
  }
  updateProviderInvocationUsage(invocationId: string, input: UpdateProviderInvocationUsageInput): ProviderInvocationUsageRecord {
    const updated = this.invocationRepo.updateProviderInvocationUsage(invocationId, input);
    if (updated.taskId) this.taskUsageCache.delete(updated.taskId);
    if (updated.sprintRunId) this.sprintRunUsageCache.delete(updated.sprintRunId);
    return updated;
  }
  getProviderInvocationUsage(invocationId: string): ProviderInvocationUsageRecord | null {
    return this.invocationRepo.getProviderInvocationUsage(invocationId);
  }
  getLatestProviderInvocationUsageBySession(sessionId: string, purpose?: ProviderInvocationUsageRecord["purpose"]): ProviderInvocationUsageRecord | null {
    return this.invocationRepo.getLatestProviderInvocationUsageBySession(sessionId, purpose);
  }
  listRunningProviderInvocationUsages(providers?: string[]): ProviderInvocationUsageRecord[] {
    return this.invocationRepo.listRunningProviderInvocationUsages(providers);
  }
  listExecutionInvocationsByProviderInvocationId(providerInvocationId: string): ExecutionInvocationRecord[] {
    return this.invocationRepo.listExecutionInvocationsByProviderInvocationId(providerInvocationId);
  }

  // Event Methods
  appendTaskRunEvent(taskRunId: string, eventType: string, originator: string, payload: Record<string, unknown>, options?: { createdAt?: string; sourceEventKey?: string | null }): boolean {
    const inserted = this.taskRunRepo.appendTaskRunEvent(taskRunId, eventType, originator, payload, options);
    if (inserted) {
      const taskRun = this.taskRunRepo.getTaskRun(taskRunId);
      if (taskRun?.taskId) this.taskWallTimeCache.delete(taskRun.taskId);
      if (taskRun?.sprintRunId) this.sprintRunWallTimeCache.delete(taskRun.sprintRunId);
    }
    return inserted;
  }
  appendSprintRunEvent(sprintRunId: string, eventType: string, originator: string, payload: Record<string, unknown>, options?: { createdAt?: string; sourceEventKey?: string | null }): boolean {
    return this.sprintRunRepo.appendSprintRunEvent(sprintRunId, eventType, originator, payload, options);
  }
  listTaskRunEvents(taskRunId: string, limit: number = 50): TaskRunEventRecord[] {
    return this.taskRunRepo.listTaskRunEvents(taskRunId, limit);
  }
  listSprintRunEvents(sprintRunId: string, limit: number = 50): SprintRunEventRecord[] {
    return this.sprintRunRepo.listSprintRunEvents(sprintRunId, limit);
  }

  // Lease Methods
  acquireLease(input: AcquireExecutionLeaseInput): ExecutionLeaseRecord {
    return this.sprintRunRepo.acquireLease(input);
  }
  renewLease(input: RenewExecutionLeaseInput): ExecutionLeaseRecord {
    return this.sprintRunRepo.renewLease(input);
  }
  releaseLease(scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string, leaseToken?: string): void {
    return this.sprintRunRepo.releaseLease(scopeType, scopeId, leaseToken);
  }
  releaseStaleSprintLease(projectId: string, sprintId: string): boolean {
    return this.sprintRunRepo.releaseStaleSprintLease(projectId, sprintId);
  }
  getLease(scopeType: ExecutionLeaseRecord["scopeType"], scopeId: string): ExecutionLeaseRecord | null {
    return this.sprintRunRepo.getLease(scopeType, scopeId);
  }
  listExpiredLeases(scopeType?: ExecutionLeaseRecord["scopeType"], now?: Date): ExecutionLeaseRecord[] {
    return this.sprintRunRepo.listExpiredLeases(scopeType, now);
  }

  // Other Methods
  hasActiveTaskDispatches(sprintRunId: string): boolean {
    return this.sprintRunRepo.hasActiveTaskDispatches(sprintRunId);
  }
  finalizeSprintRunCancellationIfIdle(sprintRunId: string): SprintRunRecord | null {
    return this.sprintRunRepo.finalizeSprintRunCancellationIfIdle(sprintRunId);
  }
  listWorkerProjectAffinity(connectionId: string): string[] {
    void connectionId;
    return [];
  }

  // Snapshot/Stats Methods
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

  // Private Helper methods for snapshots (using HotCache)

  private getUsageTotalsByTaskIds(projectId: string, taskIds: string[]): Map<string, ExecutionUsageTotals> {
    if (taskIds.length === 0) return new Map();
    const result = new Map<string, ExecutionUsageTotals>();
    const missingTaskIds: string[] = [];

    for (const taskId of taskIds) {
      const cached = this.taskUsageCache.get(taskId);
      if (cached) {
        result.set(taskId, cached);
      } else {
        missingTaskIds.push(taskId);
      }
    }

    if (missingTaskIds.length > 0) {
      const rows = this.storage.executeChunkedInQuery<ProviderInvocationUsageRow>({
        sqlPrefix: "SELECT * FROM provider_invocations WHERE project_id = ? AND task_id",
        items: missingTaskIds,
        bindParamsBefore: [projectId],
      });
      const grouped = this.groupUsageBy(rows.map((row) => mapProviderInvocationUsageRow(row)), (row) => row.taskId!);
      for (const [taskId, totals] of grouped.entries()) {
        this.taskUsageCache.set(taskId, totals);
        result.set(taskId, totals);
      }
      // Set empty totals for missing ones to avoid re-querying
      for (const taskId of missingTaskIds) {
        if (!result.has(taskId)) {
          const empty = createEmptyUsageTotals();
          this.taskUsageCache.set(taskId, empty);
          result.set(taskId, empty);
        }
      }
    }

    return result;
  }

  private getUsageTotalsBySprintRunIds(projectId: string, sprintRunIds: string[]): Map<string, ExecutionUsageTotals> {
    if (sprintRunIds.length === 0) return new Map();
    const result = new Map<string, ExecutionUsageTotals>();
    const missingIds: string[] = [];

    for (const id of sprintRunIds) {
      const cached = this.sprintRunUsageCache.get(id);
      if (cached) {
        result.set(id, cached);
      } else {
        missingIds.push(id);
      }
    }

    if (missingIds.length > 0) {
      const rows = this.storage.executeChunkedInQuery<ProviderInvocationUsageRow>({
        sqlPrefix: "SELECT * FROM provider_invocations WHERE project_id = ? AND sprint_run_id",
        items: missingIds,
        bindParamsBefore: [projectId],
      });
      const grouped = this.groupUsageBy(rows.map((row) => mapProviderInvocationUsageRow(row)), (row) => row.sprintRunId!);
      for (const [id, totals] of grouped.entries()) {
        this.sprintRunUsageCache.set(id, totals);
        result.set(id, totals);
      }
      for (const id of missingIds) {
        if (!result.has(id)) {
          const empty = createEmptyUsageTotals();
          this.sprintRunUsageCache.set(id, empty);
          result.set(id, empty);
        }
      }
    }

    return result;
  }

  private groupUsageBy(
    rows: ProviderInvocationUsageRecord[],
    keySelector: (row: ProviderInvocationUsageRecord) => string,
  ): Map<string, ExecutionUsageTotals> {
    const map = new Map<string, ExecutionUsageTotals>();
    for (const row of rows) {
      const key = keySelector(row);
      const current = map.get(key) || createEmptyUsageTotals();
      this.mergeUsageTotals(current, row);
      map.set(key, current);
    }
    return map;
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
      case "reported": target.reportedInvocationCount += 1; break;
      case "estimated": target.estimatedInvocationCount += 1; break;
      case "unsupported": target.unsupportedInvocationCount += 1; break;
      default: target.unavailableInvocationCount += 1; break;
    }
  }

  private getWallTimeTotalsByTaskIds(projectId: string, taskIds: string[], nowIso: string): Map<string, number> {
    if (taskIds.length === 0) return new Map();
    const result = new Map<string, number>();
    const missingTaskIds: string[] = [];
    const activeTaskIds: string[] = [];

    for (const taskId of taskIds) {
      const cache = this.taskWallTimeCache.get(taskId);
      if (cache) {
        result.set(taskId, cache.finishedMs);
        if (cache.hasActive) activeTaskIds.push(taskId);
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
      const finishedMap = new Map(finishedRows.map(r => [r.task_id, Math.max(0, toNumber(r.total_duration_ms))]));

      for (const taskId of missingTaskIds) {
        const finishedMs = finishedMap.get(taskId) || 0;
        const hasActive = activeMap.has(taskId);
        this.taskWallTimeCache.set(taskId, { finishedMs, hasActive });
        result.set(taskId, finishedMs);
        if (hasActive) activeTaskIds.push(taskId);
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
        result.set(row.task_id, (result.get(row.task_id) || 0) + Math.max(0, toNumber(row.total_duration_ms)));
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
      const cache = this.sprintRunWallTimeCache.get(sprintRunId);
      if (cache) {
        result.set(sprintRunId, cache.finishedMs);
        if (cache.hasActive) activeIds.push(sprintRunId);
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
      const finishedMap = new Map(finishedRows.map(r => [r.sprint_run_id, Math.max(0, toNumber(r.total_duration_ms))]));

      for (const sprintRunId of missingIds) {
        const finishedMs = finishedMap.get(sprintRunId) || 0;
        const hasActive = activeMap.has(sprintRunId);
        this.sprintRunWallTimeCache.set(sprintRunId, { finishedMs, hasActive });
        result.set(sprintRunId, finishedMs);
        if (hasActive) activeIds.push(sprintRunId);
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
        result.set(row.sprint_run_id, (result.get(row.sprint_run_id) || 0) + Math.max(0, toNumber(row.total_duration_ms)));
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

    return new Map(rows.map((row) => [row.task_id, Math.max(0, toNumber(row.total_duration_ms))]));
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

    return new Map(rows.map((row) => [row.sprint_run_id, Math.max(0, toNumber(row.total_duration_ms))]));
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
    }]));
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
      };
      map.set(row.sprint_id, summary);
      if (row.sprint_run_id) map.set(row.sprint_run_id, summary);
    }
    return map;
  }

  private mergeUsageMap(map: Map<string, ExecutionUsageTotals>, key: string | null | undefined, invocation: ProviderInvocationUsageRecord): void {
    if (!key) return;
    const existing = map.get(key) || createEmptyUsageTotals();
    this.mergeUsageTotals(existing, invocation);
    map.set(key, existing);
  }

  private updateLastActivity(map: Map<string, string>, key: string | null | undefined, value: string | null | undefined): void {
    if (!key || !value) return;
    const current = map.get(key);
    if (!current || new Date(value).getTime() > new Date(current).getTime()) {
      map.set(key, value);
    }
  }
}
