import { describe, expect, it } from "vitest";
import type { ExecutionDashboardSnapshot, Source, Sprint, TaskRecord } from "../../../dashboard/src/v2/types.js";
import {
  areExecutionSnapshotsEqual,
  areProjectListsEqual,
  areSprintListsEqual,
  areTaskRecordListsEqual,
  shouldUseForegroundLoading,
} from "../../../dashboard/src/v2/hooks/project-resource-utils.js";

function createTaskRecord(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "task-1",
    projectId: "project-1",
    sprintId: "sprint-1",
    taskKey: "T01",
    title: "Implement flow",
    promptMarkdown: "Do the thing",
    description: "desc",
    status: "pending",
    priority: "medium",
    executorType: "auto",
    sortOrder: 0,
    dependsOnTaskIds: [],
    isIndependent: true,
    isMerged: false,
    mergeIndicator: null,
    sourceType: null,
    sourcePath: null,
    createdAt: "2026-03-10T00:00:00.000Z",
    updatedAt: "2026-03-10T00:00:00.000Z",
    ...overrides,
  };
}

function createSprint(overrides: Partial<Sprint> = {}): Sprint {
  return {
    id: "sprint-1",
    projectId: "project-1",
    number: 1,
    slug: "sprint-1",
    name: "Sprint 1",
    goal: "Ship it",
    status: "idle",
    startDate: null,
    endDate: null,
    featureBranch: null,
    tasksCount: 1,
    completion: 0,
    createdAt: "2026-03-10T00:00:00.000Z",
    updatedAt: "2026-03-10T00:00:00.000Z",
    date: "Schedule TBD",
    ...overrides,
  };
}

describe("project-resource-utils", () => {
  it("only uses foreground loading for first non-silent fetches", () => {
    expect(shouldUseForegroundLoading(false, false)).toBe(true);
    expect(shouldUseForegroundLoading(true, false)).toBe(false);
    expect(shouldUseForegroundLoading(false, true)).toBe(false);
  });

  it("treats identical task record payloads as equal", () => {
    const current = [createTaskRecord({ dependsOnTaskIds: ["task-0"] })];
    const next = [createTaskRecord({ dependsOnTaskIds: ["task-0"] })];

    expect(areTaskRecordListsEqual(current, next)).toBe(true);
  });

  it("detects meaningful task record changes", () => {
    const current = [createTaskRecord()];
    const next = [createTaskRecord({ updatedAt: "2026-03-10T00:00:01.000Z" })];

    expect(areTaskRecordListsEqual(current, next)).toBe(false);
  });

  it("treats identical sprint payloads as equal", () => {
    const current = [createSprint()];
    const next = [createSprint()];

    expect(areSprintListsEqual(current, next)).toBe(true);
  });

  it("detects sprint status changes", () => {
    const current = [createSprint({ status: "idle" })];
    const next = [createSprint({ status: "running" })];

    expect(areSprintListsEqual(current, next)).toBe(false);
  });
});


describe("areExecutionSnapshotsEqual", () => {
  const baseSnapshot: ExecutionDashboardSnapshot = {
    projectId: "proj-1",
    projectName: "Project 1",
    sprintRuns: [],
    taskDispatches: [],
    connections: [],
    primaryAssignedWorker: null,
    overflowAssignedWorkers: [],
    attentionItems: [],
    recentEvents: [],
    updatedAt: "2026-03-10T00:00:00.000Z",
  };

  it("treats identical snapshots as equal", () => {
    expect(areExecutionSnapshotsEqual(baseSnapshot, { ...baseSnapshot })).toBe(true);
  });

  it("detects changes in updatedAt", () => {
    const nextSnapshot = { ...baseSnapshot, updatedAt: "2026-03-10T00:00:01.000Z" };
    expect(areExecutionSnapshotsEqual(baseSnapshot, nextSnapshot)).toBe(false);
  });
});

describe("areProjectListsEqual", () => {
  const baseProject: Source = {
    id: "proj-1",
    slug: "proj-1",
    name: "Project 1",
    baseDir: "/path",
    repoUrl: null,
    sourceType: "local",
    sourceRef: "main",
    defaultBranch: "main",
    featureBranchPrefix: null,
    status: "active",
    sprintsCount: 1,
    openTasks: 5,
    completedTasks: 10,
    isRunning: false,
    createdAt: "2026-03-10T00:00:00.000Z",
    updatedAt: "2026-03-10T00:00:00.000Z",
  };

  it("treats identical project lists as equal", () => {
    expect(areProjectListsEqual([baseProject], [{ ...baseProject }])).toBe(true);
  });

  it("detects changes in project status or stats", () => {
    const nextProject = { ...baseProject, status: "archived" as any };
    expect(areProjectListsEqual([baseProject], [nextProject])).toBe(false);

    const nextProjectStats = { ...baseProject, openTasks: 6 };
    expect(areProjectListsEqual([baseProject], [nextProjectStats])).toBe(false);
  });
});
