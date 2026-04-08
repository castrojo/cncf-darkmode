import { test, expect } from '@playwright/test';

const SITES = [
  { name: 'projects', url: 'http://localhost:4321/cncf-darkmode/' },
  { name: 'members', url: 'http://localhost:4321/cncf-darkmode/members/' },
];

for (const site of SITES) {
  test(`${site.name}: loads and renders primary content`, async ({ page }) => {
    await page.goto(site.url);
    await expect(page.locator('main .main-content')).toBeVisible();
    await expect(page.locator('#search-input')).toBeVisible();
  });

  test(`${site.name}: keyboard "/" focuses search input`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(site.url);
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('/');
    await expect(page.locator('#search-input')).toBeFocused();
  });

  test(`${site.name}: keyboard help opens with "?" and closes with Escape`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(site.url);
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('?');
    await expect(page.locator('#keyboard-help-modal')).toHaveClass(/visible/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#keyboard-help-modal')).not.toHaveClass(/visible/);
  });

  test(`${site.name}: numeric tab shortcut activates tab 2`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(site.url);
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('2');
    await expect(page.locator('.section-link[data-tab]').nth(1)).toHaveClass(/active/);
  });
}

test('keyboard ] navigates from projects to end users section', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press(']');
  await page.waitForURL('http://localhost:4321/cncf-darkmode/members/');
  await expect(page.locator('.site-title')).toContainText('CNCF End Users');
});

test('keyboard [ navigates from end users to projects section', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/members/');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('[');
  await page.waitForURL('http://localhost:4321/cncf-darkmode/');
  await expect(page.locator('.site-title')).toContainText('CNCF Projects');
});

test('people route exists and is served internally', async ({ page }) => {
  const response = await page.goto('http://localhost:4321/cncf-darkmode/people/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('.site-title')).toContainText('CNCF People');
  await expect(page.locator('.site-switcher .switcher-pill.active')).toContainText('People');
});
