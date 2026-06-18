# Accessibility and Usability

This document defines the accessibility and usability contracts enforced in the dashboard. Preserving these behaviors is required for all new dashboard development.

## Core Accessibility Contracts

### Landmarks and Headings
- The dashboard uses standard semantic HTML5 landmarks (`<header>`, `<main>`, `<nav>`, `<footer>`) to allow structural navigation.
- Headings (`<h1>` through `<h6>`) must maintain a logical, unbroken hierarchy on every page.

### Dialogs and Focus Management
- Implemented using proper ARIA roles (`role="dialog"` or `role="alertdialog"`).
- Component Ownership: `Dialog`, `Modal`, `SearchOverlay`.
- Modals manage focus by trapping it within the overlay and restoring it to the trigger upon closing using the `useFocusTrap` hook.
- If a dialog has no naturally focusable elements, the container itself uses `tabIndex={-1}` and an outline-removal class to safely receive programmatic focus upon mount.

### Menus and Comboboxes
- Use explicit ARIA roles such as `menu`, `menuitem`, `combobox`, `listbox`, and `option`.
- Component Ownership: Comboboxes and dropdown menus.
- Keyboard navigation (up/down arrows, Enter/Space, Escape) is strictly supported.
- Selections and current states must be accurately reflected via `aria-selected` and `aria-expanded`.

### Tables and Grid Data
- Complex data displays use semantic HTML (`<table>`, `<th>`, `<td>`, `<tr>`, `<thead>`, `<tbody>`) or explicit ARIA grid roles to support screen reader cell navigation.
- Component Ownership: `Table`, `SprintLedger`, `InvocationsTable`.
- Responsive behavior must avoid horizontal overflow on small screens while maintaining row integrity.

### Forms and Validation
- All inputs must have associated labels (`<label>` or `aria-label`/`aria-labelledby`).
- Component Ownership: `TaskComposer` and standard forms.
- Validation feedback uses `aria-invalid="true"` or `aria-invalid="false"` (strict string literals for testing compatibility) and natively associates error messages using `aria-errormessage` or `aria-describedby`.
- Visually hidden redundant text (`sr-only`) or duplicating `role="alert"` should be avoided to prevent double-announcements in screen readers.

### Live Regions and Notifications
- Transient UI components and non-visual state changes are announced using `aria-live="polite"` or `aria-live="assertive"`.
- Component Ownership: `ToastProvider`, `ActionFeedbackRegion`.
- Safe focus management upon unmount is implemented by shifting focus to a fallback container (e.g., `[role="main"]` or `document.body`).

### Loading, Empty, and Error States
- Loading spinners use `aria-hidden="true"` with a visually hidden fallback (e.g., "Loading..."), while their containers use `aria-busy="true"`.
- Empty and error states must be explicitly described using semantic text and accessible names to ensure screen reader visibility.

### Responsive Layouts
- Layouts must naturally scale down without fixed rigid viewport bounds that break on smaller viewports.
- Controls must not be clipped. Long labels use fluid utilities (e.g., `min-w-0`, `max-w-full`, `truncate`, `break-words`).
- Full-height embedded layouts rely on dynamic viewport sizing (`dvh` with minimums like `min-h-[400px]`).

### Reduced Motion
- Component animations using CSS or Tailwind respect user preferences via the `prefers-reduced-motion` media query, disabling unnecessary visual transitions.
- Focus rings remain visible.

## Verification and Quality Checks

To verify that accessibility contracts and usability behaviors remain intact after changes, developers must run the following validation commands:

1. **Focused Component Testing:** Run the specific Vitest file for the modified component (e.g., `pnpm run test:dashboard tests/dashboard/path-to-test.test.tsx`) to verify `toHaveAttribute` bounds and focus management.
2. **Dashboard Type Checking:** Validate strict TypeScript contracts, including prop signatures and view-model memoizations.
   ```bash
   pnpm run typecheck:dashboard
   ```
3. **Full Dashboard Test Suite:** Ensure no regressions occurred across the UI layer and its testing environment (including `happy-dom` wrappers).
   ```bash
   pnpm run test:dashboard
   ```
4. **Production Build Integration:** Catch any build-time issues, circular dev-server dependencies, or missing exports.
   ```bash
   pnpm run build
   ```
