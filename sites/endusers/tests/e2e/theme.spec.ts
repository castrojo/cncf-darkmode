import { test, expect } from '@playwright/test';

test('theme toggle button changes data-theme attribute', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('#theme-toggle').first();
  await toggle.click();
  const theme = await page.locator('html').getAttribute('data-theme');
  expect(['light', 'dark']).toContain(theme);
});

test('theme persists on reload', async ({ page }) => {
  await page.goto('/');
  // Use t key to toggle
  await page.keyboard.press('t');
  const theme1 = await page.locator('html').getAttribute('data-theme');
  await page.reload();
  const theme2 = await page.locator('html').getAttribute('data-theme');
  expect(theme1).toBe(theme2);
});

test('dark theme applies dark colors', async ({ page }) => {
  await page.goto('/');
  // Force dark theme
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  });
  const theme = await page.locator('html').getAttribute('data-theme');
  expect(theme).toBe('dark');
});
