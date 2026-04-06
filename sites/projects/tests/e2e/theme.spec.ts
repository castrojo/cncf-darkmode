import { test, expect } from '@playwright/test';

test('theme toggle button is visible', async ({ page }) => {
  await page.goto('./');
  const toggle = page.locator('#theme-toggle, [aria-label*="theme" i], .theme-toggle').first();
  await expect(toggle).toBeVisible();
});

test('theme toggle cycles through modes', async ({ page }) => {
  await page.goto('./');
  const toggle = page.locator('#theme-toggle, [aria-label*="theme" i], .theme-toggle').first();
  const theme1 = await page.locator('html').getAttribute('data-theme');
  await toggle.click();
  const theme2 = await page.locator('html').getAttribute('data-theme');
  expect(['light', 'dark']).toContain(theme2);
  expect(theme1).not.toBe(theme2);
});

test('theme persists on reload', async ({ page }) => {
  await page.goto('./');
  // Set theme via keyboard shortcut
  await page.keyboard.press('t');
  const theme1 = await page.locator('html').getAttribute('data-theme');
  await page.reload();
  const theme2 = await page.locator('html').getAttribute('data-theme');
  expect(theme1).toBe(theme2);
});
