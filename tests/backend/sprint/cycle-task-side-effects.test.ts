import { describe, expect, it, vi } from "vitest";
import type { Subtask } from "../../../src/contracts/app-types.js";
import {
  captureTaskCompletionMemories,
  reviewCompletedTasks,
  persistCiGateTaskStateChanges,
  captureCiFailureMemories,
  snapshotTaskState,
} from "../../../src/domain/sprint/orchestrator/cycle-task-side-effects.js";

describe("cycle-task-side-effects", () => {
  it("captures task completion memory exactly once when status changes to COMPLETED", async () => {
    const memoryService = { createMemory: vi.fn().mockResolvedValue(undefined) } as any;
    const logger = { warn: vi.fn(), info: vi.fn() } as any;

    const subtasks: Subtask[] = [{ id: "t1", title: "T", prompt: "P", status: "COMPLETED", depends_on: [], is_independent: true }];
    const preStates = new Map<string, Subtask["status"]>([["t1", "RUNNING"]]);

    await captureTaskCompletionMemories(
      subtasks,
      preStates,
      { memoryService, logger },
      { projectId: "p1", sprintId: "s1" },
      { memory: { enabled: true, autoCaptureSprint: true } }
    );

    expect(memoryService.createMemory).toHaveBeenCalledOnce();
    expect(memoryService.createMemory).toHaveBeenCalledWith("p1", expect.objectContaining({ category: "context" }));
  });

  it("does not capture task completion memory if already COMPLETED", async () => {
    const memoryService = { createMemory: vi.fn().mockResolvedValue(undefined) } as any;
    const logger = { warn: vi.fn(), info: vi.fn() } as any;

    const subtasks: Subtask[] = [{ id: "t1", title: "T", prompt: "P", status: "COMPLETED", depends_on: [], is_independent: true }];
    const preStates = new Map<string, Subtask["status"]>([["t1", "COMPLETED"]]);

    await captureTaskCompletionMemories(
      subtasks,
      preStates,
      { memoryService, logger },
      { projectId: "p1", sprintId: "s1" },
      { memory: { enabled: true, autoCaptureSprint: true } }
    );

    expect(memoryService.createMemory).not.toHaveBeenCalled();
  });

  it("persists CI gate state changes only if status or merge properties changed", () => {
    const projectManagementRepository = { updateTask: vi.fn() } as any;
    const previous = new Map([
      ["t1", { id: "t1", status: "RUNNING" as any, isMerged: false, mergeIndicator: undefined as any }],
      ["t2", { id: "t2", status: "RUNNING" as any, isMerged: false, mergeIndicator: undefined as any }]
    ]);

    const subtasks: Subtask[] = [
      { id: "t1", record_id: "rec1", status: "RUNNING", is_merged: false, depends_on: [], is_independent: true },
      { id: "t2", record_id: "rec2", status: "COMPLETED", is_merged: true, merge_indicator: "CI", depends_on: [], is_independent: true }
    ];

    persistCiGateTaskStateChanges(previous, subtasks, { projectManagementRepository });

    expect(projectManagementRepository.updateTask).toHaveBeenCalledOnce();
    expect(projectManagementRepository.updateTask).toHaveBeenCalledWith("rec2", {
      status: "completed",
      isMerged: true,
      mergeIndicator: "CI"
    });
  });

  it("captures CI failure memories only when merge_indicator newly changes to CI", async () => {
    const memoryService = { createMemory: vi.fn().mockResolvedValue(undefined) } as any;
    const logger = { warn: vi.fn(), info: vi.fn() } as any;

    const preGateStates = new Map([
      ["t1", { id: "t1", status: "RUNNING" as any, isMerged: false, mergeIndicator: "PENDING" as any }],
      ["t2", { id: "t2", status: "RUNNING" as any, isMerged: false, mergeIndicator: "CI" as any }]
    ]);

    const subtasks: Subtask[] = [
      { id: "t1", title: "T1", prompt: "P1", status: "RUNNING", is_merged: false, merge_indicator: "CI", depends_on: [], is_independent: true },
      { id: "t2", title: "T2", prompt: "P2", status: "RUNNING", is_merged: false, merge_indicator: "CI", depends_on: [], is_independent: true }
    ];

    await captureCiFailureMemories(
      subtasks,
      preGateStates,
      { memoryService, logger },
      { projectId: "p1", sprintId: "s1" },
      { memory: { enabled: true, autoCaptureSprint: true } }
    );

    expect(memoryService.createMemory).toHaveBeenCalledOnce();
  });
});
