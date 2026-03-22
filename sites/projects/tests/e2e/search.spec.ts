import { test, expect } from '@playwright/test';

test('search input is visible and accepts input', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('#search-input');
  await expect(input).toBeVisible();
  await input.fill('kubernetes');
  await expect(input).toHaveValue('kubernetes');
});

test('/ key focuses search input', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('/');
  const input = page.locator('#search-input');
  await expect(input).toBeFocused();
});

test('Escape clears search input', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('#search-input');
  await input.fill('kubernetes');
  await page.keyboard.press('Escape');
  await expect(input).toHaveValue('');
});
