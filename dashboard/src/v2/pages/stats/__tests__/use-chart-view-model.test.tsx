/** @vitest-environment happy-dom */
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/preact";
import { useChartViewModel } from "../chart-view-models.js";
import type { ProjectExecutionStatsSnapshot } from "../../../types.js";

const mockStats: ProjectExecutionStatsSnapshot = {
  range: { label: "Test", bucketCount: 3, resolutionLabel: "day", resolution: "day", from: new Date(), to: new Date() },
  buckets: [
    { bucketStart: "2024-01-01", bucketEnd: "2024-01-02", label: "Jan 1", usage: { totalTokens: 10, activeTimeMs: 100, invocationCount: 1, totalCostUsd: 0.1 } },
    { bucketStart: "2024-01-02", bucketEnd: "2024-01-03", label: "Jan 2", usage: { totalTokens: 20, activeTimeMs: 200, invocationCount: 2, totalCostUsd: 0.2 } },
    { bucketStart: "2024-01-03", bucketEnd: "2024-01-04", label: "Jan 3", usage: { totalTokens: 30, activeTimeMs: 300, invocationCount: 3, totalCostUsd: 0.3 } },
  ],
  chartSeries: [
    { id: "tokens", label: "Tokens", color: "#00E0A0", data: [10, 20, 30], defaultEnabled: true, grouping: "Usage" },
    { id: "activeTime", label: "Active Time", color: "#00E0A0", data: [100, 200, 300], defaultEnabled: true, grouping: "Usage" },
  ],
} as any;

describe("useChartViewModel", () => {
  it("computes derived state correctly without zoom", () => {
    const { result } = renderHook(() => useChartViewModel({
      stats: mockStats,
      zoomRange: null,
      enabledSeries: { tokens: true, activeTime: false },
      dimensions: { width: 1000, height: 500 },
      hoveredIndex: null,
      padding: 34
    }));

    expect(result.current.visibleBuckets).toHaveLength(3);
    expect(result.current.visibleSeries).toHaveLength(1);
    expect(result.current.visibleSeries[0]?.id).toBe("tokens");
    expect(result.current.activeSeriesCount).toBe(1);
    expect(result.current.metrics.peakTokens).toBe(30);
    expect(result.current.visibleSeriesKey).toBe("tokens");
  });

  it("handles zoom range correctly", () => {
    const { result } = renderHook(() => useChartViewModel({
      stats: mockStats,
      zoomRange: { start: 1, end: 2 },
      enabledSeries: { tokens: true, activeTime: true },
      dimensions: { width: 1000, height: 500 },
      hoveredIndex: 0,
      padding: 34
    }));

    expect(result.current.visibleBuckets).toHaveLength(2); // index 1 and 2
    expect(result.current.visibleBuckets[0]?.label).toBe("Jan 2");
    expect(result.current.metrics.peakTokens).toBe(30);
    expect(result.current.tooltipState.activeIndex).toBe(0); // hovered index is relative to visible
    expect(result.current.tooltipState.activeBucket?.label).toBe("Jan 2");
    expect(result.current.visibleSeriesKey).toBe("activeTime,tokens");
  });
});
