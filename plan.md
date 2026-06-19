1. **Understand validation feedback issue**:
   - Need to move focus to the first invalid field upon an invalid submission. We also need to keep the "shake" animation but ensure it respects `reducedMotion`.
   - Update inline helpers/status feedback for dependencies and executor selection without changing task payload.
   - Improve submit interaction for pending, success, and retryable errors.

2. **File modifications**:
   - `dashboard/src/v2/components/ui/TaskComposer.tsx`:
      - Update `handleSubmit` to find the first invalid field and focus it.
      - Update the UI to show validation errors based on `state.hasAttemptedSubmit || state.touchedFields...`
      - Provide clearer inline helper for dependencies.
      - Improve `onSubmit` interaction, ensure errors stay long enough, success stays before closing.

3. **Add Tests**:
   - `dashboard/src/v2/components/ui/__tests__/TaskComposer.test.tsx`

4. **Verify**:
   - Run typecheck.
   - Run tests.

