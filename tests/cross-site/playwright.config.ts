import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  timeout: 60000,
  use: {
    browserName: 'chromium',
  },
  webServer: {
    command: 'cd ../../ && npm run dev',
    port: 4321,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
