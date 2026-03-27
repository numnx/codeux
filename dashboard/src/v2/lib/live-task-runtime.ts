import type {
  ExecutionRuntimeEventSummary,
  ExecutionTaskDispatchSummary,
  ProviderId,
  Subtask,
} from "../../types.js";
import {
  getLiveTaskProgressPhase,
  type TaskProgressPhase,
} from "../../lib/task-progress.js";

interface TerminalTaskSignal {
  at: string;
  phase: TaskProgressPhase;
  mergeSettled?: boolean;
}

function compareIsoAsc(left: string, right: string): number {
  return left.localeCompare(right);
}

function getDispatchRecency(dispatch: ExecutionTaskDispatchSummary): string {
  return (
    dispatch.finishedAt
    || dispatch.startedAt
    || dispatch.claimedAt
    || dispatch.queuedAt
    || ""
  );
}

function normalizeString(value: string | null | undefined): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeProvider(value: string | null | undefined): ProviderId | undefined {
  switch (normalizeString(value)) {
    case "jules":
    case "gemini":
    case "codex":
    case "claude-code":
      return normalizeString(value) as ProviderId;
    default:
      return undefined;
  }
}

function taskScopeMatchesDispatch(task: Subtask, dispatch: ExecutionTaskDispatchSummary): boolean {
  if (task.project_id && dispatch.projectId !== task.project_id) {
    return false;
  }
  if (task.sprint_id && dispatch.sprintId !== task.sprint_id) {
    return false;
  }
  return true;
}

function taskScopeMatchesEvent(task: Subtask, event: ExecutionRuntimeEventSummary): boolean {
  if (task.project_id && event.projectId !== task.project_id) {
    return false;
  }
  if (task.sprint_id && event.sprintId !== task.sprint_id) {
    return false;
  }
  return true;
}

export function pickLatestTaskDispatch(
  task: Subtask,
  dispatches: ExecutionTaskDispatchSummary[],
): ExecutionTaskDispatchSummary | null {
  const recordId = normalizeString(task.record_id);
  const scopedDispatches = dispatches.filter((dispatch) => taskScopeMatchesDispatch(task, dispatch));
  const latestByRecency = (items: ExecutionTaskDispatchSummary[]): ExecutionTaskDispatchSummary | null => (
    items.length === 0
      ? null
      : [...items].sort((left, right) => compareIsoAsc(getDispatchRecency(left), getDispatchRecency(right))).at(-1) ?? null
  );

  if (recordId) {
    const exactMatches = scopedDispatches.filter((dispatch) => dispatch.taskId === recordId);
    if (exactMatches.length > 0) {
      return latestByRecency(exactMatches);
    }
    return null;
  }

  return latestByRecency(scopedDispatches.filter((dispatch) => dispatch.taskKey === task.id));
}

export function getTaskEventsForLiveTask(
  task: Subtask,
  dispatch: ExecutionTaskDispatchSummary | null,
  events: ExecutionRuntimeEventSummary[],
): ExecutionRuntimeEventSummary[] {
  const recordId = normalizeString(task.record_id);
  const scopedEvents = events.filter((event) => taskScopeMatchesEvent(task, event));
  const sortEvents = (items: ExecutionRuntimeEventSummary[]): ExecutionRuntimeEventSummary[] => {
    const deduped = new Map<string, ExecutionRuntimeEventSummary>();
    for (const event of items) {
      deduped.set(event.id, event);
    }
    return [...deduped.values()].sort((left, right) => compareIsoAsc(left.createdAt, right.createdAt));
  };

  if (dispatch?.taskRunId) {
    const taskRunMatches = scopedEvents.filter((event) => event.taskRunId === dispatch.taskRunId);
    if (taskRunMatches.length > 0) {
      return sortEvents(taskRunMatches);
    }
  }

  if (dispatch?.id) {
    const dispatchMatches = scopedEvents.filter((event) => event.dispatchId === dispatch.id);
    if (dispatchMatches.length > 0) {
      return sortEvents(dispatchMatches);
    }
  }

  if (recordId) {
    return sortEvents(scopedEvents.filter((event) => event.taskId === recordId));
  }

  return sortEvents(scopedEvents.filter((event) => event.taskKey === task.id));
}

function resolveTerminalEventSignal(
  event: ExecutionRuntimeEventSummary,
): TerminalTaskSignal | null {
  const payload = event.payload || {};
  const ciGateState = String(payload.state || "").toLowerCase();

  switch (event.eventType) {
    case "ci_gate_status":
      if (ciGateState === "merge_confirmed" || ciGateState === "automerge_succeeded") {
        return {
          at: event.createdAt,
          phase: "COMPLETED",
          mergeSettled: true,
        };
      }
      return null;
    case "cli_git_no_changes":
    case "cli_workflow_completed":
    case "run_completed":
      return {
        at: event.createdAt,
        phase: "COMPLETED",
      };
    case "run_failed":
    case "dispatch_failed":
    case "cli_workflow_failed":
      return {
        at: event.createdAt,
        phase: "FAILED",
      };
    case "run_blocked":
    case "dispatch_cancelled":
    case "worker_cancelled":
    case "action_required_auto_failed":
      return {
        at: event.createdAt,
        phase: "BLOCKED",
      };
    case "cli_workflow_quota":
      return {
        at: event.createdAt,
        phase: "QUOTA",
      };
    default:
      return null;
  }
}

export function findLatestTerminalTaskSignal(
  events: ExecutionRuntimeEventSummary[],
): TerminalTaskSignal | null {
  let latestSignal: TerminalTaskSignal | null = null;
  for (const event of events) {
    const signal = resolveTerminalEventSignal(event);
    if (signal) {
      latestSignal = signal;
    }
  }
  return latestSignal;
}

export function projectLiveTask(
  task: Subtask,
  dispatches: ExecutionTaskDispatchSummary[],
  events: ExecutionRuntimeEventSummary[],
): Subtask {
  const dispatch = pickLatestTaskDispatch(task, dispatches);
  const taskEvents = getTaskEventsForLiveTask(task, dispatch, events);
  const terminalSignal = findLatestTerminalTaskSignal(taskEvents);

  return {
    ...task,
    status: getLiveTaskProgressPhase({
      task,
      dispatch,
      runtimeTerminalPhase: terminalSignal?.phase ?? null,
      runtimeMergeSettled: terminalSignal?.mergeSettled === true,
    }),
    session_id: normalizeString(dispatch?.sessionId) || normalizeString(task.session_id) || undefined,
    session_name: normalizeString(dispatch?.sessionName) || normalizeString(task.session_name) || undefined,
    session_state: normalizeString(dispatch?.taskRunState) || normalizeString(task.session_state) || undefined,
    provider: normalizeProvider(dispatch?.provider) || task.provider,
    worker_branch: normalizeString(dispatch?.workerBranch) || normalizeString(task.worker_branch) || undefined,
    pr_url: normalizeString(dispatch?.prUrl) || normalizeString(task.pr_url) || undefined,
  };
}
