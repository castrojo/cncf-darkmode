import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:4324/cncf-darkmode/members/',
    browserName: 'chromium',
  },
  webServer: {
    command: 'npm run dev',
    port: 4324,
    reuseExistingServer: !process.env.CI,
  },
});
