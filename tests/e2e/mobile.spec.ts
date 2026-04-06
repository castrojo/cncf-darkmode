import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORTS = [
  { name: 'mobile-sm', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
];

for (const viewport of MOBILE_VIEWPORTS) {
  test(`[${viewport.name}] page renders without horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('./');
    // Check for horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // allow 5px tolerance
  });

  test(`[${viewport.name}] main content is visible`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('./');
    await expect(page.locator('main')).toBeVisible();
  });

  test(`[${viewport.name}] search input is reachable`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('./');
    const input = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    // Either visible directly or accessible via tap
    const isVisible = await input.isVisible().catch(() => false);
    expect(isVisible).toBe(true);
  });
}
