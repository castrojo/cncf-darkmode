import { test, expect } from '@playwright/test';

// Navigate to people page (base URL points to members, so use full path)
const PEOPLE = 'http://localhost:4321/cncf-darkmode/people/';

test('people page: dynamic cards receive CSS (card-body padding is 1rem)', async ({ page }) => {
  await page.goto(PEOPLE);
  await page.waitForLoadState('networkidle');

  // Scroll to bottom to trigger IntersectionObserver for feed-sentinel
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000); // allow batch to render

  // Confirm dynamic cards loaded (count > 30 = STATIC_COUNT)
  const cardCount = await page.locator('.person-card').count();
  console.log('Total person-cards after scroll:', cardCount);
  expect(cardCount).toBeGreaterThan(30);

  const result = await page.evaluate(() => {
    // After <style is:global> fix, ALL .person-card elements share the same global CSS
    // (no data-astro-cid attribute on any card — both SSR and dynamic are plain .person-card)
    const allCards = Array.from(document.querySelectorAll<HTMLElement>('.person-card'));
    if (allCards.length === 0) return { error: 'no person-card elements found' };
    // Check a card from the dynamic batch (beyond STATIC_COUNT=30)
    const dynamic = allCards[35] ?? allCards[allCards.length - 1];
    const dynBody = dynamic.querySelector<HTMLElement>('.card-body');
    // Also check an early card (SSR'd)
    const early = allCards[0];
    const earlyBody = early.querySelector<HTMLElement>('.card-body');
    return {
      total: allCards.length,
      dynamicPadding: dynBody ? getComputedStyle(dynBody).padding : null,
      earlyPadding: earlyBody ? getComputedStyle(earlyBody).padding : null,
      dynamicBorderRadius: getComputedStyle(dynamic).borderRadius,
    };
  });
  console.log('Card CSS result:', result);
  expect((result as any).error).toBeUndefined();
  // card-body must have padding (1rem = 16px) — '0px' means CSS is missing
  expect((result as any).dynamicPadding).toMatch(/^16px/);
  // Early (SSR'd) card must also have correct padding
  expect((result as any).earlyPadding).toMatch(/^16px/);
});

test('people page: everyone tab shows everyone hero, hides kubestronauts hero', async ({ page }) => {
  await page.goto(PEOPLE);
  await page.waitForLoadState('networkidle');

  // Ensure everyone tab is active (clear any localStorage)
  await page.evaluate(() => localStorage.removeItem('active-tab'));
  await page.reload();
  await page.waitForLoadState('networkidle');

  const heroState = await page.evaluate(() => {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-tab-heroes]')).map(el => ({
      tab: el.dataset.tabHeroes,
      visible: el.style.display !== 'none',
    }));
  });
  console.log('Hero sections on everyone tab:', heroState);

  const everyoneVisible = heroState.filter(h => h.tab === 'everyone' && h.visible);
  const kubeVisible = heroState.filter(h => h.tab === 'kubestronauts' && h.visible);
  expect(everyoneVisible.length).toBeGreaterThan(0);
  expect(kubeVisible.length).toBe(0);
});

test('people page: ambassadors tab filters timeline to ambassador cards only', async ({ page }) => {
  await page.goto(PEOPLE);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => localStorage.removeItem('active-tab'));
  await page.reload();
  await page.waitForLoadState('networkidle');

  await page.click('[data-tab="ambassadors"]');
  await page.waitForTimeout(500);

  const visible = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll<HTMLElement>('#timeline-feed .person-card'));
    const shown = all.filter(c => c.style.display !== 'none');
    const wrongTab = shown.filter(c => !c.dataset.categories?.includes('ambassadors'));
    return { total: all.length, shown: shown.length, wrongTab: wrongTab.length };
  });
  console.log('Ambassador tab filter:', visible);
  expect(visible.shown).toBeGreaterThan(0);
  expect(visible.wrongTab).toBe(0);
});

test('people page: kubestronauts tab filters timeline to kubestronaut cards only', async ({ page }) => {
  await page.goto(PEOPLE);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => localStorage.removeItem('active-tab'));
  await page.reload();
  await page.waitForLoadState('networkidle');

  await page.click('[data-tab="kubestronauts"]');
  await page.waitForTimeout(500);

  const visible = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll<HTMLElement>('#timeline-feed .person-card'));
    const shown = all.filter(c => c.style.display !== 'none');
    const wrongTab = shown.filter(c => !c.dataset.categories?.includes('kubestronaut'));
    return { total: all.length, shown: shown.length, wrongTab: wrongTab.length };
  });
  console.log('Kubestronauts tab filter:', visible);
  expect(visible.shown).toBeGreaterThan(0);
  expect(visible.wrongTab).toBe(0);
});
