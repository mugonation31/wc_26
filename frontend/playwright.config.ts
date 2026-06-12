import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
config({ path: '../.env' });

/**
 * WC26 Last Man Standing — Playwright E2E configuration.
 *
 * Run with:
 *   npx playwright test
 *   npx playwright test --headed
 *   npx playwright test e2e/specs/tab-navigation.spec.ts
 *
 * Firebase Auth is mocked via route interception in e2e/utils/firebase-mocks.ts
 * so no real Google sign-in is required.
 */
export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:4226',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* Start the Angular dev server automatically when running tests locally */
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4226',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
