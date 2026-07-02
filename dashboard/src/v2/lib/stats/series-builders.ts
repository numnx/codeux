import type { ProjectExecutionStatsSnapshot } from "../../../types.js";

export function buildChartSeriesIndex(stats: ProjectExecutionStatsSnapshot | null): Map<string, number[]> {
  const index = new Map<string, number[]>();
  if (stats?.chartSeries) {
    for (const series of stats.chartSeries) {
      if (series.data && series.data.length > 0) {
        index.set(series.id, series.data);
      }
    }
  }
  return index;
}

function extractChartSeries(stats: ProjectExecutionStatsSnapshot | null, id: string, index?: Map<string, number[]>): number[] {
  if (!stats) return [0, 0, 0, 0, 0, 0, 0];

  if (index) {
    const data = index.get(id);
    if (data) return data;
  } else {
    const series = stats.chartSeries?.find((s) => s.id === id);
    if (series && series.data && series.data.length > 0) {
      return series.data;
    }
  }
  return new Array(Math.max(stats.buckets?.length || 7, 7)).fill(0);
}

export function extractProviderSeries(stats: ProjectExecutionStatsSnapshot | null, providerId: string, index?: Map<string, number[]>): number[] {
  return extractChartSeries(stats, `provider_${providerId}`, index);
}

export function extractModelSeries(stats: ProjectExecutionStatsSnapshot | null, modelId: string, index?: Map<string, number[]>): number[] {
  return extractChartSeries(stats, `model_${modelId}`, index);
}

export function buildMetricSeries(stats: ProjectExecutionStatsSnapshot | null, index?: Map<string, number[]>) {
  const activeIndex = index || buildChartSeriesIndex(stats);
  return {
    taskCodingTokens: extractChartSeries(stats, "purpose_invocations_task_coding", activeIndex),
    ciFixTokens: extractChartSeries(stats, "purpose_invocations_ci_fix", activeIndex),
    qaReviewTokens: extractChartSeries(stats, "purpose_invocations_qa_review", activeIndex),
    planningTokens: extractChartSeries(stats, "purpose_invocations_planning", activeIndex),
    wallRuntime: stats && stats.buckets && stats.buckets.length > 0
      ? stats.buckets.map(b => (b.usage.wallTimeMs || 0) / 3600000)
      : new Array(Math.max(stats?.buckets?.length || 7, 7)).fill(0),
    coreInputTokens: extractChartSeries(stats, "core_input_tokens", activeIndex),
    coreOutputTokens: extractChartSeries(stats, "core_output_tokens", activeIndex),
    gitInsertions: extractChartSeries(stats, "git_insertions", activeIndex),
    gitDeletions: extractChartSeries(stats, "git_deletions", activeIndex),
    gitFilesChanged: extractChartSeries(stats, "git_files_changed", activeIndex),
    gitPrs: extractChartSeries(stats, "git_prs", activeIndex),
    gitMerges: extractChartSeries(stats, "git_merges", activeIndex),
  };
}
