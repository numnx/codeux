1. Modify `dashboard/src/v2/components/ui/AddTaskModal.tsx`:
   - Add `transition-colors focus:bg-black/[0.05] dark:focus:bg-white/[0.05]` to form fields (inputs, selects, textareas).
   - Change focus ring to `focus:ring-4 focus:ring-signal-500/40`.
   - Add conditional validation class `border-red-500 dark:border-red-500` to `sprintId` and `title` fields based on `validationErrors` and `touched` state.
   - For textareas, add `overflow-y-auto` to only show scrollbars when needed.
   - Remove `focus-visible:` prefixes in favor of `focus:` for consistent typing feedback, or keep them but ensure the background shift happens.
   - Note: The prompt also mentioned "Do not use browser-native validation tooltips." I should add `noValidate` to the `<form>` element.

2. Modify `dashboard/src/v2/components/ui/AddProjectModal.tsx`:
   - Apply similar background shifts (`focus:bg-black/[0.05] dark:focus:bg-white/[0.05]`), rounded corners where appropriate, and `focus:ring-4 focus:ring-ember-500/40`.
   - Add conditional validation class `border-red-500 dark:border-red-500` to `name`, `localPath`, and `gitUrl` inputs based on `validationErrors` and `touched`.
   - Add `noValidate` to the `<form>` element.

3. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

4. Submit the change.
