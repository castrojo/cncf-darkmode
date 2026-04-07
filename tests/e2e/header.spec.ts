import { test, expect } from '@playwright/test';

// Generic: logo geometry applies on all sections
test('logo is 42×42px via getBoundingClientRect', async ({ page }) => {
  await page.goto('./');
  const logo = page.locator('.cncf-logo-wrapper img').first();
  await expect(logo).toBeVisible();
  const rect = await logo.boundingBox();
  expect(rect).not.toBeNull();
  expect(Math.abs(rect!.width - 42)).toBeLessThan(3);
  expect(Math.abs(rect!.height - 42)).toBeLessThan(3);
});

// Generic: site title layout applies on all sections
test('site title is single line', async ({ page }) => {
  await page.goto('./');
  const el = page.locator('.site-title').first();
  await expect(el).toBeVisible();
  const box = await el.boundingBox();
  expect(box?.height).toBeLessThan(50);
});

// Endusers-specific: only the members section says "CNCF End Users"
test('site title contains CNCF End Users @endusers', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.site-title')).toContainText('CNCF End Users');
});

// Generic: sticky header applies on all sections
test('header is sticky (position sticky)', async ({ page }) => {
  await page.goto('./');
  const header = page.locator('.site-header').first();
  const position = await header.evaluate(el => getComputedStyle(el).position);
  expect(position).toBe('sticky');
});
