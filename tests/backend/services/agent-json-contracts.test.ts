import { describe, it, expect } from "vitest";
import {
  normalizePlannedSprintPayload,
  normalizeQaReviewResult,
  normalizePriority,
  normalizeExecutor,
  parseJsonReply,
  normalizeFollowUpTask
} from "../../../src/services/agent-json-contracts.js";

describe("agent-json-contracts", () => {
  describe("normalizePlannedSprintPayload", () => {
    it("should parse valid planning payload with task array", () => {
      const payload = normalizePlannedSprintPayload(JSON.stringify({
        goal: "Test goal",
        tasks: [
          { key: "T01", title: "Task 1", description: "Desc 1", promptMarkdown: "Prompt 1", priority: "high", executorType: "auto", dependsOn: [] }
        ]
      }));
      expect(payload.goal).toBe("Test goal");
      expect(payload.tasks).toHaveLength(1);
      expect(payload.tasks[0]?.title).toBe("Task 1");
    });

    it("should throw error for duplicate keys", () => {
      expect(() => normalizePlannedSprintPayload(JSON.stringify({
        tasks: [
          { key: "T01", title: "Task 1", description: "Desc 1", promptMarkdown: "Prompt 1" },
          { key: "T01", title: "Task 2", description: "Desc 2", promptMarkdown: "Prompt 2" }
        ]
      }))).toThrow(/duplicate task key/);
    });

    it("should handle missing required strings", () => {
      expect(() => normalizePlannedSprintPayload(JSON.stringify({
        tasks: [
          { key: "T01", title: "", description: "Desc 1", promptMarkdown: "Prompt 1" }
        ]
      }))).toThrow(/incomplete task/);

      expect(() => normalizePlannedSprintPayload(JSON.stringify({
        tasks: [
          { key: "T01", title: "Task 1", description: "Desc 1", promptMarkdown: "" }
        ]
      }))).toThrow(/incomplete task/);
    });

    it("should handle aliases for arrays", () => {
      const payload = normalizePlannedSprintPayload(JSON.stringify({
        subtasks: [
          { id: "T01", name: "Task 1", instructions: "Prompt 1", dependencies: ["T02"] }
        ]
      }));
      expect(payload.tasks).toHaveLength(1);
      expect(payload.tasks[0]?.key).toBe("T01");
      expect(payload.tasks[0]?.title).toBe("Task 1");
      expect(payload.tasks[0]?.promptMarkdown).toBe("Prompt 1");
      expect(payload.tasks[0]?.dependsOn).toEqual(["T02"]);
    });

    it("should throw error for no tasks", () => {
      expect(() => normalizePlannedSprintPayload(JSON.stringify({
        goal: "Test goal",
        tasks: []
      }))).toThrow(/did not include any tasks/);
    });
  });

  describe("normalizeQaReviewResult", () => {
    it("should parse valid QA review payload", () => {
      const payload = normalizeQaReviewResult(JSON.stringify({
        verdict: "pass",
        summary: "Good job",
        findings: ["Finding 1"],
        followUpTasks: []
      }));
      expect(payload.verdict).toBe("pass");
      expect(payload.summary).toBe("Good job");
      expect(payload.findings).toEqual(["Finding 1"]);
    });

    it("should throw error for invalid verdict", () => {
      expect(() => normalizeQaReviewResult(JSON.stringify({
        verdict: "maybe",
        summary: "Good job"
      }))).toThrow(/invalid 'verdict'/);
    });

    it("should throw error for missing summary", () => {
      expect(() => normalizeQaReviewResult(JSON.stringify({
        verdict: "pass"
      }))).toThrow(/invalid 'summary'/);
    });

    it("should ignore malformed follow-up tasks", () => {
      const payload = normalizeQaReviewResult(JSON.stringify({
        verdict: "pass",
        summary: "Good job",
        followUpTasks: [
          { title: "Task 1" }, // missing promptMarkdown
          { promptMarkdown: "Prompt 1" }, // missing title
          { title: "Task 2", promptMarkdown: "Prompt 2" } // valid
        ]
      }));
      expect(payload.followUpTasks).toHaveLength(1);
      expect(payload.followUpTasks[0]?.title).toBe("Task 2");
    });

    it("should fallback to aliases for follow-up tasks", () => {
      const payload = normalizeQaReviewResult(JSON.stringify({
        verdict: "pass",
        summary: "Good job",
        followUpTasks: [
          { title: "Task 1", prompt: "Prompt 1", dependsOnTaskKeys: ["T01"] }
        ]
      }));
      expect(payload.followUpTasks).toHaveLength(1);
      expect(payload.followUpTasks[0]?.promptMarkdown).toBe("Prompt 1");
      expect(payload.followUpTasks[0]?.dependsOnTaskKeys).toEqual(["T01"]);
    });
  });

  describe("parseJsonReply", () => {
    it("should parse valid JSON", () => {
      expect(parseJsonReply('{"test": true}')).toEqual({ test: true });
    });

    it("should throw error for malformed JSON", () => {
      expect(() => parseJsonReply('{test: true}')).toThrow(/not valid JSON/);
    });
  });

  describe("normalizePriority and normalizeExecutor", () => {
    it("normalizePriority should handle inputs", () => {
      expect(normalizePriority("high")).toBe("high");
      expect(normalizePriority("UNKNOWN")).toBe("medium");
      expect(normalizePriority("")).toBe("medium");
    });

    it("normalizeExecutor should handle inputs", () => {
      expect(normalizeExecutor("mcp_worker")).toBe("mcp_worker");
      expect(normalizeExecutor("UNKNOWN")).toBe("auto");
      expect(normalizeExecutor("")).toBe("auto");
    });
  });
});
