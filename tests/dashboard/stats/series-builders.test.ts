import { describe, expect, it } from "vitest";
import { buildMetricSeries, buildChartSeriesIndex, extractProviderSeries, extractModelSeries } from "../../../dashboard/src/v2/lib/stats/series-builders.js";

describe("series-builders", () => {
  const mockStats = {
    chartSeries: [
      { id: "purpose_invocations_task_coding", data: [1, 2, 3] },
      { id: "purpose_invocations_ci_fix", data: [4, 5, 6] },
      { id: "purpose_invocations_qa_review", data: [7, 8, 9] },
      { id: "purpose_invocations_planning", data: [10, 11, 12] },
      { id: "provider_test-provider", data: [13, 14, 15] },
      { id: "model_test-model", data: [16, 17, 18] },
    ],
    buckets: [
      { usage: { wallTimeMs: 3600000 } },
      { usage: { wallTimeMs: 7200000 } },
      { usage: { wallTimeMs: 1800000 } },
    ],
  } as any;

  it("builds an object with the 5 series", () => {
    const series = buildMetricSeries(mockStats);
    expect(series.taskCodingTokens).toEqual([1, 2, 3]);
    expect(series.ciFixTokens).toEqual([4, 5, 6]);
    expect(series.qaReviewTokens).toEqual([7, 8, 9]);
    expect(series.planningTokens).toEqual([10, 11, 12]);
    expect(series.wallRuntime).toEqual([1, 2, 0.5]);
  });

  it("handles null stats", () => {
    const series = buildMetricSeries(null);
    expect(series.taskCodingTokens).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(series.wallRuntime).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("builds a chart series index", () => {
    const index = buildChartSeriesIndex(mockStats);
    expect(index.get("purpose_invocations_task_coding")).toEqual([1, 2, 3]);
    expect(index.get("provider_test-provider")).toEqual([13, 14, 15]);
  });

  it("extractProviderSeries uses index when provided", () => {
    const index = buildChartSeriesIndex(mockStats);
    const seriesWithIndex = extractProviderSeries(mockStats, "test-provider", index);
    const seriesWithoutIndex = extractProviderSeries(mockStats, "test-provider");
    expect(seriesWithIndex).toEqual([13, 14, 15]);
    expect(seriesWithoutIndex).toEqual([13, 14, 15]);
  });

  it("extractModelSeries uses index when provided", () => {
    const index = buildChartSeriesIndex(mockStats);
    const seriesWithIndex = extractModelSeries(mockStats, "test-model", index);
    const seriesWithoutIndex = extractModelSeries(mockStats, "test-model");
    expect(seriesWithIndex).toEqual([16, 17, 18]);
    expect(seriesWithoutIndex).toEqual([16, 17, 18]);
  });

  it("returns zero-filled array for missing series with stable length", () => {
    const index = buildChartSeriesIndex(mockStats);
    const missingSeries = extractProviderSeries(mockStats, "missing-provider", index);
    expect(missingSeries).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(missingSeries.length).toBe(7);
  });
});
