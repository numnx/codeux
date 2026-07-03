import type {
  DashboardSettings,
  DashboardStatus,
  ExecutionAttentionItemSummary,
  ExecutionDashboardSnapshot,
  ExternalSettingsHints,
  GitTrackingStatus,
  OnboardingRuntimeReadiness,
  OverviewTelemetrySnapshot,
  ProjectLiveDashboardSnapshot,
} from "../../types.js";
import { fetchJson } from "./fetch-json.js";


export class ApiCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private inflight = new Map<string, Promise<T>>();

  constructor(private ttlMs: number, private maxSize: number = 1) {}

  public get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    // Update LRU position
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  public async fetch(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached) return cached;

    let request = this.inflight.get(key);
    if (!request) {
      request = fetcher()
        .then((resolved) => {
          this.set(key, resolved);
          return resolved;
        })
        .finally(() => {
          this.inflight.delete(key);
        });
      this.inflight.set(key, request);
    }
    return request;
  }

  public set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
    this.inflight.clear();
  }
}

export type RuntimeDashboardPayload = ProjectLiveDashboardSnapshot;

export const fetchRuntimeStatus = async (): Promise<DashboardStatus> => {
  return fetchJson<DashboardStatus>("/api/status");
};

export const fetchExecutionSnapshot = async (): Promise<ExecutionDashboardSnapshot> => {
  return fetchJson<ExecutionDashboardSnapshot>("/api/execution");
};

const livePayloadCache = new ApiCache<RuntimeDashboardPayload>(5000, 5);

export const clearLivePayloadCacheForTests = (): void => {
  livePayloadCache.clear();
  overviewTelemetryCache.clear();
  onboardingReadinessCache.clear();
  externalSettingsHintsCacheInst.clear();
};

export const invalidateLivePayloadCache = (projectId?: string | null): void => {
  const key = projectId?.trim() || "default";
  livePayloadCache.delete(key);
};

export const getCachedLivePayload = (projectId?: string | null): RuntimeDashboardPayload | null => {
  const key = projectId?.trim() || "default";
  return livePayloadCache.get(key);
};

export const fetchRuntimeDashboardPayload = async (projectId?: string | null): Promise<RuntimeDashboardPayload> => {
  return fetchLivePayload(projectId);
};

/** Single HTTP call returning both status + execution — used for fast initial load. */
export const fetchLivePayload = async (projectId?: string | null): Promise<RuntimeDashboardPayload> => {
  const key = projectId?.trim() || "default";
  return livePayloadCache.fetch(key, () => {
    const query = typeof projectId === "string" && projectId.trim().length > 0
      ? `?projectId=${encodeURIComponent(projectId.trim())}`
      : "";
    return fetchJson<RuntimeDashboardPayload>(`/api/live${query}`);
  });
};

export const fetchLiveActivities = async (): Promise<import("../../types.js").LiveActivitiesResponse> => {
  return fetchJson<import("../../types.js").LiveActivitiesResponse>("/api/live-activities");
};

const overviewTelemetryCache = new ApiCache<OverviewTelemetrySnapshot>(5000, 1);

export const fetchOverviewTelemetry = async (): Promise<OverviewTelemetrySnapshot> => {
  return overviewTelemetryCache.fetch("default", () => fetchJson<OverviewTelemetrySnapshot>("/api/telemetry/overview"));
};

export const fetchGitTrackingStatus = async (): Promise<GitTrackingStatus> => {
  return fetchJson<GitTrackingStatus>("/api/git-status");
};

const onboardingReadinessCache = new ApiCache<OnboardingRuntimeReadiness>(5000, 1);

export const fetchOnboardingReadiness = async (): Promise<OnboardingRuntimeReadiness> => {
  return onboardingReadinessCache.fetch("default", () => fetchJson<OnboardingRuntimeReadiness>("/api/onboarding/readiness"));
};


const externalSettingsHintsCacheInst = new ApiCache<ExternalSettingsHints>(300000, 1);

export const fetchExternalSettingsHints = async (): Promise<ExternalSettingsHints> => {
  return externalSettingsHintsCacheInst.fetch("default", () => fetchJson<ExternalSettingsHints>("/api/settings/import-sources"));
};

export interface RerunTaskOptions {
  provider?: string;
  providerConfigId?: string;
  model?: string;
  clearWorktree?: boolean;
  resetDependents?: boolean;
  undoMerge?: boolean;
}

export const rerunTask = async (taskId: string, options?: RerunTaskOptions): Promise<void> => {
  await fetchJson<{ ok: boolean }>(`/api/tasks/${encodeURIComponent(taskId)}/rerun`, {
    method: "POST",
    headers: options ? { "Content-Type": "application/json" } : undefined,
    body: options ? JSON.stringify(options) : undefined,
  });
};

export const orchestrateSprint = async (projectId: string, sprintId: string): Promise<void> => {
  await fetchJson<{ ok: boolean }>(
    `/api/projects/${encodeURIComponent(projectId)}/sprints/${encodeURIComponent(sprintId)}/orchestrate`,
    { method: "POST" },
  );
};

export const pauseSprintRun = async (sprintRunId: string): Promise<void> => {
  await fetchJson(`/api/sprint-runs/${encodeURIComponent(sprintRunId)}/pause`, {
    method: "POST",
  });
};

export const resumeSprintRun = async (sprintRunId: string): Promise<void> => {
  await fetchJson(`/api/sprint-runs/${encodeURIComponent(sprintRunId)}/resume`, {
    method: "POST",
  });
};

export const cancelSprintRun = async (sprintRunId: string): Promise<void> => {
  await fetchJson(`/api/sprint-runs/${encodeURIComponent(sprintRunId)}/cancel`, {
    method: "POST",
  });
};

export const forceCancelSprintRun = async (sprintRunId: string): Promise<void> => {
  await fetchJson(`/api/sprint-runs/${encodeURIComponent(sprintRunId)}/force-cancel`, {
    method: "POST",
  });
};

export const cancelTaskDispatch = async (dispatchId: string): Promise<void> => {
  await fetchJson(`/api/task-dispatches/${encodeURIComponent(dispatchId)}/cancel`, {
    method: "POST",
  });
};

export const forceCancelTaskDispatch = async (dispatchId: string): Promise<void> => {
  await fetchJson(`/api/task-dispatches/${encodeURIComponent(dispatchId)}/force-cancel`, {
    method: "POST",
  });
};

export const retryTaskDispatch = async (dispatchId: string): Promise<void> => {
  await fetchJson(`/api/task-dispatches/${encodeURIComponent(dispatchId)}/retry`, {
    method: "POST",
  });
};

export const claimAttentionItem = async (
  projectId: string,
  attentionItemId: string,
  input?: { workerEndpointId?: string; claimReason?: string },
): Promise<ExecutionAttentionItemSummary> => {
  return fetchJson<ExecutionAttentionItemSummary>(
    `/api/projects/${encodeURIComponent(projectId)}/attention-items/${encodeURIComponent(attentionItemId)}/claim`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input || {}),
    },
  );
};

export const resolveAttentionItem = async (
  projectId: string,
  attentionItemId: string,
  input?: { status?: "resolved" | "dismissed"; reason?: string; resolutionSummaryMarkdown?: string },
): Promise<ExecutionAttentionItemSummary> => {
  return fetchJson<ExecutionAttentionItemSummary>(
    `/api/projects/${encodeURIComponent(projectId)}/attention-items/${encodeURIComponent(attentionItemId)}/resolve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input || {}),
    },
  );
};
