const plan = `
1. **Modify \`TaskComposer.tsx\` to support first-invalid-field focusing and improved animations:**
   - In \`handleSubmit\`, instead of hardcoding \`titleInputRef.current\` for shaking, find the first invalid field using DOM queries (e.g., \`[aria-invalid="true"]\`) and focus it.
   - For the shake animation, if \`!reducedMotion\`, apply \`gsap.to(firstInvalidField)\`.
   - Update \`onSubmit\` success handling: delay \`onClose()\` slightly so the user can see the success state, or let the parent handle close, or as required: "Improve submit interaction so pending, success, and retryable errors remain visible long enough to understand, and closing after success does not hide errors or leave stale pending state". Instead of immediately \`onClose()\`, wait a bit or let \`autoDismiss\` of \`setSuccess\` handle it, but wait e.g., 1000ms before calling \`onClose()\`.
   - Update form controls (e.g., title, description, prompt) to have \`aria-invalid={!state.is[Field]Valid && (state.hasAttemptedSubmit || state.touchedFields[Field])}\` to allow querying. Wait, the \`aria-invalid\` is probably already set, but we need to check.

2. **Modify \`task-composer-state.ts\` to expose validation order or simply rely on DOM order**:
   - The DOM order is: Title, Sprint, Status, Description, PromptMarkdown, Dependency, Priority, Executor.
   - Or we can maintain refs for each. A simpler way is to give an \`id\` or \`name\` to each field and a \`ref\` or query selector.
   - Add \`id\` to all relevant fields: \`sprint-select\`, \`title-input\`, \`description-input\`, \`prompt-input\`, \`status-select\`, \`priority-buttons\`, \`executor-buttons\`.

3. **Improve Dependencies and Executor Feedback (\`TaskComposer.tsx\`)**:
   - For Dependencies: Add clearer inline helpers based on validation (none currently, but state says no deps selected etc, or invalid if there was validation). Actually the prompt says: "Add clearer inline helper or status feedback for dependencies and executor selection, including selected, unavailable, and invalid cases without changing the task payload contract."
   - For Executor: Show if a selected executor is valid or has an error.

4. **Write tests (\`dashboard/src/v2/components/ui/__tests__/TaskComposer.test.tsx\`)**:
   - Test validation timing.
   - Test first-invalid-field focus.
   - Test successful payload submission.
   - Test retryable error feedback.

5. **Pre-commit steps & Typecheck**.
`
console.log(plan);
