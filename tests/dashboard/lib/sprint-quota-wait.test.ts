import { describe, it, expect } from "vitest";
import { deriveSprintQuotaWaits } from "../../../dashboard/src/v2/lib/sprint-quota-wait.js";
import { QUOTA_WAIT_EVENT_TYPE } from "../../../dashboard/src/v2/lib/live-task-runtime.js";
import type { ExecutionDashboardSnapshot, ExecutionRuntimeEventSummary, ExecutionTaskDispatchSummary } from "../../../dashboard/src/v2/types.js";

function createEvent(
  id: string,
  taskId: string,
  sprintId: string,
  retryAfterIso: string | null | undefined,
  createdAt: string,
  taskKey = taskId,
  taskTitle = taskId,
  provider = "jules"
): ExecutionRuntimeEventSummary {
  return {
    id,
    scopeType: "task_run",
    taskRunId: "run1",
    sprintRunId: "sprintRun1",
    dispatchId: "dispatch1",
    projectId: "proj1",
    sprintId,
    sprintName: "Sprint 1",
    sprintNumber: 1,
    sprintRunStatus: "running",
    taskId,
    taskKey,
    taskTitle,
    taskRunState: "running",
    eventType: QUOTA_WAIT_EVENT_TYPE,
    originator: "test",
    sourceEventKey: null,
    provider,
    sessionId: "sess1",
    sessionName: "sess1",
    workerBranch: "branch1",
    prUrl: "url1",
    connectionId: "conn1",
    connectionDisplayName: "conn1",
    connectionRole: "primary",
    createdAt,
    payload: { retryAfterIso }
  };
}

describe("deriveSprintQuotaWaits", () => {
  it("should return empty map for empty execution events", () => {
    const execution: ExecutionDashboardSnapshot = {
      projectId: "proj", projectName: "Proj", sprintRuns: [], taskDispatches: [], connections: [], primaryAssignedWorker: null, overflowAssignedWorkers: [], attentionItems: [], recentEvents: [], updatedAt: null
    };
    expect(deriveSprintQuotaWaits(execution).size).toBe(0);
  });

  it("should group events by sprintId and pick the soonest reset time", () => {
    const now = new Date("2025-01-01T00:00:00Z").getTime();

    const events: ExecutionRuntimeEventSummary[] = [
      createEvent("1", "task1", "sprint1", "2025-01-01T00:01:00Z", "2025-01-01T00:00:00Z", "key1", "Task 1", "gemini"),
      createEvent("2", "task2", "sprint1", "2025-01-01T00:02:00Z", "2025-01-01T00:00:00Z", "key2", "Task 2", "gemini")
    ];

    const execution: ExecutionDashboardSnapshot = {
      projectId: "proj", projectName: "Proj", sprintRuns: [], taskDispatches: [], connections: [], primaryAssignedWorker: null, overflowAssignedWorkers: [], attentionItems: [], recentEvents: events, updatedAt: null
    };

    const waits = deriveSprintQuotaWaits(execution, now);
    expect(waits.size).toBe(1);

    const sprintWait = waits.get("sprint1");
    expect(sprintWait).toBeDefined();
    expect(sprintWait?.sprintId).toBe("sprint1");
    expect(sprintWait?.taskCount).toBe(2);
    expect(sprintWait?.retryAfterIso).toBe("2025-01-01T00:01:00Z");
    expect(sprintWait?.taskKey).toBe("key1");
  });

  it("should ignore events where retryAfterIso has passed", () => {
    const now = new Date("2025-01-01T00:00:00Z").getTime();

    const events: ExecutionRuntimeEventSummary[] = [
      createEvent("1", "task1", "sprint1", "2024-12-31T23:59:59Z", "2024-12-31T23:59:00Z", "key1", "Task 1", "gemini")
    ];

    const execution: ExecutionDashboardSnapshot = {
      projectId: "proj", projectName: "Proj", sprintRuns: [], taskDispatches: [], connections: [], primaryAssignedWorker: null, overflowAssignedWorkers: [], attentionItems: [], recentEvents: events, updatedAt: null
    };

    const waits = deriveSprintQuotaWaits(execution, now);
    expect(waits.size).toBe(0);
  });

  it("should ignore malformed events without valid retryAfterIso", () => {
    const now = new Date("2025-01-01T00:00:00Z").getTime();

    const events: ExecutionRuntimeEventSummary[] = [
      createEvent("1", "task1", "sprint1", null, "2025-01-01T00:00:00Z", "key1", "Task 1", "gemini"),
      createEvent("2", "task2", "sprint1", undefined, "2025-01-01T00:00:00Z", "key2", "Task 2", "gemini"),
      {
        ...createEvent("3", "task3", "sprint1", "2025-01-01T00:01:00Z", "2025-01-01T00:00:00Z", "key3", "Task 3", "gemini"),
        payload: null
      }
    ];

    const execution: ExecutionDashboardSnapshot = {
      projectId: "proj", projectName: "Proj", sprintRuns: [], taskDispatches: [], connections: [], primaryAssignedWorker: null, overflowAssignedWorkers: [], attentionItems: [], recentEvents: events, updatedAt: null
    };

    const waits = deriveSprintQuotaWaits(execution, now);
    expect(waits.size).toBe(0);
  });

  it("should aggregate waits across different sprints independently", () => {
    const now = new Date("2025-01-01T00:00:00Z").getTime();

    const events: ExecutionRuntimeEventSummary[] = [
      createEvent("1", "task1", "sprint1", "2025-01-01T00:01:00Z", "2025-01-01T00:00:00Z", "key1", "Task 1", "gemini"),
      createEvent("2", "task2", "sprint2", "2025-01-01T00:05:00Z", "2025-01-01T00:00:00Z", "key2", "Task 2", "gemini")
    ];

    const execution: ExecutionDashboardSnapshot = {
      projectId: "proj", projectName: "Proj", sprintRuns: [], taskDispatches: [], connections: [], primaryAssignedWorker: null, overflowAssignedWorkers: [], attentionItems: [], recentEvents: events, updatedAt: null
    };

    const waits = deriveSprintQuotaWaits(execution, now);
    expect(waits.size).toBe(2);
    expect(waits.get("sprint1")?.retryAfterIso).toBe("2025-01-01T00:01:00Z");
    expect(waits.get("sprint2")?.retryAfterIso).toBe("2025-01-01T00:05:00Z");
  });

  it("should fallback to dispatch metadata when event task fields are missing", () => {
    const now = new Date("2025-01-01T00:00:00Z").getTime();

    const event = createEvent("1", "task1", "sprint1", "2025-01-01T00:01:00Z", "2025-01-01T00:00:00Z", "key1", "Task 1", "gemini");
    // clear fields to force fallback
    event.taskKey = null;
    event.taskTitle = null;
    event.provider = null;

    const dispatch: ExecutionTaskDispatchSummary = {
      id: "dispatch1", projectId: "proj1", sprintId: "sprint1", sprintRunId: "run1", sprintName: "Sprint 1", sprintNumber: 1, taskId: "task1", taskKey: "dispatchKey1", taskTitle: "Dispatch Title 1", status: "running", executorType: "cli", priority: 1, connectionId: null, connectionDisplayName: null, connectionRole: null, taskRunId: null, taskRunState: null, provider: "codex", sessionId: null, sessionName: null, workerBranch: null, prUrl: null, queuedAt: "2025-01-01T00:00:00Z", claimedAt: null, startedAt: null, finishedAt: null, lastHeartbeatAt: null, errorMessage: null, activeLeaseOwnerKey: null, activeLeaseExpiresAt: null
    };

    const execution: ExecutionDashboardSnapshot = {
      projectId: "proj", projectName: "Proj", sprintRuns: [], taskDispatches: [dispatch], connections: [], primaryAssignedWorker: null, overflowAssignedWorkers: [], attentionItems: [], recentEvents: [event], updatedAt: null
    };

    const waits = deriveSprintQuotaWaits(execution, now);
    expect(waits.size).toBe(1);

    const wait = waits.get("sprint1");
    expect(wait?.taskKey).toBe("dispatchKey1");
    expect(wait?.taskTitle).toBe("Dispatch Title 1");
    expect(wait?.provider).toBe("codex");
  });
});
