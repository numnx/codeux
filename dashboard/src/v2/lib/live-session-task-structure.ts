import type { ExecutionRuntimeEventSummary, ExecutionTaskDispatchSummary, Subtask } from "../../types.js";
import type { Task, TaskStatus } from "../types.js";

function mapTaskStatusToRuntimeStatus(status: TaskStatus): Subtask["status"] {
  switch (status) {
    case "in_progress":
      return "RUNNING";
    case "coding_completed":
      return "CODING_COMPLETED";
    case "completed":
      return "COMPLETED";
    case "pending":
    default:
      return "PENDING";
  }
}

function toMergeIndicator(value: string | null): Subtask["merge_indicator"] {
  switch (value) {
    case "CI":
    case "AUTOMERGE":
    case "MERGED":
    case "MERGE_BLOCKED":
    case "MERGE_CONFLICT":
      return value;
    default:
      return undefined;
  }
}

export function buildLiveSessionTasks(
  tasks: Task[],
  runtimeTasks: Subtask[],
  dispatches: ExecutionTaskDispatchSummary[],
  events: ExecutionRuntimeEventSummary[],
  projectId: string | null,
): Subtask[] {
  const taskKeyByRecordId = new Map(tasks.map((task) => [task.recordId, task.id]));
  const runtimeByRecordId = new Map(
    runtimeTasks
      .filter((task): task is Subtask & { record_id: string } => typeof task.record_id === "string" && task.record_id.length > 0)
      .map((task) => [task.record_id, task]),
  );
  const runtimeByTaskKey = new Map(runtimeTasks.map((task) => [task.id, task]));

  const dispatchByTaskKey = new Map(dispatches.map((d) => [d.taskKey, d]));
  const latestEventByTaskKey = new Map<string, ExecutionRuntimeEventSummary>();

  // Events are usually ordered chronologically but we can just map the last one seen per task
  for (const event of events) {
    if (event.taskKey) {
      latestEventByTaskKey.set(event.taskKey, event);
    }
  }

  return tasks.map((task) => {
    const runtimeTask = runtimeByRecordId.get(task.recordId) || runtimeByTaskKey.get(task.id);
    const dispatch = dispatchByTaskKey.get(task.id);
    const event = latestEventByTaskKey.get(task.id);

    // Status tasks have provider, session_id, worker_branch, pr_url, etc.
    // Dispatches don't really have these except maybe connection/worker info, but we rely on the task itself.
    // However, the issue explicitly says: "preserving session_id, session_name, provider, worker_branch, pr_url, merge state, and related metadata when one source lags or temporarily omits those fields."
    // This probably means runtimeTasks could be sparse but we should hydrate fields from what's available?
    // Wait, the status subtasks array is what we are overlaying onto the project tasks.

    // Let's look closely at the constraints: "Extend the task-structure overlay so runtime task fields can be hydrated from status tasks, execution dispatches, and runtime events, preserving session_id, session_name, provider, worker_branch, pr_url, merge state, and related metadata when one source lags or temporarily omits those fields."

    // Actually, runtimeTask is the status task. What else can provide status? Dispatch has "status", event has "taskRunState".
    let derivedStatus: Subtask["status"] = runtimeTask?.status ?? mapTaskStatusToRuntimeStatus(task.status);

    // If runtime task doesn't exist, we can use dispatch or event state.
    // Dispatch status might be "running", "completed", "failed", etc.
    if (!runtimeTask) {
        if (event?.taskRunState === "running" || dispatch?.status === "running") {
            derivedStatus = "RUNNING";
        } else if (event?.taskRunState === "completed" || dispatch?.status === "completed") {
            derivedStatus = "COMPLETED";
        } else if (event?.taskRunState === "failed" || dispatch?.status === "failed") {
            derivedStatus = "FAILED";
        } else if (event?.taskRunState === "blocked" || dispatch?.status === "blocked") {
            derivedStatus = "BLOCKED";
        } else if (event?.taskRunState === "coding_completed" || dispatch?.status === "coding_completed") {
            derivedStatus = "CODING_COMPLETED";
        } else if (dispatch?.status === "queued") {
            derivedStatus = "PENDING";
        }
    }

    return {
      record_id: task.recordId,
      project_id: runtimeTask?.project_id ?? projectId ?? undefined,
      sprint_id: runtimeTask?.sprint_id ?? task.sprintId,
      id: task.id,
      title: runtimeTask?.title ?? task.title,
      prompt: runtimeTask?.prompt ?? task.promptMarkdown ?? task.description ?? "",
      depends_on: task.dependsOnTaskIds.map((dependencyId) => taskKeyByRecordId.get(dependencyId) || dependencyId),
      status: derivedStatus,
      session_id: runtimeTask?.session_id ?? dispatch?.connectionId ?? undefined,
      session_name: runtimeTask?.session_name ?? dispatch?.connectionDisplayName ?? undefined,
      session_state: runtimeTask?.session_state,
      provider: runtimeTask?.provider,
      worker_branch: runtimeTask?.worker_branch ?? undefined,
      pr_url: runtimeTask?.pr_url ?? undefined,
      activities: runtimeTask?.activities,
      is_independent: runtimeTask?.is_independent ?? task.isIndependent,
      is_merged: runtimeTask?.is_merged ?? task.isMerged,
      merge_indicator: runtimeTask?.merge_indicator ?? toMergeIndicator(task.mergeIndicator),
    };
  });
}
