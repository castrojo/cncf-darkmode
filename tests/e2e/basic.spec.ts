import { test, expect } from '@playwright/test';

test('page loads without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('./');
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});

test('member cards render on Everyone tab @endusers', async ({ page }) => {
  await page.goto('./');
  const cards = page.locator('.member-card, .card, [data-member]');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(0);
});

test('page has correct title @endusers', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle(/CNCF End Users/i);
});
