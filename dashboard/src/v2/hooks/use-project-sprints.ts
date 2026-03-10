import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { Sprint } from "../types.js";
import type { DashboardRealtimeServerMessage } from "../../types.js";
import { fetchSprints } from "../lib/project-api.js";
import { toSprintViewModel } from "../lib/view-models.js";
import { subscribeToDashboardRealtime } from "../../lib/realtime/dashboard-realtime-client.js";
import { areSprintListsEqual, shouldUseForegroundLoading } from "./project-resource-utils.js";

interface UseProjectSprintsResult {
  sprints: Sprint[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProjectSprints(projectId: string | null): UseProjectSprintsResult {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const refreshInternal = useCallback(async (options?: { silent?: boolean }): Promise<void> => {
    if (!projectId) {
      setSprints([]);
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
      const nextSprints = fetchSprints(projectId).then((data) => data.map(toSprintViewModel));
      const resolvedSprints = await nextSprints;
      setSprints((current) => (areSprintListsEqual(current, resolvedSprints) ? current : resolvedSprints));
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

  useEffect(() => {
    hasLoadedRef.current = false;
    void refreshInternal();
  }, [projectId, refreshInternal]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    return subscribeToDashboardRealtime([`project:${projectId}`], (message: DashboardRealtimeServerMessage) => {
      if (message.type === "snapshot_required") {
        void refreshInternal({ silent: true });
        return;
      }

      if (message.type === "event" && message.event.eventType === "project.structure.updated") {
        void refreshInternal({ silent: true });
      }
    });
  }, [projectId, refreshInternal]);

  const refresh = useCallback(async (): Promise<void> => {
    await refreshInternal({ silent: true });
  }, [refreshInternal]);

  return { sprints, loading, error, refresh };
}
