import { test, expect } from '@playwright/test';

test('SiteSwitcher renders projects and end users only', async ({ page }) => {
  await page.goto('./');
  const switcher = page.locator('.site-switcher');
  await expect(switcher).toBeVisible();
  await expect(switcher).toContainText('Projects');
  await expect(switcher).toContainText('End Users');
  await expect(switcher).not.toContainText('People');
});
