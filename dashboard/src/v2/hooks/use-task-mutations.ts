import { useCallback, useState } from "preact/hooks";
import { useAsyncAction } from "./use-async-action.js";
import { createTask, updateTask, deleteTask } from "../lib/project-api.js";
import { rerunTask, type RerunTaskOptions } from "../../lib/api/dashboard-api.js";
import type { Task, TaskPriority, TaskStatus } from "../types.js";

export interface TaskMutationDraft {
  sprintId: string;
  title: string;
  description: string;
  promptMarkdown: string;
  status: TaskStatus;
  priority: TaskPriority;
  executorType: Task["executorType"];
  dependsOnTaskIds: string[];
}

export interface UseTaskMutationsOptions {
  projectId: string | null;
  onSuccess?: () => Promise<void> | void;
}

export function useTaskMutations({ projectId, onSuccess }: UseTaskMutationsOptions) {
  // We track which task IDs are currently being mutated to show per-row loading states
  const [pendingActionIds, setPendingActionIds] = useState<Set<string>>(new Set());

  const addPendingId = useCallback((id: string) => {
    setPendingActionIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const removePendingId = useCallback((id: string) => {
    setPendingActionIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const create = useAsyncAction(
    async (draft: TaskMutationDraft) => {
      if (!projectId) throw new Error("No project selected");
      return await createTask(projectId, draft);
    },
    {
      successMessage: "Task created successfully",
      pendingMessage: "Creating task...",
      onSuccess,
    }
  );

  const update = useAsyncAction(
    async (recordId: string, draft: TaskMutationDraft) => {
      addPendingId(recordId);
      try {
        return await updateTask(recordId, draft);
      } finally {
        removePendingId(recordId);
      }
    },
    {
      successMessage: "Task updated successfully",
      pendingMessage: "Updating task...",
      onSuccess,
    }
  );

  const remove = useAsyncAction(
    async (recordId: string) => {
      addPendingId(recordId);
      try {
        return await deleteTask(recordId);
      } finally {
        removePendingId(recordId);
      }
    },
    {
      successMessage: "Task deleted successfully",
      pendingMessage: "Deleting task...",
      onSuccess,
    }
  );

  const rerun = useAsyncAction(
    async (recordId: string, options?: RerunTaskOptions) => {
      addPendingId(recordId);
      try {
        return await rerunTask(recordId, options);
      } finally {
        removePendingId(recordId);
      }
    },
    {
      successMessage: "Task rerun initiated",
      pendingMessage: "Initiating rerun...",
      onSuccess,
    }
  );

  return {
    create,
    update,
    remove,
    rerun,
    pendingActionIds,
    isAnyPending: create.isPending || update.isPending || remove.isPending || rerun.isPending,
  };
}
