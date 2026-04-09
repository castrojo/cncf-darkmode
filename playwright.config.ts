import { defineConfig, devices } from '@playwright/test';

// In CI we run `astro preview` (against pre-built dist/ artifact).
// Locally we run `astro dev` for a fast feedback loop.
const serverCommand = process.env.CI ? 'npm run preview' : 'npm run dev';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  webServer: {
    command: serverCommand,
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
      // Projects section: all tests except people-specific and endusers-tagged ones
      name: 'projects',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4321/cncf-darkmode/',
      },
      testIgnore: ['**/people-timeline.spec.ts'],
      grepInvert: /@endusers/,
    },
  ],
});
