import { useEffect, useState } from "preact/hooks";
import type { Sprint } from "../types.js";
import { fetchSprints } from "../lib/project-api.js";
import { toSprintViewModel } from "../lib/view-models.js";

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

  const refresh = async (): Promise<void> => {
    if (!projectId) {
      setSprints([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchSprints(projectId);
      setSprints(data.map(toSprintViewModel));
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [projectId]);

  return { sprints, loading, error, refresh };
}
