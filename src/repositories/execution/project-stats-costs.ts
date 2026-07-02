import { TokenPricing, ExecutionUsageTotals } from "../../contracts/app-types.js";

export type SnapshotPricingResolver = (provider: string | null | undefined, model: string | null | undefined) => TokenPricing | undefined;

export function createSnapshotPricingResolver(getModelPricing?: (providerId: string, model: string | null) => TokenPricing | undefined): SnapshotPricingResolver {
  const cache = new Map<string, TokenPricing | undefined>();
  return (provider, model) => {
    if (!provider || !getModelPricing) return undefined;
    const key = `${provider}::${model || ""}`;
    if (cache.has(key)) return cache.get(key);
    const pricing = getModelPricing(provider, model || null);
    cache.set(key, pricing);
    return pricing;
  };
}

export function applyPricingToUsage(
  usage: ExecutionUsageTotals,
  pricingResolver?: SnapshotPricingResolver,
  provider?: string | null,
  model?: string | null
): void {
  if (pricingResolver && provider) {
    const pricing = pricingResolver(provider, model);
    if (pricing) {
      usage.inputCostUsd = (usage.inputTokens / 1_000_000) * (pricing.inputTokens || 0);
      usage.outputCostUsd = (usage.outputTokens / 1_000_000) * (pricing.outputTokens || 0);
      usage.cachedInputCostUsd = (usage.cachedInputTokens / 1_000_000) * (pricing.cachedInputTokens || 0);
      usage.totalCostUsd = usage.inputCostUsd + usage.outputCostUsd + usage.cachedInputCostUsd;
    }
  }
}
