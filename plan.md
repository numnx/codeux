1. **Create `src/domain/qa-review/qa-review-state-transitions.ts`**
   - Extract logic to generate payload for "qa_review_started" event.
   - Extract logic to generate state transitions based on `TaskReviewIntent`.
   - The returned payloads/intents will be used by `QualityAssuranceService` to call `this.appendTaskEvent(...)` and `this.setTaskQaPending(...)`.

2. **Update `src/services/quality-assurance-service.ts`**
   - Replace the inline assembly of task states and events with calls to the new helpers.

3. **Add `tests/backend/domain/qa-review/qa-review-state-transitions.test.ts`**
   - Write tests for "started", "passed", "changes_requested", "retryable_failure" and "fatal_failure" cases.

4. **Update docs**
   - Modify `docs/architecture/quality-assurance-agent.md` to document this extraction.

5. **Pre-commit Steps**
   - Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.
