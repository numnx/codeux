import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ExecutionDashboardSnapshot, DashboardRealtimeServerMessage } from "../../types.js";
import { fetchProjectExecution } from "../lib/project-api.js";
import { areExecutionSnapshotsEqual, shouldUseForegroundLoading } from "./project-resource-utils.js";
import { subscribeToDashboardRealtime } from "../../lib/realtime/dashboard-realtime-client.js";

const executionCache = new Map<string, ExecutionDashboardSnapshot>();

const EMPTY_SNAPSHOT: ExecutionDashboardSnapshot = {
  projectId: null,
  projectName: null,
  sprintRuns: [],
  taskDispatches: [],
  connections: [],
  primaryAssignedWorker: null,
  overflowAssignedWorkers: [],
  attentionItems: [],
  recentEvents: [],
  updatedAt: null,
};

export function useProjectExecution(projectId: string | null, pollIntervalMs: number = 30000): {
  execution: ExecutionDashboardSnapshot;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [execution, setExecution] = useState<ExecutionDashboardSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const refreshInternal = useCallback(async (options?: { silent?: boolean }): Promise<void> => {
    if (!projectId) {
      setExecution(EMPTY_SNAPSHOT);
      setError(null);
      setLoading(false);
      hasLoadedRef.current = false;
      return;
    }

    const shouldUseForegroundState = shouldUseForegroundLoading(hasLoadedRef.current, options?.silent);
    if (shouldUseForegroundState) {
      setLoading(true);
    }

    try {
      const nextExecution = await fetchProjectExecution(projectId);
      executionCache.set(projectId, nextExecution);
      setExecution((current) => areExecutionSnapshotsEqual(current, nextExecution) ? current : nextExecution);
      hasLoadedRef.current = true;
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
    } finally {
      if (shouldUseForegroundState) {
        setLoading(false);
      }
    }
  }, [projectId]);

  const refresh = useCallback(async (): Promise<void> => {
    await refreshInternal({ silent: true });
  }, [refreshInternal]);

  useEffect(() => {
    if (!projectId) {
      hasLoadedRef.current = false;
      void refreshInternal();
      return;
    }

    const cachedExecution = executionCache.get(projectId);
    if (cachedExecution) {
      setExecution(cachedExecution);
      setLoading(false);
      setError(null);
      hasLoadedRef.current = true;
      void refreshInternal({ silent: true });
      return;
    }

    hasLoadedRef.current = false;
    void refreshInternal();
  }, [projectId, refreshInternal]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    return subscribeToDashboardRealtime([`project:${projectId}`], (message: DashboardRealtimeServerMessage) => {
      if (message.type === "event" && message.event.eventType === "project.execution.updated") {
        setExecution(message.event.payload as ExecutionDashboardSnapshot);
        setError(null);
        setLoading(false);
        return;
      }

      if (message.type === "snapshot_required") {
        void refreshInternal({ silent: true });
      }
    });
  }, [projectId, refreshInternal]);

  useEffect(() => {
    if (!projectId || pollIntervalMs <= 0) {
      return;
    }
    const intervalId = window.setInterval(() => {
      void refreshInternal({ silent: true });
    }, pollIntervalMs);
    return () => window.clearInterval(intervalId);
  }, [projectId, pollIntervalMs, refreshInternal]);

  return useMemo(() => ({
    execution,
    loading,
    error,
    refresh,
  }), [error, execution, loading, refresh]);
}
