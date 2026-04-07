import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  use: {
    browserName: 'chromium',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321/cncf-darkmode/',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      // Projects (index) page — runs generic tests only; excludes @endusers and @people
      name: 'projects',
      use: { baseURL: 'http://localhost:4321/cncf-darkmode/' },
      grepInvert: /@endusers|@people/,
    },
    {
      // End-users / Members page — runs all tests except @people-tagged ones
      name: 'endusers',
      use: { baseURL: 'http://localhost:4321/cncf-darkmode/members/' },
      grepInvert: /@people/,
    },
    {
      // People timeline page — runs only @people-tagged tests
      name: 'people',
      use: { baseURL: 'http://localhost:4321/cncf-darkmode/people/' },
      grep: /@people/,
    },
  ],
});
