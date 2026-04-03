import { useCallback, useState } from "preact/hooks";
import type { CreateTaskInput, Sprint, SprintStatus, Task } from "../../types.js";
import {
  cancelSprintRun,
  orchestrateSprint,
} from "../../../lib/api/dashboard-api.js";
import {
  createTask,
  deleteSprint,
  exportSprintMarkdown,
  fetchProjectExecution,
  fetchTasks,
  importSprintMarkdown,
  updateSprint,
} from "../../lib/project-api.js";
import { buildTaskBundle, parseTaskBundle } from "../../lib/markdown-transfer.js";
import { toTaskViewModel } from "../../lib/view-models.js";

export function useSprintActions({
  selectedProject,
  sprints,
  activeRunsBySprintId,
  refresh,
  refreshExecution,
  setSuppressedRunningSprintIds,
}: {
  selectedProject: { id: string } | null;
  sprints: Sprint[];
  activeRunsBySprintId: Map<string, { id: string; status: string }>;
  refresh: () => Promise<void>;
  refreshExecution: () => Promise<void>;
  setSuppressedRunningSprintIds: (updater: (current: Set<string>) => Set<string>) => void;
}) {
  const [pendingActionIds, setPendingActionIds] = useState<Set<string>>(new Set());
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, SprintStatus>>({});
  const [addTaskForSprint, setAddTaskForSprint] = useState<Sprint | null>(null);
  const [addTaskSprintTasks, setAddTaskSprintTasks] = useState<Task[]>([]);
  const [exportState, setExportState] = useState<{
    sprintLabel: string;
    sprintMarkdown: string;
    tasksMarkdown: string;
  } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const runSprintAction = useCallback(async (
    actionId: string,
    sprintId: string,
    operation: () => Promise<void>,
    options: {
      optimisticStatus?: SprintStatus;
      waitForActiveRun?: boolean;
    } = {},
  ) => {
    setPendingActionIds((current) => new Set(current).add(actionId));
    if (options.optimisticStatus) {
      setOptimisticStatuses((current) => ({ ...current, [sprintId]: options.optimisticStatus! }));
    }
    try {
      await operation();
      if (options.optimisticStatus === "cancelled") {
        setSuppressedRunningSprintIds((current) => new Set(current).add(sprintId));
      }
      if (options.waitForActiveRun && selectedProject) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const snapshot = await fetchProjectExecution(selectedProject.id);
          if (snapshot.sprintRuns.some((run) => run.sprintId === sprintId && (run.status === "running" || run.status === "queued"))) {
            break;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 250));
        }
      }
      await Promise.all([refresh(), refreshExecution()]);
      setOptimisticStatuses((current) => {
        const next = { ...current };
        delete next[sprintId];
        return next;
      });
    } catch (error) {
      setOptimisticStatuses((current) => {
        const next = { ...current };
        delete next[sprintId];
        return next;
      });
      await Promise.all([refresh(), refreshExecution()]);
      window.alert(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      setPendingActionIds((current) => {
        const next = new Set(current);
        next.delete(actionId);
        return next;
      });
    }
  }, [refresh, refreshExecution, selectedProject, setSuppressedRunningSprintIds]);

  const handleSprintToggle = useCallback((sprintId: string) => {
    if (!selectedProject) {
      return;
    }
    const activeRun = activeRunsBySprintId.get(sprintId);
    if (activeRun) {
      const stopActionId = `sprint-stop:${activeRun.id}`;
      void runSprintAction(stopActionId, sprintId, async () => {
        await cancelSprintRun(activeRun.id);
      }, { optimisticStatus: "cancelled" });
      return;
    }

    const startActionId = `sprint-start:${sprintId}`;
    if (pendingActionIds.has(startActionId)) {
      return;
    }
    setSuppressedRunningSprintIds((current) => {
      if (!current.has(sprintId)) {
        return current;
      }
      const next = new Set(current);
      next.delete(sprintId);
      return next;
    });
    void runSprintAction(startActionId, sprintId, async () => {
      await orchestrateSprint(selectedProject.id, sprintId);
    }, { waitForActiveRun: true });
  }, [activeRunsBySprintId, pendingActionIds, runSprintAction, selectedProject, setSuppressedRunningSprintIds]);

  const handleOpenAppendTasks = useCallback(async (sprint: Sprint) => {
    if (!selectedProject) return;
    try {
      const taskRecords = await fetchTasks(selectedProject.id, sprint.id);
      const sprintsById = new Map<string, Sprint>(sprints.map((s: Sprint) => [s.id, s]));
      const tasks = taskRecords.map((t) => toTaskViewModel(t, new Map(), sprintsById));
      setAddTaskSprintTasks(tasks);
      setAddTaskForSprint(sprint);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    }
  }, [selectedProject, sprints]);

  const handleAppendTask = useCallback(async (draft: {
    sprintId: string;
    title: string;
    description: string;
    promptMarkdown: string;
    status: string;
    priority: string;
    executorType: string;
    dependsOnTaskIds: string[];
  }) => {
    if (!selectedProject) return;
    await createTask(selectedProject.id, draft as CreateTaskInput);
    await refresh();
    if (addTaskForSprint) {
      const taskRecords = await fetchTasks(selectedProject.id, addTaskForSprint.id);
      const sprintsById = new Map<string, Sprint>(sprints.map((s: Sprint) => [s.id, s]));
      setAddTaskSprintTasks(taskRecords.map((t) => toTaskViewModel(t, new Map(), sprintsById)));
    }
  }, [addTaskForSprint, refresh, selectedProject, sprints]);

  const handleDeleteSprint = useCallback(async (sprintId: string) => {
    await deleteSprint(sprintId);
    await Promise.all([refresh(), refreshExecution()]);
  }, [refresh, refreshExecution]);

  const handleToggleShowcase = useCallback(async (sprint: Sprint) => {
    const actionId = `sprint-showcase:${sprint.id}`;
    if (pendingActionIds.has(actionId)) {
      return;
    }
    setPendingActionIds((current) => new Set(current).add(actionId));
    try {
      await updateSprint(sprint.id, {
        showcasePinned: !sprint.showcasePinned,
      });
      await refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingActionIds((current) => {
        const next = new Set(current);
        next.delete(actionId);
        return next;
      });
    }
  }, [pendingActionIds, refresh]);

  const handleOpenExport = useCallback(async (sprintId: string, sprintName: string) => {
    if (!selectedProject) {
      return;
    }
    const bundle = await exportSprintMarkdown(selectedProject.id, sprintId);
    setExportState({
      sprintLabel: sprintName,
      sprintMarkdown: bundle.sprint.markdown,
      tasksMarkdown: buildTaskBundle(bundle.tasks),
    });
  }, [selectedProject]);

  const handleImportSprint = useCallback(async (payload: { sprintMarkdown: string; tasksMarkdown: string }) => {
    if (!selectedProject) {
      return;
    }
    await importSprintMarkdown(selectedProject.id, {
      sprintMarkdown: payload.sprintMarkdown,
      tasks: parseTaskBundle(payload.tasksMarkdown),
    });
    await refresh();
  }, [refresh, selectedProject]);

  return {
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
  };
}
