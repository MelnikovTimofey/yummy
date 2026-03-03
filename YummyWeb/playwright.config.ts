import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'android-chrome',
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
      },
    },
    {
      name: 'ios-safari',
      use: {
        ...devices['iPhone 13'],
        browserName: 'webkit',
      },
    },
  ],
});
