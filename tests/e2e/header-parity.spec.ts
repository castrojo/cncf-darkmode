/**
 * Header Parity Tests — Speculative Scaffolding
 *
 * Parent:   SO-112 (blocked)
 * Scaffold: SO-125
 * Target:   Shared SiteHeader component (SO-110 + SO-111)
 * Contract: docs/header-contract.md (SO-108)
 *
 * Status: ALL TEST GROUPS SKIPPED
 *   These tests target the shared SiteHeader component that will be introduced in
 *   SO-110 (ProjectsLayout refactor) and SO-111 (EndusersLayout refactor).
 *
 *   To enable after SO-110 + SO-111 merge:
 *     - Remove `.skip` from each `test.describe.skip(...)` block
 *     - No other changes should be needed
 *
 * Sites under test (docs/header-contract.md §1 — "in scope"):
 *   - projects:  http://localhost:4321/cncf-darkmode/
 *   - endusers:  http://localhost:4321/cncf-darkmode/members/
 *
 * Note: Tests use absolute URLs so they work correctly in all Playwright projects
 * (endusers, projects) without depending on baseURL.
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Site registry — both in-scope sites from header-contract.md §1
// ---------------------------------------------------------------------------

const SITES = [
  {
    name: 'projects',
    url: 'http://localhost:4321/cncf-darkmode/',
    label: 'CNCF Projects',
  },
  {
    name: 'endusers',
    url: 'http://localhost:4321/cncf-darkmode/members/',
    label: 'CNCF End Users',
  },
] as const;

type SiteConfig = (typeof SITES)[number];

// ---------------------------------------------------------------------------
// Viewport fixtures — fully implemented per AC3
// Values from SO-112 scope (1280px, 768px, 375px)
// ---------------------------------------------------------------------------

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  tablet:  { width: 768,  height: 1024 },
  mobile:  { width: 375,  height: 667 },
} as const;

type ViewportName = keyof typeof VIEWPORTS;

// ---------------------------------------------------------------------------
// Tolerances — sourced from header-contract.md §6 and SO-112 spec
// ---------------------------------------------------------------------------

/** ±2px height parity tolerance (SO-112 scope). §6 uses ≤5px; SO-112 tightens to ±2px. */
const HEADER_HEIGHT_TOLERANCE_PX = 2;

/** ±3px logo position tolerance (matches existing cross-site-header.spec.ts constant). */
const LOGO_POSITION_TOLERANCE_PX = 3;

// ---------------------------------------------------------------------------
// Helper functions — fully implemented per AC3
// ---------------------------------------------------------------------------

/**
 * Navigate to a URL at a specific viewport size and wait for the site-header
 * to be present before returning.
 */
async function gotoAtViewport(
  page: Page,
  url: string,
  viewport: { width: number; height: number },
): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.site-header', { timeout: 10_000 });
}

/**
 * Return the rendered height of .site-header via getBoundingClientRect.
 * Returns -1 when the element is absent (causes an assertion to fail with context).
 */
async function getHeaderHeight(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector('.site-header');
    return el ? el.getBoundingClientRect().height : -1;
  });
}

/**
 * Return the bounding box of the visible CNCF logo image.
 * Prefers the light-mode image; falls back to any img inside .cncf-logo-wrapper.
 * Returns null when the element is absent.
 */
async function getLogoBoundingBox(
  page: Page,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return page.evaluate(() => {
    // Prefer the currently-displayed logo (not hidden by display:none)
    const all = Array.from(
      document.querySelectorAll<HTMLImageElement>('.cncf-logo-wrapper img'),
    );
    const visible = all.find(img => getComputedStyle(img).display !== 'none') ?? all[0];
    if (!visible) return null;
    const r = visible.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
}

/**
 * Return the computed background-color of .site-header as a CSS rgb()/rgba() string.
 */
async function getHeaderBackgroundColor(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.querySelector('.site-header');
    return el ? getComputedStyle(el).backgroundColor : '';
  });
}

/**
 * Resolve a CSS custom property from :root / the document element.
 * Returns an empty string if the property is not set.
 */
async function getCSSVar(page: Page, varName: string): Promise<string> {
  return page.evaluate((v: string) => {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }, varName);
}

/**
 * Return true when the page body has horizontal overflow (scrollWidth > innerWidth + 1px).
 */
async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.body.scrollWidth > window.innerWidth + 1);
}

/**
 * Return a descriptor list for all Tab-reachable elements inside .site-header,
 * in DOM order.  Used for keyboard-navigation assertions.
 */
async function getHeaderFocusableElements(
  page: Page,
): Promise<Array<{ tagName: string; id: string; ariaLabel: string; href: string }>> {
  return page.evaluate(() => {
    const header = document.querySelector('.site-header');
    if (!header) return [];
    const candidates = header.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    return Array.from(candidates).map(el => ({
      tagName: el.tagName.toLowerCase(),
      id: el.id ?? '',
      ariaLabel: el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '',
      href: (el as HTMLAnchorElement).href ?? '',
    }));
  });
}

// ---------------------------------------------------------------------------
// Group 1: Header height parity at 1280px, 768px, 375px  (±2px tolerance)
// SKIP — requires shared SiteHeader from SO-110 + SO-111
// ---------------------------------------------------------------------------

test.describe.skip('Group 1: Header height parity across sites', () => {
  const viewportEntries = Object.entries(VIEWPORTS) as Array<
    [ViewportName, { width: number; height: number }]
  >;

  for (const [vpName, viewport] of viewportEntries) {
    test(
      `header height matches at ${viewport.width}px — projects vs endusers` +
        ` (±${HEADER_HEIGHT_TOLERANCE_PX}px)`,
      async ({ page }) => {
        const heights: Record<string, number> = {};

        for (const site of SITES) {
          await gotoAtViewport(page, site.url, viewport);
          heights[site.name] = await getHeaderHeight(page);
          expect(
            heights[site.name],
            `[${site.name}] header height is ${heights[site.name]}px at ${viewport.width}px —` +
              ` .site-header not found or has zero height`,
          ).toBeGreaterThan(0);
        }

        const diff = Math.abs(heights['projects'] - heights['endusers']);
        expect(
          diff,
          `Header height mismatch at ${viewport.width}px —` +
            ` projects: ${heights['projects']}px,` +
            ` endusers: ${heights['endusers']}px,` +
            ` diff: ${diff}px (tolerance ±${HEADER_HEIGHT_TOLERANCE_PX}px).` +
            ` Check shared SiteHeader height rules in layout.css.`,
        ).toBeLessThanOrEqual(HEADER_HEIGHT_TOLERANCE_PX);
      },
    );
  }
});

// ---------------------------------------------------------------------------
// Group 2: Logo slot position parity across both sites
// SKIP — requires shared SiteHeader from SO-110 + SO-111
// ---------------------------------------------------------------------------

test.describe.skip('Group 2: Logo slot position parity', () => {
  test(
    `logo position and size match across projects and endusers` +
      ` (±${LOGO_POSITION_TOLERANCE_PX}px)`,
    async ({ page }) => {
      const boxes: Record<string, { x: number; y: number; width: number; height: number }> = {};

      for (const site of SITES) {
        await gotoAtViewport(page, site.url, VIEWPORTS.desktop);
        const box = await getLogoBoundingBox(page);
        expect(
          box,
          `[${site.name}] logo not found — check .cncf-logo-wrapper img selector in shared SiteHeader`,
        ).not.toBeNull();
        boxes[site.name] = box!;
      }

      const p = boxes['projects'];
      const e = boxes['endusers'];

      expect(
        Math.abs(p.x - e.x),
        `Logo X mismatch — projects: ${p.x}px, endusers: ${e.x}px` +
          ` (tolerance ±${LOGO_POSITION_TOLERANCE_PX}px)`,
      ).toBeLessThanOrEqual(LOGO_POSITION_TOLERANCE_PX);

      expect(
        Math.abs(p.y - e.y),
        `Logo Y mismatch — projects: ${p.y}px, endusers: ${e.y}px` +
          ` (tolerance ±${LOGO_POSITION_TOLERANCE_PX}px)`,
      ).toBeLessThanOrEqual(LOGO_POSITION_TOLERANCE_PX);

      // Width parity (both must be ~42px per header-contract.md §6)
      for (const site of SITES) {
        expect(
          Math.abs(boxes[site.name].width - 42),
          `[${site.name}] logo width: ${boxes[site.name].width}px, expected 42px` +
            ` (±${LOGO_POSITION_TOLERANCE_PX}px) — check .cncf-logo-wrapper img width/height attrs`,
        ).toBeLessThanOrEqual(LOGO_POSITION_TOLERANCE_PX);
      }
    },
  );
});

// ---------------------------------------------------------------------------
// Group 3: Nav links keyboard-accessible on both sites (Tab traversal)
// SKIP — requires shared SiteHeader from SO-110 + SO-111
// ---------------------------------------------------------------------------

test.describe.skip('Group 3: Nav links keyboard-accessible via Tab traversal', () => {
  for (const site of SITES) {
    test(`[${site.name}] header contains Tab-reachable nav elements`, async ({ page }) => {
      await gotoAtViewport(page, site.url, VIEWPORTS.desktop);
      const focusable = await getHeaderFocusableElements(page);

      expect(
        focusable.length,
        `[${site.name}] no focusable elements found in .site-header —` +
          ` check shared SiteHeader DOM structure`,
      ).toBeGreaterThan(0);

      // SiteSwitcher pills must be reachable (header-contract.md §2.2)
      const hasSwitcherLink = focusable.some(el => {
        const label = el.ariaLabel.toLowerCase();
        return (
          label.includes('project') || label.includes('end user') || label.includes('people')
        );
      });
      expect(
        hasSwitcherLink,
        `[${site.name}] SiteSwitcher pills not found in Tab-reachable header elements —` +
          ` check aria-label on SiteSwitcher links per header-contract.md §2.2`,
      ).toBe(true);
    });

    test(`[${site.name}] Tab key moves focus through header controls`, async ({ page }) => {
      await gotoAtViewport(page, site.url, VIEWPORTS.desktop);

      // Press Tab from the document body and confirm focus enters the header
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(
        () => document.activeElement?.closest('.site-header') !== null,
      );
      expect(
        firstFocused,
        `[${site.name}] Tab from document body did not land inside .site-header —` +
          ` skip-nav or first header link must be first focusable element`,
      ).toBe(true);

      // Second Tab must move focus (not stay on the same element)
      const before = await page.evaluate(() => document.activeElement?.id ?? '');
      await page.keyboard.press('Tab');
      const after = await page.evaluate(() => document.activeElement?.id ?? '');
      expect(
        before === after,
        `[${site.name}] Tab did not advance focus (stuck on #${before}) —` +
          ` check tabindex and focusable element order in shared SiteHeader`,
      ).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// Group 4: Mobile hamburger appears at ≤768px on both sites
// SKIP — hamburger is a planned feature of the shared SiteHeader (SO-110 + SO-111)
//         and is not present in the current per-site header implementations
// ---------------------------------------------------------------------------

test.describe.skip('Group 4: Mobile hamburger visible at ≤768px', () => {
  // Expected selectors per shared SiteHeader contract.  Adjust to the final
  // implementation once SO-110 / SO-111 define the element.
  const hamburgerSelector =
    '#mobile-menu-toggle, .hamburger-button, [aria-label="Open navigation menu"]';

  for (const site of SITES) {
    test(`[${site.name}] hamburger visible at 768px`, async ({ page }) => {
      await gotoAtViewport(page, site.url, VIEWPORTS.tablet);
      await expect(
        page.locator(hamburgerSelector).first(),
        `[${site.name}] hamburger not visible at 768px —` +
          ` check #mobile-menu-toggle visibility in shared SiteHeader @media (max-width: 768px)`,
      ).toBeVisible();
    });

    test(`[${site.name}] hamburger visible at 375px`, async ({ page }) => {
      await gotoAtViewport(page, site.url, VIEWPORTS.mobile);
      await expect(
        page.locator(hamburgerSelector).first(),
        `[${site.name}] hamburger not visible at 375px —` +
          ` check #mobile-menu-toggle visibility in shared SiteHeader @media (max-width: 375px)`,
      ).toBeVisible();
    });

    test(`[${site.name}] hamburger not visible at 1280px (desktop)`, async ({ page }) => {
      await gotoAtViewport(page, site.url, VIEWPORTS.desktop);
      await expect(
        page.locator(hamburgerSelector).first(),
        `[${site.name}] hamburger must be hidden at 1280px —` +
          ` check display:none on #mobile-menu-toggle above 768px breakpoint`,
      ).not.toBeVisible();
    });
  }
});

// ---------------------------------------------------------------------------
// Group 5: Dark mode toggle present and functional on both sites
// SKIP — requires shared SiteHeader from SO-110 + SO-111
// ---------------------------------------------------------------------------

test.describe.skip('Group 5: Dark mode toggle present and functional', () => {
  for (const site of SITES) {
    test(`[${site.name}] #theme-toggle is visible in header`, async ({ page }) => {
      await gotoAtViewport(page, site.url, VIEWPORTS.desktop);
      await expect(
        page.locator('#theme-toggle'),
        `[${site.name}] #theme-toggle not found —` +
          ` check ThemeToggle is rendered inside shared SiteHeader .header-actions`,
      ).toBeVisible();
    });

    test(`[${site.name}] #theme-toggle click flips data-theme attribute`, async ({ page }) => {
      await gotoAtViewport(page, site.url, VIEWPORTS.desktop);

      const before = await page.locator('html').getAttribute('data-theme');
      await page.locator('#theme-toggle').click();
      const after = await page.locator('html').getAttribute('data-theme');

      expect(
        after,
        `[${site.name}] data-theme did not change after #theme-toggle click` +
          ` (before: "${before}", after: "${after}") —` +
          ` check ThemeToggle click handler in shared SiteHeader`,
      ).not.toBe(before);

      expect(
        ['light', 'dark', null],
        `[${site.name}] data-theme value "${after}" is unexpected —` +
          ` must be "light", "dark", or absent`,
      ).toContain(after);
    });

    test(`[${site.name}] toggled theme persists on reload`, async ({ page }) => {
      await gotoAtViewport(page, site.url, VIEWPORTS.desktop);
      await page.locator('#theme-toggle').click();
      const before = await page.locator('html').getAttribute('data-theme');
      await page.reload();
      await page.waitForLoadState('networkidle');
      const after = await page.locator('html').getAttribute('data-theme');
      expect(
        after,
        `[${site.name}] theme did not persist after reload` +
          ` (set: "${before}", after reload: "${after}") —` +
          ` check localStorage cncf-theme read in shared SiteHeader init`,
      ).toBe(before);
    });
  }
});

// ---------------------------------------------------------------------------
// Group 6: Header background-color uses --color-bg-default on both sites
// SKIP — requires shared SiteHeader from SO-110 + SO-111 to guarantee CSS var propagation
// ---------------------------------------------------------------------------

test.describe.skip('Group 6: Header background uses --color-bg-default', () => {
  for (const site of SITES) {
    test(`[${site.name}] header background is non-transparent in light mode`, async ({ page }) => {
      await gotoAtViewport(page, site.url, VIEWPORTS.desktop);
      // Remove data-theme to get light mode baseline
      await page.evaluate(() => {
        document.documentElement.removeAttribute('data-theme');
        localStorage.removeItem('cncf-theme');
      });

      const headerBg = await getHeaderBackgroundColor(page);
      const cssVar = await getCSSVar(page, '--color-bg-default');

      expect(
        headerBg,
        `[${site.name}] header background-color is empty —` +
          ` shared SiteHeader must set background: var(--color-bg-default)`,
      ).toBeTruthy();
      expect(
        headerBg,
        `[${site.name}] header background is transparent in light mode` +
          ` (computed: "${headerBg}", --color-bg-default resolves to: "${cssVar}") —` +
          ` add background: var(--color-bg-default) to .site-header in layout.css`,
      ).not.toBe('rgba(0, 0, 0, 0)');
    });

    test(`[${site.name}] header background is non-transparent in dark mode`, async ({ page }) => {
      await gotoAtViewport(page, site.url, VIEWPORTS.desktop);
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('cncf-theme', 'dark');
      });

      const headerBg = await getHeaderBackgroundColor(page);
      const cssVar = await getCSSVar(page, '--color-bg-default');

      expect(
        headerBg,
        `[${site.name}] header background is transparent in dark mode` +
          ` (computed: "${headerBg}", --color-bg-default resolves to: "${cssVar}") —` +
          ` check [data-theme="dark"] --color-bg-default override in variables-base.css`,
      ).not.toBe('rgba(0, 0, 0, 0)');
    });

    test(`[${site.name}] header background-color matches --color-bg-default resolved value`, async ({ page }) => {
      await gotoAtViewport(page, site.url, VIEWPORTS.desktop);

      // Measure background via the CSS var directly and compare to computed style
      const { headerBg, varResolved } = await page.evaluate(() => {
        const header = document.querySelector('.site-header')!;
        const computed = getComputedStyle(header).backgroundColor;
        // Resolve --color-bg-default by setting it on a throw-away element
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;display:none;background:var(--color-bg-default)';
        document.body.appendChild(probe);
        const resolved = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return { headerBg: computed, varResolved: resolved };
      });

      expect(
        headerBg,
        `[${site.name}] header background-color "${headerBg}" does not match` +
          ` --color-bg-default resolved value "${varResolved}" —` +
          ` shared SiteHeader must use background: var(--color-bg-default)`,
      ).toBe(varResolved);
    });
  }
});

// ---------------------------------------------------------------------------
// Group 7: Skip-nav link present and focusable on both sites
// SKIP — skip-nav is documented as pending in header-contract.md §8.3
//         and requires shared SiteHeader from SO-110 + SO-111
// ---------------------------------------------------------------------------

test.describe.skip('Group 7: Skip-nav link present and focusable', () => {
  const skipNavSelector = 'a.skip-nav, a[href="#main-content"]';

  for (const site of SITES) {
    test(`[${site.name}] skip-nav link is present in DOM`, async ({ page }) => {
      await gotoAtViewport(page, site.url, VIEWPORTS.desktop);
      await expect(
        page.locator(skipNavSelector).first(),
        `[${site.name}] skip-nav link not found —` +
          ` add <a href="#main-content" class="skip-nav"> per header-contract.md §8.3`,
      ).toBeAttached();
    });

    test(`[${site.name}] skip-nav is the first Tab-reachable element on the page`, async ({
      page,
    }) => {
      await gotoAtViewport(page, site.url, VIEWPORTS.desktop);

      const first = await page.evaluate(() => {
        const all = document.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const el = all[0];
        return el
          ? {
              tagName: el.tagName.toLowerCase(),
              href: (el as HTMLAnchorElement).href ?? '',
              className: el.className,
            }
          : null;
      });

      expect(
        first?.href,
        `[${site.name}] first focusable element is not the skip-nav link` +
          ` (found: ${JSON.stringify(first)}) —` +
          ` skip-nav must be the first child of <body> per WCAG 2.4.1 (Bypass Blocks)`,
      ).toContain('#main-content');
    });

    test(`[${site.name}] skip-nav receives focus on first Tab and becomes visible`, async ({
      page,
    }) => {
      await gotoAtViewport(page, site.url, VIEWPORTS.desktop);

      // First Tab from blank focus should land on skip-nav
      await page.keyboard.press('Tab');

      const skipNav = page.locator(skipNavSelector).first();
      const isFocused = await skipNav.evaluate(el => document.activeElement === el);
      expect(
        isFocused,
        `[${site.name}] skip-nav did not receive focus on first Tab —` +
          ` check DOM order: skip-nav must precede all other interactive elements`,
      ).toBe(true);

      // When focused the skip-nav must be visible (top ≥ 0 per header-contract.md §8.3 CSS)
      const top = await skipNav.evaluate(el => el.getBoundingClientRect().top);
      expect(
        top,
        `[${site.name}] skip-nav top is ${top}px when focused (expected ≥ 0) —` +
          ` add .skip-nav:focus { top: 0.5rem } per header-contract.md §8.3`,
      ).toBeGreaterThanOrEqual(0);
    });

    test(`[${site.name}] skip-nav href #main-content target exists in DOM`, async ({ page }) => {
      await gotoAtViewport(page, site.url, VIEWPORTS.desktop);
      const mainExists = await page.evaluate(
        () => document.getElementById('main-content') !== null,
      );
      expect(
        mainExists,
        `[${site.name}] #main-content element not found —` +
          ` add id="main-content" to <main> per header-contract.md §8.3`,
      ).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// Group 8: No horizontal scroll at 375px on either site
// SKIP — requires shared SiteHeader from SO-110 + SO-111 for mobile layout parity
// ---------------------------------------------------------------------------

test.describe.skip('Group 8: No horizontal scroll at 375px', () => {
  for (const site of SITES) {
    test(`[${site.name}] no horizontal scroll at 375px viewport`, async ({ page }) => {
      await gotoAtViewport(page, site.url, VIEWPORTS.mobile);

      const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      const overflows = await hasHorizontalScroll(page);

      expect(
        overflows,
        `[${site.name}] horizontal scroll detected at 375px —` +
          ` body.scrollWidth: ${bodyScrollWidth}px, window.innerWidth: ${viewportWidth}px` +
          ` (overflow: ${bodyScrollWidth - viewportWidth}px).` +
          ` Check shared SiteHeader CSS at max-width: 375px — look for fixed widths` +
          ` or min-width values that exceed the viewport.`,
      ).toBe(false);
    });
  }
});
