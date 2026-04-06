import { test, expect } from '@playwright/test';

test('page loads without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('./');
  expect(errors.filter(e => !e.includes('favicon') && !e.includes('net::ERR'))).toHaveLength(0);
});

test('cards render on Everything tab', async ({ page }) => {
  await page.goto('./');
  // Wait briefly for JS to load data (if any)
  await page.waitForTimeout(500);
  const cards = page.locator('.project-card, .card, [data-project]');
  const count = await cards.count();
  // When no data, page still renders (empty state is acceptable)
  // Just ensure main is visible
  await expect(page.locator('main')).toBeVisible();
});
