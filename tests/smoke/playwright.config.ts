import { defineConfig, devices } from '@playwright/test';

const aromaBaseUrl = process.env.ATELIER_AROMA_URL ?? 'http://127.0.0.1:5174';
const masterBaseUrl = process.env.ATELIER_MASTER_URL ?? 'http://127.0.0.1:5176';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  // Проекты ходят в одну БД, а master-smoke меняет Полку: «Закончился» на доли
  // секунды прячет табак из рейлов, каталога и Миксера гостя. В параллельных
  // воркерах гостевые сценарии ловили это пустой витриной и 404/409 (#474).
  workers: 1,
  reporter: [
    ['line'],
    ['html', { open: 'never', outputFolder: '../../output/playwright/atelier-quality/html-report' }],
  ],
  outputDir: '../../output/playwright/atelier-quality/test-results',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'aroma-chromium',
      testMatch: /.*aroma-smoke\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
        baseURL: aromaBaseUrl,
      },
    },
    {
      name: 'master-chromium',
      testMatch: /.*master-smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: masterBaseUrl,
      },
    },
    // Сценарии, которым нужны именно демо-фикстуры seed. Вынесены в отдельный
    // проект, чтобы общий прогон оставался зелёным и на продуктовом снапшоте:
    // при отсутствии фикстур тесты помечают себя skipped (#27).
    {
      name: 'master-seed-chromium',
      testMatch: /.*master-seed\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: masterBaseUrl,
      },
    },
  ],
});
