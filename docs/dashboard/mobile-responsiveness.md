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

## Operational Surfaces

Dense dashboard rows and panels should keep actions and status readable at 375px, 768px, and desktop widths:

1.  **Rows and ledgers**:
    *   Use `min-w-0` on row parents and text containers so truncation works instead of forcing horizontal overflow.
    *   Keep primary actions keyboard reachable and visible in the document flow on narrow screens. Hover-revealed action rails may remain for desktop, but mobile layouts must not depend on hover.
    *   Add `title` or equivalent accessible labels when visual text is truncated.

2.  **Data-dense panels**:
    *   Use named regions (`aria-label` or `aria-labelledby`) for timelines, DAG canvases, telemetry ledgers, and Git/CI panels.
    *   Wrap long lists and visualizations in bounded scroll containers with `dashboard-scrollbar` and `overscroll-contain`.
    *   Preserve table-like meaning on mobile by exposing labels near values when desktop headers are hidden.

3.  **Graph and chart alternatives**:
    *   Interactive visualizations must include screen-reader summaries and keyboard/touch alternatives for selecting or navigating data points.
    *   Canvas-like or SVG-heavy surfaces should expose a scrollable region label and a compact list alternative when graph nodes are otherwise hard to target.
