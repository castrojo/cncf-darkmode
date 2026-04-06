import { test, expect } from '@playwright/test';

test('SiteSwitcher renders projects, end users, and people', async ({ page }) => {
  await page.goto('./');
  const switcher = page.locator('.site-switcher');
  await expect(switcher).toBeVisible();
  await expect(switcher).toContainText('Projects');
  await expect(switcher).toContainText('End Users');
  await expect(switcher).toContainText('People');
  await expect(switcher.locator('a', { hasText: 'People' })).toHaveAttribute(
    'href',
    /(^\/people-website\/$)|(^http:\/\/localhost:4323\/people-website\/$)/,
  );
});
