import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { createAuthState } from './helpers/authState';

const STORAGE_KEY = 'yummy_web_auth_state_v1';
const AFTER_DIR = path.resolve(process.cwd(), '..', 'output', 'playwright', 'mobile-wave1', 'after');
const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:3001';
const NAV_LABEL_BY_KEY = {
  home: 'Главная',
  catalog: 'Каталог',
  favorites: 'Избранное',
  sessions: 'Сессии',
} as const;

const saveScreenshot = async (page: Page, project: string, name: string) => {
  fs.mkdirSync(AFTER_DIR, { recursive: true });
  const target = path.join(AFTER_DIR, `${project}-${name}.png`);
  await page.screenshot({ path: target, fullPage: true });
};

const goToMobileNavItem = async (
  page: Page,
  key: keyof typeof NAV_LABEL_BY_KEY,
) => {
  const tab = page.getByTestId(`tab-${key}`);
  if (await tab.count()) {
    await tab.first().click();
    return;
  }

  const selectTrigger = page.getByTestId('topbar-nav-select');
  await expect(selectTrigger).toBeVisible();
  await selectTrigger.click();
  await page.getByRole('option', { name: NAV_LABEL_BY_KEY[key] }).click();
};

const ensureFavoriteForAuthUser = async (
  request: APIRequestContext,
  accessToken: string,
) => {
  const mixesResponse = await request.get(`${API_BASE_URL}/mixes?limit=1`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  expect(mixesResponse.ok()).toBeTruthy();
  const mixes = (await mixesResponse.json()) as { items?: Array<{ id: string }> };
  const mixId = mixes.items?.[0]?.id;
  expect(Boolean(mixId)).toBeTruthy();

  const favoriteResponse = await request.post(`${API_BASE_URL}/favorites`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: { mixId },
  });
  expect(favoriteResponse.ok()).toBeTruthy();
};

test('guest: home -> rail navigation -> catalog -> info modal', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.getByTestId('topbar-nav-select')).toBeVisible();
  await saveScreenshot(page, testInfo.project.name, 'guest-home');

  const railRow = page.locator('[data-testid^="home-rail-row-"]').first();

  await expect(railRow).toBeVisible();
  const canScroll = await railRow.evaluate((element) => element.scrollWidth > element.clientWidth + 2);
  expect(canScroll).toBeTruthy();

  const beforeScroll = await railRow.evaluate((element) => element.scrollLeft);
  await railRow.evaluate((element) => element.scrollBy({ left: 240, behavior: 'auto' }));
  await page.waitForTimeout(350);
  const afterScroll = await railRow.evaluate((element) => element.scrollLeft);
  expect(afterScroll).toBeGreaterThan(beforeScroll);

  await goToMobileNavItem(page, 'catalog');
  await expect(page.getByPlaceholder('Поиск по названию и описанию')).toBeVisible();
  await saveScreenshot(page, testInfo.project.name, 'guest-catalog');

  await page.locator('[data-testid^="mix-card-info-"]').first().click();
  await expect(page.getByTestId('mix-info-modal')).toBeVisible();
  await saveScreenshot(page, testInfo.project.name, 'guest-catalog-info');

  await page.getByTestId('mix-info-close').click();
  await expect(page.getByTestId('mix-info-modal')).toBeHidden();
});

test.describe('auth flows', () => {
  test.describe.configure({ mode: 'serial' });

  let authState: Awaited<ReturnType<typeof createAuthState>>;

  test.beforeAll(async ({ request }) => {
    authState = await createAuthState(request);
  });

  test('auth: add/remove favorite from mobile flows', async ({ page, request }, testInfo) => {
    await page.goto('/');
    await page.evaluate(
      ({ key, value }) => {
        localStorage.setItem(key, JSON.stringify(value));
      },
      { key: STORAGE_KEY, value: authState },
    );
    await page.reload();

    await expect(page.getByTestId('topbar-nav-select')).toBeVisible();
    await ensureFavoriteForAuthUser(request, authState.tokens.accessToken);
    await page.reload();

    const seeAllButton = page.locator('[data-testid^="home-rail-see-all-"]').first();
    await expect(seeAllButton).toBeVisible();
    await seeAllButton.click();
    await expect(page.getByText('Результат')).toBeVisible();

    await goToMobileNavItem(page, 'favorites');
    await expect(page.getByRole('main').getByText('Избранное')).toBeVisible();
    await expect.poll(async () => page.locator('[data-testid^="mix-card-"]').count()).toBeGreaterThan(0);
    await saveScreenshot(page, testInfo.project.name, 'auth-favorites');

    await page.locator('[data-testid^="mix-card-favorite-"]').first().click();
    await page.waitForTimeout(450);
  });

  test('auth: create and delete session from mobile UI', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.evaluate(
      ({ key, value }) => {
        localStorage.setItem(key, JSON.stringify(value));
      },
      { key: STORAGE_KEY, value: authState },
    );
    await page.reload();

    await goToMobileNavItem(page, 'sessions');
    await expect(page.getByText('Сессии курения')).toBeVisible();

    await page.getByTestId('sessions-open-compose').click();
    await expect(page.getByTestId('sessions-compose-grid')).toBeVisible();

    await page.getByTestId('sessions-compose-grid').locator('[data-testid^="mix-card-"]').first().click();
    await expect(page.getByTestId('add-to-session-modal')).toBeVisible();
    await page.getByTestId('add-to-session-submit').click();

    await expect(page.getByText('Сессия сохранена.')).toBeVisible();

    const deleteButton = page.locator('[data-testid^="session-row-delete-"]').first();
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    await expect(page.getByTestId('session-delete-modal')).toBeVisible();
    await page.getByTestId('session-delete-confirm').click();
    await expect(page.getByTestId('session-delete-modal')).toBeHidden();
    await expect(page.getByText(/Сессия удалена\.|Не удалось удалить сессию\./)).toBeVisible();
    await saveScreenshot(page, testInfo.project.name, 'auth-sessions');
  });
});
