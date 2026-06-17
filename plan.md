1. **Create `src/domain/qa-review/qa-review-budget.ts`**:
   - Move `QA_INFRA_FAILURE_GRACE` logic here.
   - Implement `checkQaReviewBudget(args)` that accepts `existingRuns`, `decisiveRuns`, `maxReviewRuns`, `latestRun`, and returns an object indicating whether QA can run, and the reason (e.g. `allowed: true, reason: 'within_budget'`, `allowed: true, reason: 'recovered_stale'`, `allowed: false, reason: 'budget_exhausted'`).
2. **Update `src/services/quality-assurance-service.ts`**:
   - Replace inline logic `decisiveRuns >= qaSettings.maxTaskReviewRuns || existingRuns >= ...` with the helper result from `checkQaReviewBudget`.
   - Use the helper result for deciding if `reviewCompletedTask` should abort.
3. **Add tests**:
   - Create `tests/backend/domain/qa-review/qa-review-budget.test.ts` to test the new helper (check decisive budget exhausted, infra grace exhausted, infra failures allowed within grace, post-continuation verification, recovered stale, and disabled).
   - Verify `tests/backend/services/quality-assurance-service.test.ts` still passes.
4. **Update `docs/architecture/quality-assurance-agent.md`**:
   - Add/update the contract details indicating that retry budget logic is a dedicated domain module.
5. **Run Pre Commit Steps**:
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
6. **Submit**.
