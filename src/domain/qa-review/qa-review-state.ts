import type { QaReviewRepository, QaReviewRunRecord } from "../../repositories/qa-review-repository.js";
import type { QaReviewRunnerOutcome } from "./qa-review-runner.js";

export interface QaReviewStateDependencies {
  qaReviewRepository: QaReviewRepository;
}

export class QaReviewState {
  constructor(private readonly deps: QaReviewStateDependencies) {}

  markQaReviewSuccess(run: QaReviewRunRecord, outcome: Extract<QaReviewRunnerOutcome, { status: "success" }>, options?: { taskSnapshot?: string; overrideVerdict?: "pass" | "changes_requested"; overrideFixInstructions?: string | null; extraPayload?: Record<string, unknown> }): QaReviewRunRecord {
    return this.deps.qaReviewRepository.updateRun(run.id, {
      status: "completed",
      outcome: options?.overrideVerdict || outcome.review.verdict,
      summaryMarkdown: outcome.review.summary,
      fixInstructions: options?.overrideFixInstructions !== undefined ? options.overrideFixInstructions : outcome.review.fixInstructions,
      targetTaskKey: outcome.review.targetTaskKey,
      payload: {
        ...outcome.review.raw,
        taskSnapshot: options?.taskSnapshot,
        ...options?.extraPayload,
      },
      finishedAt: new Date().toISOString(),
    });
  }

  markQaReviewFailed(run: QaReviewRunRecord, outcome: Extract<QaReviewRunnerOutcome, { status: "error" }>): QaReviewRunRecord {
    return this.deps.qaReviewRepository.updateRun(run.id, {
      status: "errored",
      summaryMarkdown: outcome.error.message,
      payload: {
        error_reason: outcome.error.code,
        error_code: outcome.error.code,
        errorMessage: outcome.error.message,
      },
      finishedAt: new Date().toISOString(),
    });
  }
}
