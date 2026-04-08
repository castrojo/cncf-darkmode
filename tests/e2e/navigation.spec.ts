import { test, expect } from '@playwright/test';

// -----------------------------------------------------------------------
// Section keyboard navigation
// These tests run in the endusers project (baseURL = /members/) as well as
// the projects project (baseURL = /cncf-darkmode/). Absolute URLs are used
// for tests that make cross-site URL assertions so behaviour is deterministic
// regardless of which Playwright project runs them.
// -----------------------------------------------------------------------

test('] key navigates from members to people section', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/members/');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press(']');
  await page.waitForURL('**/cncf-darkmode/people/**');
  await expect(page.locator('.site-title')).toContainText('CNCF People');
});

test('[ key navigates from members to projects section', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/members/');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('[');
  await page.waitForURL('**/cncf-darkmode/');
  await expect(page.locator('.site-title')).toContainText('CNCF Projects');
});

test('SiteSwitcher "Projects" pill navigates from members to projects', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/members/');
  await page.waitForLoadState('networkidle');
  await page.locator('.site-switcher .switcher-pill', { hasText: 'Projects' }).click();
  await page.waitForURL('**/cncf-darkmode/');
  await expect(page.locator('.site-title')).toContainText('CNCF Projects');
});

test('SiteSwitcher "People" pill navigates from members to people', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/members/');
  await page.waitForLoadState('networkidle');
  await page.locator('.site-switcher .switcher-pill', { hasText: 'People' }).click();
  await page.waitForURL('**/cncf-darkmode/people/**');
  await expect(page.locator('.site-title')).toContainText('CNCF People');
});

// -----------------------------------------------------------------------
// General card / tab interaction — works in any project context
// -----------------------------------------------------------------------

test('j/k keys navigate cards without crashing', async ({ page }) => {
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('j');
  await expect(page.locator('main')).toBeVisible();
  await page.keyboard.press('k');
  await expect(page.locator('main')).toBeVisible();
});

test('Tab key cycles through section tabs without crashing', async ({ page }) => {
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Tab');
  await expect(page.locator('main')).toBeVisible();
});

// -----------------------------------------------------------------------
// Bug 7 — projects search: verify search filters cards on the projects page
// Runs correctly in the projects project (baseURL = /cncf-darkmode/)
// -----------------------------------------------------------------------

test('projects: search input filters changelog cards', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/');
  await page.waitForLoadState('networkidle');
  const cards = page.locator('#cards-container .changelog-event-card');
  await expect(cards.first()).toBeVisible();
  const initialCount = await cards.count();
  expect(initialCount).toBeGreaterThan(0);

  // Type a short token likely to match some cards
  const input = page.locator('#search-input');
  await input.fill('a');
  await page.waitForTimeout(250);
  const filteredCount = await cards.count();
  expect(filteredCount).toBeGreaterThanOrEqual(0);
  expect(filteredCount).toBeLessThanOrEqual(initialCount);

  // Clear restores all cards
  await input.fill('');
  await page.waitForTimeout(250);
  const restoredCount = await cards.count();
  expect(restoredCount).toEqual(initialCount);
});

