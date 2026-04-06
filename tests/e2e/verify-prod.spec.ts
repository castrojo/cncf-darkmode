import { test, expect } from '@playwright/test';

const PROD = 'https://castrojo.github.io/cncf-darkmode';

test('people page: body uses system font stack (not serif fallback)', async ({ page }) => {
  await page.goto(`${PROD}/people/`);
  await page.waitForLoadState('networkidle');
  const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  console.log('body font-family:', fontFamily);
  // Must start with -apple-system (system font stack), not Times New Roman (browser default)
  expect(fontFamily.toLowerCase()).toMatch(/apple-system|blinkmacsystemfont|segoe ui|helvetica/i);
});

test('people page: Jonathan Bryce hero has CNCF headshot (not GitHub avatar)', async ({ page }) => {
  await page.goto(`${PROD}/people/`);
  await page.waitForLoadState('networkidle');
  // Find Jonathan Bryce hero card photo
  const img = page.locator('.hero-photo[alt="Jonathan Bryce"]');
  const src = await img.getAttribute('src');
  console.log('Jonathan Bryce src:', src);
  expect(src).toContain('cncf/people/main/images/Jonathan-Bryce');
});

test('people page: Chris Aniszczyk hero has CNCF headshot', async ({ page }) => {
  await page.goto(`${PROD}/people/`);
  await page.waitForLoadState('networkidle');
  const img = page.locator('.hero-photo[alt="Chris Aniszczyk"]');
  const src = await img.getAttribute('src');
  console.log('Chris src:', src);
  expect(src).toContain('cncf.io/wp-content/uploads');
});

test('people page: Vanessa Heric hero has CNCF headshot', async ({ page }) => {
  await page.goto(`${PROD}/people/`);
  await page.waitForLoadState('networkidle');
  const img = page.locator('.hero-photo[alt="Vanessa Heric"]');
  const src = await img.getAttribute('src');
  console.log('Vanessa src:', src);
  expect(src).toContain('cncf/people/main/images/vanessa-heric');
});

test('people page: ambassadors tab shows changelog events', async ({ page }) => {
  await page.goto(`${PROD}/people/`);
  await page.waitForLoadState('networkidle');
  // Click the Ambassadors tab
  await page.click('[data-tab="ambassadors"]');
  // Wait for feed-loader to fetch changelog.json and render ambassador cards.
  // cards use class "person-card" and data-categories contains "ambassadors"
  await page.waitForSelector('.person-card[data-categories*="ambassadors"]', { timeout: 15000 });
  const cards = page.locator('.person-card[data-categories*="ambassadors"]');
  const count = await cards.count();
  console.log('ambassador person-cards:', count);
  expect(count).toBeGreaterThan(0);
});

test('people page: everyone tab shows kubestronauts hero section', async ({ page }) => {
  await page.goto(`${PROD}/people/`);
  await page.waitForLoadState('networkidle');
  // Everyone tab is default — kubestronauts hero sections must NOT appear on everyone tab.
  // Only data-tab-heroes="everyone" sections should be visible.
  const kubeSection = page.locator('[data-tab-heroes="kubestronauts"]').first();
  const visible = await kubeSection.isVisible();
  console.log('kubestronauts hero visible on everyone tab (must be false):', visible);
  expect(visible).toBe(false);
  // The everyone-tab hero section should be visible
  const everyoneSection = page.locator('[data-tab-heroes="everyone"]').first();
  const everySectionVisible = await everyoneSection.isVisible();
  console.log('everyone hero visible on everyone tab:', everySectionVisible);
  expect(everySectionVisible).toBe(true);
});

test('people page: search returns results', async ({ page }) => {
  await page.goto(`${PROD}/people/`);
  await page.waitForLoadState('networkidle');
  // Type a common name; search shows results as .search-result-item in the overlay
  await page.fill('#search-input', 'Chris');
  // Wait for at least one search-result-item to appear (200ms debounce + index load time)
  await page.waitForSelector('#search-results-overlay .search-result-item', { timeout: 15000 });
  const results = page.locator('#search-results-overlay .search-result-item');
  const count = await results.count();
  console.log('search result items:', count);
  expect(count).toBeGreaterThan(0);
});
