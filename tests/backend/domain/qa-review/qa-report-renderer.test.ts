import { describe, it, expect } from "vitest";
import {
  renderQaPassReport,
  renderQaChangesRequestedReport,
  renderQaReviewFailedReport,
  renderSprintQaPassReport,
  renderSprintQaChangesRequestedReport,
  renderSprintQaPendingReport,
  renderSprintQaFailedReport,
  buildSprintQaSnapshot,
  readSprintQaSnapshot
} from "../../../../src/domain/qa-review/qa-report-renderer.js";

describe("QaReportRenderer", () => {
  describe("renderQaPassReport", () => {
    it("should render correct string", () => {
      expect(renderQaPassReport("T01", "LGTM")).toBe("\nQA passed for `T01`: LGTM\n");
    });
  });

  describe("renderQaChangesRequestedReport", () => {
    it("should render with continued", () => {
      expect(renderQaChangesRequestedReport("T01", "Fix it", true)).toBe("\nQA requested follow-up for `T01` and resumed the task session: Fix it\n");
    });
    it("should render without continued", () => {
      expect(renderQaChangesRequestedReport("T01", "Fix it", false)).toBe("\nQA requested follow-up for `T01`: Fix it\n");
    });
  });

  describe("renderQaReviewFailedReport", () => {
    it("should render error message for Error instance", () => {
      expect(renderQaReviewFailedReport("T01", new Error("Network Error"))).toBe("\nQA review failed for `T01` and must retry before merge: Network Error\n");
    });
    it("should render stringified error for non-Error", () => {
      expect(renderQaReviewFailedReport("T01", "Unknown Error")).toBe("\nQA review failed for `T01` and must retry before merge: Unknown Error\n");
    });
  });

  describe("renderSprintQaPassReport", () => {
    it("should render correct string", () => {
      expect(renderSprintQaPassReport("All Good")).toBe("\nSprint QA passed: All Good\n");
    });
  });

  describe("renderSprintQaChangesRequestedReport", () => {
    it("should render with targetTaskKey, continued, and createdTasks", () => {
      expect(renderSprintQaChangesRequestedReport("Fix sprint", "T01", true, ["T02", "T03"]))
        .toBe("\nSprint QA requested follow-up and resumed the selected task session. Target task: `T01`. Created follow-up tasks: `T02`, `T03`. Fix sprint\n");
    });
    it("should render without targetTaskKey, not continued, no tasks", () => {
      expect(renderSprintQaChangesRequestedReport("Fix sprint", null, false, []))
        .toBe("\nSprint QA requested follow-up. Fix sprint\n");
    });
  });

  describe("renderSprintQaPendingReport", () => {
    it("should render for running state", () => {
      expect(renderSprintQaPendingReport({ status: "running" } as any)).toContain("Sprint QA is still running.");
    });
    it("should render for changes_requested outcome with summary", () => {
      expect(renderSprintQaPendingReport({ status: "completed", outcome: "changes_requested", summaryMarkdown: "Some changes" } as any))
        .toBe("\nSprint QA is still waiting on follow-up work before merge. Some changes\n");
    });
    it("should render for changes_requested outcome without summary", () => {
      expect(renderSprintQaPendingReport({ status: "completed", outcome: "changes_requested" } as any))
        .toBe("\nSprint QA is still waiting on follow-up work before merge.\n");
    });
    it("should render for default state with summary", () => {
      expect(renderSprintQaPendingReport({ status: "completed", outcome: "pass", summaryMarkdown: "Retrying" } as any))
        .toBe("\nSprint QA must be retried before merge. Retrying\n");
    });
    it("should render for default state without summary", () => {
      expect(renderSprintQaPendingReport({ status: "completed", outcome: "pass" } as any))
        .toBe("\nSprint QA must be retried before merge.\n");
    });
  });

  describe("renderSprintQaFailedReport", () => {
    it("should render error message for Error instance", () => {
      expect(renderSprintQaFailedReport(new Error("Fail"))).toBe("\nSprint QA failed and blocked merge: Fail\n");
    });
    it("should render stringified error for non-Error", () => {
      expect(renderSprintQaFailedReport("Bad Error")).toBe("\nSprint QA failed and blocked merge: Bad Error\n");
    });
  });

  describe("buildSprintQaSnapshot", () => {
    it("should build correct JSON string", () => {
      const result = buildSprintQaSnapshot([{ id: "T02", depends_on: ["T01"] } as any, { id: "T01", depends_on: [] } as any]);
      expect(JSON.parse(result)).toEqual([
        { id: "T01", title: "", prompt: "", status: "", dependsOn: [], isMerged: false, mergeIndicator: "" },
        { id: "T02", title: "", prompt: "", status: "", dependsOn: ["T01"], isMerged: false, mergeIndicator: "" }
      ]);
    });
  });

  describe("readSprintQaSnapshot", () => {
    it("should read valid snapshot string", () => {
      expect(readSprintQaSnapshot({ payload: { taskSnapshot: "my snapshot" } } as any)).toBe("my snapshot");
    });
    it("should return null if not string", () => {
      expect(readSprintQaSnapshot({ payload: { taskSnapshot: 123 } } as any)).toBeNull();
    });
    it("should return null if missing", () => {
      expect(readSprintQaSnapshot({} as any)).toBeNull();
      expect(readSprintQaSnapshot(null)).toBeNull();
    });
  });
});
