import { describe, expect, it } from "vitest";
import type { Subtask, ExecutionTaskDispatchSummary, ExecutionRuntimeEventSummary } from "../../../dashboard/src/types.js";
import type { Task } from "../../../dashboard/src/v2/types.js";
import { buildLiveSessionTasks } from "../../../dashboard/src/v2/lib/live-session-task-structure.js";

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    recordId: "task-record-1",
    id: "TASK-1",
    source: "Project 1",
    sprint: "Sprint 1",
    sprintId: "sprint-1",
    title: "Ship it",
    status: "in_progress",
    priority: "medium",
    executorType: "docker_cli",
    assignee: "Runner",
    time: "Active",
    createdAt: "2026-03-26T10:00:00.000Z",
    promptMarkdown: "Do the work",
    description: "",
    dependsOnTaskIds: [],
    isIndependent: true,
    isMerged: false,
    mergeIndicator: null,
    ...overrides,
  };
}

function createRuntimeTask(overrides: Partial<Subtask> = {}): Subtask {
  return {
    record_id: "task-record-1",
    project_id: "project-1",
    sprint_id: "sprint-1",
    id: "TASK-1",
    title: "Ship it",
    prompt: "Do the work",
    depends_on: [],
    status: "RUNNING",
    session_id: "session-1",
    provider: "gemini-cli",
    is_independent: true,
    is_merged: false,
    ...overrides,
  };
}

describe("live-session-task-structure", () => {
  it("uses stable project task structure when runtime tasks are empty", () => {
    const result = buildLiveSessionTasks([
      createTask(),
      createTask({ recordId: "task-record-2", id: "TASK-2", dependsOnTaskIds: ["task-record-1"], status: "pending" }),
    ], [], [], [], "project-1");

    expect(result).toHaveLength(2);
    expect(result[0]?.status).toBe("RUNNING");
    expect(result[1]?.status).toBe("PENDING");
    expect(result[1]?.depends_on).toEqual(["TASK-1"]);
  });

  it("overlays runtime task state onto the stable task structure", () => {
    const result = buildLiveSessionTasks([
      createTask({ status: "pending" }),
    ], [
      createRuntimeTask({ status: "FAILED", session_id: "session-2", worker_branch: "feature/task-1" }),
    ], [], [], "project-1");

    expect(result[0]?.status).toBe("FAILED");
    expect(result[0]?.session_id).toBe("session-2");
    expect(result[0]?.worker_branch).toBe("feature/task-1");
  });

  it("matches runtime tasks by task key when the record id is missing", () => {
    const result = buildLiveSessionTasks([
      createTask(),
    ], [
      createRuntimeTask({ record_id: undefined, status: "CODING_COMPLETED", id: "TASK-1" }),
    ], [], [], "project-1");

    expect(result[0]?.status).toBe("CODING_COMPLETED");
  });

  it("hydrates status and session from dispatch when runtime tasks omit it", () => {
    const dispatch: ExecutionTaskDispatchSummary = {
        id: "d-1",
        projectId: "project-1",
        sprintId: "sprint-1",
        sprintRunId: "run-1",
        sprintName: "Sprint 1",
        sprintNumber: 1,
        taskId: "task-record-1",
        taskKey: "TASK-1",
        taskTitle: "Ship it",
        status: "completed",
        executorType: "cli",
        priority: 1,
        connectionId: "conn-2",
        connectionDisplayName: "Cool Conn",
        connectionRole: "primary",
    };

    const result = buildLiveSessionTasks([
        createTask({ status: "pending" })
    ], [], [dispatch], [], "project-1");

    expect(result[0]?.status).toBe("COMPLETED");
    expect(result[0]?.session_id).toBe("conn-2");
    expect(result[0]?.session_name).toBe("Cool Conn");
  });

  it("hydrates status from runtime events when runtime tasks omit it", () => {
    const event: ExecutionRuntimeEventSummary = {
        id: "e-1",
        scopeType: "task_run",
        taskRunId: "run-1",
        sprintRunId: "sprint-1",
        dispatchId: "d-1",
        projectId: "project-1",
        sprintId: "sprint-1",
        sprintName: "Sprint 1",
        sprintNumber: 1,
        sprintRunStatus: "running",
        taskId: "task-record-1",
        taskKey: "TASK-1",
        taskTitle: "Ship it",
        taskRunState: "blocked",
        eventType: "update",
    };

    const result = buildLiveSessionTasks([
        createTask({ status: "pending" })
    ], [], [], [event], "project-1");

    expect(result[0]?.status).toBe("BLOCKED");
  });

  it("hydrates status from dispatch for other status mappings", () => {
    const dispatchBase: ExecutionTaskDispatchSummary = {
        id: "d-1",
        projectId: "project-1",
        sprintId: "sprint-1",
        sprintRunId: "run-1",
        sprintName: "Sprint 1",
        sprintNumber: 1,
        taskId: "task-record-1",
        taskKey: "TASK-1",
        taskTitle: "Ship it",
        status: "queued",
        executorType: "cli",
        priority: 1,
        connectionId: null,
        connectionDisplayName: null,
        connectionRole: null,
    };

    const task = createTask({ status: "pending" });

    // queued -> PENDING
    expect(buildLiveSessionTasks([task], [], [{ ...dispatchBase, status: "queued" }], [], "project-1")[0]?.status).toBe("PENDING");

    // running -> RUNNING
    expect(buildLiveSessionTasks([task], [], [{ ...dispatchBase, status: "running" }], [], "project-1")[0]?.status).toBe("RUNNING");

    // failed -> FAILED
    expect(buildLiveSessionTasks([task], [], [{ ...dispatchBase, status: "failed" }], [], "project-1")[0]?.status).toBe("FAILED");

    // blocked -> BLOCKED
    expect(buildLiveSessionTasks([task], [], [{ ...dispatchBase, status: "blocked" }], [], "project-1")[0]?.status).toBe("BLOCKED");

    // coding_completed -> CODING_COMPLETED
    expect(buildLiveSessionTasks([task], [], [{ ...dispatchBase, status: "coding_completed" }], [], "project-1")[0]?.status).toBe("CODING_COMPLETED");
  });

  it("hydrates status from events for other status mappings", () => {
    const eventBase: ExecutionRuntimeEventSummary = {
        id: "e-1",
        scopeType: "task_run",
        taskRunId: "run-1",
        sprintRunId: "sprint-1",
        dispatchId: "d-1",
        projectId: "project-1",
        sprintId: "sprint-1",
        sprintName: "Sprint 1",
        sprintNumber: 1,
        sprintRunStatus: "running",
        taskId: "task-record-1",
        taskKey: "TASK-1",
        taskTitle: "Ship it",
        taskRunState: "running",
        eventType: "update",
    };

    const task = createTask({ status: "pending" });

    // running -> RUNNING
    expect(buildLiveSessionTasks([task], [], [], [{ ...eventBase, taskRunState: "running" }], "project-1")[0]?.status).toBe("RUNNING");

    // failed -> FAILED
    expect(buildLiveSessionTasks([task], [], [], [{ ...eventBase, taskRunState: "failed" }], "project-1")[0]?.status).toBe("FAILED");

    // blocked -> BLOCKED
    expect(buildLiveSessionTasks([task], [], [], [{ ...eventBase, taskRunState: "blocked" }], "project-1")[0]?.status).toBe("BLOCKED");

    // completed -> COMPLETED
    expect(buildLiveSessionTasks([task], [], [], [{ ...eventBase, taskRunState: "completed" }], "project-1")[0]?.status).toBe("COMPLETED");

    // coding_completed -> CODING_COMPLETED
    expect(buildLiveSessionTasks([task], [], [], [{ ...eventBase, taskRunState: "coding_completed" }], "project-1")[0]?.status).toBe("CODING_COMPLETED");
  });
});
