import { useCallback, useEffect, useState } from "preact/hooks";
import type { QuicksprintTemplateRecord } from "../../../../../src/contracts/quicksprint-types.js";
import {
  createCustomQuicksprintTemplate,
  deleteCustomQuicksprintTemplate,
  executeQuicksprint,
  fetchQuicksprintTemplates,
  updateCustomQuicksprintTemplate,
} from "../../lib/quicksprint-api.js";
import { toPlanningOverrides, type PlanningRouteOption } from "../../lib/sprint-composer-state.js";

export function useQuicksprintTemplates({
  selectedProject,
  refresh,
}: {
  selectedProject: { id: string } | null;
  refresh: () => Promise<void>;
}) {
  const [showQuicksprint, setShowQuicksprint] = useState(false);
  const [quicksprintTemplates, setQuicksprintTemplates] = useState<QuicksprintTemplateRecord[]>([]);
  const [quicksprintLoading, setQuicksprintLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!selectedProject || !showQuicksprint) {
      return () => {
        cancelled = true;
      };
    }

    setQuicksprintLoading(true);
    void fetchQuicksprintTemplates(selectedProject.id)
      .then((templates) => {
        if (!cancelled) {
          setQuicksprintTemplates(templates);
          setQuicksprintLoading(false);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch quicksprint templates", error);
        if (!cancelled) {
          setQuicksprintLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedProject?.id, showQuicksprint]);

  const reloadQuicksprintTemplates = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const templates = await fetchQuicksprintTemplates(selectedProject.id);
      setQuicksprintTemplates(templates);
    } catch (error) {
      console.error("Failed to reload quicksprint templates", error);
    }
  }, [selectedProject]);

  const handleQuicksprintExecute = useCallback(async (
    templateId: string,
    taskCount: number,
    submitMode: string,
    additionalPrompt?: string,
    routeOverride?: PlanningRouteOption | null,
    modelOverride?: string | null
  ) => {
    if (!selectedProject) return;
    try {
      await executeQuicksprint(selectedProject.id, {
        templateId,
        taskCount,
        submitMode: submitMode as "plan_only" | "plan_and_start",
        additionalPrompt,
        planningOverrides: toPlanningOverrides(routeOverride ?? null, modelOverride ?? null),
      });
      setShowQuicksprint(false);
      await refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }, [selectedProject, refresh]);

  const handleCreateQuicksprintTemplate = useCallback(async (data: {
    name: string; description: string; icon: string; category: string; categoryColor?: string;
    agentInstructionMarkdown: string; defaultTaskCount: number; agentPresetId?: string;
  }) => {
    if (!selectedProject) return;
    await createCustomQuicksprintTemplate(selectedProject.id, data);
    await reloadQuicksprintTemplates();
  }, [selectedProject, reloadQuicksprintTemplates]);

  const handleUpdateQuicksprintTemplate = useCallback(async (templateId: string, data: {
    name: string; description: string; icon: string; category: string; categoryColor?: string;
    agentInstructionMarkdown: string; defaultTaskCount: number; agentPresetId?: string;
  }) => {
    if (!selectedProject) return;
    await updateCustomQuicksprintTemplate(selectedProject.id, templateId, data);
    await reloadQuicksprintTemplates();
  }, [selectedProject, reloadQuicksprintTemplates]);

  const handleDeleteQuicksprintTemplate = useCallback(async (templateId: string) => {
    if (!selectedProject) return;
    await deleteCustomQuicksprintTemplate(selectedProject.id, templateId);
    await reloadQuicksprintTemplates();
  }, [selectedProject, reloadQuicksprintTemplates]);

  return {
    showQuicksprint, setShowQuicksprint,
    quicksprintTemplates,
    quicksprintLoading,
    handleQuicksprintExecute,
    handleCreateQuicksprintTemplate,
    handleUpdateQuicksprintTemplate,
    handleDeleteQuicksprintTemplate,
  };
}
