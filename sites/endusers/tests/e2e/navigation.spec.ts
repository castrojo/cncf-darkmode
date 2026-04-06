import { test, expect } from '@playwright/test';

test('j/k keys do not crash page (card navigation)', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('j');
  await expect(page.locator('main')).toBeVisible();
  await page.keyboard.press('k');
  await expect(page.locator('main')).toBeVisible();
});

test('Tab key cycles through section tabs without crashing', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.locator('main')).toBeVisible();
});
