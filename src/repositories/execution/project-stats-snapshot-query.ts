import { normalizeProjectStatsQuery } from "./project-stats-query.js";
import { createUsageBuckets, createEmptyUsageTotals } from "./stats-buckets.js";
import { queryProjectGitStats } from "./project-stats-git-query.js";
import {
  ProjectStatsQuery,
  ProjectStatsWindow,
  ProjectExecutionStatsSnapshot,
  ExecutionUsageBucketSummary,
  ExecutionStatsEntitySummary,
  ProjectExecutionStatsChartSeries,
} from "../../contracts/app-types.js";
import { DatabaseAdapter as Database } from "../db/database-adapter.js";
import {
  ExecutionUsageTotals,
} from "../../contracts/app-types.js";
import {
  addStatusCount,
  buildModelStatsKey,
  buildModelStatsLabel,
  computeDurationStats,
  computeSuccessRate,
  createEmptyStatusCounts,
} from "./model-stats.js";
import {
  ExecutionInvocationStatusCounts,
  ExecutionModelStatsSummary,
} from "../../contracts/app-types.js";
import {
  mapUsageRowToTotals,
  mergeUsageTotals,
  USAGE_AGGREGATION_FIELDS_SQL
} from "./execution-usage-aggregate-query.js";
import { ProjectStatsQueryDependencies, StatsEntityMetadata } from "./execution-stats-types.js";

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
      ${USAGE_AGGREGATION_FIELDS_SQL}
    FROM provider_invocations
    WHERE project_id = ? AND started_at >= ? AND started_at < ?
    GROUP BY bucketIndex, task_id, sprint_key, provider, purpose, usage_source, model, status
  `).all(...bucketParams, projectId, rangeStartIso, rangeEndIso) as any[];

  for (const row of mainAggs) {
    const u = mapUsageRowToTotals(row);
    mergeUsageTotals(usage, u);

    // Task aggregations
    if (row.task_id) {
      const tU = taskUsage.get(row.task_id) || createEmptyUsageTotals();
      mergeUsageTotals(tU, u);
      taskUsage.set(row.task_id, tU);
      deps.updateLastActivity(taskLastActivity, row.task_id, row.lastActivityAt);
    }

    // Sprint aggregations
    if (row.sprint_key) {
      const sU = sprintUsage.get(row.sprint_key) || createEmptyUsageTotals();
      mergeUsageTotals(sU, u);
      sprintUsage.set(row.sprint_key, sU);
      deps.updateLastActivity(sprintLastActivity, row.sprint_key, row.lastActivityAt);
    }

    // Provider usage
    if (row.provider) {
      const pU = providerUsage.get(row.provider) || createEmptyUsageTotals();
      mergeUsageTotals(pU, u);
      providerUsage.set(row.provider, pU);
      deps.updateLastActivity(providerLastActivity, row.provider, row.lastActivityAt);
    }

    // Purpose usage
    if (row.purpose) {
      const purU = purposeUsage.get(row.purpose) || createEmptyUsageTotals();
      mergeUsageTotals(purU, u);
      purposeUsage.set(row.purpose, purU);
      deps.updateLastActivity(purposeLastActivity, row.purpose, row.lastActivityAt);
    }

    // Token sources
    if (row.usage_source) {
      tokenSourceCounts.set(row.usage_source, (tokenSourceCounts.get(row.usage_source) || 0) + u.invocationCount);
    }

    // Model + status aggregations
    const modelKey = buildModelStatsKey(row.provider, row.model);
    if (!modelMeta.has(modelKey)) {
      modelMeta.set(modelKey, { provider: row.provider || "unknown", model: row.model || null });
    }

    const mU = modelUsage.get(modelKey) || createEmptyUsageTotals();
    mergeUsageTotals(mU, u);
    modelUsage.set(modelKey, mU);

    const mSC = modelStatusCounts.get(modelKey) || createEmptyStatusCounts();
    addStatusCount(mSC, row.status, u.invocationCount);
    modelStatusCounts.set(modelKey, mSC);
    addStatusCount(statusCounts, row.status, u.invocationCount);

    deps.updateLastActivity(modelLastActivity, modelKey, row.lastActivityAt);

    // Bucket aggregations
    if (row.bucketIndex >= 0 && row.bucketIndex < buckets.length) {
      const b = buckets[row.bucketIndex];
      mergeUsageTotals(b.usage, u);
      
      if (row.provider) {
        b.providerTokens.set(row.provider, (b.providerTokens.get(row.provider) || 0) + u.totalTokens);
      }
      if (row.purpose) {
        b.purposeTime.set(row.purpose, (b.purposeTime.get(row.purpose) || 0) + u.activeTimeMs);
        b.purposeInvocations.set(row.purpose, (b.purposeInvocations.get(row.purpose) || 0) + u.invocationCount);
      }
    }
  }

  const mapEntityUsage = (
    map: Map<string, ExecutionUsageTotals>, 
    activityMap: Map<string, string>, 
    getMeta?: (id: string) => StatsEntityMetadata | undefined
  ): ExecutionStatsEntitySummary[] => {
    return Array.from(map.entries()).map(([id, u]): ExecutionStatsEntitySummary => {
      const meta = getMeta ? getMeta(id) : undefined;
      return {
        id,
        label: meta?.label || id,
        secondaryLabel: meta?.secondaryLabel || null,
        status: meta?.status || "unknown",
        purpose: (meta?.purpose as any) || null,
        provider: meta?.provider || null,
        lastActivityAt: activityMap.get(id) || null,
        usage: u,
      };
    });
  };

  const tasks = mapEntityUsage(taskUsage, taskLastActivity, (id) => deps.getTaskMetadata(projectId, [id]).get(id));
  const sprints = mapEntityUsage(sprintUsage, sprintLastActivity, (id) => deps.getSprintMetadata(projectId, [id]).get(id));

  // Enrich with wall time
  let totalWallTimeMs = 0;
  for (const t of tasks) {
    const wallTime = wallTimeByTaskId.get(t.id);
    if (wallTime !== undefined) {
      t.usage.wallTimeMs = wallTime;
      totalWallTimeMs += wallTime;
    }
  }
  for (const s of sprints) {
    const wallTime = wallTimeBySprintRunId.get(s.id);
    if (wallTime !== undefined) s.usage.wallTimeMs = wallTime;
  }
  usage.wallTimeMs = totalWallTimeMs;

  // Active sprint info
  const activeSprintRow = db.prepare(`
    SELECT id, name, number
    FROM sprints
    WHERE project_id = ? AND status = 'running'
    LIMIT 1
  `).get(projectId) as { id: string; name: string; number: number | null } | undefined;

  // Build chart series
  const chartSeries: ProjectExecutionStatsChartSeries[] = [
    { id: "core_total_tokens", label: "Total Tokens", grouping: "totals", defaultEnabled: true, data: buckets.map(b => b.usage.totalTokens), formatter: "tokens" },
    { id: "core_active_time", label: "Active Time", grouping: "totals", defaultEnabled: false, data: buckets.map(b => b.usage.activeTimeMs), formatter: "duration" },
    { id: "core_invocations", label: "Invocations", grouping: "totals", defaultEnabled: false, data: buckets.map(b => b.usage.invocationCount), formatter: "number" },
  ];

  const allProviders = Array.from(new Set(buckets.flatMap(b => Array.from(b.providerTokens.keys()))));
  for (const provider of allProviders) {
    chartSeries.push({
      id: `provider_${provider}`,
      label: provider,
      grouping: "providers",
      defaultEnabled: false,
      data: buckets.map(b => b.providerTokens.get(provider) || 0),
      formatter: "tokens"
    });
  }

  const allPurposes = Array.from(new Set(buckets.flatMap(b => Array.from(b.purposeTime.keys()))));
  for (const purpose of allPurposes) {
    chartSeries.push({
      id: `purpose_time_${purpose}`,
      label: purpose,
      grouping: "purposes_time",
      defaultEnabled: false,
      data: buckets.map(b => b.purposeTime.get(purpose) || 0),
      formatter: "duration"
    });
    chartSeries.push({
      id: `purpose_invocations_${purpose}`,
      label: purpose,
      grouping: "purposes_invocations",
      defaultEnabled: false,
      data: buckets.map(b => b.purposeInvocations.get(purpose) || 0),
      formatter: "number"
    });
  }

  return {
    projectId: projectRow?.id || projectId,
    projectName: projectRow?.name || "Unknown Project",
    window: normalized.range.window,
    query: normalized.query,
    generatedAt: nowIso,
    range: normalized.range,
    usage,
    statusCounts,
    tokenSources: Array.from(tokenSourceCounts.entries()).map(([source, count]) => ({ source: source as any, count })),
    git: {
      totals: gitTotals,
      buckets: gitBuckets,
      tasks: Array.from(gitTaskUsage.entries()).map(([id, metrics]) => {
        const meta = deps.getTaskMetadata(projectId, [id]).get(id);
        return { id, label: meta?.label || id, secondaryLabel: meta?.secondaryLabel || null, metrics };
      }),
      sprints: Array.from(gitSprintUsage.entries()).map(([id, metrics]) => {
        const meta = deps.getSprintMetadata(projectId, [id]).get(id);
        return { id, label: meta?.label || id, secondaryLabel: meta?.secondaryLabel || null, metrics };
      }),
    },
    tasks,
    sprints,
    providers: mapEntityUsage(providerUsage, providerLastActivity),
    purposes: mapEntityUsage(purposeUsage, purposeLastActivity),
    activeSprint: activeSprintRow ? {
      sprintId: activeSprintRow.id,
      sprintName: activeSprintRow.name,
      sprintNumber: activeSprintRow.number,
    } : null,
    models: Array.from(modelUsage.entries()).map(([key, u]): ExecutionModelStatsSummary => {
      const meta = modelMeta.get(key)!;
      const sC = modelStatusCounts.get(key)!;
      return {
        id: key,
        provider: meta.provider,
        model: meta.model,
        label: buildModelStatsLabel(meta.provider, meta.model),
        usage: u,
        statusCounts: sC,
        successRate: computeSuccessRate(sC),
        duration: computeDurationStats((u as any).durationSamples || []),
        lastActivityAt: modelLastActivity.get(key) || null,
      };
    }),
    buckets: buckets.map((b): ExecutionUsageBucketSummary => ({
      bucketStart: b.bucketStart,
      bucketEnd: b.bucketEnd,
      label: b.label,
      usage: b.usage,
    })),
    chartSeries,
    duration: computeDurationStats((usage as any).durationSamples || []),
  };
}
