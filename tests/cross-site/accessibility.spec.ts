/**
 * accessibility.spec.ts
 *
 * WCAG 2.x automated accessibility audit across all sections of the
 * CNCF Landscape using @axe-core/playwright.
 *
 * SO-19: People section added (gap G6 — high-density person cards / modals).
 * SO-54: People confirmed in cross-site quality matrix (GH #15).
 *
 * NOTE: Pre-existing color-contrast violations in Projects and Members (upstream
 * data-driven hex values) may surface here. When this suite is run against a
 * production build those violations should be absent; in dev they may still be
 * present. If any section shows violations, the test logs them with detail
 * before failing so that impact / selector information is visible in CI output.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = 'http://localhost:4321/cncf-darkmode';

const SITES = [
  { name: 'projects', url: `${BASE}/` },
  { name: 'members',  url: `${BASE}/members/` },
  { name: 'people',   url: `${BASE}/people/` },
];

for (const site of SITES) {
  test(`${site.name}: zero WCAG 2.x accessibility violations`, async ({ page }) => {
    await page.goto(site.url);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    if (results.violations.length > 0) {
      console.log(`\n── ${site.name} a11y violations (${results.violations.length}) ──`);
      results.violations.forEach(v => {
        console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
        v.nodes.forEach(n => console.log(`    → ${n.target}`));
      });
    }

    expect(results.violations).toHaveLength(0);
  });
}
