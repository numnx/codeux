import { describe, it, expect } from "vitest";
import {
  getTaskProgressPhase,
  getLiveTaskProgressPhase,
  isTaskCodingCompleted,
  isTaskCompleted,
} from "../../../src/domain/sprint/task-progress-utils.js";
import type { Subtask } from "../../../src/contracts/app-types.js";

describe("task-progress-utils", () => {
  describe("getTaskProgressPhase", () => {
    it("returns initial status if not RUNNING, CODING_COMPLETED, or COMPLETED", () => {
      expect(getTaskProgressPhase({ status: "PENDING" } as Subtask)).toBe("PENDING");
      expect(getTaskProgressPhase({ status: "FAILED" } as Subtask)).toBe("FAILED");
    });

    it("transitions RUNNING to CODING_COMPLETED when CI indicator present", () => {
      expect(getTaskProgressPhase({ status: "RUNNING", merge_indicator: "CI" } as Subtask)).toBe("CODING_COMPLETED");
      expect(getTaskProgressPhase({ status: "RUNNING", merge_indicator: "AUTOMERGE" } as Subtask)).toBe("CODING_COMPLETED");
    });

    it("transitions RUNNING to COMPLETED when MERGED indicator present", () => {
      expect(getTaskProgressPhase({ status: "RUNNING", merge_indicator: "MERGED" } as Subtask)).toBe("COMPLETED");
    });

    it("handles explicit CODING_COMPLETED with merge evidence and settled indicator", () => {
      const task = {
        status: "CODING_COMPLETED",
        worker_branch: "foo",
        merge_indicator: "AUTOMERGE",
      } as Subtask;
      expect(getTaskProgressPhase(task)).toBe("COMPLETED");
    });

    it("handles explicit CODING_COMPLETED without merge evidence", () => {
      const task = {
        status: "CODING_COMPLETED",
        worker_branch: "",
        pr_url: "",
      } as Subtask;
      expect(getTaskProgressPhase(task)).toBe("COMPLETED");
    });

    it("keeps CODING_COMPLETED if merge not settled and evidence exists", () => {
      const task = {
        status: "CODING_COMPLETED",
        worker_branch: "foo",
      } as Subtask;
      expect(getTaskProgressPhase(task)).toBe("CODING_COMPLETED");
    });
  });

  describe("getLiveTaskProgressPhase", () => {
    it("overrides terminal phase from dispatch status", () => {
      expect(getLiveTaskProgressPhase({
        task: { status: "PENDING" } as Subtask,
        dispatch: { status: "completed" } as any,
      })).toBe("COMPLETED");

      expect(getLiveTaskProgressPhase({
        task: { status: "PENDING" } as Subtask,
        dispatch: { status: "failed" } as any,
      })).toBe("FAILED");
    });

    it("respects runtimeTerminalPhase", () => {
      expect(getLiveTaskProgressPhase({
        task: { status: "RUNNING" } as Subtask,
        runtimeTerminalPhase: "BLOCKED",
      })).toBe("BLOCKED");
    });

    it("combines dispatch merge evidence", () => {
      expect(getLiveTaskProgressPhase({
        task: { status: "CODING_COMPLETED" } as Subtask,
        dispatch: { workerBranch: "bar" } as any,
      })).toBe("CODING_COMPLETED"); // Merge not settled
    });

    it("combines runtime merge settled flag", () => {
      expect(getLiveTaskProgressPhase({
        task: { status: "CODING_COMPLETED", worker_branch: "foo" } as Subtask,
        runtimeMergeSettled: true,
      })).toBe("COMPLETED");
    });
  });

  describe("isTaskCodingCompleted", () => {
    it("returns true for CODING_COMPLETED phase", () => {
      expect(isTaskCodingCompleted({ status: "CODING_COMPLETED", worker_branch: "foo" } as Subtask)).toBe(true);
      expect(isTaskCodingCompleted({ status: "RUNNING", merge_indicator: "CI" } as Subtask)).toBe(true);
      expect(isTaskCodingCompleted({ status: "PENDING" } as Subtask)).toBe(false);
    });
  });

  describe("isTaskCompleted", () => {
    it("returns true for COMPLETED phase", () => {
      expect(isTaskCompleted({ status: "COMPLETED" } as Subtask)).toBe(true);
      expect(isTaskCompleted({ status: "RUNNING", merge_indicator: "MERGED" } as Subtask)).toBe(true);
      expect(isTaskCompleted({ status: "CODING_COMPLETED", worker_branch: "" } as Subtask)).toBe(true);
      expect(isTaskCompleted({ status: "PENDING" } as Subtask)).toBe(false);
    });
  });
});
