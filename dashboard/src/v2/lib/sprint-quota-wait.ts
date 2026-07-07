import { QUOTA_WAIT_EVENT_TYPE, findActiveQuotaWait } from "./live-task-runtime.js";
import type { ExecutionDashboardSnapshot, ProviderId, ExecutionRuntimeEventSummary, ExecutionTaskDispatchSummary } from "../../../src/types.js";

export interface SprintQuotaWaitSummary {
  sprintId: string;
  retryAfterIso: string;
  taskCount: number;
  taskKey: string;
  taskTitle: string;
  provider?: ProviderId;
}

export function deriveSprintQuotaWaits(
  execution: ExecutionDashboardSnapshot,
  now: number = Date.now(),
): Map<string, SprintQuotaWaitSummary> {
  const result = new Map<string, SprintQuotaWaitSummary>();

  if (!execution.recentEvents || execution.recentEvents.length === 0) {
    return result;
  }

  // Find all active quota wait events. We will group by task and find active.
  const eventsByTask = new Map<string, ExecutionRuntimeEventSummary[]>();
  for (const event of execution.recentEvents) {
    if (event.eventType !== QUOTA_WAIT_EVENT_TYPE) {
      continue;
    }
    const taskId = event.taskId || event.taskKey; // Try to get an identifier
    if (!taskId) {
        continue;
    }
    const list = eventsByTask.get(taskId) || [];
    list.push(event);
    eventsByTask.set(taskId, list);
  }

  // Aggregate per sprint
  for (const [taskId, events] of eventsByTask.entries()) {
      const activeWait = findActiveQuotaWait(events, now);
      if (!activeWait) {
          continue;
      }

      // We need the most recent event to pull metadata from. findActiveQuotaWait logic
      // returns just the retryAfterIso, so we need to find the event that corresponds to it,
      // or at least the latest one. Find the event with matching retryAfterIso.
      let event = events.find((e: ExecutionRuntimeEventSummary) => typeof e.payload?.retryAfterIso === "string" && e.payload.retryAfterIso === activeWait.retryAfterIso);
      if (!event) {
          // Fallback to the latest one by createdAt
          event = [...events].sort((a: ExecutionRuntimeEventSummary, b: ExecutionRuntimeEventSummary) => b.createdAt.localeCompare(a.createdAt))[0];
      }
      if (!event) { continue; } // Should not happen

      const sprintId = event.sprintId;
      if (!sprintId) continue;

      let dispatch = execution.taskDispatches?.find((d: ExecutionTaskDispatchSummary) => (d.taskId === taskId || d.taskKey === taskId) && d.sprintId === sprintId);

      const taskKey = event.taskKey || dispatch?.taskKey || taskId;
      const taskTitle = event.taskTitle || dispatch?.taskTitle || taskKey;
      const provider = (event.provider || dispatch?.provider) as ProviderId | undefined;

      const current = result.get(sprintId);
      if (!current) {
          result.set(sprintId, {
              sprintId,
              retryAfterIso: activeWait.retryAfterIso,
              taskCount: 1,
              taskKey,
              taskTitle,
              provider
          });
      } else {
          current.taskCount++;
          if (new Date(activeWait.retryAfterIso).getTime() < new Date(current.retryAfterIso).getTime()) {
              current.retryAfterIso = activeWait.retryAfterIso;
              current.taskKey = taskKey;
              current.taskTitle = taskTitle;
              current.provider = provider;
          }
      }
  }

  return result;
}
