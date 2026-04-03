import { useEffect, useMemo, useState } from "preact/hooks";
import type { Sprint, SprintStatus } from "../../types.js";
import { useProjectData } from "../../context/project-data.js";
import { useSprints } from "../../../hooks/useSprints.js";
import { useExecutions } from "../../../hooks/useExecutions.js";
import { getSprintHumanInterventionBySprintId } from "../../../lib/execution-intervention.js";
import { filterShowcaseSprints, sortSprintsByRecency } from "../../lib/sprint-gallery.js";

import { useSprintActions } from "./use-sprint-actions.js";
import { usePlanningControls } from "./use-planning-controls.js";
import { useQuicksprintTemplates } from "./use-quicksprint-templates.js";

const IN_WORK_STATUSES = new Set<SprintStatus>(["running", "paused"]);

export function useSprintsPageData() {
  const [showCreateComposer, setShowCreateComposer] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [rowMenu, setRowMenu] = useState<{
    sprintId: string;
    top: number;
    left: number;
    openUp: boolean;
  } | null>(null);
  const [overrideSprint, setOverrideSprint] = useState<Sprint | null>(null);
  const [suppressedRunningSprintIds, setSuppressedRunningSprintIds] = useState<Set<string>>(new Set());

  const { selectedProject } = useProjectData();
  const { data: sprints, refetch: refreshSprints, loading: sprintsLoading } = useSprints(selectedProject?.id || null);
  const { data: execution, refetch: refreshExecution, loading: executionLoading } = useExecutions(selectedProject?.id || null);

  const nextSprintNumber = useMemo(() => (
    sprints.reduce((maxNumber: number, sprint: Sprint) => Math.max(maxNumber, sprint.number || 0), 0) + 1
  ), [sprints]);
  const nextId = `SPR-${String(nextSprintNumber).padStart(2, "0")}`;

  const actualActiveRunsBySprintId = useMemo(() => {
    const map = new Map<string, { id: string; status: string }>();
    for (const run of execution.sprintRuns) {
      if (run.status !== "running" && run.status !== "queued") {
        continue;
      }
      if (!map.has(run.sprintId)) {
        map.set(run.sprintId, { id: run.id, status: run.status });
      }
    }
    return map;
  }, [execution.sprintRuns]);

  useEffect(() => {
    setSuppressedRunningSprintIds((current) => {
      let changed = false;
      const next = new Set<string>();
      for (const sprintId of current) {
        if (actualActiveRunsBySprintId.has(sprintId)) {
          next.add(sprintId);
        } else {
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [actualActiveRunsBySprintId]);

  const activeRunsBySprintId = useMemo(() => {
    const map = new Map<string, { id: string; status: string }>();
    for (const [sprintId, run] of actualActiveRunsBySprintId.entries()) {
      if (suppressedRunningSprintIds.has(sprintId)) {
        continue;
      }
      map.set(sprintId, run);
    }
    return map;
  }, [actualActiveRunsBySprintId, suppressedRunningSprintIds]);

  const interventionBySprintId = useMemo(
    () => getSprintHumanInterventionBySprintId(execution),
    [execution],
  );

  const {
    pendingActionIds,
    optimisticStatuses,
    addTaskForSprint, setAddTaskForSprint,
    addTaskSprintTasks,
    exportState, setExportState,
    showImportModal, setShowImportModal,
    handleSprintToggle,
    handleOpenAppendTasks,
    handleAppendTask,
    handleDeleteSprint,
    handleToggleShowcase,
    handleOpenExport,
    handleImportSprint,
  } = useSprintActions({
    selectedProject,
    sprints,
    activeRunsBySprintId,
    refresh: refreshSprints,
    refreshExecution,
    setSuppressedRunningSprintIds,
  });

  const displaySprints = useMemo(() => (
    sprints.map((sprint: Sprint) => ({
      ...sprint,
      status: optimisticStatuses[sprint.id]
        || (suppressedRunningSprintIds.has(sprint.id) && sprint.status === "running" ? "cancelled" : sprint.status),
    }))
  ), [optimisticStatuses, sprints, suppressedRunningSprintIds]);

  const sortedSprints = useMemo(() => (
    sortSprintsByRecency(displaySprints)
  ), [displaySprints]);

  const showcaseSprints = useMemo(() => {
    return filterShowcaseSprints(sortedSprints);
  }, [sortedSprints]);

  const completedCount = useMemo(() => (
    sortedSprints.filter((sprint) => sprint.status === "completed").length
  ), [sortedSprints]);

  const inWorkCount = useMemo(() => (
    sortedSprints.filter((sprint) => IN_WORK_STATUSES.has(sprint.status)).length
  ), [sortedSprints]);

  const {
    agentPresets,
    planningPresets,
    planningEta,
    planningRoute,
    virtualProviders,
    handleSubmitSprint,
    handleImprovePrompt,
  } = usePlanningControls({
    selectedProject,
    execution,
    nextSprintNumber,
    refresh: refreshSprints,
    refreshExecution,
    editingSprint,
    setEditingSprint,
  });

  const {
    showQuicksprint, setShowQuicksprint,
    quicksprintTemplates,
    quicksprintLoading,
    handleQuicksprintExecute,
    handleCreateQuicksprintTemplate,
    handleUpdateQuicksprintTemplate,
    handleDeleteQuicksprintTemplate,
  } = useQuicksprintTemplates({
    selectedProject,
    refresh: refreshSprints,
  });

  return {
    selectedProject,
    sprints,
    sortedSprints,
    showcaseSprints,
    execution,
    loading: sprintsLoading || executionLoading,
    nextId,
    planningRoute,
    completedCount,
    inWorkCount,
    pendingActionIds,
    activeRunsBySprintId,
    interventionBySprintId,
    rowMenu, setRowMenu,
    showCreateComposer, setShowCreateComposer,
    editingSprint, setEditingSprint,
    showImportModal, setShowImportModal,
    exportState, setExportState,
    overrideSprint, setOverrideSprint,
    addTaskForSprint, setAddTaskForSprint,
    addTaskSprintTasks,
    virtualProviders,
    planningEta,
    planningPresets,
    showQuicksprint, setShowQuicksprint,
    quicksprintTemplates,
    quicksprintLoading,
    agentPresets,
    handleQuicksprintExecute,
    handleCreateQuicksprintTemplate,
    handleUpdateQuicksprintTemplate,
    handleDeleteQuicksprintTemplate,
    refreshSprints,
    refreshExecution,
    handleSprintToggle,
    handleSubmitSprint,
    handleImprovePrompt,
    handleOpenAppendTasks,
    handleAppendTask,
    handleDeleteSprint,
    handleToggleShowcase,
    handleOpenExport,
    handleImportSprint,
  };
}
