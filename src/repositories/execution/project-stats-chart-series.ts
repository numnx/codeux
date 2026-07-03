import {
  ProjectExecutionStatsChartSeries,
  ExecutionUsageTotals,
} from "../../contracts/app-types.js";
import { InternalStatsBucket } from "./stats-buckets.js";
import { ExecutionGitMetrics } from "../../contracts/app-types.js";
import { buildModelStatsLabel } from "./model-stats.js";

export function buildProjectStatsChartSeries(
  buckets: InternalStatsBucket[],
  gitBuckets: Array<{ bucketStart: string; bucketEnd: string; label: string; metrics: ExecutionGitMetrics; }>,
  providerUsage: Map<string, ExecutionUsageTotals>,
  modelUsage: Map<string, ExecutionUsageTotals>,
  purposeUsage: Map<string, ExecutionUsageTotals>,
  modelMeta: Map<string, { provider: string; model: string | null }>
): ProjectExecutionStatsChartSeries[] {
  return [
    { id: "core_total_tokens", label: "Total Tokens", grouping: "totals", defaultEnabled: true, data: buckets.map((b) => b.usage.totalTokens), color: '#00E0A0', signalLabel: 'Throughput', formatter: 'tokens' },
    { id: "core_total_cost", label: "Total Cost (USD)", grouping: "totals", defaultEnabled: false, data: buckets.map((b) => b.usage.totalCostUsd), color: '#10B981', signalLabel: 'Cost', formatter: 'number' },
    { id: "core_active_time", label: "Active Time (ms)", grouping: "totals", defaultEnabled: false, data: buckets.map((b) => b.usage.activeTimeMs), color: '#FFB800', signalLabel: 'Latency', formatter: 'duration' },
    { id: "core_invocations", label: "Invocations", grouping: "totals", defaultEnabled: false, data: buckets.map((b) => b.usage.invocationCount), color: '#0EA5E9', signalLabel: 'Volume', formatter: 'number' },
    { id: "core_input_tokens", label: "Input Tokens", grouping: "details", defaultEnabled: false, data: buckets.map((b) => b.usage.inputTokens), formatter: 'tokens' },
    { id: "core_cached_tokens", label: "Cached Tokens", grouping: "details", defaultEnabled: false, data: buckets.map((b) => b.usage.cachedInputTokens), formatter: 'tokens' },
    { id: "core_output_tokens", label: "Output Tokens", grouping: "details", defaultEnabled: false, data: buckets.map((b) => b.usage.outputTokens), formatter: 'tokens' },
    { id: "core_reasoning_tokens", label: "Reasoning Tokens", grouping: "details", defaultEnabled: false, data: buckets.map((b) => b.usage.reasoningOutputTokens), formatter: 'tokens' },
    { id: "reliability_reported", label: "Reported Usage", grouping: "reliability", defaultEnabled: false, data: buckets.map((b) => b.usage.reportedInvocationCount), formatter: 'number' },
    { id: "reliability_estimated", label: "Estimated Usage", grouping: "reliability", defaultEnabled: false, data: buckets.map((b) => b.usage.estimatedInvocationCount), formatter: 'number' },
    { id: "reliability_unsupported", label: "Unsupported Usage", grouping: "reliability", defaultEnabled: false, data: buckets.map((b) => b.usage.unsupportedInvocationCount), formatter: 'number' },
    { id: "reliability_unavailable", label: "Unavailable Usage", grouping: "reliability", defaultEnabled: false, data: buckets.map((b) => b.usage.unavailableInvocationCount), formatter: 'number' },
    { id: "git_insertions", label: "Insertions", grouping: "git", defaultEnabled: true, data: gitBuckets.map((b) => b.metrics.insertions), color: '#10B981', signalLabel: 'Added', formatter: 'number' },
    { id: "git_deletions", label: "Deletions", grouping: "git", defaultEnabled: true, data: gitBuckets.map((b) => b.metrics.deletions), color: '#EF4444', signalLabel: 'Removed', formatter: 'number' },
    { id: "git_files_changed", label: "Files Changed", grouping: "git", defaultEnabled: true, data: gitBuckets.map((b) => b.metrics.filesChanged), color: '#3B82F6', signalLabel: 'Modified', formatter: 'number' },
    { id: "git_prs", label: "Pull Requests", grouping: "git", defaultEnabled: false, data: gitBuckets.map((b) => b.metrics.prCount), color: '#8B5CF6', signalLabel: 'Merged', formatter: 'number' },
    { id: "git_merges", label: "Commits", grouping: "git", defaultEnabled: false, data: gitBuckets.map((b) => b.metrics.mergedCount), color: '#F59E0B', signalLabel: 'History', formatter: 'number' },
    { id: "core_cache_hit", label: "Cache Hit Rate", grouping: "details", defaultEnabled: false, data: buckets.map((b) => {
      const denominator = b.usage.inputTokens + b.usage.cachedInputTokens;
      return denominator > 0 ? Math.round((b.usage.cachedInputTokens / denominator) * 1000) / 10 : 0;
    }), formatter: 'percent' },
    ...Array.from(providerUsage.keys()).map((providerId) => ({
      id: `provider_${providerId}`, label: `${providerId} Tokens`, grouping: "providers", defaultEnabled: false,
      data: buckets.map((b) => b.providerTokens.get(providerId) || 0), formatter: 'tokens' as const
    })),
    ...Array.from(providerUsage.keys()).map((providerId) => ({
      id: `provider_cost_${providerId}`, label: `${providerId} Cost (USD)`, grouping: "providers_cost", defaultEnabled: false,
      data: buckets.map((b) => b.providerCost.get(providerId) || 0), formatter: 'number' as const
    })),
    ...Array.from(modelUsage.keys()).map((modelKey) => {
      const meta = modelMeta.get(modelKey);
      return {
        id: `model_${modelKey}`,
        label: `${buildModelStatsLabel(meta?.provider, meta?.model)} Tokens`,
        grouping: "models",
        defaultEnabled: false,
        data: buckets.map((b) => b.modelTokens.get(modelKey) || 0),
        formatter: 'tokens' as const,
      };
    }),
    ...Array.from(modelUsage.keys()).map((modelKey) => {
      const meta = modelMeta.get(modelKey);
      return {
        id: `model_cost_${modelKey}`,
        label: `${buildModelStatsLabel(meta?.provider, meta?.model)} Cost (USD)`,
        grouping: "models_cost",
        defaultEnabled: false,
        data: buckets.map((b) => b.modelCost.get(modelKey) || 0),
        formatter: 'number' as const,
      };
    }),
    ...Array.from(purposeUsage.keys()).map((purposeId) => ({
      id: `purpose_time_${purposeId}`, label: `${purposeId.replace(/_/g, " ")} Time`, grouping: "purposes_time", defaultEnabled: false,
      data: buckets.map((b) => b.purposeTime.get(purposeId) || 0), formatter: 'duration' as const
    })),
    ...Array.from(purposeUsage.keys()).map((purposeId) => ({
      id: `purpose_invocations_${purposeId}`, label: `${purposeId.replace(/_/g, " ")} Calls`, grouping: "purposes_invocations", defaultEnabled: false,
      data: buckets.map((b) => b.purposeInvocations.get(purposeId) || 0), formatter: 'number' as const
    })),
  ];
}
