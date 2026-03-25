import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ExecutionDashboardSnapshot, DashboardRealtimeServerMessage } from "../../types.js";
import { fetchProjectExecution } from "../lib/project-api.js";
import { subscribeToDashboardRealtime } from "../../lib/realtime/dashboard-realtime-client.js";

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

  const refresh = useCallback(async (options?: { silent?: boolean }): Promise<void> => {
    if (!projectId) {
      setExecution(EMPTY_SNAPSHOT);
      setError(null);
      setLoading(false);
      hasLoadedRef.current = false;
      return;
    }

    // Only show foreground loading on the very first fetch.
    // Subsequent polls/realtime refreshes update data silently
    // so the UI never flashes skeleton rows.
    const isForeground = !options?.silent && !hasLoadedRef.current;
    if (isForeground) {
      setLoading(true);
    }
    try {
      const next = await fetchProjectExecution(projectId);
      setExecution((prev) => prev.updatedAt === next.updatedAt ? prev : next);
      hasLoadedRef.current = true;
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
    } finally {
      if (isForeground) {
        setLoading(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    hasLoadedRef.current = false;
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    return subscribeToDashboardRealtime([`project:${projectId}`], (message: DashboardRealtimeServerMessage) => {
      if (message.type === "event" && message.event.eventType === "project.execution.updated") {
        const next = message.event.payload as ExecutionDashboardSnapshot;
        setExecution((prev) => prev.updatedAt === next.updatedAt ? prev : next);
        setError(null);
        return;
      }

      if (message.type === "snapshot_required") {
        void refresh({ silent: true });
      }
    });
  }, [projectId, refresh]);

  useEffect(() => {
    if (!projectId || pollIntervalMs <= 0) {
      return;
    }
    const intervalId = window.setInterval(() => {
      void refresh({ silent: true });
    }, pollIntervalMs);
    return () => window.clearInterval(intervalId);
  }, [projectId, pollIntervalMs, refresh]);

  return useMemo(() => ({
    execution,
    loading,
    error,
    refresh: () => refresh({ silent: true }),
  }), [error, execution, loading, refresh]);
}
