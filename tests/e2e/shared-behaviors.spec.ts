/**
 * shared-behaviors.spec.ts
 *
 * Cross-section smoke tests: these run on BOTH the `projects` and `endusers`
 * Playwright projects (no tag = generic).  They verify structural invariants
 * that must hold on every section of the CNCF Landscape site.
 *
 * Related: castrojo/cncf-darkmode#40
 */
import { test, expect } from '@playwright/test';

// ── SiteSwitcher ────────────────────────────────────────────────────────────

test('site-switcher nav is present', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('nav.site-switcher')).toBeVisible();
});

test('site-switcher has exactly 3 pills', async ({ page }) => {
  await page.goto('./');
  const pills = page.locator('nav.site-switcher .switcher-pill');
  await expect(pills).toHaveCount(3);
});

test('site-switcher pills are Projects, End Users, People', async ({ page }) => {
  await page.goto('./');
  const pills = page.locator('nav.site-switcher .switcher-pill');
  const labels = await pills.allTextContents();
  expect(labels).toEqual(['Projects', 'End Users', 'People']);
});

test('site-switcher has exactly one active pill', async ({ page }) => {
  await page.goto('./');
  const activePills = page.locator('nav.site-switcher .switcher-pill.active');
  await expect(activePills).toHaveCount(1);
});

// ── Header structural invariants ────────────────────────────────────────────

test('site header is present', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.site-header')).toBeVisible();
});

test('theme toggle button is present', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#theme-toggle')).toBeVisible();
});

// ── Keyboard shortcuts ───────────────────────────────────────────────────────

test('search input exists and is focusable via / key', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('/');
  await expect(page.locator('input#search-input').first()).toBeFocused();
});

test('? key shows keyboard help overlay', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('?');
  await expect(page.locator('#keyboard-help-modal')).toBeVisible();
  // Clean up
  await page.keyboard.press('Escape');
});
