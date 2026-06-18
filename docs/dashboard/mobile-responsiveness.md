# Mobile Responsiveness & Overlay Surfaces

The dashboard UI uses specific constraints to handle small screens, browser chrome changes, and medium-width layouts without clipping important controls or trapping content outside the viewport.

## Responsive Overlays

When using shared overlay components (`Modal`, `Dialog`, `Drawer`, `NotificationPanel`, `SearchOverlay`), follow these responsive constraints:

1.  **Modals & Dialogs**:
    *   Always use dynamic viewport-relative limits: `max-w-[calc(100vw-2rem)]` and `max-h-[calc(100dvh-2rem)]`.
    *   Include `overflow-y-auto` so internal content scrolls naturally if it exceeds the viewport height.
    *   For layouts with sidebars or decorative panels (e.g., `AddProjectModal`, `AddTaskModal`, `SprintMarkdownModal`), stack the layout on small screens using `flex-col sm:flex-row`, or hide purely decorative panels (`hidden sm:flex`).

2.  **Drawers**:
    *   Drawers must stretch to the full viewport height using `h-[100dvh]` to account for mobile browser UI chrome.
    *   They should act full-width on phones but have a bounded max-width on larger screens (e.g., `w-[calc(100vw-2rem)] sm:w-full max-w-md`).
    *   Internal vertical scrolling must be enabled (`overflow-y-auto`).

3.  **Command Palettes & Positioning (e.g., `SearchOverlay`)**:
    *   Anchored positioning should fall back to a centered, screen-relative mobile command surface if the available space below the anchor is too small (e.g., `< 300px` available) or if the viewport is narrow (e.g., `< 768px`).
    *   Ensure focus return and keyboard navigation work correctly regardless of the layout fallback mode.

4.  **Notification Panels**:
    *   Flyout menus and notification surfaces should be collision-aware with width and max-height constraints (e.g., `max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-5rem)]`) so they remain fully visible from the top nav at tablet widths without clipping.

5. **Page Containers & Safe Areas**:
   *   Pages that scroll vertically behind fixed bottom navigation elements (like the `KineticDock`) must append a safe bottom padding (e.g., `pb-36 md:pb-32`) to ensure final controls are reachable.

6. **Scheduler & Calendar Layouts**:
   * Scheduler navigation rows and segmented controls must utilize responsive wrapping or truncation strategies (e.g., `flex-wrap`, `min-w-0`, `truncate`) to avoid pushing horizontal page scroll on mobile and tablet widths.
   * Long titles, recurrences, and inline data chips on scheduled event rows should adopt `flex-wrap` and allow individual components to wrap cleanly without overlapping or pushing outside the grid columns.
   * Horizontal calendar strips must contain their own `overflow-x-auto` to allow sideways scrolling without causing a page-level horizontal overflow. Form layouts sharing space with calendars should switch from a unified row to a single column (`grid-cols-1 sm:grid-cols-3`) when width decreases.
