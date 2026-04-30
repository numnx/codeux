1.  **Extract Positioning Logic:** Create a centralized positioning utility `dashboard/src/v2/lib/positioning/index.ts` to calculate top/left coordinates handling edge collisions gracefully for popovers, menus, and tooltips.
2.  **Update `Tooltip.tsx`**: Update `dashboard/src/v2/components/ui/Tooltip.tsx` to use the centralized positioning logic. Ensure keyboard event logic (`Escape` to close) to avoid focus trapping, and ARIA attributes for tooltips (`role="tooltip"`, etc). Use `gsap.killTweensOf` before animating to prevent GSAP conflicts.
3.  **Update `InfoIconPopover.tsx`**: Update `dashboard/src/v2/components/ui/InfoIconPopover.tsx` to use the centralized positioning logic, standardise interaction states, and improve keyboard dismissals via Escape key. Use `gsap.killTweensOf`.
4.  **Update Menus/Popovers in `SprintBubble.tsx` and `SprintImportMenu.tsx` / `BrowserSessionsMenu.tsx`**: Add `aria-expanded` and semantic wiring to trigger buttons. Ensure open/close events function as intended via ARIA patterns. Use `gsap.killTweensOf`. Ensure `pointer-events: none` on unmounted layers to prevent trapping clicks.
5.  **Create `dashboard/src/v2/lib/errors/user-message.ts`**:
   - Create the function `getUserFriendlyErrorMessage(error: unknown, fallbackMessage: string = "An unexpected error occurred"): string`.
   - The implementation will check if `error` is an instance of `Error` and return `error.message` ONLY if it doesn't look like a raw JSON payload.
6.  **Create `dashboard/src/v2/hooks/use-async-action.ts`**:
   - Provide the hook: `export function useAsyncAction<T, Args extends any[]>(action: (...args: Args) => Promise<T>, options?: { onSuccess?: (data: T) => void, onError?: (error: unknown) => void, successMessage?: string | ((data: T) => string), errorMessage?: string, pendingMessage?: string })`
   - It will internally use `useActionFeedback()`.
7.  **Create `dashboard/src/v2/components/ui/Toast.tsx`**:
   - Implement `ToastProvider` and `useToast` via a Preact Context `ToastContext`.
8.  **Create `dashboard/src/v2/components/ui/AsyncState.tsx`**:
   - Create an `AsyncState` component supporting `idle`, `pending`, `success`, `error`, and optional retry/undo actions.
9.  **Validation & Submission**:
    - Run `pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run build`.
    - Complete pre-commit steps and submit code.
