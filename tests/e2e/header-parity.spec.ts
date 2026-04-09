/**
 * Cross-site header geometry + computed-style parity tests (SO-51-E, SO-112)
 *
 * Enforces visual/structural parity of the shared header across projects and
 * endusers sites. Each test group targets one AC from the spec.
 *
 * Sites under test:
 *   - projects : http://localhost:4321/cncf-darkmode/
 *   - endusers : http://localhost:4321/cncf-darkmode/members/
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

const SITES = [
  { name: 'projects', url: 'http://localhost:4321/cncf-darkmode/' },
  { name: 'endusers', url: 'http://localhost:4321/cncf-darkmode/members/' },
] as const;

const VIEWPORTS = [
  { label: '1280px', width: 1280, height: 800 },
  { label: '768px',  width: 768,  height: 1024 },
  { label: '375px',  width: 375,  height: 667 },
] as const;

const HEIGHT_TOLERANCE = 2; // ±2px, per spec

// ─────────────────────────────────────────────────────────────────────────────
// 1. Header height matches at 1280px, 768px, 375px across both sites (±2px)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('1. Header height parity across viewports', () => {
  for (const vp of VIEWPORTS) {
    test(`header height matches at ${vp.label} (±${HEIGHT_TOLERANCE}px)`, async ({ browser }) => {
      const heights: Record<string, number> = {};

      for (const site of SITES) {
        const page: Page = await browser.newPage();
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(site.url);
        await page.waitForLoadState('networkidle');
        const header = page.locator('.site-header').first();
        await expect(header, `[${site.name}] .site-header must be visible at ${vp.label}`).toBeVisible();
        const box = await header.boundingBox();
        expect(box, `[${site.name}] .site-header bounding box at ${vp.label}`).not.toBeNull();
        heights[site.name] = box!.height;
        await page.close();
      }

      const diff = Math.abs(heights['projects'] - heights['endusers']);
      expect(diff, [
        `Header height diverged between sites at ${vp.label}:`,
        `  projects=${heights['projects']}px  endusers=${heights['endusers']}px  diff=${diff}px`,
        `  tolerance: ±${HEIGHT_TOLERANCE}px`,
      ].join('\n')).toBeLessThanOrEqual(HEIGHT_TOLERANCE * 2);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Logo slot renders in same position on both sites
// ─────────────────────────────────────────────────────────────────────────────
test.describe('2. Logo slot position parity', () => {
  test('logo x/y position matches between projects and endusers (±5px)', async ({ browser }) => {
    const positions: Record<string, { x: number; y: number }> = {};

    for (const site of SITES) {
      const page: Page = await browser.newPage();
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(site.url);
      await page.waitForLoadState('networkidle');
      const logo = page.locator('.cncf-logo-wrapper img').first();
      await expect(logo, `[${site.name}] logo image must be visible`).toBeVisible();
      const box = await logo.boundingBox();
      expect(box, `[${site.name}] logo bounding box`).not.toBeNull();
      positions[site.name] = { x: box!.x, y: box!.y };
      await page.close();
    }

    const xDiff = Math.abs(positions['projects'].x - positions['endusers'].x);
    const yDiff = Math.abs(positions['projects'].y - positions['endusers'].y);
    const LOGO_POS_TOLERANCE = 5;

    expect(xDiff, [
      `Logo X position diverged between sites:`,
      `  projects.x=${positions['projects'].x}  endusers.x=${positions['endusers'].x}  diff=${xDiff}px`,
    ].join('\n')).toBeLessThanOrEqual(LOGO_POS_TOLERANCE);

    expect(yDiff, [
      `Logo Y position diverged between sites:`,
      `  projects.y=${positions['projects'].y}  endusers.y=${positions['endusers'].y}  diff=${yDiff}px`,
    ].join('\n')).toBeLessThanOrEqual(LOGO_POS_TOLERANCE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Nav links are keyboard-accessible on both sites (Tab traversal)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('3. Nav link keyboard accessibility (Tab traversal)', () => {
  for (const site of SITES) {
    test(`[${site.name}] Tab traversal reaches at least one nav link in header`, async ({ page }) => {
      await page.goto(site.url);
      await page.waitForLoadState('networkidle');

      // Tab up to 15 times from the start of the page; a nav link inside .nav-group
      // must receive focus before we exhaust the budget.
      let navLinkFocused = false;
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return false;
          // Accept any anchor or button inside the nav-group or site-switcher
          const inNav = el.closest('.nav-group, .site-switcher');
          return inNav !== null && (el.tagName === 'A' || el.tagName === 'BUTTON');
        });
        if (focused) {
          navLinkFocused = true;
          break;
        }
      }

      expect(navLinkFocused, [
        `[${site.name}] No nav link in .nav-group received focus after 15 Tab presses.`,
        `Nav links must be reachable via keyboard (Tab) for WCAG 2.1 SC 2.1.1.`,
      ].join('\n')).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Mobile hamburger appears at ≤768px on both sites
// ─────────────────────────────────────────────────────────────────────────────
test.describe('4. Mobile hamburger button at ≤768px', () => {
  for (const site of SITES) {
    for (const vp of [{ label: '768px', width: 768, height: 1024 }, { label: '375px', width: 375, height: 667 }]) {
      test(`[${site.name}] hamburger menu button visible at ${vp.label}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(site.url);
        await page.waitForLoadState('networkidle');

        // Hamburger button: button with aria-label or class convention for mobile nav toggle
        const hamburger = page.locator([
          'button[aria-label*="menu" i]',
          'button[aria-label*="navigation" i]',
          'button[aria-expanded]',
          '.hamburger',
          '.nav-toggle',
          '[data-nav-toggle]',
        ].join(', ')).first();

        await expect(hamburger, [
          `[${site.name}] at ${vp.label}: expected a hamburger/mobile-nav toggle button.`,
          `Current layout collapses via CSS flex-wrap but provides no explicit toggle button.`,
          `A button[aria-expanded] or equivalent is required for WCAG 2.1 SC 4.1.2.`,
        ].join('\n')).toBeVisible();
      });
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Dark mode toggle present and functional on both sites
// ─────────────────────────────────────────────────────────────────────────────
test.describe('5. Dark mode toggle parity', () => {
  for (const site of SITES) {
    test(`[${site.name}] #theme-toggle is present and changes data-theme`, async ({ page }) => {
      await page.goto(site.url);
      await page.waitForLoadState('networkidle');

      const toggle = page.locator('#theme-toggle').first();
      await expect(toggle, `[${site.name}] #theme-toggle must be present in header`).toBeVisible();

      const before = await page.locator('html').getAttribute('data-theme');
      await toggle.click();
      const after = await page.locator('html').getAttribute('data-theme');

      expect(after, `[${site.name}] data-theme must change after clicking #theme-toggle`).not.toBe(before);
      expect(['light', 'dark'], `[${site.name}] data-theme must be 'light' or 'dark' after toggle`).toContain(after);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Header computed background-color uses expected CSS variable
// ─────────────────────────────────────────────────────────────────────────────
test.describe('6. Header background-color CSS variable parity', () => {
  for (const site of SITES) {
    test(`[${site.name}] .site-header background matches --color-bg-default (light mode)`, async ({ page }) => {
      // Force light theme to get deterministic value
      await page.goto(site.url);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
      });

      const result = await page.evaluate(() => {
        const header = document.querySelector('.site-header');
        if (!header) return { headerBg: null, cssVar: null };
        const headerBg = getComputedStyle(header).backgroundColor;
        const cssVar = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-bg-default').trim();
        return { headerBg, cssVar };
      });

      expect(result.headerBg, `[${site.name}] could not read .site-header computed style`).not.toBeNull();
      expect(result.cssVar, `[${site.name}] --color-bg-default CSS variable is empty`).not.toBe('');

      // --color-bg-default is #ffffff in light mode → rgb(255, 255, 255)
      expect(result.headerBg, [
        `[${site.name}] .site-header background-color does not match --color-bg-default.`,
        `  computed: ${result.headerBg}`,
        `  --color-bg-default: ${result.cssVar}`,
        `  Layout.css declares: background: var(--color-bg-default) — verify no override.`,
      ].join('\n')).toBe('rgb(255, 255, 255)');
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Skip-nav link present and focusable on both sites
// ─────────────────────────────────────────────────────────────────────────────
test.describe('7. Skip-nav link parity', () => {
  for (const site of SITES) {
    test(`[${site.name}] skip-nav link is present and receives focus on first Tab`, async ({ page }) => {
      await page.goto(site.url);
      await page.waitForLoadState('networkidle');

      // A skip-nav link must be one of the first focusable elements and must link to main content
      const skipNav = page.locator([
        'a[href="#main-content"]',
        'a[href="#content"]',
        'a[href="#main"]',
        '.skip-link',
        '.skip-nav',
        '[data-skip-nav]',
      ].join(', ')).first();

      await expect(skipNav, [
        `[${site.name}] No skip-nav link found in the page.`,
        `A "Skip to main content" link is required for WCAG 2.1 SC 2.4.1.`,
        `Expected an <a href="#main-content"> or .skip-link near the top of <body>.`,
        `BaseLayout.astro does not currently include a skip-nav link.`,
      ].join('\n')).toBeAttached();

      // Verify it receives focus on the first Tab press
      await page.keyboard.press('Tab');
      const focused = await skipNav.evaluate(el => el === document.activeElement);
      expect(focused, [
        `[${site.name}] skip-nav link exists but does not receive focus on first Tab.`,
        `It must appear before other interactive elements in DOM order.`,
      ].join('\n')).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. No horizontal scroll at 375px on either site
// ─────────────────────────────────────────────────────────────────────────────
test.describe('8. No horizontal scroll at 375px', () => {
  for (const site of SITES) {
    test(`[${site.name}] no horizontal scroll at 375px viewport`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(site.url);
      await page.waitForLoadState('networkidle');

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
      }));

      expect(overflow.scrollWidth, [
        `[${site.name}] horizontal scroll detected at 375px.`,
        `  body.scrollWidth=${overflow.scrollWidth}px  viewport=${overflow.clientWidth}px`,
        `  overflow=${overflow.scrollWidth - overflow.clientWidth}px`,
        `  Check .site-header overflow-x:clip and any fixed-width children.`,
      ].join('\n')).toBeLessThanOrEqual(overflow.clientWidth + 1);

      expect(overflow.documentScrollWidth, [
        `[${site.name}] document horizontal scroll detected at 375px.`,
        `  document.scrollWidth=${overflow.documentScrollWidth}px  viewport=${overflow.clientWidth}px`,
      ].join('\n')).toBeLessThanOrEqual(overflow.clientWidth + 1);
    });
  }
});
