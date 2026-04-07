import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SITES = [
  { name: 'projects', url: 'http://localhost:4321/cncf-darkmode/' },
  { name: 'members', url: 'http://localhost:4321/cncf-darkmode/members/' },
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
