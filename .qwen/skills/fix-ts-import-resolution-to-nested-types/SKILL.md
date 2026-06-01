---
name: fix-ts-import-resolution-to-nested-types
description: Diagnose and fix TS2305 errors where a relative `../../types.js` import resolves to the wrong `types.ts` file because multiple type modules exist at different directory depths
source: auto-skill
extracted_at: '2026-06-01T06:13:07.296Z'
---

# Fix: TypeScript import resolution to wrong nested `types.ts` file

When CI fails with `TS2305: Module '"../../types.js"' has no exported member 'SomeType'`, the root cause is often that `../../types.js` resolves to **different** `types.ts` files depending on the directory depth of the importing file — and one of them does not export the requested type.

This is common in projects with layered directory structures where each layer has its own `types.ts`:
- `src/types.ts` (top-level types)
- `src/v2/types.ts` (v2-scoped types, possibly re-exporting from deeper contracts)

## Diagnosis

### 1. Read the error

```
dashboard/src/v2/components/chat/InvocationListCard.tsx(2,55):
error TS2305: Module '"../../types.js"' has no exported member 'EffectiveSettingsResponse'.
```

Note: the **importing file path** and the **missing type name**.

### 2. Determine what `../../types.js` actually resolves to

Count `..` segments relative to the importing file's directory:

```
Importing file:
  dashboard/src/v2/components/chat/InvocationListCard.tsx
                                  ^^^^^^^^^^^^^^^^^^^^
Directory of the file:            dashboard/src/v2/components/chat/

../../types.js                    → go up 2 levels from chat/
  dashboard/src/v2/components/    (first ..)
  dashboard/src/v2/               (second ..)
→ resolves to dashboard/src/v2/types.js
```

Now check if the resolved file exists at that path and grep for the type name:

```bash
grep 'EffectiveSettingsResponse' dashboard/src/v2/types.ts
```

### 3. Find where the type IS actually defined

Grep across the project for the type name:

```bash
grep -rn 'EffectiveSettingsResponse' dashboard/src/ --include='*.ts' --include='*.tsx'
```

Look for an `export type` or `export interface` / `export {` declaration, not just an import.

## Fix procedure

### 1. Count the correct depth to the right `types.ts`

If the type is in `src/types.ts`, and the importing file is at `src/v2/components/chat/InvocationListCard.tsx`, the correct relative path is:

```
src/types.ts                                 (target)
src/v2/components/chat/InvocationListCard.tsx (source)

../              → src/v2/components/
../              → src/v2/
../              → src/
```

That's three levels up: `../../../types.js`

### 2. Split the import line

If the importing file imports multiple types from `../../types.js`, some of which ARE available in the wrongly-resolved file, keep those and add a separate import for the missing type:

```typescript
// Before (one import, fails):
import type { ExecutionInvocationRecord, AgentPreset, EffectiveSettingsResponse } from "../../types.js";

// After (split into two, one per types.ts):
import type { ExecutionInvocationRecord, AgentPreset } from "../../types.js";    // resolved to v2/types.ts
import type { EffectiveSettingsResponse } from "../../../types.js";               // resolved to src/types.ts
```

### 3. Verify cross-references

Check that other files at the same depth handle the same type correctly. For example, if `hooks/use-project-effective-settings.ts` is one level higher than `components/chat/InvocationListCard.tsx`, its `../../types.js` resolves one level higher — which may be the correct target. This confirms the path-depth analysis:

```typescript
// dashboard/src/v2/hooks/use-project-effective-settings.ts imports from:
import type { EffectiveSettingsResponse } from "../../types.js";
// .. + .. = src/types.js ✓  (correct for this depth)
```

### 4. Validate

```bash
npm run typecheck     # must pass with zero errors
npm run build         # must pass
```

## Why this happens

Relative `../../` paths resolve differently from different directory depths:

| Importing file | `../../types.js` resolves to | Contains type? |
|---|---|---|
| `src/v2/hooks/foo.ts` (2 deep from v2) | `src/types.js` | ✅ Yes |
| `src/v2/lib/bar.ts` (2 deep from v2) | `src/types.js` | ✅ Yes |
| `src/v2/components/chat/baz.tsx` (3 deep from v2) | `v2/types.js` | ❌ No (v2 scope) |

Files at `hooks/` or `lib/` are only 1 level deep within `v2/` (`v2/hooks/ → ../ → v2/ → ../ → src/ = ../../`), while files in `components/chat/` are 2 levels deep (`v2/components/chat/ → ../ → components/ → ../ → v2/ → ../ → src/ = ../../../`). This one-level difference is easy to miss.

## When NOT to use this approach

- When the error is `TS2307: Cannot find module` — that's a path existence issue, not a resolution-to-wrong-file issue.
- When the type genuinely does not exist anywhere in the project (needs to be defined first).
- When the project is a single-level directory with only one `types.ts` file (then the error means the type was never exported).