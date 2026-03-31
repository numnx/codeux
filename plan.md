1. **Modify `dashboard/src/main.tsx`:** Use `replace_with_git_merge_diff` to lazy-load `DeepOceanBackground`. Implement an `IdleMount` wrapper component in `main.tsx` that uses `useEffect` and `requestIdleCallback` (with a timeout fallback) to set a `mounted` state before rendering the lazy-loaded `DeepOceanBackground`. This defers the background chunk execution and ensures `three` is not part of the initial paint path. Use `read_file` to verify the edit.

2. **Modify `dashboard/src/v2/components/TopNav.tsx`:** Use `replace_with_git_merge_diff` to wrap the GSAP entrance animation in a non-blocking macro-task `setTimeout(() => { ... }, 0)`. This decouples the shell mount timing from GSAP execution, allowing immediate top-nav rendering before motion initializes. Use `read_file` to verify the edit.

3. **Modify `dashboard/src/v2/components/KineticDock.tsx`:** Use `replace_with_git_merge_diff` to wrap the GSAP entrance animation inside `useEffect` in a non-blocking `setTimeout(() => { ... }, 0)`. This ensures the dock renders its structure instantly without waiting on GSAP. Use `read_file` to verify the edit.

4. **Modify `vite.config.ts`:** Use `replace_with_git_merge_diff` to remove the explicit `three: ["three"]` manual chunk from `rollupOptions`. Since `DeepOceanBackground` is now lazy-loaded, Vite will automatically split it and its `three` dependency into an async chunk. Removing it from eager vendor chunks prevents it from being preloaded in the root HTML. Use `read_file` to verify the edit.

5. **Create tests:** Use `write_file` to create `tests/dashboard/v2/main-shell.test.tsx`. Implement a vitest suit rendering the `TopNav` and `KineticDock` directly and asserting that they render synchronously without throwing and don't block on `three` loading. Also assert that `DeepOceanBackground` can be lazily loaded without throwing. Use `read_file` to verify.

6. **Run Quality Gates:** Use `run_in_bash_session` to run `npm run lint`, `npm run typecheck:dashboard`, `npm run test -- tests/dashboard/v2/main-shell.test.tsx`, and `npm run build:dashboard`. Confirm tests pass and that `three` is absent from the initial bundle output.

7. **Pre-commit:** Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

8. **Submit:** Submit the completed task.
