# JULES WORKER — TECHNICAL BASELINE

This guide defines the engineering standard for Jules workers.

## 1. Purpose
- Complete each sprint with production-grade quality.
- End every sprint with Playwright validation and zero untriaged console/page errors.
- Target award-level execution in both frontend and backend code.

## 2. Mandatory End-of-Sprint Quality Gate
A sprint subtask is not complete until these commands pass locally:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:integration`
- `pnpm test:e2e` (Playwright)

## 3. Playwright Standard
- **Minimum Coverage**: One happy-path and one negative/edge scenario for new critical flows.
- **Global Failure Conditions**: Fail on `pageerror` or unexpected `console.error`.

## 4. Coding Standards
- **TypeScript**: Strict mode, avoid `any`.
- **Structure**: Organize by domain; separate transport, domain logic, and persistence.
- **APIs**: Validate all external input; use consistent error formats.
- **Data**: Migration files for every schema change; forward-safe and rollback-aware.
- **Frontend**: Reusable primitives, deterministic rendering, handle loading/error states.
- **Presentation**: Visual identity and craft quality must be high (layout, typography, motion).

## 5. Security & Compliance
- Enforce auth/RBAC checks server-side.
- No secrets in code or logs.
- Audit all critical writes.

## 6. Git Workflow
- Subtasks work on their own branches created from the main feature branch.
- Commits: Small units (feat, fix, chore, test, docs).
- Commit style: `feat(sprint-<n>): ...`, `fix(sprint-<n>): ...`.
- PR creation: Use `gh pr create` with a summary of the task and test evidence.
