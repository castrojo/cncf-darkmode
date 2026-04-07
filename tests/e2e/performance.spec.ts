import { test, expect } from '@playwright/test';

test('members page loads within 3000ms (DOMContentLoaded) @endusers', async ({ page }) => {
  const start = Date.now();
  await page.goto('./');
  await page.waitForLoadState('domcontentloaded');
  const elapsed = Date.now() - start;
  console.log(`members DOMContentLoaded: ${elapsed}ms`);
  expect(elapsed).toBeLessThan(3000);
});

test('members page has no inline script payloads over 10KB @endusers', async ({ page }) => {
  await page.goto('./');
  const largeBlobsFound = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script:not([src])'));
    return scripts
      .filter(s => (s.textContent?.length ?? 0) > 10 * 1024)
      .map(s => ({
        id: s.id || '(no id)',
        sizeKb: Math.round((s.textContent?.length ?? 0) / 1024),
      }));
  });
  if (largeBlobsFound.length > 0) {
    console.log('Large inline blobs found:', JSON.stringify(largeBlobsFound, null, 2));
  }
  const disallowedLargeBlobs = largeBlobsFound.filter(
    blob => blob.id !== 'arch-data' && blob.id !== 'initial-members-data',
  );
  expect(disallowedLargeBlobs).toHaveLength(0);
});
