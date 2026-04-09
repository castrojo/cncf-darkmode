/**
 * search-contract.spec.ts
 *
 * Validates the search UX contract for each section of the CNCF Landscape.
 *
 * Projects and Members share the card-filter pattern:
 *   - `#search-input` filters visible cards inline (no network fetch)
 *   - `#no-results` element appears when query returns nothing
 *   - Clearing the input restores all cards
 *
 * People uses the MiniSearch overlay pattern:
 *   - `#search-results-overlay` appears over the feed (async, debounced)
 *   - Results are rendered as `<a class="search-result-item">` links
 *   - Clearing the input hides the overlay and restores the tab feed
 *   - `aria-label` on `#search-input` is set for screen readers
 *
 * SO-54: People MiniSearch overlay contract added (GH #15).
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:4321/cncf-darkmode';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Count DOM elements that are actually visible (not hidden via display:none). */
async function visibleCount(page: import('@playwright/test').Page, selector: string): Promise<number> {
  return page.locator(selector).evaluateAll((nodes) =>
    nodes.filter((node) => {
      const el = node as HTMLElement;
      return el.offsetParent !== null && getComputedStyle(el).display !== 'none';
    }).length,
  );
}

/** Find a search token from existing card names that returns at least one result. */
async function findTokenWithResults(
  page: import('@playwright/test').Page,
  input: import('@playwright/test').Locator,
  cardSelector: string,
  nameSelector: string,
): Promise<{ token: string; filteredCount: number }> {
  const names = await page.locator(`${cardSelector} ${nameSelector}`).allTextContents();
  const candidates = Array.from(
    new Set(
      names
        .map((v) => v.trim())
        .flatMap((v) => v.split(/\s+/))
        .map((v) => v.replace(/[^a-zA-Z0-9.+-]/g, ''))
        .filter((v) => v.length >= 4),
    ),
  ).slice(0, 30);

  for (const token of candidates) {
    await input.fill(token);
    await page.waitForTimeout(250);
    const count = await visibleCount(page, cardSelector);
    if (count > 0) return { token, filteredCount: count };
  }
  return { token: candidates[0] ?? '', filteredCount: 0 };
}

// ─── Card-filter pattern (projects + members) ─────────────────────────────────

const CARD_FILTER_SITES = [
  {
    name: 'projects',
    url: `${BASE}/`,
    cardSelector: '#cards-container .changelog-event-card',
    nameSelector: '.card-name',
  },
  {
    name: 'members',
    url: `${BASE}/members/`,
    cardSelector: '#members-grid .member-card',
    nameSelector: '.card-name',
  },
];

for (const site of CARD_FILTER_SITES) {
  test(`${site.name}: search contract — results, empty-state, restore`, async ({ page }) => {
    await page.goto(site.url);
    await page.waitForLoadState('networkidle');
    await expect(page.locator(site.cardSelector).first()).toBeVisible();

    const initialCount = await visibleCount(page, site.cardSelector);
    expect(initialCount).toBeGreaterThan(0);

    const input = page.locator('#search-input');
    const { token, filteredCount } = await findTokenWithResults(page, input, site.cardSelector, site.nameSelector);
    expect(token.length).toBeGreaterThan(0);
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    await expect(page.locator('#no-results')).toBeHidden();

    // Impossible query → empty state
    await input.fill('qzxwvvqzxwv12345');
    await page.waitForTimeout(250);
    const emptyCount = await visibleCount(page, site.cardSelector);
    expect(emptyCount).toBe(0);
    await expect(page.locator('#no-results')).toBeVisible();

    // Clearing query → cards restored
    await input.fill('');
    await page.waitForTimeout(250);
    const restoredCount = await visibleCount(page, site.cardSelector);
    expect(restoredCount).toBeGreaterThan(0);
    await expect(page.locator('#no-results')).toBeHidden();
  });
}

// ─── People MiniSearch overlay pattern ────────────────────────────────────────
//
// The People page uses an async full-text MiniSearch index that:
//   1. Hides the timeline feed and shows #search-results-overlay while typing
//   2. Renders result links (<a class="search-result-item">) inside #search-results-list
//   3. Shows a .search-no-results message when nothing matches
//   4. Hides the overlay and restores the active tab when the input is cleared
//
// We wait 600 ms after typing to allow for debounce + async index load.

const PEOPLE_URL         = `${BASE}/people/`;
const PEOPLE_OVERLAY     = '#search-results-overlay';
const PEOPLE_LIST        = '#search-results-list';
const PEOPLE_RESULT_ITEM = '#search-results-list .search-result-item';
const PEOPLE_NO_RESULTS  = '#search-results-list .search-no-results';
const PEOPLE_TIMELINE    = '#timeline-feed';

test('people: search overlay appears when typing and is hidden when idle', async ({ page }) => {
  await page.goto(PEOPLE_URL);
  await page.waitForLoadState('networkidle');

  // Overlay starts hidden
  await expect(page.locator(PEOPLE_OVERLAY)).toBeHidden();

  // Typing shows overlay
  await page.locator('#search-input').fill('kubernetes');
  await page.waitForTimeout(600);
  await expect(page.locator(PEOPLE_OVERLAY)).toBeVisible();

  // Clearing hides overlay
  await page.locator('#search-input').fill('');
  await page.waitForTimeout(400);
  await expect(page.locator(PEOPLE_OVERLAY)).toBeHidden();
});

test('people: search results are rendered as links inside the overlay', async ({ page }) => {
  await page.goto(PEOPLE_URL);
  await page.waitForLoadState('networkidle');

  await page.locator('#search-input').fill('a');   // broad query — should have results
  await page.waitForTimeout(600);

  await expect(page.locator(PEOPLE_OVERLAY)).toBeVisible();
  // At least one result item should appear for a broad single-character query
  const resultCount = await page.locator(PEOPLE_RESULT_ITEM).count();
  expect(resultCount).toBeGreaterThan(0);
});

test('people: impossible query renders no-results message', async ({ page }) => {
  await page.goto(PEOPLE_URL);
  await page.waitForLoadState('networkidle');

  await page.locator('#search-input').fill('qzxwvvqzxwv12345');
  await page.waitForTimeout(600);

  await expect(page.locator(PEOPLE_OVERLAY)).toBeVisible();
  await expect(page.locator(PEOPLE_NO_RESULTS)).toBeVisible();
  const resultCount = await page.locator(PEOPLE_RESULT_ITEM).count();
  expect(resultCount).toBe(0);
});

test('people: clearing search restores timeline feed', async ({ page }) => {
  await page.goto(PEOPLE_URL);
  await page.waitForLoadState('networkidle');

  // Type to trigger overlay
  await page.locator('#search-input').fill('kubernetes');
  await page.waitForTimeout(600);
  await expect(page.locator(PEOPLE_OVERLAY)).toBeVisible();

  // Timeline feed should be hidden while overlay is visible
  await expect(page.locator(PEOPLE_TIMELINE)).toBeHidden();

  // Clear → overlay hidden, timeline restored
  await page.locator('#search-input').fill('');
  await page.waitForTimeout(400);
  await expect(page.locator(PEOPLE_OVERLAY)).toBeHidden();
  await expect(page.locator(PEOPLE_TIMELINE)).toBeVisible();
});

test('people: search-clear button clears input and restores timeline', async ({ page }) => {
  await page.goto(PEOPLE_URL);
  await page.waitForLoadState('networkidle');

  await page.locator('#search-input').fill('kubernetes');
  await page.waitForTimeout(600);
  await expect(page.locator(PEOPLE_OVERLAY)).toBeVisible();

  // Click the clear button
  await page.locator('#search-clear').click();
  await page.waitForTimeout(400);

  await expect(page.locator('#search-input')).toHaveValue('');
  await expect(page.locator(PEOPLE_OVERLAY)).toBeHidden();
  await expect(page.locator(PEOPLE_TIMELINE)).toBeVisible();
});

test('people: #search-input has accessible aria-label', async ({ page }) => {
  await page.goto(PEOPLE_URL);
  const input = page.locator('#search-input');
  await expect(input).toBeVisible();
  const label = await input.getAttribute('aria-label');
  expect(label).toBeTruthy();
  expect(label!.length).toBeGreaterThan(3);
});
