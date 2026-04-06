import { test, expect } from '@playwright/test';

test('[ key does not crash the page', async ({ page }) => {
  await page.goto('/');
  // Just verify the key doesn't crash
  await page.keyboard.press('[');
  await expect(page.locator('main')).toBeVisible();
});

test('] key does not crash the page', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press(']');
  await expect(page.locator('main')).toBeVisible();
});

test('SiteSwitcher renders projects and end users only', async ({ page }) => {
  await page.goto('/');
  const switcher = page.locator('.site-switcher');
  await expect(switcher).toBeVisible();
  await expect(switcher).toContainText('Projects');
  await expect(switcher).toContainText('Members');
  await expect(switcher).not.toContainText('People');
});
