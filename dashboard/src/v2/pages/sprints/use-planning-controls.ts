import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import type { AgentPreset, ImprovePromptInput, Sprint, VirtualWorkerProvider } from "../../types.js";
import {
  createSprint,
  fetchProjectStats,
  improveSprintPrompt,
  planSprint,
  updateSprint,
} from "../../lib/project-api.js";
import { fetchAgentPresets } from "../../lib/agent-preset-api.js";
import { derivePlanningETA } from "../../lib/planning-telemetry.js";
import { useProjectEffectiveSettings } from "../../hooks/use-project-effective-settings.js";
import { toPlanningOverrides, type SprintSubmitMode, type PlanningRouteOption } from "../../lib/sprint-composer-state.js";

const ACTIVE_CONNECTION_STATUSES = new Set(["connected", "listening", "idle"]);
const PLANNING_ROLE_PRIORITY: Record<string, number> = {
  worker: 0,
  listener: 1,
};
const CONNECTION_STATUS_PRIORITY: Record<string, number> = {
  listening: 0,
  connected: 1,
  idle: 2,
  paused: 3,
  stale: 4,
  offline: 5,
};
const VIRTUAL_PROVIDER_LABELS: Record<string, string> = {
  gemini: "Virtual Gemini Worker",
  codex: "Virtual Codex Worker",
  "claude-code": "Virtual Claude Code Worker",
};

const compareString = (left: string, right: string): number => (
  left.localeCompare(right, undefined, { sensitivity: "base" })
);

export function usePlanningControls({
  selectedProject,
  execution,
  nextSprintNumber,
  refresh,
  refreshExecution,
  editingSprint,
  setEditingSprint,
}: {
  selectedProject: { id: string } | null;
  execution: any;
  nextSprintNumber: number;
  refresh: () => Promise<void>;
  refreshExecution: () => Promise<void>;
  editingSprint: Sprint | null;
  setEditingSprint: (sprint: Sprint | null) => void;
}) {
  const [agentPresets, setAgentPresets] = useState<AgentPreset[]>([]);
  const [planningEta, setPlanningEta] = useState(180000);
  const [workerMode, setWorkerMode] = useState<null | {
    executionMode: "CONNECTED_MCP" | "VIRTUAL";
    virtualWorkerProvider: string;
  }>(null);

  const { data: effectiveSettings } = useProjectEffectiveSettings(selectedProject?.id || null);

  useEffect(() => {
    if (!selectedProject) {
      setAgentPresets([]);
      return;
    }
    void fetchAgentPresets(selectedProject.id)
      .then(setAgentPresets)
      .catch((error) => {
        console.error("Failed to fetch agent presets", error);
        setAgentPresets([]);
      });
  }, [selectedProject?.id]);

  const planningPresets = useMemo(() => {
    return agentPresets.filter(p =>
      p.labels.some(label => label.trim().toLowerCase() === "planning")
    );
  }, [agentPresets]);

  useEffect(() => {
    if (!selectedProject) {
      setPlanningEta(180000);
      return;
    }
    let cancelled = false;
    void fetchProjectStats(selectedProject.id, "all")
      .then((stats) => {
        if (!cancelled) setPlanningEta(derivePlanningETA(stats));
      })
      .catch((error) => {
        console.error("Failed to fetch project stats for ETA", error);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedProject || !effectiveSettings) {
      setWorkerMode(null);
      return;
    }
    setWorkerMode({
      executionMode: effectiveSettings.settings.workers.executionMode,
      virtualWorkerProvider: effectiveSettings.settings.workers.virtualWorkerProvider,
    });
  }, [selectedProject?.id, effectiveSettings]);

  const planningConnection = useMemo(() => (
    [...execution.connections]
      .filter((connection) => (
        connection.listenMode
        && ACTIVE_CONNECTION_STATUSES.has(connection.status)
        && (connection.role === "worker" || connection.role === "listener")
      ))
      .sort((left, right) => {
        const roleDelta = (PLANNING_ROLE_PRIORITY[left.role] ?? 99) - (PLANNING_ROLE_PRIORITY[right.role] ?? 99);
        if (roleDelta !== 0) {
          return roleDelta;
        }
        const statusDelta = (CONNECTION_STATUS_PRIORITY[left.status] ?? 99) - (CONNECTION_STATUS_PRIORITY[right.status] ?? 99);
        if (statusDelta !== 0) {
          return statusDelta;
        }
        return compareString(left.displayName, right.displayName);
      })[0] || null
  ), [execution.connections]);

  const planningRoute = useMemo(() => {
    if (workerMode?.executionMode === "VIRTUAL") {
      return {
        available: true,
        label: VIRTUAL_PROVIDER_LABELS[workerMode.virtualWorkerProvider] || "Virtual Worker",
      };
    }

    if (planningConnection) {
      return {
        available: true,
        label: planningConnection.displayName,
      };
    }

    return {
      available: false,
      label: null,
    };
  }, [planningConnection, workerMode]);

  const virtualProviders = useMemo(() => (
    Object.entries(VIRTUAL_PROVIDER_LABELS).map(([id, label]) => ({
      id: id as VirtualWorkerProvider,
      label,
    }))
  ), []);

  const handleSubmitSprint = useCallback(async (payload: {
    name: string;
    goal: string;
    originalPrompt: string | null;
    submitMode: SprintSubmitMode;
    routeOverride: PlanningRouteOption | null;
    modelOverride: string | null;
    planningAgentPresetId: string | null;
    signal?: AbortSignal;
  }): Promise<void> => {
    if (!selectedProject) {
      return;
    }

    const overrides = toPlanningOverrides(payload.routeOverride, payload.modelOverride, payload.planningAgentPresetId);

    if (editingSprint) {
      await updateSprint(editingSprint.id, {
        name: payload.name,
        goal: payload.goal,
        originalPrompt: payload.originalPrompt,
      });

      if (payload.submitMode === "plan_only" || payload.submitMode === "replan") {
        await planSprint(selectedProject.id, editingSprint.id, {
          autoStart: false,
          replan: payload.submitMode === "replan",
          planningAgentPresetId: payload.planningAgentPresetId || undefined,
          overrides,
        }, payload.signal);
      } else if (payload.submitMode === "plan_and_start") {
        await planSprint(selectedProject.id, editingSprint.id, {
          autoStart: true,
          replan: false,
          planningAgentPresetId: payload.planningAgentPresetId || undefined,
          overrides,
        }, payload.signal);
      }

      await refresh();
      setEditingSprint(null);
      return;
    }

    const created = await createSprint(selectedProject.id, {
      name: payload.name,
      goal: payload.goal,
      originalPrompt: payload.originalPrompt,
      number: nextSprintNumber,
      status: "idle",
      showcasePinned: true,
      startDate: null,
      endDate: null,
    });

    if (payload.submitMode === "plan_only") {
      await planSprint(selectedProject.id, created.id, {
        autoStart: false,
        planningAgentPresetId: payload.planningAgentPresetId || undefined,
        overrides,
      }, payload.signal);
    } else if (payload.submitMode === "plan_and_start") {
      await planSprint(selectedProject.id, created.id, {
        autoStart: true,
        planningAgentPresetId: payload.planningAgentPresetId || undefined,
        overrides,
      }, payload.signal);
    }

    await Promise.all([refresh(), refreshExecution()]);
  }, [editingSprint, nextSprintNumber, refresh, refreshExecution, selectedProject, setEditingSprint]);

  const handleImprovePrompt = useCallback(async (draft: ImprovePromptInput, signal?: AbortSignal): Promise<string> => {
    if (!selectedProject) {
      throw new Error("Select a project before using Plan ahead with AI.");
    }
    const response = await improveSprintPrompt(selectedProject.id, draft, signal);
    return response.goal;
  }, [selectedProject]);

  return {
    agentPresets,
    planningPresets,
    planningEta,
    planningRoute,
    virtualProviders,
    handleSubmitSprint,
    handleImprovePrompt,
  };
}
