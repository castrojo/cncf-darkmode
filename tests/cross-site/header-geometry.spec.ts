import { test, expect } from '@playwright/test';

const SITES = [
  { name: 'projects', url: 'http://localhost:4322/cncf-darkmode/' },
  { name: 'members', url: 'http://localhost:4324/cncf-darkmode/members/' },
];

const LOGO_SIZE = 42;
const TOLERANCE = 3;
const MAX_TITLE_HEIGHT = 40; // single-line title

for (const site of SITES) {
  test(`${site.name}: logo is ${LOGO_SIZE}×${LOGO_SIZE}px (±${TOLERANCE}px)`, async ({ page }) => {
    await page.goto(site.url);
    const logo = page.locator('.cncf-logo-wrapper img, header img[alt*="CNCF" i]').first();
    await expect(logo).toBeVisible();
    const rect = await logo.boundingBox();
    expect(rect).not.toBeNull();
    expect(Math.abs(rect!.width - LOGO_SIZE)).toBeLessThan(TOLERANCE);
    expect(Math.abs(rect!.height - LOGO_SIZE)).toBeLessThan(TOLERANCE);
  });

  test(`${site.name}: site title is single-line (height < ${MAX_TITLE_HEIGHT}px)`, async ({ page }) => {
    await page.goto(site.url);
    const title = page.locator('.site-title, header h1').first();
    await expect(title).toBeVisible();
    const box = await title.boundingBox();
    expect(box?.height).toBeLessThan(MAX_TITLE_HEIGHT);
  });

  test(`${site.name}: SiteSwitcher is visible and has correct links`, async ({ page }) => {
    await page.goto(site.url);
    const switcher = page.locator('.site-switcher, [data-site-switcher], nav[aria-label*="site" i]').first();
    await expect(switcher).toBeVisible();
    await expect(switcher).toContainText('Projects');
    await expect(switcher).toContainText('End Users');
    await expect(switcher).toContainText('People');
    await expect(switcher.locator('a', { hasText: 'People' })).toHaveAttribute(
      'href',
      /(^\/cncf-darkmode\/people\/$)|(^http:\/\/localhost:4322\/cncf-darkmode\/people\/$)/,
    );
  });

  test(`${site.name}: header layout does not overflow viewport`, async ({ page }) => {
    await page.goto(site.url);
    const header = page.locator('header').first();
    const headerBox = await header.boundingBox();
    const viewportSize = page.viewportSize();
    expect(headerBox!.width).toBeLessThanOrEqual(viewportSize!.width + 1);
  });
}

test('header height is consistent across sites (within 5px)', async ({ browser }) => {
  const heights: number[] = [];
  for (const site of SITES) {
    const page = await browser.newPage();
    await page.goto(site.url);
    const header = page.locator('header').first();
    const box = await header.boundingBox();
    if (box) heights.push(box.height);
    await page.close();
  }
  expect(heights).toHaveLength(SITES.length);
  const min = Math.min(...heights);
  const max = Math.max(...heights);
  expect(max - min).toBeLessThan(5); // headers within 5px of each other
});

test('header-left is ~240px wide on both sites (±10px)', async ({ browser }) => {
  for (const site of SITES) {
    const page = await browser.newPage();
    await page.goto(site.url);
    const left = page.locator('.header-left').first();
    await expect(left).toBeVisible();
    const box = await left.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.width - 240)).toBeLessThanOrEqual(10);
    await page.close();
  }
});

test('ThemeToggle X position is consistent across sites (within 10px)', async ({ browser }) => {
  const xs: number[] = [];
  for (const site of SITES) {
    const page = await browser.newPage();
    await page.goto(site.url);
    const toggle = page.locator('#theme-toggle').first();
    await expect(toggle).toBeVisible();
    const box = await toggle.boundingBox();
    if (box) xs.push(box.x);
    await page.close();
  }
  expect(xs).toHaveLength(SITES.length);
  expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(10);
});
