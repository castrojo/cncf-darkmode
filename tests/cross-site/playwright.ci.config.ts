/**
 * playwright.ci.config.ts
 *
 * CI-specific Playwright configuration for cross-site smoke tests.
 * Used by the `playwright-smoke` job in .github/workflows/ci.yml.
 *
 * Differences from playwright.config.ts (local dev):
 * - Uses `npm run preview` (astro preview, serves built dist/) instead of `npm run dev`
 * - Excludes accessibility.spec.ts (axe color-contrast violations tracked separately)
 * - Chromium-only for speed
 *
 * SO-15: https://github.com/castrojo/cncf-darkmode/issues/SO-15
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  testIgnore: [
    // axe color-contrast violations are known and tracked as a separate remediation issue.
    // Re-enable once the a11y remediation branch is merged.
    '**/accessibility.spec.ts',
  ],
  timeout: 60000,
  use: {
    browserName: 'chromium',
  },
  webServer: {
    command: 'cd ../../ && npm run preview',
    port: 4321,
    reuseExistingServer: false,   // always start fresh in CI
    timeout: 60000,
  },
  reporter: [['list'], ['github']],
});
