import { test, expect } from '@playwright/test';

test.describe('AgentAvatarScene E2E Tests', () => {
  test('should render the WebGL canvas when WebGL is supported', async ({ page }) => {
    // Navigate to agents page
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // If no agents exist (empty state), create one to display the customizer detail panel
    const createFirstBtn = page.getByRole('button', { name: 'Create First Agent' });
    const newAgentBtn = page.getByRole('button', { name: 'New Agent' });
    if (await createFirstBtn.isVisible()) {
      await createFirstBtn.click();
    } else if (await newAgentBtn.isVisible()) {
      await newAgentBtn.click();
    }

    // Assert that the 3D scene container is rendered and contains a canvas
    const avatarScene = page.locator('[data-testid="agent-avatar-scene"]');
    await expect(avatarScene).toBeVisible();

    const canvas = avatarScene.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should render fallback UI (SVG) when WebGL is unsupported or fails', async ({ page }) => {
    // Inject script to disable WebGL support before the page loads
    await page.addInitScript(() => {
      // Mock HTMLCanvasElement.prototype.getContext to return null for webgl/webgl2 contexts
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          return null;
        }
        return originalGetContext.apply(this, [type, ...args]);
      } as any;
    });

    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Create an agent if necessary
    const createFirstBtn = page.getByRole('button', { name: 'Create First Agent' });
    const newAgentBtn = page.getByRole('button', { name: 'New Agent' });
    if (await createFirstBtn.isVisible()) {
      await createFirstBtn.click();
    } else if (await newAgentBtn.isVisible()) {
      await newAgentBtn.click();
    }

    // Verify that the fallback SVG container is rendered instead of the WebGL canvas
    const fallbackSvg = page.locator('[data-testid="agent-avatar-fallback"]');
    await expect(fallbackSvg).toBeVisible();

    const avatarScene = page.locator('[data-testid="agent-avatar-scene"]');
    await expect(avatarScene).not.toBeVisible();
  });
});
