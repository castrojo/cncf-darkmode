import { test, expect } from '@playwright/test';

test('/ key focuses search input', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('/');
  const input = page.locator('input#search-input').first();
  await expect(input).toBeFocused();
});

test('? key opens keyboard help modal', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('?');
  await expect(page.locator('#keyboard-help-modal')).toBeVisible();
});

test('Escape closes keyboard help modal', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('?');
  await expect(page.locator('#keyboard-help-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#keyboard-help-modal')).not.toBeVisible();
});

test('t key toggles theme', async ({ page }) => {
  await page.goto('./');
  const before = await page.locator('html').getAttribute('data-theme');
  await page.keyboard.press('t');
  const after = await page.locator('html').getAttribute('data-theme');
  expect(before).not.toBe(after);
});

test('digit keys 1-6 switch tabs @endusers', async ({ page }) => {
  await page.goto('./');
  const tabKeys = ['1', '2', '3', '4', '5', '6'];
  const tabIds  = ['everyone', 'platinum', 'gold', 'silver', 'academic', 'architectures'];
  for (let i = 0; i < tabKeys.length; i++) {
    await page.keyboard.press(tabKeys[i]);
    await expect(page.locator(`button.section-link[data-tab="${tabIds[i]}"]`)).toHaveClass(/active/);
  }
});
