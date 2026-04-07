import { test, expect, type Page } from '@playwright/test';

// All search tests are endusers-specific: members grid and member cards only exist on the members section
test.describe('@endusers', () => {

async function gotoMembersEveryone(page: Page) {
  await page.goto('./');
  await page.locator('.section-link[data-tab="everyone"]').click();
}

test('search returns results for a known member token', async ({ page }) => {
  await gotoMembersEveryone(page);
  const cards = page.locator('#members-grid .member-card');
  await expect(cards.first()).toBeVisible();
  const initialCount = await cards.count();
  expect(initialCount).toBeGreaterThan(0);

  const firstName = (await cards.first().locator('.card-name').first().textContent())?.trim() ?? '';
  const token = firstName.split(/\s+/).find((part) => part.length >= 3) ?? firstName;
  expect(token.length).toBeGreaterThan(0);

  const input = page.locator('#search-input');
  await input.fill(token);
  await page.waitForTimeout(250);

  const filteredCount = await cards.count();
  expect(filteredCount).toBeGreaterThan(0);
  expect(filteredCount).toBeLessThanOrEqual(initialCount);
  await expect(page.locator('#no-results')).toBeHidden();
});

test('search input clears on X button click', async ({ page }) => {
  await gotoMembersEveryone(page);
  const input = page.locator('input#search-input').first();
  await input.fill('test query');
  const clearBtn = page.locator('#search-clear');
  await clearBtn.click();
  await expect(input).toHaveValue('');
});

test('search shows empty state for unknown member query', async ({ page }) => {
  await gotoMembersEveryone(page);
  const input = page.locator('#search-input');
  await input.fill('qzxwvvqzxwv12345');
  await page.waitForTimeout(250);
  await expect(page.locator('#members-grid')).toBeHidden();
  await expect(page.locator('#no-results')).toBeVisible();
});

}); // end @endusers describe
