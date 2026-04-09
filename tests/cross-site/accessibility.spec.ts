/**
 * accessibility.spec.ts
 *
 * Cross-site accessibility gate: every section of the CNCF Landscape must
 * pass WCAG 2.1 AA axe-core rules with zero violations.
 *
 * SO-54: People section (/people/) added to SITES matrix (GH #15, gap G6).
 * People is a high-risk page due to its density of dynamically-rendered
 * person cards, badges, and modal components.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SITES = [
  { name: 'projects', url: 'http://localhost:4321/cncf-darkmode/' },
  { name: 'members',  url: 'http://localhost:4321/cncf-darkmode/members/' },
  { name: 'people',   url: 'http://localhost:4321/cncf-darkmode/people/' },
];

for (const site of SITES) {
  test(`${site.name}: zero accessibility violations (WCAG 2.1 AA)`, async ({ page }) => {
    await page.goto(site.url);
    // Wait for all lazy-loaded content (People lazy-loads emeritus+staff cards)
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log(`\n${site.name} a11y violations (${results.violations.length}):`);
      results.violations.forEach((v) => {
        console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
        v.nodes.forEach((n) => console.log(`    → ${n.target}`));
      });
    }

    expect(results.violations).toHaveLength(0);
  });

  test(`${site.name}: dark-mode has zero accessibility violations (WCAG 2.1 AA)`, async ({ page }) => {
    await page.goto(site.url);
    await page.waitForLoadState('networkidle');

    // Activate dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(200);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    if (results.violations.length > 0) {
      console.log(`\n${site.name} (dark-mode) a11y violations (${results.violations.length}):`);
      results.violations.forEach((v) => {
        console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
        v.nodes.forEach((n) => console.log(`    → ${n.target}`));
      });
    }

    expect(results.violations).toHaveLength(0);
  });
}
