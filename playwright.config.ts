import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  use: {
    browserName: 'chromium',
    baseURL: 'http://localhost:4321/cncf-darkmode/members/',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321/cncf-darkmode/members/',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
