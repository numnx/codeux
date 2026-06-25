# Secondary Pages Design System

This document outlines the operational design language and unified visual standards applied across secondary routes (e.g., Scheduler, Knowledge, File Browser, and Error pages) in the Code UX dashboard. This ensures visual coherence with primary surfaces (Projects, Tasks, Browser) while respecting each view's specialized intent.

## 1. Page Framing

All secondary pages must use the core `PageContainer` component rather than raw `div` structures with manual screen heights to ensure consistent max-width constraining and safe areas.

* **Padding**: Use `padding="standard"` or `padding="workbench"` appropriately based on content density.
* **Avoid full bleed manual constraints**: Do not use `h-screen w-full relative bg-transparent`. Rely on `PageContainer`.

## 2. Page Headers

Page headers form the top-level orientation architecture and must follow a precise structural pattern. Do not invent arbitrary text hierarchies.

* **Eyebrow**: Secondary pages must use the unified signal eyebrow component at the top of the header hierarchy.
  ```tsx
  <div className="inline-flex items-center gap-2 rounded-full border border-signal-500/20 bg-signal-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-signal-600 dark:text-signal-400">
    <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
    Page Context Label
  </div>
  ```
* **Title with Watermark**:
  ```tsx
  <div className="relative overflow-hidden">
    <h2 aria-hidden className="absolute -top-10 -left-3 text-[7rem] font-black tracking-tighter text-black/[0.04] dark:text-white/[0.03] pointer-events-none select-none font-display leading-none">
      WATERMARK
    </h2>
    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 dark:text-white leading-[0.92] font-display relative z-10">
      Title Content
    </h1>
  </div>
  ```

## 3. Surface Containers (Panels & Cards)

All main structural containers, side panels, data grids, and empty states must align on the standard "frosted glass" layered surface variables.

* **Base Class String**: `rounded-[1.75rem] border border-black/[0.06] bg-white/70 shadow-[0_2px_20px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/[0.06] dark:bg-void-800/60 dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]`
* Use internal padding of `p-4`, `p-6`, or `p-8` based on density needs.

### Modals and Transient Overlays
Modals and dialogue windows require slightly distinct shadowing and rounding (standardized to `2xl` instead of `1.75rem`) to sit effectively on top of the Z-stack.

* **Base Modal Class**: `rounded-2xl border border-black/[0.08] bg-white p-6 shadow-2xl dark:border-white/[0.08] dark:bg-void-800`

## 4. Dense List Typography & Affordances

When displaying data-heavy surfaces (file trees, knowledge bases, change lists), rely on restrained mono typography and explicit row selection states. Do not use decorative text shadows or gradients here.

* **List File/Folder Metadata**: Use `font-mono text-[12px] font-medium` for dense programmatic labels to increase parsing legibility.
* **Row Selection Styling**:
  * Selected row: `bg-signal-500/[0.08] ring-1 ring-inset ring-signal-500/20`
  * Unselected (hover): `hover:bg-black/[0.04] dark:hover:bg-white/[0.05]`

## 5. Empty and Error States

Avoid stark layout breaks when no data is present. Empty lists, diff viewers, and 404 views must retain structural continuity.

* **Empty Panels**: Instead of raw floating text, wrap empty placeholder states in the standard Surface Container (Section 3) with a centralized alignment context (`flex-col items-center justify-center text-center px-8 py-12`).
* **Error Actions**: Recovery mechanisms (like "Go Home" or "Retry") must map to the standardized primary action button format:
  ```tsx
  <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-signal-500 px-5 text-sm font-bold text-slate-900 hover:bg-signal-400 transition-colors">
    Action
  </Link>
  ```
