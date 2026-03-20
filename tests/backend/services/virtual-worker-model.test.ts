import { describe, expect, it } from "vitest";
import { resolveVirtualWorkerModel } from "../../../src/services/virtual-worker-model.js";
import { DEFAULT_DASHBOARD_SETTINGS } from "../../../src/repositories/settings-defaults.js";

describe("resolveVirtualWorkerModel", () => {
  it("uses provider model when virtual worker model is default", () => {
    const settings = {
      ...DEFAULT_DASHBOARD_SETTINGS,
      workers: {
        ...DEFAULT_DASHBOARD_SETTINGS.workers,
        virtualWorkerProvider: "codex",
        virtualWorkerModel: "default",
      },
      aiProvider: {
        ...DEFAULT_DASHBOARD_SETTINGS.aiProvider,
        providers: {
          ...DEFAULT_DASHBOARD_SETTINGS.aiProvider.providers,
          codex: {
            ...DEFAULT_DASHBOARD_SETTINGS.aiProvider.providers.codex,
            model: "gpt-5.3-codex",
          },
        },
      },
    };

    expect(resolveVirtualWorkerModel(settings, "codex")).toEqual({
      model: "gpt-5.3-codex",
      fallbackModel: "gpt-5.3-codex",
    });
  });

  it("uses virtual worker override model with provider fallback", () => {
    const settings = {
      ...DEFAULT_DASHBOARD_SETTINGS,
      workers: {
        ...DEFAULT_DASHBOARD_SETTINGS.workers,
        virtualWorkerProvider: "gemini",
        virtualWorkerModel: "gemini-2.5-pro",
      },
      aiProvider: {
        ...DEFAULT_DASHBOARD_SETTINGS.aiProvider,
        providers: {
          ...DEFAULT_DASHBOARD_SETTINGS.aiProvider.providers,
          gemini: {
            ...DEFAULT_DASHBOARD_SETTINGS.aiProvider.providers.gemini,
            model: "gemini-2.5-flash",
          },
        },
      },
    };

    expect(resolveVirtualWorkerModel(settings, "gemini")).toEqual({
      model: "gemini-2.5-pro",
      fallbackModel: "gemini-2.5-flash",
    });
  });
});
