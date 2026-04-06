import { test, expect } from '@playwright/test';

test('search returns results for a known project token', async ({ page }) => {
  await page.goto('./');
  const cards = page.locator('#cards-container .changelog-event-card');
  await expect(cards.first()).toBeVisible();
  const initialCount = await cards.count();
  expect(initialCount).toBeGreaterThan(0);

  const nameNodes = page.locator('#cards-container .changelog-event-card .card-name');
  await expect(nameNodes.first()).toBeVisible();
  const firstProjectName = (await nameNodes.first().textContent())?.trim() ?? '';
  const token = firstProjectName.split(/\s+/).find((part) => part.length >= 3) ?? firstProjectName;
  expect(token.length).toBeGreaterThan(0);

  const input = page.locator('#search-input');
  await input.fill(token);
  await page.waitForTimeout(250);

  const filteredCount = await cards.count();
  expect(filteredCount).toBeGreaterThan(0);
  expect(filteredCount).toBeLessThanOrEqual(initialCount);
  await expect(page.locator('#no-results')).toBeHidden();
});

test('search shows empty state for unknown query', async ({ page }) => {
  await page.goto('./');
  const input = page.locator('#search-input');
  await expect(input).toBeVisible();
  await input.fill('qzxwvvqzxwv12345');
  await page.waitForTimeout(250);
  await expect(page.locator('#cards-container .changelog-event-card')).toHaveCount(0);
  await expect(page.locator('#no-results')).toBeVisible();
});

test('Escape clears search input', async ({ page }) => {
  await page.goto('./');
  const input = page.locator('#search-input');
  await input.fill('kubernetes');
  await page.keyboard.press('Escape');
  await expect(input).toHaveValue('');
});
