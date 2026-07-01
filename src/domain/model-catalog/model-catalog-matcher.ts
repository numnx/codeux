import type { ProviderId } from "../../contracts/app-types.js";
import { getModelCatalogEntry } from "./model-catalog-loader.js";

/**
 * models.dev provider id for each of our built-in CLI providers. `jules` and `antigravity`
 * are agentic runtimes rather than raw model providers and have no direct models.dev entry —
 * matching for their models falls back to the keyword tables below.
 */
const PROVIDER_TO_CATALOG_PROVIDER: Partial<Record<ProviderId, string>> = {
  gemini: "google",
  codex: "openai",
  "claude-code": "anthropic",
  "qwen-code": "alibaba",
};

/**
 * Shorthand/alias model slugs used by our hardcoded AI_MODEL_CATALOG dropdowns
 * (src/repositories/settings-defaults.ts) that don't match a models.dev model id directly.
 * Versioned ids (e.g. "gpt-5.5", "claude-opus-4-6", "qwen3-coder-plus") already match
 * models.dev 1:1 and don't need an entry here.
 */
const MODEL_SLUG_ALIASES: Partial<Record<ProviderId, Record<string, string>>> = {
  gemini: {
    auto: "google/gemini-2.5-pro",
    pro: "google/gemini-2.5-pro",
    flash: "google/gemini-2.5-flash",
    "flash-lite": "google/gemini-2.5-flash-lite",
  },
  "claude-code": {
    default: "anthropic/claude-sonnet-4-5",
    sonnet: "anthropic/claude-sonnet-4-5",
    opus: "anthropic/claude-opus-4-5",
    haiku: "anthropic/claude-haiku-4-5-20251001",
    "sonnet[1m]": "anthropic/claude-sonnet-4-5",
    "opus[1m]": "anthropic/claude-opus-4-5",
    opusplan: "anthropic/claude-opus-4-5",
  },
  antigravity: {
    default: "google/gemini-3-flash-preview",
    "gemini-3-flash": "google/gemini-3-flash-preview",
    "claude-sonnet-4.6-thinking": "anthropic/claude-sonnet-4-5",
    "claude-opus-4.6-thinking": "anthropic/claude-opus-4-5",
  },
};

/**
 * Resolves a Code UX provider + CLI-facing model slug to a canonical models.dev catalogue id
 * ("<provider>/<model>"), or null if no match exists (the caller falls back to a manual
 * per-model price override — see ModelPricingSettings).
 */
export function resolveCatalogModelId(providerId: ProviderId, rawModel: string): string | null {
  const model = rawModel.trim();
  if (!model) {
    return null;
  }

  if (providerId === "opencode") {
    // OpenCode model ids are already "<provider>/<model>", matching the catalogue format.
    return getModelCatalogEntry(model) ? model : null;
  }

  const catalogProvider = PROVIDER_TO_CATALOG_PROVIDER[providerId];
  if (catalogProvider) {
    const directId = `${catalogProvider}/${model}`;
    if (getModelCatalogEntry(directId)) {
      return directId;
    }
  }

  const aliasId = MODEL_SLUG_ALIASES[providerId]?.[model];
  if (aliasId && getModelCatalogEntry(aliasId)) {
    return aliasId;
  }

  return null;
}
