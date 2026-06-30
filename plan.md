1. **Fix `aria-activedescendant` on selector buttons (TopNav.tsx):**
   - Remove `aria-activedescendant` from the project and sprint toggle buttons (`project-selector-button`, `sprint-selector-button`).
   - Add `role="combobox"`, `aria-expanded="true"`, and `aria-autocomplete="list"` to the filter inputs so that if they have `aria-activedescendant`, it correctly follows the combobox pattern.

2. **Improve screen reader announcements for filter inputs:**
   - Update `project-filter-desc` and `sprint-filter-desc` to dynamically announce the result counts and empty states (e.g., "5 projects found. Use arrow keys to navigate." or "No results.").

3. **Fix keyboard navigation (TopNav.tsx):**
   - In `useDropdownKeyboard`, update the `onContainerKeyDown` logic to ignore options with `aria-disabled="true"` or `tabindex="-1"`.
   - Ensure the focus returns gracefully on Escape or close.

4. **Enhance visual-only selected indicators:**
   - Add `aria-hidden="true"` to the `bg-signal-500` dot spans used for active selection.
   - Add a visually hidden screen reader text like `<span className="sr-only"> (Selected)</span>` to clearly state which item is currently chosen.

5. **Document the keyboard contract (docs/dashboard/design-system-shell-navigation.md):**
   - Append a section detailing the Combobox/Listbox keyboard navigation pattern used by the selectors (Escape to close and return focus, Arrow keys for navigation).

6. **Pre-commit checks:**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

7. **Test & Submit:**
   - Run the lint and test commands. Submit if everything passes.
