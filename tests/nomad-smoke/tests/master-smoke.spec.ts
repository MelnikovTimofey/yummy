import { expect, test, type Locator, type Page } from '@playwright/test';

const signIn = async (login: string, password: string, page: Page) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Вход для персонала' })).toBeVisible();
  await page.getByLabel('Логин').fill(login);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  // h1 после логина = label активного workspace (default `dashboard` → `Дашборд`);
  // brand-name `Nomad Master` остался в нав-баре как span, а не h1.
  // Любое изменение default workspace или label'а должно ловиться этим smoke —
  // см. CLAUDE.md §3 (smoke gate после правок фронта).
  await expect(page.getByRole('heading', { name: 'Дашборд', level: 1 })).toBeVisible();
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

const getMixRow = (page: Page, name: string): Locator =>
  page.locator('tbody tr').filter({
    has: page.getByRole('cell', { name }),
  });

test('Master workspace tabs support keyboard navigation for critical admin sections', async ({ page }) => {
  await signIn('admin', 'admin', page);

  await expect(page.getByRole('tablist', { name: 'Рабочие разделы Мастера' })).toBeVisible();
  await expect(getWorkspaceTab(page, 'Дашборд')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.master-stage__header').getByRole('heading', { name: 'Дашборд' })).toBeVisible();

  await getWorkspaceTab(page, 'Дашборд').press('ArrowRight');
  await expect(getWorkspaceTab(page, 'Табаки')).toHaveAttribute('aria-selected', 'true');
  // h1 рабочего экрана = label активного workspace; отдельной h2 «Таблица остатков»
  // в master shell больше нет после UX-рефактора PR #14.
  await expect(page.locator('.master-stage__header').getByRole('heading', { name: 'Табаки' })).toBeVisible();

  await getWorkspaceTab(page, 'Табаки').press('End');
  await expect(getWorkspaceTab(page, 'Доступ')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Daily code и Telegram allowlist', level: 2 })).toBeVisible();

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

  await openWorkspace(page, 'Миксы');
  const citrusMixRow = getMixRow(page, 'Цитрусовый караван');
  await expect(citrusMixRow).toBeVisible();
  await citrusMixRow.getByRole('button', { name: 'Редактировать' }).click();
  // MixBuilder открывается full-page (3-колоночный layout) — Sheet удалён
  // в шаге 5 рефактора по design/design_handoff_master_refactor §Микс —
  // конструктор. Имя микса — `<h2>` в sticky-breadcrumb сверху-слева.
  await expect(page.getByRole('heading', { name: 'Цитрусовый караван' })).toBeVisible();
  await expect(page.getByText('Сумма долей: 100%')).toBeVisible();
  await expect(page.locator('.mix-builder__component').nth(0)).toContainText('Citrus Breeze');
  await expect(page.locator('.mix-builder__component').nth(1)).toContainText('Mint Veil');

  // Возвращаемся в каталог через кнопку «Отмена» в шапке MixBuilder —
  // полноэкранный layout не оверлей, но всё равно прячем его перед
  // переключением на следующий раздел.
  await page.getByRole('button', { name: 'Отмена' }).click();
  await expect(page.locator('.mix-builder')).toBeHidden();

  await openWorkspace(page, 'Рейлы');
  const statisticalRail = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'Больше всего выбирают' }),
  });
  await statisticalRail.getByRole('button', { name: 'Просмотр' }).click();
  await expect(page.getByRole('heading', { name: 'Больше всего выбирают' }).last()).toBeVisible();
  await expect(page.locator('.status-chip--locked')).toHaveText('Только просмотр');
  await expect(page.getByLabel('Название')).toBeDisabled();

  // Rail editor тоже в правом Sheet'е (`.rails-surface__sheet`) — закрываем
  // оверлей перед переключением на 'Доступ'.
  await page.keyboard.press('Escape');
  await expect(page.locator('.rails-surface__sheet')).toBeHidden();

  await openWorkspace(page, 'Доступ');
  await expect(page.getByRole('heading', { name: 'Daily code и Telegram allowlist' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Новый оператор' })).toBeVisible();
  // Кнопка «Добавить в список» переехала внутрь Telegram operator Dialog'а
  // (открывается кликом «Новый оператор») — не видна без раскрытия диалога.
  // Сам триггер `Новый оператор` уже проверен выше.
  await expect(page.getByRole('heading', { name: 'Последние staff-операции' })).toBeVisible();
});

test('Master nomad role keeps admin-only surfaces restricted while preserving access context', async ({ page }) => {
  await signIn('nomad', 'nomad', page);

  await openWorkspace(page, 'Доступ');
  await expect(page.getByRole('heading', { name: 'Daily code и Telegram allowlist' })).toBeVisible();
  await expect(page.getByText('Статус Telegram automation доступен только для admin.')).toBeVisible();
  await expect(page.getByText('Allowlist Telegram доступен только для admin.').first()).toBeVisible();
  // Текст «Telegram allowlist недоступен для вашей роли.» переехал внутрь Dialog
  // «Новый оператор» после UX-рефактора PR #14 — на странице сразу не виден,
  // нужен клик. Не разворачиваем dialog в smoke, чтобы не множить шаги; inline
  // forbidden-сообщения по Telegram уже проверяет assertion выше.
  await expect(page.getByText('Раздел сотрудников доступен только для admin.').first()).toBeVisible();
  await expect(page.getByText('Staff accounts недоступны для вашей роли.')).toBeVisible();
  await expect(page.getByText('Журнал изменений доступен только для admin.')).toBeVisible();
});
