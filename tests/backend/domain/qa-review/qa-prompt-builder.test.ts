import { describe, it, expect } from "vitest";
import { triggerReviewModeDescription, renderActivityExcerpt, buildQaReviewPrompt } from "../../../../src/domain/qa-review/qa-prompt-builder.js";
import type { Subtask } from "../../../../src/contracts/app-types.js";

describe("QaPromptBuilder", () => {
  describe("triggerReviewModeDescription", () => {
    it("should return correct description for completed_task_without_pr", () => {
      expect(triggerReviewModeDescription("completed_task_without_pr")).toContain("Review a completed task with no PR");
    });
    it("should return correct description for sprint_completion", () => {
      expect(triggerReviewModeDescription("sprint_completion")).toContain("Review the full sprint");
    });
    it("should return correct description for task_completion", () => {
      expect(triggerReviewModeDescription("task_completion")).toContain("Review a completed task for correctness");
    });
  });

  describe("renderActivityExcerpt", () => {
    it("should handle empty activities", () => {
      expect(renderActivityExcerpt({ activities: [] } as any)).toBe("- No recent activity captured.");
    });
    it("should render agentMessaged", () => {
      expect(renderActivityExcerpt({ activities: [{ agentMessaged: { agentMessage: "agent test" } }] } as any)).toBe("- agent test");
    });
    it("should render userMessaged", () => {
      expect(renderActivityExcerpt({ activities: [{ userMessaged: { userMessage: "user test" } }] } as any)).toBe("- user test");
    });
    it("should render progressUpdated", () => {
      expect(renderActivityExcerpt({ activities: [{ progressUpdated: { description: "progress test" } }] } as any)).toBe("- progress test");
    });
    it("should render description", () => {
      expect(renderActivityExcerpt({ activities: [{ description: "desc test" }] } as any)).toBe("- desc test");
    });
    it("should fallback to 'No summary'", () => {
      expect(renderActivityExcerpt({ activities: [{}] } as any)).toBe("- No summary");
    });
  });

  describe("buildQaReviewPrompt", () => {
    const baseSubtask: Subtask = {
      id: "T01",
      title: "Test Task",
      prompt: "Test prompt",
      status: "COMPLETED",
      provider: "test_provider",
      depends_on: [],
      is_independent: true,
      worker_branch: "test-branch",
      pr_url: "http://pr",
      activities: []
    };

    it("should build prompt with currentTask", () => {
      const prompt = buildQaReviewPrompt({
        triggerType: "task_completion",
        projectName: "Test Project",
        sprintGoal: "Test Goal",
        agentInstructions: "Agent Instructions",
        subtasks: [baseSubtask],
        currentTask: baseSubtask,
      });

      expect(prompt).toContain("## QUALITY ASSURANCE AGENT INSTRUCTIONS\nAgent Instructions");
      expect(prompt).toContain("## PROJECT CONTEXT\nProject: Test Project\nSprint goal: Test Goal");
      expect(prompt).toContain("## CURRENT TASK UNDER REVIEW\nTask key: T01");
      expect(prompt).toContain("## REQUIRED OUTPUT");
    });

    it("should build prompt without currentTask", () => {
      const prompt = buildQaReviewPrompt({
        triggerType: "sprint_completion",
        projectName: "Test Project",
        sprintGoal: "Test Goal",
        agentInstructions: "Agent Instructions",
        subtasks: [baseSubtask],
        currentTask: null,
      });

      expect(prompt).toContain("## CURRENT TASK\nNo single task is preselected.");
    });
  });
});
