import { describe, it, expect } from "vitest";
import {
  formatTokens,
  formatDuration,
  formatPercent,
  formatDateTime,
  sumUsage,
  createSeries,
  groupSegments,
  createStatsSegments,
  EMPTY_USAGE,
} from "../../../dashboard/src/v2/pages/stats/stats-utils.js";

describe("stats-utils", () => {
  describe("formatTokens", () => {
    it("formats millions", () => {
      expect(formatTokens(1500000)).toBe("1.50M");
    });
    it("formats thousands", () => {
      expect(formatTokens(1500)).toBe("1.5k");
    });
    it("formats small numbers", () => {
      expect(formatTokens(123)).toBe("123");
    });
  });

  describe("formatDuration", () => {
    it("formats hours and minutes", () => {
      expect(formatDuration(3661000)).toBe("1h 1m");
    });
    it("formats minutes and seconds", () => {
      expect(formatDuration(61000)).toBe("1m 1s");
    });
    it("formats seconds", () => {
      expect(formatDuration(5000)).toBe("5s");
    });
    it("handles zero or negative", () => {
      expect(formatDuration(0)).toBe("0s");
      expect(formatDuration(-1000)).toBe("0s");
    });
  });

  describe("formatPercent", () => {
    it("formats percentage", () => {
      expect(formatPercent(12.3)).toBe("12%");
      expect(formatPercent(50.9)).toBe("51%");
    });
  });

  describe("formatDateTime", () => {
    it("handles null", () => {
      expect(formatDateTime(null)).toBe("No activity yet");
    });
    it("handles invalid date", () => {
      expect(formatDateTime("invalid")).toBe("invalid");
    });
    it("formats valid date string", () => {
      const date = "2023-01-01T12:00:00Z";
      expect(formatDateTime(date)).toContain("Jan 1");
    });
  });

  describe("sumUsage", () => {
    it("sums up multiple items", () => {
      const items = [
        { label: "A", usage: { ...EMPTY_USAGE, totalTokens: 100, invocationCount: 1 } },
        { label: "B", usage: { ...EMPTY_USAGE, totalTokens: 200, invocationCount: 2 } },
      ];
      const result = sumUsage(items as any);
      expect(result.totalTokens).toBe(300);
      expect(result.invocationCount).toBe(3);
    });
    it("returns empty usage for empty array", () => {
      expect(sumUsage([])).toEqual(EMPTY_USAGE);
    });
  });

  describe("createSeries", () => {
    it("extracts values from buckets", () => {
      const buckets = [
        { usage: { totalTokens: 10 } },
        { usage: { totalTokens: 20 } },
      ];
      const result = createSeries(buckets as any, (b) => b.usage.totalTokens);
      expect(result).toEqual([10, 20]);
    });
    it("falls back to zero array if all values are zero", () => {
      const buckets = [
        { usage: { totalTokens: 0 } },
        { usage: { totalTokens: 0 } },
      ];
      const result = createSeries(buckets as any, (b) => b.usage.totalTokens);
      expect(result).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });
  });

  describe("groupSegments", () => {
    const colorPalette = ["red", "green", "blue"];
    it("groups top items and merges others", () => {
      const items = [
        { label: "A", usage: { totalTokens: 100 } },
        { label: "B", usage: { totalTokens: 80 } },
        { label: "C", usage: { totalTokens: 60 } },
        { label: "D", usage: { totalTokens: 40 } },
      ];
      const result = groupSegments(items as any, { top: 2, colorPalette, fallbackLabel: "Others" });
      expect(result).toHaveLength(3);
      expect(result[0].label).toBe("A");
      expect(result[1].label).toBe("B");
      expect(result[2].label).toBe("Others");
      expect(result[2].value).toBe(100); // 60 + 40
    });
    it("handles small number of items", () => {
      const items = [{ label: "A", usage: { totalTokens: 100 } }];
      const result = groupSegments(items as any, { top: 5, colorPalette, fallbackLabel: "Others" });
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe("A");
    });
  });

  describe("createStatsSegments", () => {
    it("creates all segments correctly", () => {
      const stats = {
        providers: [{ label: "P1", usage: { totalTokens: 100 } }],
        tokenSources: [{ source: "S1", count: 50 }],
      };
      const usage = { ...EMPTY_USAGE, inputTokens: 40, outputTokens: 60 };
      const result = createStatsSegments(stats as any, usage);
      expect(result.providerSegments).toHaveLength(1);
      expect(result.sourceSegments).toHaveLength(1);
      expect(result.tokenSegments).toHaveLength(2); // Input, Output
    });
  });
});
