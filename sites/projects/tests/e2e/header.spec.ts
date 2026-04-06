import { test, expect } from '@playwright/test';

test('logo is approximately 42×42px', async ({ page }) => {
  await page.goto('./');
  const logo = page.locator('.cncf-logo-wrapper img').first();
  await expect(logo).toBeVisible();
  const rect = await logo.boundingBox();
  expect(rect).not.toBeNull();
  // Allow ±4px tolerance for subpixel rendering
  expect(Math.abs(rect!.width - 42)).toBeLessThan(4);
  expect(Math.abs(rect!.height - 42)).toBeLessThan(4);
});

test('site title is single line (no wrap)', async ({ page }) => {
  await page.goto('./');
  const el = page.locator('.site-title').first();
  await expect(el).toBeVisible();
  const box = await el.boundingBox();
  // A wrapped title would be taller; single line should be under 48px
  expect(box?.height).toBeLessThan(48);
});

test('header is visible and contains CNCF branding', async ({ page }) => {
  await page.goto('./');
  const header = page.locator('.site-header');
  await expect(header).toBeVisible();
  const title = page.locator('.site-title');
  await expect(title).toContainText('CNCF');
});
