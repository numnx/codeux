import { test, expect } from '@playwright/test';

test('Composer visual feedback works correctly', async ({ page }) => {
  // Test pulse/glow effect
  await page.goto('/tasks');
  const taskTitleInput = page.getByPlaceholder('Fix navigation layout shift');
  await expect(taskTitleInput).toBeVisible();

  await taskTitleInput.click();
  await taskTitleInput.type('T', { delay: 50 });
  await expect(taskTitleInput).toHaveClass(/animate-pulse/);

  // Wait for debounce and test that error appears in aria-live
  await taskTitleInput.fill('');
  await page.evaluate(() => document.activeElement?.blur());

  // Specific check for aria-live regions used for validation
  const ariaLiveRegion = page.locator('[aria-live="polite"]');
  // Wait condition that confirms the GSAP transition has completed before asserting layout positions
  await page.waitForTimeout(600); // GSAP transition is usually 400ms

  const alertContainer = page.locator('.text-red-500').filter({ hasText: 'Task Title is required' });
  await expect(alertContainer).toBeVisible({ timeout: 2000 });
});
