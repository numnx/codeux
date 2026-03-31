# Settings Page Refactor (T12)
1. **Extract `useSettingsPageState` Hook**:
    - Create `dashboard/src/v2/hooks/use-settings-page-state.ts`.
    - Move types `SettingsScope`, `CategoryId`, `AgentInstructionTemplateId`, `IntegrationId`, `Category`, `IntegrationDefinition`, `CATEGORIES`, `CATEGORY_SEARCH_HINTS`, `providerLabels`, `thinkingModeOptions`, `invocationRouteDefinitions`, `routingProfileOptions`, `INTEGRATIONS`, `AGENT_INSTRUCTION_TEMPLATE_OPTIONS` from `SettingsPage.tsx` or expose them so they can be imported.
    - Extract state management (useState calls, useEffect hooks for fetching/saving/resetting settings, and calculated values like `filteredCategories`) into `useSettingsPageState` hook.
    - Return a comprehensive object exposing the state, computed values, and action handlers.

2. **Extract `SettingsCategoryRail` Component**:
    - Create `dashboard/src/v2/components/settings/SettingsCategoryRail.tsx`.
    - Accept props for `categories`, `filteredCategories`, `activeCategory`, `settingsSearch`, `onSearchChange`, `onCategoryChange`.
    - Move the sticky sidebar rendering code from `SettingsPage.tsx` into this component.

3. **Extract `SettingsContentPanels` Component**:
    - Create `dashboard/src/v2/components/settings/SettingsContentPanels.tsx`.
    - Accept props for all necessary state and handlers to render the active category's content panel.
    - Move the `renderContent`, `renderGeneralSection`, etc., and `IntegrationConfigRow`, `SectionCard` from `SettingsPage.tsx` or keep `SectionCard` in `SettingsSurface.tsx` if it's there. Actually, `SectionCard` and `IntegrationConfigRow` are defined in `SettingsPage.tsx` and should be moved or exported. We'll likely move them to `SettingsContentPanels.tsx` or export them. The requirement mentions `SettingsSurface.tsx`, maybe `SectionCard` belongs there? Let's check `SettingsSurface.tsx`.

4. **Update `SettingsSurface.tsx`**:
    - Move `SectionCard` and `IntegrationConfigRow` to `SettingsSurface.tsx` if they fit as generic layout surfaces for settings, or keep them local to panels if they are highly specific. The prompt mentions `- dashboard/src/v2/components/settings/SettingsSurface.tsx`.

5. **Refactor `SettingsPage.tsx`**:
    - Import the new hook `useSettingsPageState`.
    - Import `SettingsCategoryRail` and `SettingsContentPanels`.
    - Re-wire the component to be a thin wrapper around these extracted parts.

6. **Add Tests**:
    - Update/Create `tests/dashboard/v2/settings-page-state.test.tsx` to verify the state transitions, filtering, and hook behavior.
    - Run `npm run lint`, `npm run typecheck:dashboard`, `npm run test`, `npm run build`.

7. **Submit**:
    - Commit pre-commit steps and submit.

# Execution Snapshot Refactor (T04/T05)
1. Use `write_file` to create `src/repositories/execution/execution-snapshot-loader.ts`. I will implement a `loadExecutionSnapshotData(db, storage, projectId)` function that executes the queries extracted from `getProjectExecutionSnapshot` and returns `sprintRuns`, `taskDispatches`, `taskRunByDispatchId`, and `runtimeEvents`.
2. Use `read_file` to verify `src/repositories/execution/execution-snapshot-loader.ts` was written correctly.
3. Use `write_file` to create `src/repositories/execution/execution-stats-aggregator.ts`. I will implement pure reducers `accumulateUsageStats` and `buildChartSeries` to abstract the logic in `getProjectStatsSnapshot`. `accumulateUsageStats` will iterate over the provided array of mapped invocations, merging usage for tasks, sprints, providers, purposes, and buckets. `buildChartSeries` will generate the final chart series array from the updated buckets and invocations arrays.
4. Use `read_file` to verify `src/repositories/execution/execution-stats-aggregator.ts` was written correctly.
5. Use `run_in_bash_session` to execute a custom node script that edits `src/repositories/execution-repository.ts`. The script will replace the inline SQL and loops in `getProjectExecutionSnapshot` and `getProjectStatsSnapshot` with calls to the extracted methods.
6. Use `cat` to verify `src/repositories/execution-repository.ts` edits were applied correctly.
7. Use `write_file` to create `tests/backend/repositories/execution-stats-aggregator.test.ts`. Based on my exploration of the actual extracted logic in `snapshot_stats_full.txt` (which tracks properties like `totalTokens`, `provider`, `purpose`, and builds chart series like `core_total_tokens` and `provider_{id}`), I will write focused tests to directly exercise `accumulateUsageStats` and `buildChartSeries` with dummy invocation rows, checking that tokens sum correctly across the created buckets and that the chart series structure is correct.
8. Use `read_file` to verify `tests/backend/repositories/execution-stats-aggregator.test.ts` was written correctly.
9. Run `npm run lint`, `npm run typecheck`, `npm run test:coverage`, and `npm run build` as technical quality gates. Run exactly `npx vitest run tests/backend/repositories/execution-repository.test.ts tests/backend/repositories/execution-stats-aggregator.test.ts`.
10. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
11. Submit the completed task.

# Dashboard Performance & UI Improvements
1. **Modify `dashboard/src/main.tsx`:** Use `replace_with_git_merge_diff` to lazy-load `DeepOceanBackground`. Implement an `IdleMount` wrapper component in `main.tsx` that uses `useEffect` and `requestIdleCallback` (with a timeout fallback) to set a `mounted` state before rendering the lazy-loaded `DeepOceanBackground`. This defers the background chunk execution and ensures `three` is not part of the initial paint path. Use `read_file` to verify the edit.

2. **Modify `dashboard/src/v2/components/TopNav.tsx`:** Use `replace_with_git_merge_diff` to wrap the GSAP entrance animation in a non-blocking macro-task `setTimeout(() => { ... }, 0)`. This decouples the shell mount timing from GSAP execution, allowing immediate top-nav rendering before motion initializes. Use `read_file` to verify the edit.

3. **Modify `dashboard/src/v2/components/KineticDock.tsx`:** Use `replace_with_git_merge_diff` to wrap the GSAP entrance animation inside `useEffect` in a non-blocking `setTimeout(() => { ... }, 0)`. This ensures the dock renders its structure instantly without waiting on GSAP. Use `read_file` to verify the edit.

4. **Modify `vite.config.ts`:** Use `replace_with_git_merge_diff` to remove the explicit `three: ["three"]` manual chunk from `rollupOptions`. Since `DeepOceanBackground` is now lazy-loaded, Vite will automatically split it and its `three` dependency into an async chunk. Removing it from eager vendor chunks prevents it from being preloaded in the root HTML. Use `read_file` to verify the edit.

5. **Create tests:** Use `write_file` to create `tests/dashboard/v2/main-shell.test.tsx`. Implement a vitest suit rendering the `TopNav` and `KineticDock` directly and asserting that they render synchronously without throwing and don't block on `three` loading. Also assert that `DeepOceanBackground` can be lazily loaded without throwing. Use `read_file` to verify.

6. **Run Quality Gates:** Use `run_in_bash_session` to run `npm run lint`, `npm run typecheck:dashboard`, `npm run test -- tests/dashboard/v2/main-shell.test.tsx`, and `npm run build:dashboard`. Confirm tests pass and that `three` is absent from the initial bundle output.

7. **Pre-commit:** Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

8. **Submit:** Submit the completed task.
