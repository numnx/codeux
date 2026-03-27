import { describe, expect, it } from "vitest";
import { buildLiveSessionProjection, type LiveSessionProjection } from "../../../dashboard/src/v2/lib/live-session-projection.js";
import type { DashboardStatus, ExecutionDashboardSnapshot } from "../../../dashboard/src/types.js";
import type { Task } from "../../../dashboard/src/v2/types.js";

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

function createStatus(overrides: Partial<DashboardStatus> = {}): DashboardStatus {
  return {
    project_id: "project-1",
    sprint_id: "sprint-1",
    sprint_number: 1,
    source_id: null,
    repo_path: "/repo",
    feature_branch: null,
    subtasks: [],
    reportText: "",
    statusTable: "",
    instructions: "",
    timestamp: null,
    ...overrides,
  };
}

function createExecution(overrides: Partial<ExecutionDashboardSnapshot> = {}): ExecutionDashboardSnapshot {
  return {
    projectId: "project-1",
    projectName: "Project 1",
    sprintRuns: [],
    taskDispatches: [],
    connections: [],
    primaryAssignedWorker: null,
    overflowAssignedWorkers: [],
    attentionItems: [],
    recentEvents: [],
    updatedAt: null,
    ...overrides,
  };
}

function createProjection(overrides: Partial<LiveSessionProjection> = {}): LiveSessionProjection {
  return {
    projectId: "project-1",
    sprintId: "sprint-1",
    tasks: [],
    dispatches: [],
    sprintRuns: [],
    recentEvents: [],
    statsInputs: null,
    reportText: "",
    instructions: "",
    runtimeFlags: {
      liveSprintRun: null,
      pausedInterventionRun: null,
      hasActiveSprint: false,
      hasSprintContext: false,
    },
    ...overrides,
  };
}

describe("live-session-projection", () => {
  it("builds an initial projection from empty state", () => {
    const tasks = [createTask()];
    const status = createStatus();
    const execution = createExecution();

    const projection = buildLiveSessionProjection(
      "project-1",
      "sprint-1",
      tasks,
      status,
      execution,
      null,
    );

    expect(projection.projectId).toBe("project-1");
    expect(projection.sprintId).toBe("sprint-1");
    expect(projection.tasks).toHaveLength(1);
    expect(projection.tasks[0]?.id).toBe("TASK-1");
    expect(projection.tasks[0]?.status).toBe("RUNNING"); // Mapped from in_progress
  });

  it("overlays sparse runtime status over static tasks", () => {
    const tasks = [createTask()];
    const status = createStatus({
      subtasks: [
        {
          id: "TASK-1",
          record_id: "task-record-1",
          title: "Ship it",
          prompt: "Do the work",
          depends_on: [],
          status: "FAILED", // Status is FAILED at runtime
          is_independent: true,
          session_id: "session-abc",
        },
      ],
    });
    const execution = createExecution();

    const projection = buildLiveSessionProjection(
      "project-1",
      "sprint-1",
      tasks,
      status,
      execution,
      null,
    );

    expect(projection.tasks[0]?.status).toBe("FAILED");
    expect(projection.tasks[0]?.session_id).toBe("session-abc");
  });

  it("filters execution dispatches and runs by sprint scope", () => {
    const tasks = [createTask()];
    const status = createStatus();
    const execution = createExecution({
      sprintRuns: [
        { id: "run-1", projectId: "project-1", sprintId: "sprint-1", sprintName: "Sprint 1", sprintNumber: 1, status: "completed", triggerType: "manual", triggeredBy: null, executorMode: "mixed", startedAt: null, finishedAt: null, lastHeartbeatAt: null, createdAt: "", activeLeaseOwnerKey: null, activeLeaseExpiresAt: null, humanIntervention: null },
        { id: "run-2", projectId: "project-1", sprintId: "sprint-2", sprintName: "Sprint 2", sprintNumber: 2, status: "completed", triggerType: "manual", triggeredBy: null, executorMode: "mixed", startedAt: null, finishedAt: null, lastHeartbeatAt: null, createdAt: "", activeLeaseOwnerKey: null, activeLeaseExpiresAt: null, humanIntervention: null },
      ],
      taskDispatches: [
        { id: "dispatch-1", projectId: "project-1", sprintId: "sprint-1", sprintRunId: "run-1", sprintName: "Sprint 1", sprintNumber: 1, taskId: "TASK-1", taskKey: "TASK-1", taskTitle: "Ship it", status: "completed", executorType: "docker_cli", priority: 1, connectionId: null, connectionDisplayName: null, connectionRole: null },
        { id: "dispatch-2", projectId: "project-1", sprintId: "sprint-2", sprintRunId: "run-2", sprintName: "Sprint 2", sprintNumber: 2, taskId: "TASK-2", taskKey: "TASK-2", taskTitle: "Other task", status: "completed", executorType: "docker_cli", priority: 1, connectionId: null, connectionDisplayName: null, connectionRole: null },
      ],
    });

    const projection = buildLiveSessionProjection(
      "project-1",
      "sprint-1", // We only want sprint-1
      tasks,
      status,
      execution,
      null,
    );

    expect(projection.sprintRuns).toHaveLength(1);
    expect(projection.sprintRuns[0]?.id).toBe("run-1");

    expect(projection.dispatches).toHaveLength(1);
    expect(projection.dispatches[0]?.id).toBe("dispatch-1");
  });

  it("resets state and does not use previous projection when project changes", () => {
    const tasks = [createTask()];
    const status = createStatus({ subtasks: [] });
    const execution = createExecution();
    const previous = createProjection({
      projectId: "project-OLD",
      tasks: [
        {
          id: "TASK-OLD",
          record_id: "old-record",
          title: "Old",
          prompt: "old",
          depends_on: [],
          status: "COMPLETED",
          is_independent: true,
        },
      ],
      reportText: "Old report text",
    });

    // We simulate an active sprint to trigger the "sparse payload" fallback logic,
    // to ensure it DOES NOT fire if the project ID changed.
    const activeExecution = createExecution({
      sprintRuns: [{
          id: "run-1",
          projectId: "project-1",
          sprintId: "sprint-1",
          sprintName: "Sprint 1",
          sprintNumber: 1,
          status: "running",
          triggerType: "manual",
          triggeredBy: null,
          executorMode: "mixed",
          startedAt: "",
          finishedAt: null,
          lastHeartbeatAt: null,
          createdAt: "",
          activeLeaseOwnerKey: null,
          activeLeaseExpiresAt: null,
          humanIntervention: null,
      }],
    });

    const projection = buildLiveSessionProjection(
      "project-1",
      "sprint-1",
      tasks,
      status,
      activeExecution,
      previous,
    );

    expect(projection.projectId).toBe("project-1");
    // Since scope changed, we shouldn't fallback to "Old report text" or old tasks
    expect(projection.reportText).toBe("");
    expect(projection.tasks).toHaveLength(1);
    expect(projection.tasks[0]?.id).toBe("TASK-1");
  });

  it("resets state and does not use previous projection when sprint scope changes", () => {
    const tasks = [createTask()];
    const status = createStatus({ subtasks: [] });
    const previous = createProjection({
      projectId: "project-1",
      sprintId: "sprint-OLD",
      tasks: [
        {
          id: "TASK-OLD",
          record_id: "old-record",
          title: "Old",
          prompt: "old",
          depends_on: [],
          status: "COMPLETED",
          is_independent: true,
        },
      ],
      reportText: "Old report text",
    });

    const activeExecution = createExecution({
      sprintRuns: [{
          id: "run-1",
          projectId: "project-1",
          sprintId: "sprint-1",
          sprintName: "Sprint 1",
          sprintNumber: 1,
          status: "running",
          triggerType: "manual",
          triggeredBy: null,
          executorMode: "mixed",
          startedAt: "",
          finishedAt: null,
          lastHeartbeatAt: null,
          createdAt: "",
          activeLeaseOwnerKey: null,
          activeLeaseExpiresAt: null,
          humanIntervention: null,
      }],
    });

    const projection = buildLiveSessionProjection(
      "project-1",
      "sprint-1",
      tasks,
      status,
      activeExecution,
      previous,
    );

    expect(projection.sprintId).toBe("sprint-1");
    expect(projection.reportText).toBe("");
  });

  it("retains previous status tasks and text during transient sparse updates in active sprint", () => {
    const tasks = [createTask()];

    // Status arrives empty
    const status = createStatus({
      subtasks: [],
      reportText: "",
      instructions: "",
    });

    // But we have a running sprint
    const execution = createExecution({
      sprintRuns: [{
          id: "run-1",
          projectId: "project-1",
          sprintId: "sprint-1",
          sprintName: "Sprint 1",
          sprintNumber: 1,
          status: "running",
          triggerType: "manual",
          triggeredBy: null,
          executorMode: "mixed",
          startedAt: "",
          finishedAt: null,
          lastHeartbeatAt: null,
          createdAt: "",
          activeLeaseOwnerKey: null,
          activeLeaseExpiresAt: null,
          humanIntervention: null,
      }],
    });

    const previous = createProjection({
      projectId: "project-1",
      sprintId: "sprint-1",
      tasks: [
        {
          id: "TASK-1",
          record_id: "task-record-1",
          title: "Ship it",
          prompt: "Do the work",
          depends_on: [],
          status: "RUNNING",
          session_id: "session-abc",
          is_independent: true,
        },
      ],
      reportText: "We are making progress",
      instructions: "Keep going",
    });

    const projection = buildLiveSessionProjection(
      "project-1",
      "sprint-1",
      tasks,
      status,
      execution,
      previous,
    );

    // It should have retained the previous projection's state
    expect(projection.reportText).toBe("We are making progress");
    expect(projection.instructions).toBe("Keep going");

    // And it uses the previous projection's tasks as the overlay!
    expect(projection.tasks).toHaveLength(1);
    expect(projection.tasks[0]?.status).toBe("RUNNING");
    expect(projection.tasks[0]?.session_id).toBe("session-abc");
  });

});
