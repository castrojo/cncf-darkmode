import { test, expect } from '@playwright/test';

test('/ key focuses search', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('/');
  const input = page.locator('#search-input');
  await expect(input).toBeFocused();
});

test('? key opens keyboard help', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('?');
  // Help dialog/panel should be visible
  await expect(page.locator('#keyboard-help-modal, [role="dialog"], .keyboard-help')).toBeVisible();
});

test('t key toggles theme', async ({ page }) => {
  await page.goto('./');
  const theme1 = await page.locator('html').getAttribute('data-theme');
  await page.keyboard.press('t');
  const theme2 = await page.locator('html').getAttribute('data-theme');
  expect(theme1).not.toBe(theme2);
});
