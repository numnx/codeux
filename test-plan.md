Plan:
1. Ensure components `Input`, `Select`, `Checkbox`, `Toggle` exist in `dashboard/src/v2/components/forms/`. I have already created them.
2. Verify they meet the exact accessibility requirements:
    - `<label>` element linked via `for` / `id` attributes. (Done, using `htmlFor` in React/Preact).
    - `aria-label` only when a visual label is impossible. (Done for Toggle, where label is optional).
    - `aria-invalid="true"` on inputs with validation errors. (Done).
    - Link to error messages using `aria-describedby`. (Done).
    - `aria-live="polite"` or `aria-live="assertive"` for dynamic status updates. (Done on the error spans).
3. The prompt constraint explicitly states: "Do not remove existing validation logic; enhance the existing patterns with ARIA metadata."
4. I will do a quick pass over the newly created `dashboard/src/v2/components/forms/` files and make sure the implementation is bulletproof and properly typed.
5. Create a pre commit step.
6. Submit.
