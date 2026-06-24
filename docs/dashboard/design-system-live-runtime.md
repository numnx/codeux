# Live Runtime Design System

The Live Session page and its constituent runtime surfaces (SprintStatsDeck, SprintDag, SprintBoatRace, ExecutionRuntimePanel, AttentionLedger, and LiveTaskCard) function as the operational command surface for Code UX.

## Core Philosophy: Calm High-Trust Command Surface

When a user is viewing a live sprint, they are often monitoring complex, multi-agent processes under pressure. The visual design must prioritize scanability, state clarity, and structural stability over decorative flourish.

- **Restraint:** Avoid heavy visual noise. Do not use decorative glowing radial gradients (`dag-aurora`), dotted grid backgrounds (`dag-grid-pan`), pinging animations (except for explicitly localized, small state indicators), or complex layered shadows (like `shadow-[0_2px_20px_rgba(...)]`).
- **Subtlety:** Use standard `shadow-sm`, simple border lines (`border-black/[0.04]`), and translucent surface backgrounds (`bg-white/80 backdrop-blur-sm`).
- **No Floating Decorations:** Remove abstract programmatic canvas or SVG overlays like `WaveFluid` or `BorderTrace` from all live runtime cards and panels.

## State Presentation Hierarchy

Visual states (idle, active, paused, error) must be distinct but restrained so that true emergencies (like a stalled dispatch or CI error) stand out.

### 1. Idle / Waiting (No Sprint Context)
- **Backgrounds:** Simple, flat or very subtly tinted borders (e.g., `border-black/[0.04]`).
- **Icons:** Static or pulsing gently. Do not use large, screen-filling pinging circles.
- **Text:** Slate or muted colors explaining the requirement to start a sprint.

### 2. Active / Running
- **Borders:** When a task or sprint is actively executing, use the defined brand accent border color (e.g. `cfg.border` like `border-signal-500/30`) directly on the container.
- **Backgrounds:** Use a very subtle permanent tint (e.g. `bg-black/[0.01]`) rather than animated waves or traces.
- **Motion:** Use motion sparingly. Use `motion-safe:animate-spin` on loader icons rather than raw `animate-spin` to respect accessibility preferences.

### 3. Paused / Intervention
- **Colors:** Use amber/yellow status tones.
- **Indicators:** Rely on the `HumanInterventionBadge` or clear typography. Avoid shaking or flashing elements.

### 4. Error / Failed
- **Colors:** Use red status tones (`border-status-red/30`, `bg-status-red/[0.04]`).
- **Grouping:** Ensure errors in lists (like the `RuntimeEventFeed`) are separated clearly (e.g. simple left borders) without flooding the row with heavy backgrounds.

## Layout Stability

- **Header Switching:** The framing of the DAG, Boat Race, and Stats views must remain geometrically stable when the user toggles between them. Do not change padding, corner radius (`rounded-[2rem]`), or container shadow significantly between views.
- **Card Geometry:** Live task cards and attention items must maintain predictable dimensions. Avoid collapsing/expanding animations that reflow the entire page abruptly unless triggered explicitly by the user (like expanding a prompt).