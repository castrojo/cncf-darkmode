import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:4322/projects-website',
    browserName: 'chromium',
  },
  webServer: {
    command: 'npm run dev',
    port: 4322,
    reuseExistingServer: !process.env.CI,
  },
});
