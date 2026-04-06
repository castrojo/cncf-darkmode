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
  test(`${site.name}: search contract returns results for known token`, async ({ page }) => {
    await page.goto(site.url);
    const cards = page.locator(site.cardSelector);
    await expect(cards.first()).toBeVisible();
    const initialCount = await cards.count();
    expect(initialCount).toBeGreaterThan(0);

    const firstName = (await page.locator(`${site.cardSelector} ${site.nameSelector}`).first().textContent())?.trim() ?? '';
    const token = firstName.split(/\s+/).find((part) => part.length >= 3) ?? firstName;
    expect(token.length).toBeGreaterThan(0);

    await page.locator('#search-input').fill(token);
    await page.waitForTimeout(250);

    const filteredCount = await cards.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    await expect(page.locator('#no-results')).toBeHidden();
  });
}
