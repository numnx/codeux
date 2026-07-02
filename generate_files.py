import os

domain_path = "src/domain/qa-review/qa-review-state-transitions.ts"
os.makedirs(os.path.dirname(domain_path), exist_ok=True)

with open(domain_path, "w") as f:
    f.write("""import type { QaReviewTriggerType } from "../../repositories/qa-review-repository.js";
import type { TaskReviewIntent } from "./task-review-outcome.js";

export function buildQaReviewStartedEventPayload(args: {
  triggerType: QaReviewTriggerType;
  runId: string;
  runIndex: number;
}) {
  return {
    triggerType: args.triggerType,
    qaReviewRunId: args.runId,
    runIndex: args.runIndex,
  };
}

export type QaReviewStateTransition = {
  qaPending: boolean;
  eventName: string;
  eventPayload: Record<string, unknown>;
};

export function determineTaskQaReviewStateTransition(args: {
  intentOutcome: TaskReviewIntent;
  triggerType: QaReviewTriggerType;
  runId: string;
  findings?: string[];
  continued?: boolean;
  continuationMode?: "none" | "attached" | "detached";
}): QaReviewStateTransition {
  if (args.intentOutcome.intent === "pass") {
    return {
      qaPending: false,
      eventName: "qa_review_passed",
      eventPayload: {
        triggerType: args.triggerType,
        summary: args.intentOutcome.summary,
        findings: args.findings ?? [],
        qaReviewRunId: args.runId,
      },
    };
  }

  if (args.intentOutcome.intent === "changes_requested") {
    return {
      qaPending: true,
      eventName: "qa_review_changes_requested",
      eventPayload: {
        triggerType: args.triggerType,
        summary: args.intentOutcome.summary,
        findings: args.findings ?? [],
        fixInstructions: args.intentOutcome.fixInstructions,
        qaReviewRunId: args.runId,
        continued: args.continued ?? false,
        continuationMode: args.continuationMode ?? "none",
      },
    };
  }

  // Handle retryable_failure and fatal_failure
  return {
    qaPending: false,
    eventName: "qa_review_failed",
    eventPayload: {
      triggerType: args.triggerType,
      error: args.intentOutcome.error.message,
      error_code: args.intentOutcome.error.code,
      qaReviewRunId: args.runId,
    },
  };
}
""")

test_path = "tests/backend/domain/qa-review/qa-review-state-transitions.test.ts"
os.makedirs(os.path.dirname(test_path), exist_ok=True)

with open(test_path, "w") as f:
    f.write("""import { describe, expect, it } from "vitest";
import {
  buildQaReviewStartedEventPayload,
  determineTaskQaReviewStateTransition,
} from "../../../../src/domain/qa-review/qa-review-state-transitions.js";
import { QaReviewError } from "../../../../src/domain/qa-review/qa-review-types.js";

describe("QA Review State Transitions", () => {
  describe("buildQaReviewStartedEventPayload", () => {
    it("should build started payload correctly", () => {
      const payload = buildQaReviewStartedEventPayload({
        triggerType: "task_completion",
        runId: "run-123",
        runIndex: 2,
      });

      expect(payload).toEqual({
        triggerType: "task_completion",
        qaReviewRunId: "run-123",
        runIndex: 2,
      });
    });
  });

  describe("determineTaskQaReviewStateTransition", () => {
    it("should handle pass intent correctly", () => {
      const transition = determineTaskQaReviewStateTransition({
        intentOutcome: { intent: "pass", summary: "Looks good" },
        triggerType: "task_completion",
        runId: "run-456",
        findings: ["Good code"],
      });

      expect(transition).toEqual({
        qaPending: false,
        eventName: "qa_review_passed",
        eventPayload: {
          triggerType: "task_completion",
          summary: "Looks good",
          findings: ["Good code"],
          qaReviewRunId: "run-456",
        },
      });
    });

    it("should handle changes_requested intent correctly", () => {
      const transition = determineTaskQaReviewStateTransition({
        intentOutcome: {
          intent: "changes_requested",
          summary: "Needs fixes",
          fixInstructions: "Fix formatting",
        },
        triggerType: "task_completion",
        runId: "run-789",
        findings: ["Bad formatting"],
        continued: true,
        continuationMode: "attached",
      });

      expect(transition).toEqual({
        qaPending: true,
        eventName: "qa_review_changes_requested",
        eventPayload: {
          triggerType: "task_completion",
          summary: "Needs fixes",
          findings: ["Bad formatting"],
          fixInstructions: "Fix formatting",
          qaReviewRunId: "run-789",
          continued: true,
          continuationMode: "attached",
        },
      });
    });

    it("should handle retryable_failure intent correctly", () => {
      const error = new QaReviewError("API_TIMEOUT", "Timed out", true);
      const transition = determineTaskQaReviewStateTransition({
        intentOutcome: { intent: "retryable_failure", error },
        triggerType: "task_completion",
        runId: "run-000",
      });

      expect(transition).toEqual({
        qaPending: false,
        eventName: "qa_review_failed",
        eventPayload: {
          triggerType: "task_completion",
          error: "Timed out",
          error_code: "API_TIMEOUT",
          qaReviewRunId: "run-000",
        },
      });
    });

    it("should handle fatal_failure intent correctly", () => {
      const error = new QaReviewError("PARSE_FAILURE", "Bad response", false);
      const transition = determineTaskQaReviewStateTransition({
        intentOutcome: { intent: "fatal_failure", error },
        triggerType: "task_completion",
        runId: "run-999",
      });

      expect(transition).toEqual({
        qaPending: false,
        eventName: "qa_review_failed",
        eventPayload: {
          triggerType: "task_completion",
          error: "Bad response",
          error_code: "PARSE_FAILURE",
          qaReviewRunId: "run-999",
        },
      });
    });
  });
});
""")

print("Files generated.")
