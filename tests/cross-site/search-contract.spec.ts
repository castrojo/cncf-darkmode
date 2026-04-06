import { test, expect } from '@playwright/test';

const SITES = [
  {
    name: 'projects',
    url: 'http://localhost:4322/cncf-darkmode/',
    cardSelector: '#cards-container .changelog-event-card',
    nameSelector: '.card-name',
  },
  {
    name: 'members',
    url: 'http://localhost:4324/cncf-darkmode/members/',
    cardSelector: '#members-grid .member-card',
    nameSelector: '.card-name',
  },
];

for (const site of SITES) {
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
