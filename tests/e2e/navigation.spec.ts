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

test('j/k keys move keyboard focus between cards', async ({ page }) => {
  await page.goto('./');
  await page.waitForLoadState('networkidle');

  const focused = page.locator('.keyboard-focused');

  // First j — focus lands on the first card
  await page.keyboard.press('j');
  await expect(focused).toHaveCount(1);
  const box1 = await focused.boundingBox();

  // Second j — focus moves down to the next card (higher Y in a vertical list)
  await page.keyboard.press('j');
  await expect(focused).toHaveCount(1);
  const box2 = await focused.boundingBox();
  expect(box2?.y).toBeGreaterThan(box1?.y ?? 0);
});

test('Tab key cycles to the next section tab', async ({ page }) => {
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  const firstActive = await page.locator('.section-link.active').first().textContent();
  await page.keyboard.press('Tab');
  // After Tab, active tab should have changed
  const secondActive = await page.locator('.section-link.active').first().textContent();
  expect(secondActive).not.toEqual(firstActive);
});

// -----------------------------------------------------------------------
// Bug 7 — projects search: verify search filters cards on the projects page
// Runs correctly in the projects project (baseURL = /cncf-darkmode/)
//
// Key distinction: default view renders changelog events (have data-type attr);
// search mode renders project cards from renderCard() (no data-type attr).
// -----------------------------------------------------------------------

test('projects: search input renders project results and clears correctly', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/');
  await page.waitForLoadState('networkidle');

  // Default view: changelog events carry a data-type attribute
  const changelogCards = page.locator('#cards-container .changelog-event-card[data-type]');
  await expect(changelogCards.first()).toBeVisible();
  const initialCount = await changelogCards.count();
  expect(initialCount).toBeGreaterThan(0);

  // After a search query, changelog events are replaced by project cards.
  // Project cards from renderCard() do NOT carry data-type.
  const projectCards = page.locator('#cards-container .changelog-event-card:not([data-type])');
  const input = page.locator('#search-input');
  await input.fill('kubernetes');
  await expect(projectCards.first()).toBeVisible({ timeout: 3000 });
  const searchCount = await projectCards.count();
  expect(searchCount).toBeGreaterThan(0);

  // Clearing the search restores the original changelog events
  await input.fill('');
  await expect(changelogCards.first()).toBeVisible({ timeout: 3000 });
  const restoredCount = await changelogCards.count();
  expect(restoredCount).toEqual(initialCount);
});

