import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321/cncf-darkmode/members/',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      // EndUsers section: all tests except people-specific ones
      name: 'endusers',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4321/cncf-darkmode/members/',
      },
      testIgnore: ['**/people-timeline.spec.ts'],
    },
    {
      // People section: only people-timeline tests
      name: 'people',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4321/cncf-darkmode/people/',
      },
      testMatch: ['**/people-timeline.spec.ts'],
    },
    {
      // Projects section: all tests except people-specific ones
      name: 'projects',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4321/cncf-darkmode/',
      },
      testIgnore: ['**/people-timeline.spec.ts'],
    },
  ],
});
