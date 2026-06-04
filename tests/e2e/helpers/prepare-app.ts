import type { APIRequestContext } from '@playwright/test';

// A freshly-checked-out server (as in CI) starts with the first-run onboarding
// overlay open and no projects. The overlay is a full-screen layer that
// intercepts pointer events, so any spec that clicks app UI must dismiss it
// first. These helpers drive the same server APIs the dashboard uses, so the
// state is applied before the page loads it.

export async function completeOnboarding(request: APIRequestContext): Promise<void> {
  // Marks onboarding complete server-side; GET /api/user/onboarding then reports
  // `completed: true`, so OnboardingExperience never opens the overlay.
  await request.post('/api/user/onboarding/complete');
}

export async function ensureProjectExists(request: APIRequestContext): Promise<void> {
  const res = await request.get('/api/projects');
  const body = (await res.json()) as { projects?: unknown[] };
  if (Array.isArray(body.projects) && body.projects.length > 0) {
    return;
  }
  // The repo checkout itself is a valid local source for an "existing" project.
  await request.post('/api/projects', {
    data: { name: 'E2E Test Project', sourceType: 'local', sourceRef: process.cwd() },
  });
}
