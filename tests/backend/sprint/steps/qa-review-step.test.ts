import { describe, it, expect, vi, beforeEach } from "vitest";
import { QaReviewStep } from "../../../../src/sprint/steps/qa-review-step.js";
import type { QaReviewRunner, QaReviewRunnerOutcome } from "../../../../src/domain/qa-review/qa-review-runner.js";
import type { QaReviewState } from "../../../../src/domain/qa-review/qa-review-state.js";
import type { QaReviewRunRecord } from "../../../../src/repositories/qa-review-repository.js";

describe("QaReviewStep", () => {
  let qaReviewRunner: ReturnType<typeof vi.mocked<QaReviewRunner>>;
  let qaReviewState: ReturnType<typeof vi.mocked<QaReviewState>>;
  let step: QaReviewStep;

  beforeEach(() => {
    qaReviewRunner = {
      runQaReview: vi.fn(),
    } as unknown as ReturnType<typeof vi.mocked<QaReviewRunner>>;

    qaReviewState = {
      markQaReviewSuccess: vi.fn(),
      markQaReviewFailed: vi.fn(),
    } as unknown as ReturnType<typeof vi.mocked<QaReviewState>>;

    step = new QaReviewStep({
      qaReviewRunner,
      qaReviewState,
    });
  });

  const mockRunRecord = { id: "run-1" } as QaReviewRunRecord;
  const mockArgs = {
    projectId: "proj-1",
    sprintId: "sprint-1",
    taskId: "task-1",
    provider: "openai" as any,
    model: "gpt-4",
    apiKey: "key",
    providerPrompt: "test",
    repoPath: null,
    settings: {},
    agentInstructions: "",
    runRecord: mockRunRecord,
    parseFn: vi.fn(),
  };

  it("should delegate to QaReviewState.markQaReviewSuccess on success outcome", async () => {
    const successOutcome: QaReviewRunnerOutcome = {
      status: "success",
      review: { verdict: "pass", summary: "ok" } as any,
    };
    qaReviewRunner.runQaReview.mockResolvedValueOnce(successOutcome);

    const result = await step.executeReview(mockArgs);

    expect(result).toBe(successOutcome);
    expect(qaReviewState.markQaReviewSuccess).toHaveBeenCalledWith(mockRunRecord, successOutcome);
    expect(qaReviewState.markQaReviewFailed).not.toHaveBeenCalled();
  });

  it("should delegate to QaReviewState.markQaReviewFailed on errored outcome", async () => {
    const errorOutcome: QaReviewRunnerOutcome = {
      status: "error",
      reason: "parse_failure",
      message: "JSON error",
      error: new Error("JSON error"),
    };
    qaReviewRunner.runQaReview.mockResolvedValueOnce(errorOutcome);

    const result = await step.executeReview(mockArgs);

    expect(result).toBe(errorOutcome);
    expect(qaReviewState.markQaReviewFailed).toHaveBeenCalledWith(mockRunRecord, errorOutcome);
    expect(qaReviewState.markQaReviewSuccess).not.toHaveBeenCalled();
  });
});
