import { test, expect } from '@playwright/test';

const SITES = [
  { name: 'projects', url: 'http://localhost:4322/cncf-darkmode/' },
  { name: 'members', url: 'http://localhost:4324/cncf-darkmode/members/' },
];

for (const site of SITES) {
  test(`${site.name}: loads and renders primary content`, async ({ page }) => {
    await page.goto(site.url);
    await expect(page.locator('main .main-content')).toBeVisible();
    await expect(page.locator('#search-input')).toBeVisible();
  });

  test(`${site.name}: keyboard "/" focuses search input`, async ({ page }) => {
    await page.goto(site.url);
    await page.keyboard.press('/');
    await expect(page.locator('#search-input')).toBeFocused();
  });

  test(`${site.name}: keyboard help opens with "?" and closes with Escape`, async ({ page }) => {
    await page.goto(site.url);
    await page.keyboard.press('?');
    await expect(page.locator('#keyboard-help-modal')).toHaveClass(/visible/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#keyboard-help-modal')).not.toHaveClass(/visible/);
  });

  test(`${site.name}: numeric tab shortcut activates tab 2`, async ({ page }) => {
    await page.goto(site.url);
    await page.keyboard.press('2');
    await expect(page.locator('.section-link[data-tab]').nth(1)).toHaveClass(/active/);
  });
}
