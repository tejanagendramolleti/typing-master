import { defineConfig, devices } from '@playwright/test'

/**
 * The end-to-end tests.
 *
 * They run against the whole application — the interface, the API and the
 * database — brought up with Docker Compose, because the flows the brief
 * asks for are the ones that cross all three: registering, taking a test,
 * being gated by the free limit, upgrading and seeing the analytics.
 *
 * The tests are in `frontend/e2e/`, and the configuration is here so that
 * the paths and the timeouts are in one place.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  // The tests share one database, so they cannot run in parallel.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /**
   * Brings the whole application up before the tests and takes it down
   * afterwards.
   *
   * The stack is left running when the tests are skipped, because starting
   * PostgreSQL and building the images is slow and the developer usually
   * wants to look at the result.
   */
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'docker compose up -d --build',
        cwd: '..',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 600_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
})
