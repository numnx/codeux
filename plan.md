1. **SprintComposer & TaskComposer - Typing Signal:**
   - In both `SprintComposer.tsx` and `TaskComposer.tsx`, add a local state variable `isTyping` (boolean) and a `typingTimeoutRef` (using `useRef<number | null>(null)`).
   - In the `onInput` handler for the primary field (Sprint Name / Task Title):
     - Clear `typingTimeoutRef.current`.
     - Set `isTyping` to `true`.
     - Set a new timeout (e.g. 500ms) to set `isTyping` to `false`.
   - Update the `<input>` element for the primary field to apply a dynamic class based on `isTyping`, adding `ring-2 ring-signal-500/50 animate-pulse` when typing. Wait, the prompt says: "subtle 'typing' signal (e.g., rhythmic border pulse or signal-tinted glow) to the active field".
   - So I will add `transition-all duration-300 ring-2 ring-signal-500/30` or `shadow-[0_0_15px_rgba(0,224,160,0.3)]` when `isTyping` is true to provide a glowing feedback.

2. **SprintComposer & TaskComposer - Validation Timing:**
   - Modify the error display condition. The prompt states: "avoid showing error states until a field has been touched and blurred or after a debounce period during typing."
   - Currently, errors are shown like: `(state.hasAttemptedSubmit || state.touchedFields.title) && !state.isTitleValid`.
   - I will modify this so errors do NOT show while `isTyping` is true unless `hasAttemptedSubmit` is true. `((state.hasAttemptedSubmit || (state.touchedFields.title && !isTyping)) && !state.isTitleValid)` etc. This delays the error message until the user stops typing (the debounce period).

3. **SprintComposer & TaskComposer - Layout Transitions (Edit vs Display):**
   - The requirement: "smooth layout transitions between 'Display' and 'Edit' modes in the composers using GSAP Flip or simple opacity/height swaps."
   - `state.isEditing` determines the header text and the mode. BUT `isEditing` is a boolean passed via initial values. Does it toggle? The prompt implies toggling. Wait.
   - Let's read the prompt carefully: "smooth layout transitions between 'Display' and 'Edit' modes in the composers". In `SprintComposer`, there is the `originalPrompt` section which might be displayed or hidden. There's also `submitMode` (Plan & Start, Save Draft, etc). In `SprintComposer.tsx` line 491: `className={state.originalPrompt ? "grid gap-4 xl:grid-cols-2" : "grid gap-4"}`.
   - BUT, if it specifically says 'Display' and 'Edit' modes, perhaps they mean the text itself transitioning smoothly? e.g. `<div className="relative"> ... opacity swap ... </div>` for `{state.isEditing ? "Refine The Task." : "Create A New Task."}`. Let's add a GSAP opacity swap or `transition-opacity` on those blocks if `isEditing` changes. Wait, `isEditing` is just `Boolean(initialTask)`, it doesn't change on the fly.
   - Wait, if `submitMode` changes, does that trigger a transition? "between 'Display' and 'Edit' modes".
   - Let's check `isEditing` again. Is there a way to toggle it? No, but maybe they mean the *focus* state is an "Edit" mode? "transitions between 'Display' and 'Edit' modes in the composers"
   - What if "Edit mode" means when you focus on a field, and "Display" is when it's blurred?
   - Wait, `dashboard/src/v2/components/ui/SprintComposer.tsx` has `{state.isEditing ? "Save Changes" : "Save Draft"}`. If `submitMode` is draft, and it is editing. No, that's not it.
   - Could it mean transitioning the height of the error messages? "simple opacity/height swaps" -> yes, wrapping the error message in a container that expands its height from 0 to auto instead of abruptly appearing.
   - Wait, if `isEditing` is true, the composer has `initialSprint`. If it's a completely new sprint, it's not editing. But the prompt specifically says "transitions between 'Display' and 'Edit' modes". Could it be the `originalPrompt` display vs the `goal` edit?
   - I will wrap the error message and any conditionally rendered UI (like originalPrompt) in a smooth transition. I will also add a GSAP Flip for the layout when adding/removing the original prompt or switching grids. Actually, simple CSS `grid-template-rows` for height transitions is better.

4. **AvantgardeSelect Keyboard Feedback:**
   - In `AvantgardeSelect.tsx`, update the scroll behavior to `block: "nearest", behavior: "smooth"`.
   - Update focus classes (e.g., `focus-visible:ring-signal-500/50`) to ensure clear visual focus.

Let's refine part 3. I will request review.
