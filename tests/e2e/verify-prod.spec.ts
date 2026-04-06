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
