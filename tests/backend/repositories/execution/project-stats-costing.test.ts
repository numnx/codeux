import { describe, expect, it, vi } from "vitest";
import { createSnapshotPricingResolver, applyPricingToUsage } from "../../../../src/repositories/execution/project-stats-costing.js";
import { ExecutionUsageTotals } from "../../../../src/contracts/app-types.js";
import { createEmptyUsageTotals } from "../../../../src/repositories/execution/stats-buckets.js";

describe("project-stats-costing", () => {
  describe("createSnapshotPricingResolver", () => {
    it("caches pricing lookups per provider and model", () => {
      const getModelPricing = vi.fn().mockImplementation((provider: string, model: string | null) => {
        return { inputTokens: 10, outputTokens: 20, cachedInputTokens: 5 };
      });
      const resolver = createSnapshotPricingResolver(getModelPricing);

      const pricing1 = resolver("openai", "gpt-4");
      const pricing2 = resolver("openai", "gpt-4");

      expect(pricing1).toEqual(pricing2);
      expect(getModelPricing).toHaveBeenCalledTimes(1);
    });

    it("returns undefined if getModelPricing is not provided", () => {
      const resolver = createSnapshotPricingResolver();
      expect(resolver("openai", "gpt-4")).toBeUndefined();
    });
  });

  describe("applyPricingToUsage", () => {
    it("applies pricing correctly and preserves zero-cost fallback behavior", () => {
      const u: ExecutionUsageTotals = createEmptyUsageTotals();
      u.inputTokens = 1000000;
      u.outputTokens = 2000000;
      u.cachedInputTokens = 3000000;

      const resolver = vi.fn().mockReturnValue({
        inputTokens: 10, // $10 per 1M
        outputTokens: 20, // $20 per 1M
        cachedInputTokens: 5 // $5 per 1M
      });

      applyPricingToUsage(u, resolver, "openai", "gpt-4");

      expect(u.inputCostUsd).toBe(10);
      expect(u.outputCostUsd).toBe(40);
      expect(u.cachedInputCostUsd).toBe(15);
      expect(u.totalCostUsd).toBe(65);
    });

    it("preserves zero cost if pricing is undefined", () => {
      const u: ExecutionUsageTotals = createEmptyUsageTotals();
      u.inputTokens = 1000000;

      const resolver = vi.fn().mockReturnValue(undefined);

      applyPricingToUsage(u, resolver, "openai", "gpt-4");

      expect(u.inputCostUsd).toBe(0);
      expect(u.totalCostUsd).toBe(0);
    });
  });
});
