import { test, expect } from '@playwright/test';

test('logo is 42×42px via getBoundingClientRect', async ({ page }) => {
  await page.goto('/');
  const logo = page.locator('.cncf-logo-wrapper img').first();
  await expect(logo).toBeVisible();
  const rect = await logo.boundingBox();
  expect(rect).not.toBeNull();
  expect(Math.abs(rect!.width - 42)).toBeLessThan(3);
  expect(Math.abs(rect!.height - 42)).toBeLessThan(3);
});

test('site title is single line', async ({ page }) => {
  await page.goto('/');
  const el = page.locator('.site-title').first();
  await expect(el).toBeVisible();
  const box = await el.boundingBox();
  expect(box?.height).toBeLessThan(50);
});

test('site title contains CNCF End Users', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.site-title')).toContainText('CNCF End Users');
});

test('header is sticky (position sticky)', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('.site-header').first();
  const position = await header.evaluate(el => getComputedStyle(el).position);
  expect(position).toBe('sticky');
});
