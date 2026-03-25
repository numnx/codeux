import type { DashboardStats, JulesActivity, Subtask } from "../types.js";
import { normalizeSessionName } from "./session.js";
import { getTaskProgressPhase } from "./task-progress.js";

export interface ProcessedTasksResult {
  tasks: Subtask[];
  stats: DashboardStats;
}

export const processDashboardTasks = (
  tasks: Subtask[],
  liveBySession?: Record<string, JulesActivity[]> | null
): ProcessedTasksResult => {
  const stats: DashboardStats = {
    total: tasks.length,
    running: 0,
    codingCompleted: 0,
    completed: 0,
    failed: 0,
    ci: 0,
    automerge: 0,
    merged: 0,
    mergeBlocked: 0,
    mergeConflicts: 0,
  };

  const processedTasks: Subtask[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const phase = getTaskProgressPhase(task);
    
    // Stats calculation
    if (phase === "RUNNING") stats.running++;
    else if (phase === "CODING_COMPLETED") stats.codingCompleted++;
    else if (phase === "COMPLETED") stats.completed++;
    else if (phase === "FAILED") stats.failed++;

    const indicator = task.merge_indicator;
    if (indicator === "CI") stats.ci++;
    else if (indicator === "AUTOMERGE") stats.automerge++;
    else if (indicator === "MERGED" || task.is_merged) stats.merged++;
    else if (indicator === "MERGE_BLOCKED") stats.mergeBlocked++;
    else if (indicator === "MERGE_CONFLICT") stats.mergeConflicts++;

    // Live activities merging
    let finalTask = task;
    if (liveBySession) {
      const sessionName = normalizeSessionName(task);
      if (sessionName) {
        const liveActivities = liveBySession[sessionName];
        if (liveActivities) {
          finalTask = { ...task, session_name: sessionName, activities: liveActivities };
        }
      }
    }
    processedTasks.push(finalTask);
  }

  return { tasks: processedTasks, stats };
};

export const mergeLiveActivities = (tasks: Subtask[], liveBySession: Record<string, JulesActivity[]>): Subtask[] => {
  return processDashboardTasks(tasks, liveBySession).tasks;
};

export const computeStats = (tasks: Subtask[]): DashboardStats => {
  return processDashboardTasks(tasks).stats;
};
