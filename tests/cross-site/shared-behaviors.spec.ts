/**
 * shared-behaviors.spec.ts
 *
 * Cross-site parametrised tests that every section of the CNCF Landscape must
 * satisfy: content loads, keyboard shortcuts work, dark-mode toggle persists,
 * and the SiteSwitcher navigation ring is complete.
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

// ─── Per-site parametrised tests ──────────────────────────────────────────────

for (const site of SITES) {
  // AC-1: basic page load + primary content
  test(`${site.name}: loads and renders primary content`, async ({ page }) => {
    await page.goto(site.url);
    await expect(page.locator('main .main-content')).toBeVisible();
    await expect(page.locator('#search-input')).toBeVisible();
  });

  // AC-2: keyboard "/" focuses search input (locale-independent UX contract)
  test(`${site.name}: keyboard "/" focuses search input`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(site.url);
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('/');
    await expect(page.locator('#search-input')).toBeFocused();
    expect(errors).toHaveLength(0);
  });

  // AC-3: keyboard help modal opens with "?" and closes with Escape
  test(`${site.name}: keyboard help opens with "?" and closes with Escape`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(site.url);
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('?');
    await expect(page.locator('#keyboard-help-modal')).toHaveClass(/visible/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#keyboard-help-modal')).not.toHaveClass(/visible/);
    expect(errors).toHaveLength(0);
  });

  // AC-4: numeric tab shortcut activates the second category tab
  test(`${site.name}: numeric tab shortcut activates tab 2`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(site.url);
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('2');
    await expect(page.locator('.section-link[data-tab]').nth(1)).toHaveClass(/active/);
    expect(errors).toHaveLength(0);
  });

  // AC-5: dark mode toggle — pressing "t" flips data-theme and persists via localStorage
  test(`${site.name}: dark mode toggle ("t") flips theme and persists`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(site.url);
    await page.waitForLoadState('networkidle');

    // Clear any stored theme so we start from a known state
    await page.evaluate(() => localStorage.removeItem('cncf-theme'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    const before = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );

    // Press "t" to toggle
    await page.keyboard.press('t');

    const after = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );

    // Theme must have changed
    expect(after).not.toBe(before);

    // Stored value must match what's on the DOM
    const stored = await page.evaluate(() => localStorage.getItem('cncf-theme'));
    expect(stored).toBe(after);

    expect(errors).toHaveLength(0);
  });

  // AC-6: SiteSwitcher is visible and marks exactly one pill as active (current page)
  test(`${site.name}: SiteSwitcher has exactly one active pill`, async ({ page }) => {
    await page.goto(site.url);
    const switcher = page.locator('.site-switcher');
    await expect(switcher).toBeVisible();
    // Active pill is a <span> (not an <a>) — exactly one per page
    const activePills = switcher.locator('.switcher-pill.active');
    await expect(activePills).toHaveCount(1);
    // Inactive pills are links
    const inactivePills = switcher.locator('a.switcher-pill');
    await expect(inactivePills).toHaveCount(2);
  });
}

// ─── SiteSwitcher navigation ring (complete cycle through all three sections) ─

test('keyboard ] navigates from projects → members', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await page.waitForLoadState('networkidle');
  await page.keyboard.press(']');
  await page.waitForURL(`${BASE}/members/`);
  await expect(page.locator('.site-title')).toContainText('CNCF End Users');
});

test('keyboard ] navigates from members → people', async ({ page }) => {
  await page.goto(`${BASE}/members/`);
  await page.waitForLoadState('networkidle');
  await page.keyboard.press(']');
  await page.waitForURL(`${BASE}/people/`);
  await expect(page.locator('.site-title')).toContainText('CNCF People');
});

test('keyboard ] navigates from people → projects (ring wraps)', async ({ page }) => {
  await page.goto(`${BASE}/people/`);
  await page.waitForLoadState('networkidle');
  await page.keyboard.press(']');
  await page.waitForURL(`${BASE}/`);
  await expect(page.locator('.site-title')).toContainText('CNCF Projects');
});

test('keyboard [ navigates from members → projects', async ({ page }) => {
  await page.goto(`${BASE}/members/`);
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('[');
  await page.waitForURL(`${BASE}/`);
  await expect(page.locator('.site-title')).toContainText('CNCF Projects');
});

test('keyboard [ navigates from people → members', async ({ page }) => {
  await page.goto(`${BASE}/people/`);
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('[');
  await page.waitForURL(`${BASE}/members/`);
  await expect(page.locator('.site-title')).toContainText('CNCF End Users');
});

test('keyboard [ navigates from projects → people (ring wraps)', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('[');
  await page.waitForURL(`${BASE}/people/`);
  await expect(page.locator('.site-title')).toContainText('CNCF People');
});

// ─── People route smoke test (AC-1 for People URL namespace) ──────────────────

test('people route serves HTTP 200 with correct title and active pill', async ({ page }) => {
  const response = await page.goto(`${BASE}/people/`);
  expect(response?.status()).toBe(200);
  await expect(page.locator('.site-title')).toContainText('CNCF People');
  await expect(page.locator('.site-switcher .switcher-pill.active')).toContainText('People');
});
