import { describe, expect, it } from "vitest";
import { buildProjectStatsChartSeries } from "../../../../src/repositories/execution/project-stats-chart-series.js";
import { InternalStatsBucket } from "../../../../src/repositories/execution/stats-buckets.js";
import { ProjectGitStatsBucket } from "../../../../src/repositories/execution/project-stats-git-query.js";
import { ExecutionUsageTotals } from "../../../../src/contracts/app-types.js";

describe("project-stats-chart-series", () => {
  it("maintains stable chart-series ids and order", () => {
    const buckets: InternalStatsBucket[] = [];
    const gitBuckets: any[] = [];
    const providerUsage = new Map<string, ExecutionUsageTotals>();
    providerUsage.set("openai", {} as any);
    const modelUsage = new Map<string, ExecutionUsageTotals>();
    modelUsage.set("openai::gpt-4", {} as any);
    const purposeUsage = new Map<string, ExecutionUsageTotals>();
    purposeUsage.set("coding", {} as any);
    const modelMeta = new Map<string, { provider: string; model: string | null }>();
    modelMeta.set("openai::gpt-4", { provider: "openai", model: "gpt-4" });

    const series = buildProjectStatsChartSeries(buckets, gitBuckets, providerUsage, modelUsage, purposeUsage, modelMeta);

    const ids = series.map(s => s.id);
    expect(ids).toEqual([
      "core_total_tokens",
      "core_total_cost",
      "core_active_time",
      "core_invocations",
      "core_input_tokens",
      "core_cached_tokens",
      "core_output_tokens",
      "core_reasoning_tokens",
      "reliability_reported",
      "reliability_estimated",
      "reliability_unsupported",
      "reliability_unavailable",
      "git_insertions",
      "git_deletions",
      "git_files_changed",
      "git_prs",
      "git_merges",
      "core_cache_hit",
      "provider_openai",
      "provider_cost_openai",
      "model_openai::gpt-4",
      "model_cost_openai::gpt-4",
      "purpose_time_coding",
      "purpose_invocations_coding"
    ]);
  });
});
