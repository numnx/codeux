import type { DashboardSettings } from "../contracts/app-types.js";

const DEFAULT_MODEL = "default";

const normalizeModel = (value: string | undefined): string => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : DEFAULT_MODEL;
};

export interface ResolvedVirtualWorkerModel {
  model: string;
  fallbackModel: string;
}

export function resolveVirtualWorkerModel(
  settings: DashboardSettings,
  provider: DashboardSettings["workers"]["virtualWorkerProvider"],
): ResolvedVirtualWorkerModel {
  const providerModel = normalizeModel(settings.aiProvider.providers[provider]?.model);
  const virtualWorkerModel = normalizeModel(settings.workers.virtualWorkerModel);

  if (virtualWorkerModel === DEFAULT_MODEL) {
    return {
      model: providerModel,
      fallbackModel: providerModel,
    };
  }

  return {
    model: virtualWorkerModel,
    fallbackModel: providerModel,
  };
}
