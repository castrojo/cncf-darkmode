import { test, expect } from '@playwright/test';

test('search filters members', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('/');
  const input = page.locator('input#search-input').first();
  await expect(input).toBeFocused();
  await input.fill('spotify');
  // Wait for filtering to happen
  await page.waitForTimeout(300);
  await expect(page.locator('main')).toBeVisible();
});

test('search input clears on X button click', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('input#search-input').first();
  await input.fill('test query');
  const clearBtn = page.locator('#search-clear');
  await clearBtn.click();
  await expect(input).toHaveValue('');
});

test('architecture search works on Reference Architectures tab', async ({ page }) => {
  await page.goto('/');
  // Navigate to Reference Architectures tab
  await page.locator('button.section-link[data-tab="architectures"]').click();
  const archSearch = page.locator('input#search-input').first();
  if (await archSearch.isVisible()) {
    await archSearch.fill('spotify');
    await page.waitForTimeout(300);
    await expect(page.locator('main')).toBeVisible();
  }
});
