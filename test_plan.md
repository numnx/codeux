1. **Explore codebase and document updates**:
   - Verify definitions in `dashboard/src/lib/runtime-snapshot-stability.ts` to prepare replacements for worker summary comparisons.
   - Investigate test files `tests/dashboard/lib/project-resource-utils.test.ts` and `tests/dashboard/lib/runtime-snapshot-stability.test.ts` for needed test assertions.
2. **Update `docs/dashboard/design-system-live-runtime.md`**:
   - Add a rule for assigned worker summaries stabilization under the "Data & Performance Constraints" section, explaining how it works to stabilize snapshots.
3. **Implement Worker Equivalence**:
   - Add `isAssignedWorkerEquivalent` for semantic equivalence checking of worker summary properties in `dashboard/src/lib/runtime-snapshot-stability.ts`.
   - Update `areExecutionSnapshotsEquivalent` to use `isAssignedWorkerEquivalent` instead of shallow length and endpoint id checks.
   - Update `stabilizeExecutionSnapshot` to preserve `primaryAssignedWorker` and `overflowAssignedWorkers` using the new equivalence helpers.
4. **Update tests**:
   - Modify or add cases in `tests/dashboard/lib/runtime-snapshot-stability.test.ts` to assert that unchanged assigned worker arrays are reused, but status/capability changes trigger a snapshot update.
5. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done**:
   - Ensure the new logic is thoroughly covered.
   - Run `pnpm run test:dashboard -- tests/dashboard/lib/project-resource-utils.test.ts tests/dashboard/lib/runtime-snapshot-stability.test.ts` and `pnpm run typecheck:dashboard`.
