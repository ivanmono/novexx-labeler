import { defineConfig, devices } from '@playwright/test';

// Target display: 4.3", 800x480. Portrait = 480x800, landscape = 800x480.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002 } },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    hasTouch: true,
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [
    { name: 'portrait', use: { viewport: { width: 480, height: 800 } } },
    { name: 'landscape', use: { viewport: { width: 800, height: 480 } } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
