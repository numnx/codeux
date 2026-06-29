import type { DashboardStatus, ExecutionDashboardSnapshot, Subtask } from "../types.js";

const ACTIVE_SPRINT_RUN_STATUSES = new Set([
  "queued",
  "running",
  "paused",
  "cancel_requested",
]);

const ACTIVE_TASK_DISPATCH_STATUSES = new Set([
  "queued",
  "claimed",
  "running",
  "blocked",
  "cancel_requested",
]);

const ACTIVE_ATTENTION_STATUSES = new Set([
  "open",
  "claimed",
]);

function normalizeValue(value: string | null | undefined): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function resolveTaskIdentity(task: Subtask): string | null {
  return normalizeValue(task.record_id) ?? normalizeValue(task.id);
}

function mergeMissingTaskRuntimeMetadata(
  previous: DashboardStatus,
  next: DashboardStatus,
): DashboardStatus {
  const previousById = new Map<string, Subtask>();

  for (const task of previous.subtasks) {
    const identity = resolveTaskIdentity(task);
    if (identity) {
      previousById.set(identity, task);
    }
  }

  let changed = false;
  const subtasks = next.subtasks.map((task) => {
    const identity = resolveTaskIdentity(task);
    const previousTask = identity ? previousById.get(identity) : null;
    if (!previousTask) {
      return task;
    }

    const sessionId = normalizeValue(task.session_id) ?? normalizeValue(previousTask.session_id) ?? undefined;
    const sessionName = normalizeValue(task.session_name) ?? normalizeValue(previousTask.session_name) ?? undefined;
    const sessionState = normalizeValue(task.session_state) ?? normalizeValue(previousTask.session_state) ?? undefined;
    const workerBranch = normalizeValue(task.worker_branch) ?? normalizeValue(previousTask.worker_branch) ?? undefined;
    const prUrl = normalizeValue(task.pr_url) ?? normalizeValue(previousTask.pr_url) ?? undefined;
    const provider = task.provider ?? previousTask.provider;

    if (
      sessionId === task.session_id
      && sessionName === task.session_name
      && sessionState === task.session_state
      && workerBranch === task.worker_branch
      && prUrl === task.pr_url
      && provider === task.provider
    ) {
      return task;
    }

    changed = true;
    return {
      ...task,
      session_id: sessionId,
      session_name: sessionName,
      session_state: sessionState,
      provider,
      worker_branch: workerBranch,
      pr_url: prUrl,
    };
  });

  return changed ? { ...next, subtasks } : next;
}

function isEmptyExecutionSnapshot(snapshot: ExecutionDashboardSnapshot): boolean {
  return (
    snapshot.projectId === null
    && snapshot.projectName === null
    && snapshot.updatedAt === null
    && snapshot.sprintRuns.length === 0
    && snapshot.taskDispatches.length === 0
    && snapshot.connections.length === 0
    && snapshot.primaryAssignedWorker === null
    && snapshot.overflowAssignedWorkers.length === 0
    && snapshot.attentionItems.length === 0
    && snapshot.recentEvents.length === 0
    && (snapshot.recentInvocations?.length ?? 0) === 0
  );
}

export function hasActiveExecutionSnapshot(snapshot: ExecutionDashboardSnapshot): boolean {
  return (
    snapshot.sprintRuns.some((run) => ACTIVE_SPRINT_RUN_STATUSES.has(run.status))
    || snapshot.taskDispatches.some((dispatch) => ACTIVE_TASK_DISPATCH_STATUSES.has(dispatch.status))
    || snapshot.attentionItems.some((item) => ACTIVE_ATTENTION_STATUSES.has(item.status))
  );
}

export function areExecutionSnapshotsEquivalent(
  left: ExecutionDashboardSnapshot,
  right: ExecutionDashboardSnapshot,
): boolean {
  if (
    left.projectId !== right.projectId
    || left.projectName !== right.projectName
    || left.sprintRuns.length !== right.sprintRuns.length
    || left.taskDispatches.length !== right.taskDispatches.length
    || left.connections.length !== right.connections.length
    || left.attentionItems.length !== right.attentionItems.length
    || left.recentEvents.length !== right.recentEvents.length
    || (left.recentInvocations?.length ?? 0) !== (right.recentInvocations?.length ?? 0)
  ) {
    return false;
  }

  for (let index = 0; index < left.sprintRuns.length; index += 1) {
    const leftRun = left.sprintRuns[index];
    const rightRun = right.sprintRuns[index];
    if (
      leftRun.id !== rightRun.id
      || leftRun.status !== rightRun.status
      || leftRun.lastHeartbeatAt !== rightRun.lastHeartbeatAt
      || leftRun.finishedAt !== rightRun.finishedAt
      || leftRun.humanIntervention?.title !== rightRun.humanIntervention?.title
      || leftRun.humanIntervention?.reason !== rightRun.humanIntervention?.reason
      || leftRun.humanIntervention?.instructions !== rightRun.humanIntervention?.instructions
    ) {
      return false;
    }
  }

  for (let index = 0; index < left.taskDispatches.length; index += 1) {
    const leftDispatch = left.taskDispatches[index];
    const rightDispatch = right.taskDispatches[index];
    if (
      leftDispatch.id !== rightDispatch.id
      || leftDispatch.status !== rightDispatch.status
      || leftDispatch.taskRunState !== rightDispatch.taskRunState
      || leftDispatch.lastHeartbeatAt !== rightDispatch.lastHeartbeatAt
      || leftDispatch.finishedAt !== rightDispatch.finishedAt
      || leftDispatch.errorMessage !== rightDispatch.errorMessage
      || leftDispatch.sessionId !== rightDispatch.sessionId
      || leftDispatch.provider !== rightDispatch.provider
      || leftDispatch.prUrl !== rightDispatch.prUrl
      || leftDispatch.workerBranch !== rightDispatch.workerBranch
    ) {
      return false;
    }
  }

  for (let index = 0; index < left.connections.length; index += 1) {
    const leftConnection = left.connections[index];
    const rightConnection = right.connections[index];
    if (
      leftConnection.id !== rightConnection.id
      || leftConnection.status !== rightConnection.status
      || leftConnection.lastHeartbeatAt !== rightConnection.lastHeartbeatAt
      || leftConnection.pendingInboxCount !== rightConnection.pendingInboxCount
      || leftConnection.activeDispatchCount !== rightConnection.activeDispatchCount
    ) {
      return false;
    }
  }

  for (let index = 0; index < left.attentionItems.length; index += 1) {
    const leftItem = left.attentionItems[index];
    const rightItem = right.attentionItems[index];
    if (
      leftItem.id !== rightItem.id
      || leftItem.status !== rightItem.status
      || leftItem.updatedAt !== rightItem.updatedAt
    ) {
      return false;
    }
  }

  for (let index = 0; index < left.recentEvents.length; index += 1) {
    const leftEvent = left.recentEvents[index];
    const rightEvent = right.recentEvents[index];
    if (
      leftEvent?.id !== rightEvent?.id
      || leftEvent?.createdAt !== rightEvent?.createdAt
      || leftEvent?.eventType !== rightEvent?.eventType
    ) {
      return false;
    }
  }

  const leftInvocations = left.recentInvocations ?? [];
  const rightInvocations = right.recentInvocations ?? [];
  for (let index = 0; index < leftInvocations.length; index += 1) {
    const leftInvocation = leftInvocations[index];
    const rightInvocation = rightInvocations[index];
    if (
      leftInvocation?.id !== rightInvocation?.id
      || leftInvocation?.status !== rightInvocation?.status
      || leftInvocation?.updatedAt !== rightInvocation?.updatedAt
      || leftInvocation?.messageCount !== rightInvocation?.messageCount
      || leftInvocation?.lastMessageAt !== rightInvocation?.lastMessageAt
    ) {
      return false;
    }
  }

  return (
    left.primaryAssignedWorker?.workerEndpointId === right.primaryAssignedWorker?.workerEndpointId
    && left.overflowAssignedWorkers.length === right.overflowAssignedWorkers.length
  );
}

export function stabilizeExecutionSnapshot(
  previous: ExecutionDashboardSnapshot,
  next: ExecutionDashboardSnapshot,
): ExecutionDashboardSnapshot {
  if (!hasActiveExecutionSnapshot(previous)) {
    return next;
  }

  const previousProjectId = normalizeValue(previous.projectId);
  const nextProjectId = normalizeValue(next.projectId);
  if (previousProjectId && nextProjectId && previousProjectId !== nextProjectId) {
    return next;
  }

  return isEmptyExecutionSnapshot(next) ? previous : next;
}

export function stabilizeStatusSnapshot(
  previous: DashboardStatus,
  next: DashboardStatus,
  execution: ExecutionDashboardSnapshot,
): DashboardStatus {
  if (previous.subtasks.length === 0 || !hasActiveExecutionSnapshot(execution)) {
    return next;
  }

  const previousProjectId = normalizeValue(previous.project_id) ?? normalizeValue(previous.subtasks[0]?.project_id);
  const nextProjectId = normalizeValue(next.project_id) ?? normalizeValue(execution.projectId);
  if (previousProjectId && nextProjectId && previousProjectId !== nextProjectId) {
    return next;
  }

  const previousSprintId = normalizeValue(previous.sprint_id) ?? normalizeValue(previous.subtasks[0]?.sprint_id);
  const nextSprintId = normalizeValue(next.sprint_id);
  if (previousSprintId && nextSprintId && previousSprintId !== nextSprintId) {
    return next;
  }

  if (next.subtasks.length === 0) {
    return previous;
  }

  return mergeMissingTaskRuntimeMetadata(previous, next);
}
