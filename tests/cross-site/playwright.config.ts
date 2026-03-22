import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  timeout: 60000,
  use: {
    browserName: 'chromium',
  },
  // Note: header-geometry.spec.ts and accessibility.spec.ts require both dev servers running.
  // Run manually: just test-cross-site
  // performance.spec.ts and fixtures-audit.spec.ts run without servers (used in CI).
});
