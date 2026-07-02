import { normalizeProjectStatsQuery } from "./project-stats-query.js";
import { createUsageBuckets, createEmptyUsageTotals, InternalStatsBucket } from "./stats-buckets.js";
import { queryProjectGitStats } from "./project-stats-git-query.js";
import {
  ProjectStatsQuery,
  ProjectStatsWindow,
  ProjectExecutionStatsChartSeries,
  ProjectExecutionStatsSnapshot,
} from "../../contracts/app-types.js";
import { DatabaseAdapter as Database } from "../db/database-adapter.js";
import {
  ExecutionUsageTotals,
} from "../../contracts/app-types.js";
import { toNumber } from "./execution-utils.js";
import { StatsEntityMetadata, ProjectStatsQueryDependencies } from "./execution-stats-types.js";
import {
  usageFields,
  mapAggregatedUsage,
  mergeAggregatedUsage,
  accumulateBucketUsage,
  mapEntityUsage,
} from "./project-stats-aggregation.js";
import { createSnapshotPricingResolver } from "./project-stats-costing.js";
import { buildProjectStatsChartSeries } from "./project-stats-chart-series.js";
import { DurationSampleRow, DurationAggregateRow, computeAggregatesFromSamples, computeAggregatesFromAggregations, ComputedDurationAggregates } from "./project-stats-duration.js";

import {
  addStatusCount,
  buildModelStatsKey,
  buildModelStatsLabel,
  computeDurationStats,
  computeDurationStatsFromAggregates,
  computeSuccessRate,
  createEmptyStatusCounts,
  ExecutionDurationAggregates,
} from "./model-stats.js";
import {
  ExecutionInvocationStatusCounts,
  ExecutionModelStatsSummary,
} from "../../contracts/app-types.js";

export const DEFAULT_MAX_DURATION_SAMPLES = 10000;

export interface MainAggregateRow {
  bucketIndex: number;
  task_id: string | null;
  sprint_key: string | null;
  provider: string | null;
  purpose: string | null;
  usage_source: string | null;
  model: string | null;
  status: string | null;
  lastActivityAt: string | null;
  invocationCount: number | string | null;
  activeTimeMs: number | string | null;
  inputTokens: number | string | null;
  cachedInputTokens: number | string | null;
  outputTokens: number | string | null;
  reasoningOutputTokens: number | string | null;
  totalTokens: number | string | null;
  toolCallCount: number | string | null;
  reportedInvocationCount: number | string | null;
  estimatedInvocationCount: number | string | null;
  unsupportedInvocationCount: number | string | null;
  unavailableInvocationCount: number | string | null;
}


function getDurationSampleCap(deps: ProjectStatsQueryDependencies): number {
  return deps.maxDurationSamples ?? DEFAULT_MAX_DURATION_SAMPLES;
}

export function queryProjectStatsSnapshot(
  db: Database,
  projectId: string,
  input: ProjectStatsQuery | ProjectStatsWindow = "7d",
  deps: ProjectStatsQueryDependencies
): ProjectExecutionStatsSnapshot {
  deps.requireProject(projectId);
  const projectRow = db.prepare(`
    SELECT id, name
    FROM projects
    WHERE id = ?
  `).get(projectId) as { id: string; name: string } | undefined;
  const now = new Date();
  const normalized = normalizeProjectStatsQuery(db, projectId, input, now);
  const rangeStartIso = normalized.range.from;
  const rangeEndIso = normalized.range.to;
  const nowIso = now.toISOString();
  const wallTimeByTaskId = deps.getWallTimeTotalsByTaskIdsForRange(projectId, rangeStartIso, rangeEndIso, nowIso);
  const wallTimeBySprintRunId = deps.getWallTimeTotalsBySprintRunIdsForRange(projectId, rangeStartIso, rangeEndIso, nowIso);
  const buckets = createUsageBuckets(normalized.range, normalized.bucketSizeMs);
  const firstBucketStartMs = buckets.length > 0 ? buckets[0].bucketStartMs : 0;

  const { totals: gitTotals, buckets: gitBuckets, taskUsage: gitTaskUsage, sprintUsage: gitSprintUsage } = queryProjectGitStats(
    db,
    projectId,
    rangeStartIso,
    rangeEndIso,
    buckets,
    normalized.bucketSizeMs,
    firstBucketStartMs
  );

  const usage = createEmptyUsageTotals();
  const taskUsage = new Map<string, ExecutionUsageTotals>();
  const sprintUsage = new Map<string, ExecutionUsageTotals>();
  const providerUsage = new Map<string, ExecutionUsageTotals>();
  const purposeUsage = new Map<string, ExecutionUsageTotals>();
  const tokenSourceCounts = new Map<string, number>();
  const pricingResolver = createSnapshotPricingResolver(deps.getModelPricing);
  const taskLastActivity = new Map<string, string>();
  const sprintLastActivity = new Map<string, string>();
  const providerLastActivity = new Map<string, string>();
  const purposeLastActivity = new Map<string, string>();
  const modelUsage = new Map<string, ExecutionUsageTotals>();
  const modelMeta = new Map<string, { provider: string; model: string | null }>();
  const modelStatusCounts = new Map<string, ExecutionInvocationStatusCounts>();
  const modelLastActivity = new Map<string, string>();
  const statusCounts = createEmptyStatusCounts();

  const bucketQuery = buckets.length > 0 ? `
    CAST((julianday(started_at) - julianday(?)) * 86400000 / ? AS INTEGER) as bucketIndex,
  ` : "-1 as bucketIndex,";
  const bucketParams = buckets.length > 0 ? [rangeStartIso, normalized.bucketSizeMs] : [];

  // Single comprehensive query
  const mainAggs = db.prepare(`
    SELECT
      ${bucketQuery}
      task_id,
      COALESCE(sprint_run_id, sprint_id) as sprint_key,
      provider,
      purpose,
      usage_source,
      model,
      status,
      MAX(COALESCE(finished_at, started_at)) as lastActivityAt,
      ${usageFields}
    FROM provider_invocations
    WHERE project_id = ? AND started_at >= ? AND started_at < ?
    GROUP BY bucketIndex, task_id, sprint_key, provider, purpose, usage_source, model, status
  `).all(...bucketParams, projectId, rangeStartIso, rangeEndIso) as MainAggregateRow[];

  for (const row of mainAggs) {
    const u = mapAggregatedUsage(row, pricingResolver, row.provider, row.model);
    mergeAggregatedUsage(usage, u);

    // Task aggregations
    if (row.task_id) {
      const tU = taskUsage.get(row.task_id) || createEmptyUsageTotals();
      mergeAggregatedUsage(tU, u);
      taskUsage.set(row.task_id, tU);
      deps.updateLastActivity(taskLastActivity, row.task_id, row.lastActivityAt);
    }

    // Sprint aggregations
    if (row.sprint_key) {
      const sU = sprintUsage.get(row.sprint_key) || createEmptyUsageTotals();
      mergeAggregatedUsage(sU, u);
      sprintUsage.set(row.sprint_key, sU);
      deps.updateLastActivity(sprintLastActivity, row.sprint_key, row.lastActivityAt);
    }

    // Provider usage
    if (row.provider) {
      const pU = providerUsage.get(row.provider) || createEmptyUsageTotals();
      mergeAggregatedUsage(pU, u);
      providerUsage.set(row.provider, pU);
      deps.updateLastActivity(providerLastActivity, row.provider, row.lastActivityAt);
    }

    // Purpose usage
    if (row.purpose) {
      const purU = purposeUsage.get(row.purpose) || createEmptyUsageTotals();
      mergeAggregatedUsage(purU, u);
      purposeUsage.set(row.purpose, purU);
      deps.updateLastActivity(purposeLastActivity, row.purpose, row.lastActivityAt);
    }

    // Token sources
    if (row.usage_source) {
      tokenSourceCounts.set(row.usage_source, (tokenSourceCounts.get(row.usage_source) || 0) + toNumber(row.invocationCount));
    }

    // Model + status aggregations
    const modelKey = buildModelStatsKey(row.provider, row.model);
    if (!modelMeta.has(modelKey)) {
      modelMeta.set(modelKey, { provider: row.provider || "unknown", model: row.model || null });
    }
    const mU = modelUsage.get(modelKey) || createEmptyUsageTotals();
    mergeAggregatedUsage(mU, u);
    modelUsage.set(modelKey, mU);
    deps.updateLastActivity(modelLastActivity, modelKey, row.lastActivityAt);
    const mCounts = modelStatusCounts.get(modelKey) || createEmptyStatusCounts();
    addStatusCount(mCounts, row.status, u.invocationCount);
    modelStatusCounts.set(modelKey, mCounts);
    addStatusCount(statusCounts, row.status, u.invocationCount);

    // Buckets
    if (buckets.length > 0 && row.bucketIndex >= 0 && row.bucketIndex < buckets.length) {
      accumulateBucketUsage(buckets[row.bucketIndex], u, row.provider, row.purpose, modelKey);
    }
  }

  const sampleCap = getDurationSampleCap(deps);

  // Determine if we exceed the sample cap before materializing duration rows
  const durationCountRow = db.prepare(`
    SELECT COUNT(duration_ms) as count
    FROM provider_invocations
    WHERE project_id = ? AND started_at >= ? AND started_at < ?
      AND duration_ms IS NOT NULL AND duration_ms > 0
  `).get(projectId, rangeStartIso, rangeEndIso) as { count: number | string } | undefined;

  const totalDurationSamples = toNumber(durationCountRow?.count || 0);

  let computedDurations: ComputedDurationAggregates;

  if (totalDurationSamples <= sampleCap) {
    const durationSampleRows = db.prepare(`
      SELECT provider, model, duration_ms as durationMs
      FROM provider_invocations
      WHERE project_id = ? AND started_at >= ? AND started_at < ?
        AND duration_ms IS NOT NULL AND duration_ms > 0
      ORDER BY started_at DESC, id DESC
    `).all(projectId, rangeStartIso, rangeEndIso) as DurationSampleRow[];

    computedDurations = computeAggregatesFromSamples(durationSampleRows);
  } else {
    const durationAggRows = db.prepare(`
      SELECT
        provider,
        model,
        COUNT(duration_ms) as sampleCount,
        MIN(duration_ms) as minMs,
        MAX(duration_ms) as maxMs,
        AVG(duration_ms) as avgMs
      FROM provider_invocations
      WHERE project_id = ? AND started_at >= ? AND started_at < ?
        AND duration_ms IS NOT NULL AND duration_ms > 0
      GROUP BY provider, model
    `).all(projectId, rangeStartIso, rangeEndIso) as DurationAggregateRow[];

    computedDurations = computeAggregatesFromAggregations(durationAggRows);
  }

  const allDurations = computedDurations.allDurations;
  const modelDurations = computedDurations.modelDurations;
  const modelDurationAggs = computedDurations.modelDurationAggs;
  const overallDurationAggs = computedDurations.overallDurationAggs;

  for (const [taskId, wallTime] of wallTimeByTaskId) {
    const total = taskUsage.get(taskId) || createEmptyUsageTotals();
    total.wallTimeMs = wallTime;
    taskUsage.set(taskId, total);
  }
  for (const [sprintKey, wallTime] of wallTimeBySprintRunId) {
    const total = sprintUsage.get(sprintKey) || createEmptyUsageTotals();
    total.wallTimeMs = wallTime;
    sprintUsage.set(sprintKey, total);
  }
  usage.wallTimeMs = Array.from(wallTimeByTaskId.values()).reduce((sum, value) => sum + value, 0);

  const taskIds = Array.from(new Set([...taskUsage.keys(), ...gitTaskUsage.keys()]));
  const sprintIds = Array.from(new Set([...sprintUsage.keys(), ...gitSprintUsage.keys()]));

  const taskMeta = deps.getTaskMetadata(projectId, taskIds);
  const sprintMeta = deps.getSprintMetadata(projectId, sprintIds);

  const activeSprintRow = db.prepare(`
    SELECT sr.sprint_id, s.name AS sprint_name, s.number AS sprint_number
    FROM sprint_runs sr
    INNER JOIN sprints s ON s.id = sr.sprint_id
    WHERE sr.project_id = ?
      AND sr.status IN ('queued', 'running', 'paused', 'cancel_requested')
    ORDER BY COALESCE(sr.last_heartbeat_at, sr.updated_at, sr.created_at) DESC
    LIMIT 1
  `).get(projectId) as { sprint_id: string; sprint_name: string; sprint_number: number | string | null } | undefined;

  const chartSeries: ProjectExecutionStatsChartSeries[] = buildProjectStatsChartSeries(
    buckets,
    gitBuckets,
    providerUsage,
    modelUsage,
    purposeUsage,
    modelMeta
  );

  return {
    projectId: projectRow?.id || projectId,
    projectName: projectRow?.name || projectId,
    window: normalized.range.window,
    query: normalized.query,
    range: normalized.range,
    generatedAt: nowIso,
    usage,
    mergeConflictCount: gitTotals.mergeConflictCount,
    git: {
      totals: gitTotals,
      buckets: gitBuckets,
      tasks: Array.from(gitTaskUsage.entries()).map(([id, metrics]) => {
        const meta = taskMeta.get(id);
        const label = meta?.label || id;
        return { id, label, secondaryLabel: meta?.secondaryLabel || null, metrics };
      }),
      sprints: Array.from(gitSprintUsage.entries()).map(([id, metrics]) => {
        const meta = sprintMeta.get(id);
        const label = meta?.label || id;
        return { id, label, secondaryLabel: meta?.secondaryLabel || null, metrics };
      })
    },
    activeSprint: activeSprintRow ? {
      sprintId: activeSprintRow.sprint_id,
      sprintName: activeSprintRow.sprint_name,
      sprintNumber: activeSprintRow.sprint_number !== null ? toNumber(activeSprintRow.sprint_number) : null,
    } : null,
    buckets: buckets.map((b) => ({ bucketStart: b.bucketStart, bucketEnd: b.bucketEnd, label: b.label, usage: b.usage })),
    sprints: mapEntityUsage(sprintUsage, sprintLastActivity, (id) => sprintMeta.get(id)),
    tasks: mapEntityUsage(taskUsage, taskLastActivity, (id) => taskMeta.get(id)),
    providers: mapEntityUsage(providerUsage, providerLastActivity),
    purposes: mapEntityUsage(purposeUsage, purposeLastActivity),
    models: Array.from(modelUsage.entries()).map(([key, modelTotals]): ExecutionModelStatsSummary => {
      const meta = modelMeta.get(key);
      const counts = modelStatusCounts.get(key) || createEmptyStatusCounts();
      return {
        id: key,
        provider: meta?.provider || "unknown",
        model: meta?.model || null,
        label: buildModelStatsLabel(meta?.provider, meta?.model),
        usage: modelTotals,
        statusCounts: counts,
        successRate: computeSuccessRate(counts),
        duration: computeDurationStatsFromAggregates(modelDurationAggs.get(key), modelDurations.get(key) || []),
        lastActivityAt: modelLastActivity.get(key) || null,
      };
    }).sort((a, b) => b.usage.totalTokens - a.usage.totalTokens),
    statusCounts,
    duration: computeDurationStatsFromAggregates(overallDurationAggs, allDurations),
    tokenSources: Array.from(tokenSourceCounts.entries()).map(([source, count]) => ({ source: source as any, count })).sort((a, b) => b.count - a.count),
    chartSeries,
  };
}
