import { expect, type Locator, type Page } from '@playwright/test';

// Учётки и daily code, под которыми ходит smoke. Дефолты — из демо-seed
// (`apps/backend/prisma/seed.ts`), но на базе, налитой продуктовым снапшотом,
// логины и код другие: снапшот содержит только каталог (Tobacco, Mix,
// MixComponent, Rail, RailMix), а учётки заводит `npm run bootstrap:admin`.
// Поэтому значения переопределяются через окружение (#27).

export const adminCredentials = {
  login: process.env.ATELIER_SMOKE_ADMIN_LOGIN ?? 'admin',
  password: process.env.ATELIER_SMOKE_ADMIN_PASSWORD ?? 'admin',
};

export const operatorCredentials = {
  login: process.env.ATELIER_SMOKE_OPERATOR_LOGIN ?? 'atelier',
  password: process.env.ATELIER_SMOKE_OPERATOR_PASSWORD ?? 'atelier',
};

export const guestAccessCode = process.env.ATELIER_SMOKE_ACCESS_CODE ?? '1234';

export const signIn = async (login: string, password: string, page: Page) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Войти в смену' })).toBeVisible();
  // exact-match: иначе getByLabel('Пароль') резолвится в 2 элемента —
  // сам input и кнопку-«глаз» с aria-label «Показать пароль» (strict mode).
  await page.getByLabel('Логин', { exact: true }).fill(login);
  await page.getByLabel('Пароль', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  // h1 после логина = title из MasterPageHeader (default `dashboard` →
  // «Дашборд смены»). Route-шапка `.master-stage__header` удалена в
  // chore/master-stage-header-cleanup — единственный h1 живёт внутри
  // MasterPageHeader каждого workspace-view (см. CLAUDE.md §3, smoke gate
  // после правок фронта).
  await expect(
    page.getByRole('heading', { name: 'Дашборд смены', level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Рабочие разделы Мастера' })).toBeVisible();
};

export const getWorkspaceTab = (page: Page, label: string) =>
  page
    .getByRole('tab')
    .filter({
      has: page.getByText(label, { exact: true }),
    });

export const openWorkspace = async (page: Page, label: string) => {
  const tab = getWorkspaceTab(page, label);
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
};

export const getInventoryRow = (page: Page, name: string): Locator =>
  page.locator('tbody tr').filter({
    has: page.getByRole('cell', { name }),
  });

// Каталог миксов = таблица с богатой row-композицией (МИКС / СОСТАВ /
// ПРОФИЛЬ / СТАТУС / МЕТРИКИ / ДЕЙСТВИЯ) — соответствует mockups.html.
// PR #63 раньше попытался card-grid; PR-B вернул table back.
export const getMixRow = (page: Page, name: string): Locator =>
  page.locator('table.mixes-table tbody tr').filter({
    has: page.getByText(name, { exact: true }),
  });

// Сущности каталога smoke берёт из самих данных, а не из демо-seed: иначе
// прогон красный на любой базе, налитой продуктовым снапшотом (#27).
//
// Опора именно на позицию строки, а не на имя: в реальном каталоге имена не
// уникальны — в снапшоте htreviews есть «1001 Nights» и от Layalina, и от
// Afzal, и локатор по имени падает на strict mode violation. Сортировка при
// этом переключается на алфавитную: дефолтная «сначала по наличию» переставит
// строку сразу после батч-операции, и локатор `.first()` укажет уже на другую.
export const pinFirstInventoryRow = async (
  page: Page,
): Promise<{ row: Locator; name: string }> => {
  const first = page.locator('tbody tr[data-tobacco-id]').first();
  const checkbox = first.getByRole('checkbox');
  await expect(checkbox).toBeVisible();
  const id = await first.getAttribute('data-tobacco-id');
  const label = await checkbox.getAttribute('aria-label');
  expect(label, 'у чекбокса строки инвентаря есть aria-label «Выбрать …»').toMatch(/^Выбрать /);

  return {
    // Батч-операция снимает наличие, а дефолтная сортировка «сначала по
    // наличию» тут же переставляет строку — на каталоге из 11 505 позиций она
    // уезжает вообще на другую страницу. Поэтому строка адресуется по id, а не
    // по позиции или имени (имена в каталоге htreviews не уникальны).
    row: page.locator(`tbody tr[data-tobacco-id="${id}"]`),
    name: label!.replace(/^Выбрать /, ''),
  };
};

export const stockFilterChip = (page: Page, label: string): Locator =>
  page.getByRole('button', { name: `Фильтр: ${label}` });

// Поле поиска в сценарии не используется намеренно: дебаунс отправляет снимок
// фильтров, взятый до ввода, и запоздавший ответ возвращает `stock` к прежнему
// значению (App.tsx, onInventorySearchChange собирает nextFilters из
// inventoryFilters в замыкании). Это дефект приложения, а не теста, — заведён
// отдельной задачей; smoke просто не опирается на связку «поиск + фильтр».
export const applyStockFilter = async (page: Page, label: string) => {
  const chip = stockFilterChip(page, label);
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  // Ответ на перезапрос списка сбрасывает выделение строк, поэтому отмечать
  // чекбоксы можно только после того, как список догрузился.
  await page.waitForLoadState('networkidle');
};

// Счётчик внутри чипа наличия — самый устойчивый сигнал батч-операции: он не
// зависит ни от сортировки, ни от пагинации, ни от размера каталога.
export const readStockFilterCount = async (page: Page, label: string): Promise<number> => {
  const raw = await stockFilterChip(page, label).locator('.filter-chip__count').innerText();
  return Number(raw.replace(/\s/g, ''));
};

export const pinFirstMixRow = async (page: Page): Promise<Locator> => {
  const first = page.locator('table.mixes-table tbody tr[data-mix-id]').first();
  await expect(first).toBeVisible();
  const id = await first.getAttribute('data-mix-id');
  return page.locator(`table.mixes-table tbody tr[data-mix-id="${id}"]`);
};

// Имя нужно только там, где оно попадает в текст диалога или в aria-label
// кнопки строки.
export const readMixName = async (row: Locator): Promise<string> => {
  const title = row.locator('.mixes-cell__title strong');
  await expect(title).toBeVisible();
  return (await title.innerText()).trim();
};
