import { expect, test, type Locator, type Page } from '@playwright/test';

const signIn = async (login: string, password: string, page: Page) => {
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

const getWorkspaceTab = (page: Page, label: string) =>
  page
    .getByRole('tab')
    .filter({
      has: page.getByText(label, { exact: true }),
    });

const openWorkspace = async (page: Page, label: string) => {
  const tab = getWorkspaceTab(page, label);
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
};

const getInventoryRow = (page: Page, name: string): Locator =>
  page.locator('tbody tr').filter({
    has: page.getByRole('cell', { name }),
  });

// Каталог миксов = таблица с богатой row-композицией (МИКС / СОСТАВ /
// ПРОФИЛЬ / СТАТУС / МЕТРИКИ / ДЕЙСТВИЯ) — соответствует mockups.html.
// PR #63 раньше попытался card-grid; PR-B вернул table back.
const getMixRow = (page: Page, name: string): Locator =>
  page.locator('table.mixes-table tbody tr').filter({
    has: page.getByText(name, { exact: true }),
  });

test('Master workspace tabs support keyboard navigation for critical admin sections', async ({ page }) => {
  await signIn('admin', 'admin', page);

  await expect(page.getByRole('tablist', { name: 'Рабочие разделы Мастера' })).toBeVisible();
  await expect(getWorkspaceTab(page, 'Дашборд')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Дашборд смены', level: 1 })).toBeVisible();

  await getWorkspaceTab(page, 'Дашборд').press('ArrowRight');
  await expect(getWorkspaceTab(page, 'Табаки')).toHaveAttribute('aria-selected', 'true');
  // PR-C `feature/master-apply-shared-primitives` уже смержён: InventoryView
  // рендерит MasterPageHeader с h1 «Табаки», прежний h2 «Таблица остатков
  // и зависимых миксов» удалён.
  await expect(
    page.getByRole('heading', { name: 'Табаки', level: 1 }),
  ).toBeVisible();

  await getWorkspaceTab(page, 'Табаки').press('End');
  await expect(getWorkspaceTab(page, 'Доступ')).toHaveAttribute('aria-selected', 'true');
  // AccessView рендерит свой MasterPageHeader с h1 «Доступ и персонал»
  // (под mockups.html). Бывший section-head h2 «Daily code и Telegram
  // allowlist» удалён.
  await expect(
    page.getByRole('heading', { name: 'Доступ и персонал', level: 1 }),
  ).toBeVisible();

  await getWorkspaceTab(page, 'Доступ').press('Home');
  await expect(getWorkspaceTab(page, 'Дашборд')).toHaveAttribute('aria-selected', 'true');
});

test('Master admin smoke covers inventory batch flow, mixes editor, rails read-only mode and access observability', async ({ page }) => {
  await signIn('admin', 'admin', page);

  await openWorkspace(page, 'Табаки');
  const mintVeilRow = getInventoryRow(page, 'Mint Veil');
  await expect(mintVeilRow).toBeVisible();

  await mintVeilRow.getByRole('checkbox', { name: 'Выбрать Mint Veil' }).check();
  await expect(page.getByText('Выбрано позиций: 1')).toBeVisible();
  await page.getByRole('button', { name: 'Убрать из наличия' }).click();
  await expect(mintVeilRow.getByText('Нет наличия')).toBeVisible();

  await mintVeilRow.getByRole('checkbox', { name: 'Выбрать Mint Veil' }).check();
  await page.getByRole('button', { name: 'Вернуть в наличие' }).click();
  await expect(mintVeilRow.getByText('В наличии')).toBeVisible();

  // Фильтр «Архив» (issue #129): по умолчанию архивные скрыты, чип не нажат.
  // Переключаем фильтр и убеждаемся, что он становится активным, затем
  // возвращаем обратно — неразрушающая проверка для прочих assertion'ов.
  const archiveFilter = page.getByRole('button', { name: 'Фильтр: Архив' });
  await expect(archiveFilter).toHaveAttribute('aria-pressed', 'false');
  await archiveFilter.click();
  await expect(archiveFilter).toHaveAttribute('aria-pressed', 'true');
  await archiveFilter.click();
  await expect(archiveFilter).toHaveAttribute('aria-pressed', 'false');

  await openWorkspace(page, 'Миксы');
  const citrusMixRow = getMixRow(page, 'Цитрусовый караван');
  await expect(citrusMixRow).toBeVisible();
  // Row-click открывает редактор (drawer-pattern из mockup'а Master).
  // Прежняя кнопка «Открыть» в actions-cell заменена на icon edit/copy/hide;
  // edit-icon скрыт до hover, поэтому кликаем по самой строке.
  await citrusMixRow.click();
  // MixBuilder открывается full-page (3-колоночный layout) — Sheet удалён
  // в шаге 5 рефактора по design/design_handoff_master_refactor §Микс —
  // конструктор. Имя микса — `<h2>` в sticky-breadcrumb сверху-слева.
  await expect(page.getByRole('heading', { name: 'Цитрусовый караван' })).toBeVisible();
  await expect(page.getByText('сумма = 100%')).toBeVisible();
  await expect(page.locator('.mix-builder__component').nth(0)).toContainText('Citrus Breeze');
  await expect(page.locator('.mix-builder__component').nth(1)).toContainText('Mint Veil');

  // Возвращаемся в каталог через кнопку «Отмена» в шапке MixBuilder —
  // полноэкранный layout не оверлей, но всё равно прячем его перед
  // переключением на следующий раздел.
  await page.getByRole('button', { name: 'Отмена' }).click();
  await expect(page.locator('.mix-builder')).toBeHidden();

  // Удаление микса = подтверждающий диалог, текст которого зависит от
  // участия микса в рейлах. «Цитрусовый караван» входит в prepared-рейл
  // «Свежая линия», поэтому предупреждение перечисляет рейлы. Не
  // подтверждаем (Отмена) — smoke остаётся неразрушающим для остальных
  // assertion'ов на seed-данных.
  await citrusMixRow.getByRole('button', { name: 'Удалить Цитрусовый караван' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Удалить микс «Цитрусовый караван»?' }),
  ).toBeVisible();
  await expect(page.getByText('Свежая линия')).toBeVisible();
  await page.getByRole('button', { name: 'Отмена' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(citrusMixRow).toBeVisible();

  await openWorkspace(page, 'Рейлы');
  const statisticalRail = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'Больше всего выбирают' }),
  });
  await statisticalRail.getByRole('button', { name: 'Просмотр' }).click();
  // Read-only drawer (статистический рейл): eyebrop «Редактирование рейла»,
  // h2 заголовок = имя рейла, ghost-tag «только просмотр» внутри шапки,
  // поле «Название рейла» дизаблено. Кнопки «Сохранить» нет, только
  // «Закрыть».
  await expect(page.getByRole('heading', { name: 'Больше всего выбирают' }).last()).toBeVisible();
  await expect(page.locator('.rail-drawer__head').getByText('только просмотр')).toBeVisible();
  await expect(page.getByLabel('Название рейла')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Сохранить' })).toHaveCount(0);

  // Rail editor тоже в правом Sheet'е (`.rails-surface__sheet`) — закрываем
  // оверлей перед переключением на 'Доступ'.
  await page.keyboard.press('Escape');
  await expect(page.locator('.rails-surface__sheet')).toBeHidden();

  await openWorkspace(page, 'Доступ');
  await expect(page.getByRole('heading', { name: 'Доступ и персонал', level: 1 })).toBeVisible();
  // Primary-кнопка добавления оператора переехала из header в шапку
  // OperatorsBlock и переименована в «Добавить оператора» (mockup parity).
  await expect(page.getByRole('button', { name: 'Добавить оператора' })).toBeVisible();
  // AuditBlock убран со страницы целиком (mockup-trim) — журнал теперь
  // только за пределами Master, через /staff/audit/events API.
  await expect(page.getByText('Что происходило в системе')).toHaveCount(0);
});

test('Master non-admin role keeps admin-only surfaces restricted while preserving access context', async ({ page }) => {
  await signIn('nomad', 'nomad', page);

  await openWorkspace(page, 'Доступ');
  await expect(page.getByRole('heading', { name: 'Доступ и персонал', level: 1 })).toBeVisible();
  await expect(page.getByText('Статус Telegram automation доступен только для admin.')).toBeVisible();
  await expect(page.getByText('Allowlist Telegram доступен только для admin.').first()).toBeVisible();
  // Текст «Telegram allowlist недоступен для вашей роли.» переехал внутрь Dialog
  // «Новый оператор» после UX-рефактора PR #14 — на странице сразу не виден,
  // нужен клик. Не разворачиваем dialog в smoke, чтобы не множить шаги; inline
  // forbidden-сообщения по Telegram уже проверяет assertion выше.
  await expect(page.getByText('Раздел сотрудников доступен только для admin.').first()).toBeVisible();
  // «Staff accounts недоступны для вашей роли.» переехал внутрь Dialog'а
  // «Создать сотрудника» после mockup-parity рефактора — на странице сразу
  // не виден, нужен клик. Основное forbidden-сообщение по staff выше уже
  // проверено assertion'ом «Раздел сотрудников доступен только для admin.».
  // AuditBlock убран со страницы целиком — forbidden-сообщение по журналу
  // больше не рендерится на /access.
  await expect(page.getByText('Журнал изменений доступен только для admin.')).toHaveCount(0);
});
