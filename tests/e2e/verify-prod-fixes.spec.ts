import { test, expect } from '@playwright/test';

const PROD_MEMBERS = 'https://castrojo.github.io/cncf-darkmode/members/';

test.describe('@prod-verification', () => {
  test('keyboard shortcuts work: t key toggles theme', async ({ page }) => {
    await page.goto(PROD_MEMBERS);
    await page.waitForLoadState('networkidle');
    const before = await page.locator('html').getAttribute('data-theme');
    await page.keyboard.press('t');
    const after = await page.locator('html').getAttribute('data-theme');
    expect(before).not.toBe(after);
  });

  test('keyboard shortcuts work: / key focuses search', async ({ page }) => {
    await page.goto(PROD_MEMBERS);
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('/');
    await expect(page.locator('#search-input')).toBeFocused();
  });

  test('search empty state: nonsense query hides grid and shows no-results', async ({ page }) => {
    await page.goto(PROD_MEMBERS);
    await page.waitForLoadState('networkidle');
    await page.locator('.section-link[data-tab="everyone"]').click();
    const input = page.locator('#search-input');
    await input.fill('qzxwvvqzxwv12345');
    await page.waitForTimeout(300);
    await expect(page.locator('#members-grid')).toBeHidden();
    await expect(page.locator('#no-results')).toBeVisible();
  });

  test('mobile: no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(PROD_MEMBERS);
    await page.waitForLoadState('networkidle');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const vp = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(vp + 5);
  });
});
