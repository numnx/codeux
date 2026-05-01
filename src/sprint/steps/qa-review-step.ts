import type { QaReviewRunner, QaReviewRunnerArgs, QaReviewRunnerOutcome } from "../../domain/qa-review/qa-review-runner.js";
import type { QaReviewState } from "../../domain/qa-review/qa-review-state.js";
import type { QaReviewRunRecord } from "../../repositories/qa-review-repository.js";

export interface QaReviewStepDependencies {
  qaReviewRunner: QaReviewRunner;
  qaReviewState: QaReviewState;
}

export class QaReviewStep {
  constructor(private readonly deps: QaReviewStepDependencies) {}

  async executeReview(args: QaReviewRunnerArgs): Promise<QaReviewRunnerOutcome> {
    const outcome = await this.deps.qaReviewRunner.runQaReview(args);

    if (outcome.status === "success") {
      this.deps.qaReviewState.markQaReviewSuccess(args.runRecord, outcome);
    } else {
      this.deps.qaReviewState.markQaReviewFailed(args.runRecord, outcome);
    }

    return outcome;
  }
}
