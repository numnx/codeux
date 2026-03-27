import type {
  DashboardStatus,
  ExecutionDashboardSnapshot,
  ExecutionSprintRunSummary,
  ExecutionTaskDispatchSummary,
  ExecutionRuntimeEventSummary,
  ProjectExecutionStatsSnapshot,
  Subtask,
} from "../../types.js";
import type { Task } from "../types.js";
import { buildLiveSessionTasks } from "./live-session-task-structure.js";
import { deriveLiveSessionRuntimeState, type LiveSessionRuntimeState } from "./live-session-runtime.js";

export interface LiveSessionProjection {
  projectId: string | null;
  sprintId: string | null;
  tasks: Subtask[];
  dispatches: ExecutionTaskDispatchSummary[];
  sprintRuns: ExecutionSprintRunSummary[];
  recentEvents: ExecutionRuntimeEventSummary[];
  statsInputs: ProjectExecutionStatsSnapshot | null;
  reportText: string;
  instructions: string;
  runtimeFlags: LiveSessionRuntimeState;
}

export function buildLiveSessionProjection(
  projectId: string | null,
  sprintScopeId: string | null,
  tasks: Task[],
  status: DashboardStatus,
  execution: ExecutionDashboardSnapshot,
  previousProjection: LiveSessionProjection | null,
): LiveSessionProjection {
  const scopeHasChanged =
    previousProjection !== null &&
    (previousProjection.projectId !== projectId ||
      previousProjection.sprintId !== sprintScopeId);

  const runtimeFlags = deriveLiveSessionRuntimeState(status, execution, sprintScopeId);

  let currentStatusSubtasks = status.subtasks || [];
  let currentReportText = status.reportText || "";
  let currentInstructions = status.instructions || "";

  if (
    !scopeHasChanged &&
    previousProjection !== null &&
    currentStatusSubtasks.length === 0 &&
    (runtimeFlags.hasActiveSprint || runtimeFlags.pausedInterventionRun)
  ) {
    const previousHasTaskData = previousProjection.tasks.some(
      (t) => typeof t.record_id === "string" && t.record_id.length > 0
    );

    if (previousHasTaskData) {
      currentStatusSubtasks = previousProjection.tasks;
      currentReportText = status.reportText || previousProjection.reportText;
      currentInstructions = status.instructions || previousProjection.instructions;
    }
  }

  const scopedSprintRuns = sprintScopeId
    ? execution.sprintRuns.filter((run) => run.sprintId === sprintScopeId)
    : execution.sprintRuns;

  const scopedDispatches = sprintScopeId
    ? execution.taskDispatches.filter((d) => d.sprintId === sprintScopeId)
    : execution.taskDispatches;

  const scopedEvents = sprintScopeId
    ? execution.recentEvents.filter((e) => e.sprintId === sprintScopeId)
    : execution.recentEvents;

  const liveTasks = buildLiveSessionTasks(
    tasks,
    currentStatusSubtasks,
    scopedDispatches,
    scopedEvents,
    projectId
  );

  return {
    projectId,
    sprintId: sprintScopeId,
    tasks: liveTasks,
    dispatches: scopedDispatches,
    sprintRuns: scopedSprintRuns,
    recentEvents: scopedEvents,
    statsInputs: null,
    reportText: currentReportText,
    instructions: currentInstructions,
    runtimeFlags,
  };
}
