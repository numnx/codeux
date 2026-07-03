1. **Create `src/domain/qa-review/qa-review-state-transitions.ts`**
   - Provide the complete code for `buildQaReviewStartedEventPayload` and `determineTaskQaReviewStateTransition`. I have already created this file via a script during the exploration phase and will verify it in Step 2.

2. **Verify creation of `src/domain/qa-review/qa-review-state-transitions.ts`**
   - Run `cat src/domain/qa-review/qa-review-state-transitions.ts` to verify the file was created correctly.

3. **Update `src/services/quality-assurance-service.ts`**
   - Import the new helpers: `buildQaReviewStartedEventPayload`, `determineTaskQaReviewStateTransition`.
   - Use `buildQaReviewStartedEventPayload` and `determineTaskQaReviewStateTransition` to prepare payloads for `appendTaskEvent` and `setTaskQaPending`. Explicit replace diff:
```
<<<<<<< SEARCH
import { resolveReviewBranch } from "../domain/qa-review/qa-review-branch-resolution.js";
=======
import { resolveReviewBranch } from "../domain/qa-review/qa-review-branch-resolution.js";
import { buildQaReviewStartedEventPayload, determineTaskQaReviewStateTransition } from "../domain/qa-review/qa-review-state-transitions.js";
>>>>>>> REPLACE
```
```
<<<<<<< SEARCH
    // Signal that the task has entered the QA stage so the live view advances
    // from coding-completed → QA and starts timing the review immediately
    // (the review itself can take minutes). Persisting the QA_PENDING indicator
    // makes the stage tag, boat race and stats reflect QA for the whole review,
    // not just the event-derived stage timeline.
    this.appendTaskEvent(taskRun, "qa_review_started", {
      triggerType,
      qaReviewRunId: run.id,
      runIndex: existingRuns + 1,
    });
    this.setTaskQaPending(args.task, true);
=======
    // Signal that the task has entered the QA stage so the live view advances
    // from coding-completed → QA and starts timing the review immediately
    // (the review itself can take minutes). Persisting the QA_PENDING indicator
    // makes the stage tag, boat race and stats reflect QA for the whole review,
    // not just the event-derived stage timeline.
    this.appendTaskEvent(
      taskRun,
      "qa_review_started",
      buildQaReviewStartedEventPayload({ triggerType, runId: run.id, runIndex: existingRuns + 1 })
    );
    this.setTaskQaPending(args.task, true);
>>>>>>> REPLACE
```
```
<<<<<<< SEARCH
      if (intentOutcome.intent === "pass") {
        this.deps.qaReviewRepository.updateRun(run.id, {
          status: "completed",
          outcome: "pass",
          summaryMarkdown: intentOutcome.summary,
          payload: resolvedReview!.raw,
          finishedAt: new Date().toISOString(),
        });
        this.appendTaskEvent(taskRun, "qa_review_passed", {
          triggerType,
          summary: intentOutcome.summary,
          findings: resolvedReview!.findings,
          qaReviewRunId: run.id,
        });
        // QA cleared — drop the QA_PENDING indicator so the merge gate can
        // recompute the task's resting stage (CI / automerge / completed).
        this.setTaskQaPending(args.task, false);
=======
      if (intentOutcome.intent === "pass") {
        this.deps.qaReviewRepository.updateRun(run.id, {
          status: "completed",
          outcome: "pass",
          summaryMarkdown: intentOutcome.summary,
          payload: resolvedReview!.raw,
          finishedAt: new Date().toISOString(),
        });
        const transition = determineTaskQaReviewStateTransition({
          intentOutcome,
          triggerType,
          runId: run.id,
          findings: resolvedReview!.findings,
        });
        this.appendTaskEvent(taskRun, transition.eventName, transition.eventPayload);
        // QA cleared — drop the QA_PENDING indicator so the merge gate can
        // recompute the task's resting stage (CI / automerge / completed).
        this.setTaskQaPending(args.task, transition.qaPending);
>>>>>>> REPLACE
```
```
<<<<<<< SEARCH
        // Re-entering the coding stage: drop any stale CI / QA / MERGED indicator.
        clearMergeProjectionForRerun(args.task);

        this.appendTaskEvent(taskRun, "qa_review_changes_requested", {
          triggerType,
          summary: intentOutcome.summary,
          findings: resolvedReview!.findings,
          fixInstructions: intentOutcome.fixInstructions,
          qaReviewRunId: run.id,
          continued: continued.applied,
          continuationMode: continued.mode,
        });

        return {
=======
        // Re-entering the coding stage: drop any stale CI / QA / MERGED indicator.
        clearMergeProjectionForRerun(args.task);

        const transition = determineTaskQaReviewStateTransition({
          intentOutcome,
          triggerType,
          runId: run.id,
          findings: resolvedReview!.findings,
          continued: continued.applied,
          continuationMode: continued.mode,
        });
        this.appendTaskEvent(taskRun, transition.eventName, transition.eventPayload);
        // We do not set taskQaPending here directly because the task has re-entered the coding stage
        // and clearMergeProjectionForRerun has dropped any stale indicator, though the intent maps to qaPending: true.

        return {
>>>>>>> REPLACE
```
```
<<<<<<< SEARCH
      const qaError = intentOutcome.error;
      this.deps.qaReviewRepository.updateRun(run.id, {
        status: "failed",
        summaryMarkdown: qaError.message,
        payload: {
          error_code: qaError.code,
        },
        finishedAt: new Date().toISOString(),
      });
      this.appendTaskEvent(taskRun, "qa_review_failed", {
        triggerType,
        error: qaError.message,
        error_code: qaError.code,
        qaReviewRunId: run.id,
      });
      // Drop the QA_PENDING indicator; the merge gate re-derives the blocked
      // state from the failed run on the next cycle.
      this.setTaskQaPending(args.task, false);
=======
      const qaError = intentOutcome.error;
      this.deps.qaReviewRepository.updateRun(run.id, {
        status: "failed",
        summaryMarkdown: qaError.message,
        payload: {
          error_code: qaError.code,
        },
        finishedAt: new Date().toISOString(),
      });
      const transition = determineTaskQaReviewStateTransition({
        intentOutcome,
        triggerType,
        runId: run.id,
      });
      this.appendTaskEvent(taskRun, transition.eventName, transition.eventPayload);
      // Drop the QA_PENDING indicator; the merge gate re-derives the blocked
      // state from the failed run on the next cycle.
      this.setTaskQaPending(args.task, transition.qaPending);
>>>>>>> REPLACE
```

4. **Verify updates to `src/services/quality-assurance-service.ts`**
   - Run `git diff src/services/quality-assurance-service.ts` to verify the changes.

5. **Create `tests/backend/domain/qa-review/qa-review-state-transitions.test.ts`**
   - The test file has already been created during exploration. I will verify it in Step 6.

6. **Verify creation of `tests/backend/domain/qa-review/qa-review-state-transitions.test.ts`**
   - Run `cat tests/backend/domain/qa-review/qa-review-state-transitions.test.ts` to verify the file was created correctly.

7. **Update `docs/architecture/quality-assurance-agent.md`**
   - The doc must reflect the extraction of transition logic.
```
<<<<<<< SEARCH
Note: The run budget and retry limit rules are explicitly implemented in a dedicated domain module (`src/domain/qa-review/qa-review-budget.ts`). Additionally, the setup logic for trigger selection, and instruction composition is handled cleanly by pure functions in `src/domain/qa-review/qa-review-request-builder.ts` before the `QualityAssuranceService` acts on it. Branch resolution and stale-review decisions are handled by dedicated helpers in `src/domain/qa-review/qa-review-branch-resolution.ts` and `src/domain/qa-review/qa-review-stale-run.ts`. The task QA verdict-to-state transition logic (classifying the normalized result into pass, changes requested, or retryable failure intent) is handled purely in `src/domain/qa-review/task-review-outcome.ts`.
=======
Note: The run budget and retry limit rules are explicitly implemented in a dedicated domain module (`src/domain/qa-review/qa-review-budget.ts`). Additionally, the setup logic for trigger selection, and instruction composition is handled cleanly by pure functions in `src/domain/qa-review/qa-review-request-builder.ts` before the `QualityAssuranceService` acts on it. Branch resolution and stale-review decisions are handled by dedicated helpers in `src/domain/qa-review/qa-review-branch-resolution.ts` and `src/domain/qa-review/qa-review-stale-run.ts`. The task QA verdict-to-intent logic (classifying the normalized result into pass, changes requested, or retryable failure intent) is handled purely in `src/domain/qa-review/task-review-outcome.ts`. The intent-to-state transition logic (mapping intent to QA event payloads and pending indicators) is handled purely in `src/domain/qa-review/qa-review-state-transitions.ts`.
>>>>>>> REPLACE
```

8. **Verify updates to `docs/architecture/quality-assurance-agent.md`**
   - Run `git diff docs/architecture/quality-assurance-agent.md`.

9. **Run tests**
   - Run `pnpm run test:backend` and `pnpm run typecheck:backend`.

10. **Pre-commit step**
    - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
