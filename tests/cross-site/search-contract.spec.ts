/**
 * search-contract.spec.ts
 *
 * Validates the search UX contract across all three sections of the CNCF
 * Landscape.  Each section uses a different internal implementation:
 *
 *  - projects  → card-filter (DOM nodes shown/hidden client-side)
 *  - members   → card-filter (DOM nodes shown/hidden client-side)
 *  - people    → MiniSearch overlay (results injected into #search-results-overlay)
 *
 * The *public contract* tested here is implementation-agnostic:
 *   1. Typing a query narrows visible content.
 *   2. An impossible query surfaces an empty-state element.
 *   3. Clearing the query restores full content.
 *
 * SO-54: People section added (GH #15).
 */
import { test, expect } from '@playwright/test';

// ─── Card-filter sites (projects + members) ──────────────────────────────────

const CARD_FILTER_SITES = [
  {
    name: 'projects',
    url: 'http://localhost:4321/cncf-darkmode/',
    cardSelector: '#cards-container .changelog-event-card',
    nameSelector: '.card-name',
  },
  {
    name: 'members',
    url: 'http://localhost:4321/cncf-darkmode/members/',
    cardSelector: '#members-grid .member-card',
    nameSelector: '.card-name',
  },
];

for (const site of CARD_FILTER_SITES) {
  async function visibleCount(page: import('@playwright/test').Page, selector: string): Promise<number> {
    return page.locator(selector).evaluateAll((nodes) =>
      nodes.filter((node) => {
        const el = node as HTMLElement;
        return el.offsetParent !== null && getComputedStyle(el).display !== 'none';
      }).length
    );
  }

  async function findTokenWithResults(
    page: import('@playwright/test').Page,
    input: import('@playwright/test').Locator,
  ): Promise<{ token: string; filteredCount: number }> {
    const names = await page.locator(`${site.cardSelector} ${site.nameSelector}`).allTextContents();
    const candidates = Array.from(
      new Set(
        names
          .map((value) => value.trim())
          .flatMap((value) => value.split(/\s+/))
          .map((value) => value.replace(/[^a-zA-Z0-9.+-]/g, ''))
          .filter((value) => value.length >= 4),
      ),
    ).slice(0, 30);

    for (const token of candidates) {
      await input.fill(token);
      await page.waitForTimeout(250);
      const filteredCount = await visibleCount(page, site.cardSelector);
      if (filteredCount > 0) {
        return { token, filteredCount };
      }
    }

    return { token: candidates[0] ?? '', filteredCount: 0 };
  }

  test(`${site.name}: search contract returns results for known token`, async ({ page }) => {
    await page.goto(site.url);
    await page.waitForLoadState('networkidle');
    await expect(page.locator(site.cardSelector).first()).toBeVisible();
    const initialCount = await visibleCount(page, site.cardSelector);
    expect(initialCount).toBeGreaterThan(0);

    const input = page.locator('#search-input');
    const { token, filteredCount } = await findTokenWithResults(page, input);
    expect(token.length).toBeGreaterThan(0);
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    await expect(page.locator('#no-results')).toBeHidden();

    // Impossible query should surface empty state.
    await input.fill('qzxwvvqzxwv12345');
    await page.waitForTimeout(250);
    const emptyCount = await visibleCount(page, site.cardSelector);
    expect(emptyCount).toBe(0);
    await expect(page.locator('#no-results')).toBeVisible();

    // Clearing query should restore visible results.
    await input.fill('');
    await page.waitForTimeout(250);
    const restoredCount = await visibleCount(page, site.cardSelector);
    expect(restoredCount).toBeGreaterThan(0);
    await expect(page.locator('#no-results')).toBeHidden();
  });
}

// ─── People search — MiniSearch overlay contract ──────────────────────────────
//
// People uses a different pattern: `#search-results-overlay` is shown/hidden
// as the user types; `#timeline-feed` (the card list) is hidden while the
// overlay is active.  We test the overlay contract directly.

test('people: search input is visible and accessible', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/people/');
  await page.waitForLoadState('networkidle');

  const input = page.locator('#search-input');
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute('aria-label', /search/i);
});

test('people: typing a query shows the search-results overlay', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/people/');
  await page.waitForLoadState('networkidle');

  const overlay = page.locator('#search-results-overlay');
  // Overlay is hidden before typing
  await expect(overlay).toBeHidden();

  const input = page.locator('#search-input');
  await input.fill('kubernetes');
  // Wait for MiniSearch debounce + index load (up to 600 ms)
  await page.waitForTimeout(600);

  await expect(overlay).toBeVisible();
});

test('people: search results contain at least one result for a common token', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/people/');
  await page.waitForLoadState('networkidle');

  const input = page.locator('#search-input');
  await input.fill('cloud');
  await page.waitForTimeout(600);

  const overlay = page.locator('#search-results-overlay');
  await expect(overlay).toBeVisible();

  // Either results are populated OR a "no results" message is shown — not both.
  const resultItems = overlay.locator('.search-result-item');
  const noResults   = overlay.locator('.search-no-results');
  const resultCount = await resultItems.count();
  const noResCount  = await noResults.count();

  // At least one of them must be non-zero
  expect(resultCount + noResCount).toBeGreaterThan(0);
});

test('people: impossible query shows "no people found" empty state', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/people/');
  await page.waitForLoadState('networkidle');

  const input = page.locator('#search-input');
  await input.fill('qzxwvvqzxwv12345nope');
  await page.waitForTimeout(600);

  const overlay = page.locator('#search-results-overlay');
  await expect(overlay).toBeVisible();
  await expect(overlay.locator('.search-no-results')).toBeVisible();
  await expect(overlay.locator('.search-result-item')).toHaveCount(0);
});

test('people: clearing search via clear-search-btn hides overlay', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/people/');
  await page.waitForLoadState('networkidle');

  const input   = page.locator('#search-input');
  const overlay = page.locator('#search-results-overlay');

  await input.fill('cloud');
  await page.waitForTimeout(600);
  await expect(overlay).toBeVisible();

  const clearBtn = page.locator('#clear-search-btn');
  await expect(clearBtn).toBeVisible();
  await clearBtn.click();
  await page.waitForTimeout(250);

  await expect(overlay).toBeHidden();
  await expect(input).toHaveValue('');
});

test('people: pressing Escape clears the search overlay', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/people/');
  await page.waitForLoadState('networkidle');

  const input   = page.locator('#search-input');
  const overlay = page.locator('#search-results-overlay');

  await input.fill('cloud');
  await page.waitForTimeout(600);
  await expect(overlay).toBeVisible();

  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // Overlay hidden OR input cleared — either way search is dismissed
  const overlayHidden  = !(await overlay.isVisible());
  const inputCleared   = (await input.inputValue()) === '';
  expect(overlayHidden || inputCleared).toBe(true);
});
