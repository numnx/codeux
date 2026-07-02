import { describe, expect, it } from "vitest";
import { computeAggregatesFromSamples, computeAggregatesFromAggregations, DurationSampleRow, DurationAggregateRow } from "../../../../src/repositories/execution/project-stats-duration.js";

describe("project-stats-duration", () => {
  describe("computeAggregatesFromSamples", () => {
    it("handles empty duration data", () => {
      const rows: DurationSampleRow[] = [];
      const res = computeAggregatesFromSamples(rows);

      expect(res.allDurations).toEqual([]);
      expect(res.modelDurations.size).toBe(0);
      expect(res.modelDurationAggs.size).toBe(0);
      expect(res.overallDurationAggs).toEqual({
        sampleCount: 0,
        minMs: 0,
        maxMs: 0,
        avgMs: 0
      });
    });

    it("calculates aggregates correctly from samples", () => {
      const rows: DurationSampleRow[] = [
        { provider: "openai", model: "gpt-4", durationMs: 100 },
        { provider: "openai", model: "gpt-4", durationMs: 300 },
        { provider: "anthropic", model: "claude", durationMs: 200 },
      ];
      const res = computeAggregatesFromSamples(rows);

      expect(res.allDurations).toEqual([100, 300, 200]);
      expect(res.overallDurationAggs).toEqual({
        sampleCount: 3,
        minMs: 100,
        maxMs: 300,
        avgMs: 200
      });
      expect(res.modelDurations.get("openai::gpt-4")).toEqual([100, 300]);
      expect(res.modelDurationAggs.get("openai::gpt-4")).toEqual({
        sampleCount: 2,
        minMs: 100,
        maxMs: 300,
        avgMs: 200
      });
    });
  });

  describe("computeAggregatesFromAggregations", () => {
    it("handles empty duration data", () => {
      const rows: DurationAggregateRow[] = [];
      const res = computeAggregatesFromAggregations(rows);

      expect(res.overallDurationAggs).toEqual({
        sampleCount: 0,
        minMs: 0,
        maxMs: 0,
        avgMs: 0
      });
    });

    it("calculates aggregates correctly from aggregated rows", () => {
      const rows: DurationAggregateRow[] = [
        { provider: "openai", model: "gpt-4", sampleCount: 2, minMs: 100, maxMs: 300, avgMs: 200 },
        { provider: "anthropic", model: "claude", sampleCount: 1, minMs: 200, maxMs: 200, avgMs: 200 },
      ];
      const res = computeAggregatesFromAggregations(rows);

      expect(res.overallDurationAggs).toEqual({
        sampleCount: 3,
        minMs: 100,
        maxMs: 300,
        avgMs: 200
      });
      expect(res.modelDurationAggs.get("openai::gpt-4")).toEqual({
        sampleCount: 2,
        minMs: 100,
        maxMs: 300,
        avgMs: 200
      });
    });
  });
});
