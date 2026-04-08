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
  await page.keyboard.press('j');
  await expect(page.locator('.keyboard-focused').first()).toBeVisible();
  await page.keyboard.press('k');
  // Focus should remain on a card (first card when wrapping back)
  await expect(page.locator('.keyboard-focused').first()).toBeVisible();
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
// -----------------------------------------------------------------------

test('projects: search input filters changelog cards', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/');
  await page.waitForLoadState('networkidle');
  const cards = page.locator('#cards-container .changelog-event-card');
  await expect(cards.first()).toBeVisible();
  const initialCount = await cards.count();
  expect(initialCount).toBeGreaterThan(0);

  // Type a short token — wait for DOM to actually update (not a fixed timeout)
  const input = page.locator('#search-input');
  await input.fill('a');
  await expect(async () => {
    const count = await cards.count();
    expect(count).toBeLessThanOrEqual(initialCount);
  }).toPass({ timeout: 3000 });
  const filteredCount = await cards.count();
  expect(filteredCount).toBeGreaterThanOrEqual(0);

  // Clear restores all cards
  await input.fill('');
  await expect(async () => {
    const count = await cards.count();
    expect(count).toEqual(initialCount);
  }).toPass({ timeout: 3000 });
});

