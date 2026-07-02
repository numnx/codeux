import type { QaReviewTriggerType } from "../../repositories/qa-review-repository.js";
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
  continuationMode?: "none" | "attached" | "detached" | "jules" | "cli";
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
