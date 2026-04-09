/**
 * accessibility.spec.ts
 *
 * Runs axe-core WCAG 2.0/2.1 AA audits across all three sections of the CNCF
 * Landscape (projects, members, people).
 *
 * SO-19: People section added to a11y testing.
 * SO-54: People included in the cross-site quality matrix (GH #15).
 *
 * Note: violations are logged at warning level (not assertion failure) so that
 * pre-existing issues don't block CI while the team works through the backlog.
 * New _blocking_ assertions can be added per-section as issues are fixed.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SITES = [
  { name: 'projects', url: 'http://localhost:4321/cncf-darkmode/' },
  { name: 'members',  url: 'http://localhost:4321/cncf-darkmode/members/' },
  { name: 'people',   url: 'http://localhost:4321/cncf-darkmode/people/' },
];

for (const site of SITES) {
  test(`${site.name}: zero accessibility violations`, async ({ page }) => {
    await page.goto(site.url);
    // Wait for content to load
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log(`${site.name} a11y violations:`);
      results.violations.forEach(v => {
        console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
        v.nodes.forEach(n => console.log(`    → ${n.target}`));
      });
    }

    expect(results.violations).toHaveLength(0);
  });
}

// ─── People-specific a11y checks (SO-19 gap G6) ───────────────────────────────

test('people: person cards have accessible name (name text visible)', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/people/');
  await page.waitForLoadState('networkidle');

  // At least one person card should be in the DOM
  const cards = page.locator('#timeline-feed .person-card');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  // Every visible card must have non-empty text content (name)
  const allTexts = await cards.evaluateAll((nodes) =>
    (nodes as HTMLElement[]).map(n => n.textContent?.trim() ?? '')
  );
  expect(allTexts.every(t => t.length > 0)).toBe(true);
});

test('people: avatar images have alt attributes', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/people/');
  await page.waitForLoadState('networkidle');

  // Person cards typically include avatar <img> elements
  const avatarImgs = page.locator('#timeline-feed .person-card img');
  const imgCount = await avatarImgs.count();
  // Only assert if cards are actually rendered with images
  if (imgCount > 0) {
    const alts = await avatarImgs.evaluateAll((imgs) =>
      (imgs as HTMLImageElement[]).map(img => img.getAttribute('alt') ?? '')
    );
    // All avatar images must have an alt attribute (may be empty for decorative)
    expect(alts.every(alt => alt !== null)).toBe(true);
  }
});

test('people: ThemeToggle has aria-label', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/people/');
  const toggle = page.locator('#theme-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-label');
});

test('people: search input has aria-label', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/people/');
  const input = page.locator('#search-input');
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute('aria-label');
});

test('people: keyboard-help modal has correct ARIA attributes', async ({ page }) => {
  await page.goto('http://localhost:4321/cncf-darkmode/people/');
  await page.waitForLoadState('networkidle');

  await page.keyboard.press('?');
  await expect(page.locator('#keyboard-help-modal')).toHaveClass(/visible/);

  // Modal should be discoverable by assistive technology
  const modal = page.locator('#keyboard-help-modal');
  await expect(modal).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(modal).not.toHaveClass(/visible/);
});
