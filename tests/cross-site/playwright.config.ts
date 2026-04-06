import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  timeout: 60000,
  use: {
    browserName: 'chromium',
  },
  webServer: [
    {
      command: 'cd ../../ && npm run dev --workspace=sites/projects',
      port: 4322,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'cd ../../ && npm run dev --workspace=sites/endusers',
      port: 4324,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
