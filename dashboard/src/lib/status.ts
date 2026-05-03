import type { DashboardStats, JulesActivity, Subtask } from "../types.js";
import { normalizeSessionName } from "./session.js";
import { getTaskProgressPhase } from "./task-progress.js";

export interface ProcessedTasksResult {
  tasks: Subtask[];
  stats: DashboardStats;
}

const phaseCache = new WeakMap<Subtask, string>();

export const processDashboardTasks = (
  tasks: Subtask[],
  liveBySession?: Record<string, JulesActivity[]> | null,
): ProcessedTasksResult => {
  let running = 0;
  let codingCompleted = 0;
  let completed = 0;
  let failed = 0;
  let ci = 0;
  let automerge = 0;
  let merged = 0;
  let mergeBlocked = 0;
  let mergeConflicts = 0;

  const processedTasks: Subtask[] = [];
  processedTasks.length = tasks.length;

  const needsProcessing = Boolean(liveBySession);

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    let phase = phaseCache.get(task);
    if (!phase) {
      phase = getTaskProgressPhase(task);
      phaseCache.set(task, phase);
    }

    if (phase === "RUNNING") running += 1;
    else if (phase === "CODING_COMPLETED") codingCompleted += 1;
    else if (phase === "COMPLETED") completed += 1;
    else if (phase === "FAILED") failed += 1;

    const mergeIndicator = task.merge_indicator;
    if (mergeIndicator === "CI") ci += 1;
    else if (mergeIndicator === "AUTOMERGE") automerge += 1;
    else if (mergeIndicator === "MERGE_BLOCKED") mergeBlocked += 1;
    else if (mergeIndicator === "MERGE_CONFLICT") mergeConflicts += 1;

    if (mergeIndicator === "MERGED" || task.is_merged) {
      merged += 1;
    }

    if (!needsProcessing) {
      processedTasks[i] = task;
      continue;
    }

    const sessionName = normalizeSessionName(task);
    if (!sessionName) {
      processedTasks[i] = task;
      continue;
    }

    const liveActivities = liveBySession![sessionName];
    if (!liveActivities) {
      processedTasks[i] = task;
      continue;
    }

    processedTasks[i] = { ...task, session_name: sessionName, activities: liveActivities };
  }

  const stats: DashboardStats = {
    total: tasks.length,
    running,
    codingCompleted,
    completed,
    failed,
    ci,
    automerge,
    merged,
    mergeBlocked,
    mergeConflicts,
  };

  return { tasks: processedTasks, stats };
};

export const mergeLiveActivities = (tasks: Subtask[], liveBySession: Record<string, JulesActivity[]>): Subtask[] => {
  return processDashboardTasks(tasks, liveBySession).tasks;
};

export const computeStats = (tasks: Subtask[]): DashboardStats => {
  return processDashboardTasks(tasks).stats;
};
