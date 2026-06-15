1. Add textual chart summary and fix bucket keyboard navigation in `InteractiveUsageChart.tsx`.
   - Update `dashboard/src/v2/pages/stats/components/InteractiveUsageChart.tsx` to include an `aria-live` region with screen reader text that tracks `zoomRange`, `visibleBuckets.length`, and `activeBucket`.
   - Replace the empty `<div ref={svgContainerRef}>` wrapper with an `<input type="range">` slider mapped to `hoveredIndex` and bind keyboard enter to zoom.
   - Update SVG elements and paths with `aria-hidden="true"` so they aren't parsed by screen readers.
2. Add `aria-hidden="true"` to `UsageChartMinimap.tsx` decorative elements.
3. Write `UsageChartAccessibility.test.tsx` testing the added keyboard accessibility features.
4. Run testing gates, verify no typescript errors, and submit.
