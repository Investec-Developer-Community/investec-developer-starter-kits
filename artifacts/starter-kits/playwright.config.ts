import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/responsive',
  outputDir: '../../generated-artifacts/responsive/results',
  reporter: [['list'], ['html', { outputFolder: '../../generated-artifacts/responsive/report', open: 'never' }]],
  fullyParallel: true,
  workers: 2,
  retries: 0,
  updateSnapshots: 'none',
  forbidOnly: !!process.env.CI,
  snapshotPathTemplate: '{testDir}/baselines/{projectName}/{arg}{ext}',
  expect: { toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.002 } },
  use: {
    baseURL: 'http://127.0.0.1:4179',
    browserName: 'chromium',
    locale: 'en-ZA',
    timezoneId: 'Africa/Johannesburg',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile-320', use: { viewport: { width: 320, height: 800 } } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
  // A production build avoids development overlays and external services.
  webServer: {
    command: 'PORT=4179 BASE_PATH=/ pnpm build && PORT=4179 BASE_PATH=/ pnpm serve',
    url: 'http://127.0.0.1:4179',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
