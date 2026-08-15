import { expect, test } from '@playwright/test';
import { adminCredentials, getMixRow, openWorkspace, signIn } from './helpers';

// Проект `master-seed-chromium`: сценарии, которым нужны именно демо-фикстуры
// `apps/backend/prisma/seed.ts`. Продуктовый снапшот таких связей не гарантирует,
// поэтому предпосылка проверяется явно и при её отсутствии тест помечается
// skipped с внятной причиной, а не падает как UI-регрессия (#27).

const demoMixName = 'Цитрусовый караван';
const demoRailName = 'Свежая линия';

test('Deleting a seeded mix warns about rails it belongs to', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  await openWorkspace(page, 'Миксы');
  // Ждём отрисовки каталога: иначе проверка предпосылки поймает пустую таблицу
  // и пропустит сценарий на базе, где фикстуры на самом деле есть.
  await expect(page.locator('table.mixes-table tbody tr').first()).toBeVisible();
  const mixRow = getMixRow(page, demoMixName);
  test.skip(
    (await mixRow.count()) === 0,
    `База налита не демо-фикстурами: микса «${demoMixName}» нет. Сценарий требует apps/backend/prisma/seed.ts (npm run prisma:seed).`,
  );

  // «Цитрусовый караван» входит в prepared-рейл «Свежая линия», поэтому
  // предупреждение перечисляет рейлы. Не подтверждаем удаление — прогон
  // остаётся неразрушающим.
  await mixRow.getByRole('button', { name: `Удалить ${demoMixName}` }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: `Удалить микс «${demoMixName}»?` }),
  ).toBeVisible();
  await expect(page.getByText(demoRailName)).toBeVisible();
  await page.getByRole('button', { name: 'Отмена' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(mixRow).toBeVisible();
});

test('Seeded mix editor shows the expected component composition', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  await openWorkspace(page, 'Миксы');
  // Ждём отрисовки каталога: иначе проверка предпосылки поймает пустую таблицу
  // и пропустит сценарий на базе, где фикстуры на самом деле есть.
  await expect(page.locator('table.mixes-table tbody tr').first()).toBeVisible();
  const mixRow = getMixRow(page, demoMixName);
  test.skip(
    (await mixRow.count()) === 0,
    `База налита не демо-фикстурами: микса «${demoMixName}» нет. Сценарий требует apps/backend/prisma/seed.ts (npm run prisma:seed).`,
  );

  await mixRow.click();
  await expect(page.getByRole('heading', { name: demoMixName })).toBeVisible();
  await expect(page.getByText('сумма = 100%')).toBeVisible();
  await expect(page.locator('.mix-builder__component').nth(0)).toContainText('Citrus Breeze');
  await expect(page.locator('.mix-builder__component').nth(1)).toContainText('Mint Veil');

  await page.getByRole('button', { name: 'Отмена' }).click();
  await expect(page.locator('.mix-builder')).toBeHidden();
});
