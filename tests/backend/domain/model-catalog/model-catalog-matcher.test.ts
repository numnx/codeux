import { describe, expect, it } from "vitest";
import { resolveCatalogModelId } from "../../../../src/domain/model-catalog/model-catalog-matcher.js";

describe("resolveCatalogModelId", () => {
  it("matches versioned model slugs directly against the mapped models.dev provider", () => {
    expect(resolveCatalogModelId("codex", "gpt-5.5")).toBe("openai/gpt-5.5");
    expect(resolveCatalogModelId("claude-code", "claude-opus-4-6")).toBe("anthropic/claude-opus-4-6");
    expect(resolveCatalogModelId("qwen-code", "qwen3-coder-plus")).toBe("alibaba/qwen3-coder-plus");
    expect(resolveCatalogModelId("gemini", "gemini-2.5-pro")).toBe("google/gemini-2.5-pro");
  });

  it("resolves shorthand aliases that don't match a models.dev id directly", () => {
    expect(resolveCatalogModelId("claude-code", "sonnet")).toBe("anthropic/claude-sonnet-4-5");
    expect(resolveCatalogModelId("claude-code", "default")).toBe("anthropic/claude-sonnet-4-5");
    expect(resolveCatalogModelId("gemini", "flash")).toBe("google/gemini-2.5-flash");
  });

  it("treats opencode model ids as already-canonical provider/model pairs", () => {
    expect(resolveCatalogModelId("opencode", "anthropic/claude-sonnet-4-5")).toBe("anthropic/claude-sonnet-4-5");
    expect(resolveCatalogModelId("opencode", "not-a-real-provider/not-a-real-model")).toBeNull();
  });

  it("returns null for providers/models with no catalogue match", () => {
    expect(resolveCatalogModelId("jules", "default")).toBeNull();
    expect(resolveCatalogModelId("codex", "totally-made-up-model")).toBeNull();
  });

  it("returns null for an empty model string", () => {
    expect(resolveCatalogModelId("codex", "")).toBeNull();
    expect(resolveCatalogModelId("codex", "   ")).toBeNull();
  });
});
