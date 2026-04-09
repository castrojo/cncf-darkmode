/**
 * header-geometry.spec.ts
 *
 * Validates that shared header geometry contracts are consistent across all
 * three sections of the CNCF Landscape: projects, members, and people.
 *
 * SO-54: People section added to SITES matrix (GH #15).
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:4321/cncf-darkmode';

const SITES = [
  { name: 'projects', url: `${BASE}/` },
  { name: 'members',  url: `${BASE}/members/` },
  { name: 'people',   url: `${BASE}/people/` },
];

const LOGO_SIZE     = 42;
const TOLERANCE     = 3;
const MAX_TITLE_H   = 40; // px — single-line title

// ─── Per-site parametrised geometry tests ─────────────────────────────────────

for (const site of SITES) {
  test(`${site.name}: logo is ${LOGO_SIZE}×${LOGO_SIZE}px (±${TOLERANCE}px)`, async ({ page }) => {
    await page.goto(site.url);
    const logo = page.locator('.cncf-logo-wrapper img, header img[alt*="CNCF" i]').first();
    await expect(logo).toBeVisible();
    const rect = await logo.boundingBox();
    expect(rect).not.toBeNull();
    expect(Math.abs(rect!.width  - LOGO_SIZE)).toBeLessThan(TOLERANCE);
    expect(Math.abs(rect!.height - LOGO_SIZE)).toBeLessThan(TOLERANCE);
  });

  test(`${site.name}: site title is single-line (height < ${MAX_TITLE_H}px)`, async ({ page }) => {
    await page.goto(site.url);
    const title = page.locator('.site-title, header h1').first();
    await expect(title).toBeVisible();
    const box = await title.boundingBox();
    expect(box?.height).toBeLessThan(MAX_TITLE_H);
  });

  test(`${site.name}: SiteSwitcher is visible and links to all three sections`, async ({ page }) => {
    await page.goto(site.url);
    const switcher = page.locator('.site-switcher, [data-site-switcher], nav[aria-label*="site" i]').first();
    await expect(switcher).toBeVisible();
    await expect(switcher).toContainText('Projects');
    await expect(switcher).toContainText('End Users');
    await expect(switcher).toContainText('People');
    // People pill on non-People pages is a link; on the People page it is the active <span>
    const peopleTarget = site.name === 'people'
      ? switcher.locator('.switcher-pill.active', { hasText: 'People' })
      : switcher.locator('a', { hasText: 'People' });
    await expect(peopleTarget).toBeVisible();
    if (site.name !== 'people') {
      await expect(peopleTarget).toHaveAttribute(
        'href',
        /(^\/cncf-darkmode\/people\/$)|(^http:\/\/localhost:4321\/cncf-darkmode\/people\/$)/,
      );
    }
  });

  // AC-6: SiteSwitcher active-pill contract — exactly one active pill per page
  test(`${site.name}: SiteSwitcher has exactly one active pill`, async ({ page }) => {
    await page.goto(site.url);
    const switcher = page.locator('.site-switcher');
    await expect(switcher).toBeVisible();
    const activePills = switcher.locator('.switcher-pill.active');
    await expect(activePills).toHaveCount(1);
    // The active pill must correspond to the current site
    const label = site.name === 'projects' ? 'Projects'
                : site.name === 'members'  ? 'End Users'
                : 'People';
    await expect(activePills.first()).toContainText(label);
  });

  test(`${site.name}: header layout does not overflow viewport`, async ({ page }) => {
    await page.goto(site.url);
    const header     = page.locator('header').first();
    const headerBox  = await header.boundingBox();
    const viewport   = page.viewportSize();
    expect(headerBox!.width).toBeLessThanOrEqual(viewport!.width + 1);
  });

  test(`${site.name}: ThemeToggle is visible in the header`, async ({ page }) => {
    await page.goto(site.url);
    const toggle = page.locator('#theme-toggle').first();
    await expect(toggle).toBeVisible();
  });

  test(`${site.name}: search input is visible in the header`, async ({ page }) => {
    await page.goto(site.url);
    const input = page.locator('#search-input');
    await expect(input).toBeVisible();
  });
}

// ─── Cross-site consistency checks ────────────────────────────────────────────

test('header height is consistent across all three sites (within 5px)', async ({ browser }) => {
  const heights: number[] = [];
  for (const site of SITES) {
    const page = await browser.newPage();
    await page.goto(site.url);
    const header = page.locator('header').first();
    const box    = await header.boundingBox();
    if (box) heights.push(box.height);
    await page.close();
  }
  expect(heights).toHaveLength(SITES.length);
  const diff = Math.max(...heights) - Math.min(...heights);
  expect(diff).toBeLessThan(5);
});

test('header-left width is ~240px across all three sites (±10px)', async ({ browser }) => {
  for (const site of SITES) {
    const page = await browser.newPage();
    await page.goto(site.url);
    const left = page.locator('.header-left').first();
    await expect(left).toBeVisible();
    const box  = await left.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.width - 240)).toBeLessThanOrEqual(10);
    await page.close();
  }
});

test('ThemeToggle X position is consistent across all three sites (within 10px)', async ({ browser }) => {
  const xs: number[] = [];
  for (const site of SITES) {
    const page   = await browser.newPage();
    await page.goto(site.url);
    const toggle = page.locator('#theme-toggle').first();
    await expect(toggle).toBeVisible();
    const box    = await toggle.boundingBox();
    if (box) xs.push(box.x);
    await page.close();
  }
  expect(xs).toHaveLength(SITES.length);
  expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(10);
});
