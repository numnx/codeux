---
name: git-merge-conflict-resolution
description: Procedure for resolving Git merge conflicts between feature branches in a TypeScript/React project with strict quality gates
source: auto-skill
extracted_at: '2026-06-01T00:45:29.937Z'
---

# Git Merge Conflict Resolution for TypeScript/React Projects

Use this procedure when resolving merge conflicts in a TypeScript/React project where both branches modify overlapping areas of the same component.

## Steps

### 1. Assess the merge state

Run `git status` to identify:
- The current branch (HEAD)
- Unmerged paths (conflicted files)
- Staged changes that carried over from the merge

Read `git diff HEAD -- <conflicted-file>` to see the conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>>`) alongside the surrounding context.

### 2. Understand what each branch changed

Before resolving, map each change zone:

- **HEAD side** (your branch's changes): identify imports, hooks, computed variables, and JSX blocks.
- **Incoming side** (the target branch): identify the same categories.

Group changes into orthogonal concerns:
- **Imports**: If both branches add imports, keep all of them unless they conflict.
- **Logic/computed values**: Variables and hooks from both sides usually coexist.
- **JSX rendering**: This is where semantic conflicts usually live — two branches may change the same wrapping condition, positioning, or child element wrapper.

### 3. Merge each conflict zone deliberately

For **imports**: Before retaining imports from both sides, verify each import is actually referenced in the file body by running `grep -n '<imported-name>' <file>` for each imported symbol. Only keep imports that are used — unused imports can remain from stale code that was already removed. Concatenate both sets of truly-used import lines, preserving whitespace conventions (blank line between groups is allowed).

For **JSX blocks**: Decide on a merge strategy:
- **Condition gate**: Choose the semantically correct gate (e.g., `showInterventionBadge` from a presentation mapper rather than raw `humanIntervention`), then layer T04's wrapper/presentation changes (e.g., pulse div, repositioning classes) on top.
- **Positioning/classes**: Accept the newer or more specific version when one supersedes the other.
- **Wrappers**: Wrap the condition's child element(s) with the incoming branch's wrapper if it adds animation or accessibility improvements.

### 4. Verify no conflict markers remain

Run `grep -n '<<<<<<<\\|=======\\|>>>>>>>' <resolved-file>` — exit code 1 (no matches) means clean.

### 4a. Resolve lockfile and workspace configuration conflicts

When conflicts occur in `pnpm-lock.yaml`, `yarn.lock`, or `pnpm-workspace.yaml`:

1. **Avoid manual resolution**: Lockfiles are machine-generated and complex. Manual edits frequently break the dependency graph.
2. **Use `--theirs`**: In a feature branch merge, the incoming branch (the one you are merging in) typically contains the updated dependency requirements for the new features. Use `git checkout --theirs <lockfile>` to accept the incoming dependency state.
3. **Re-sync the workspace**: After accepting the lockfile changes, run `pnpm install` (use `corepack enable` first if you encounter environment issues) to ensure `node_modules` matches the lockfile and that any local changes to `package.json` are properly integrated.
4. **Verify**: Ensure `pnpm install` completes without errors and that the workspace is consistent.

### 5. Stage and run quality gates

```bash
git add <resolved-file>
npm install          # if deps weren't available
npm run typecheck
npm run lint
npx vitest run <focused-test-file>  # test the affected module
npm run build
```

All gates must pass (exit 0) before committing.

### 6. Commit with conventional commit message

```bash
git commit -m "fix(merge): resolve <branch-A>/<branch-B> conflict in <component>, preserve <feature-A> + <feature-B>"
```

### 7. Leave branch in a pushable state

- Do not open a new PR or rewrite history.
- Branch is ready for `git push`.
- Write `.task-learnings.md` capturing architecture, decisions, and patterns from the resolution.