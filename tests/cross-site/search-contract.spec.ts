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

  test(`${site.name}: search contract returns results for known token`, async ({ page }) => {
    await page.goto(site.url);
    await expect(page.locator(site.cardSelector).first()).toBeVisible();
    const initialCount = await visibleCount(page, site.cardSelector);
    expect(initialCount).toBeGreaterThan(0);

    const firstName = (await page.locator(`${site.cardSelector} ${site.nameSelector}`).first().textContent())?.trim() ?? '';
    const token = firstName.split(/\s+/).find((part) => part.length >= 3) ?? firstName;
    expect(token.length).toBeGreaterThan(0);

    const input = page.locator('#search-input');
    await input.fill(token);
    await page.waitForTimeout(250);

    const filteredCount = await visibleCount(page, site.cardSelector);
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
