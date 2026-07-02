1. **Create `src/domain/qa-review/qa-review-state-transitions.ts`**
   - Provide the complete code for `buildQaReviewStartedEventPayload` and `determineTaskQaReviewStateTransition`.

2. **Verify creation of `src/domain/qa-review/qa-review-state-transitions.ts`**
   - Run `cat src/domain/qa-review/qa-review-state-transitions.ts` to verify the file was created correctly.

3. **Update `src/services/quality-assurance-service.ts`**
   - Import the new helpers: `buildQaReviewStartedEventPayload`, `determineTaskQaReviewStateTransition`.
   - Use `buildQaReviewStartedEventPayload` and `determineTaskQaReviewStateTransition` to prepare payloads for `appendTaskEvent` and `setTaskQaPending`. Provide explicit replace diff.

4. **Verify updates to `src/services/quality-assurance-service.ts`**
   - Run `git diff src/services/quality-assurance-service.ts` to verify the changes.

5. **Create `tests/backend/domain/qa-review/qa-review-state-transitions.test.ts`**
   - Provide the complete test code.

6. **Verify creation of `tests/backend/domain/qa-review/qa-review-state-transitions.test.ts`**
   - Run `cat tests/backend/domain/qa-review/qa-review-state-transitions.test.ts` to verify the file was created correctly.

7. **Update `docs/architecture/quality-assurance-agent.md`**
   - Explicit replace diff for updating the doc to mention the new state-transition module.

8. **Verify updates to `docs/architecture/quality-assurance-agent.md`**
   - Run `git diff docs/architecture/quality-assurance-agent.md`.

9. **Run tests**
   - Run `pnpm run test:backend -- tests/backend/domain/qa-review/qa-review-state-transitions.test.ts tests/backend/services/quality-assurance-service.test.ts` and `pnpm run lint`.

10. **Pre-commit step**
    - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
