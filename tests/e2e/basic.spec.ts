import { test, expect } from '@playwright/test';

// Generic: runs on all sections (projects + endusers)
test('page loads without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('./');
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});

// Endusers-specific: member cards and tabs only exist on the members section
test('member cards render on Everyone tab @endusers', async ({ page }) => {
  await page.goto('./');
  const cards = page.locator('.member-card, .card, [data-member]');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(0);
});

// Endusers-specific: page title is "CNCF End Users" only on the members section
test('page has correct title @endusers', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle(/CNCF End Users/i);
});
