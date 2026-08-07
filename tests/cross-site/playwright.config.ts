import { defineConfig } from '@playwright/test';

// In CI we run `astro preview` (against pre-built dist/ artifact).
// Locally we run `astro dev` for a fast feedback loop.
const serverCommand = process.env.CI ? 'cd ../../ && npm run preview' : 'cd ../../ && npm run dev';

export default defineConfig({
  testDir: './',
  timeout: 60000,
  use: {
    browserName: 'chromium',
  },
  webServer: {
    command: serverCommand,
    port: 4321,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
