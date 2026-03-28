import { expect, test, type Locator, type Page } from '@playwright/test';

const signIn = async (login: string, password: string, page: Page) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Вход для персонала' })).toBeVisible();
  await page.getByLabel('Логин').fill(login);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('heading', { name: 'Операционный контур' })).toBeVisible();
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
  await expect(getWorkspaceTab(page, 'Инвентаризация')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Таблица остатков и зависимых миксов' })).toBeVisible();

  await getWorkspaceTab(page, 'Инвентаризация').press('End');
  await expect(getWorkspaceTab(page, 'Доступ')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Daily code и Telegram allowlist' })).toBeVisible();

  await getWorkspaceTab(page, 'Доступ').press('Home');
  await expect(getWorkspaceTab(page, 'Дашборд')).toHaveAttribute('aria-selected', 'true');
});

test('Master admin smoke covers inventory batch flow, mixes editor, rails read-only mode and access observability', async ({ page }) => {
  await signIn('admin', 'admin', page);

  await openWorkspace(page, 'Инвентаризация');
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
  await expect(page.getByRole('heading', { name: 'Цитрусовый караван' })).toBeVisible();
  await expect(page.getByText('Сумма долей: 100%')).toBeVisible();
  await expect(page.getByText('Готово к сохранению')).toBeVisible();
  await expect(page.locator('.mixes-component-row').nth(0).getByRole('combobox')).toHaveValue('tobacco-citrus-breeze');
  await expect(page.locator('.mixes-component-row').nth(1).getByRole('combobox')).toHaveValue('tobacco-mint-veil');

  await openWorkspace(page, 'Рейлы');
  const statisticalRail = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'Больше всего выбирают' }),
  });
  await statisticalRail.getByRole('button', { name: 'Просмотр' }).click();
  await expect(page.getByRole('heading', { name: 'Больше всего выбирают' }).last()).toBeVisible();
  await expect(page.locator('.status-chip--locked')).toHaveText('Только просмотр');
  await expect(page.getByLabel('Название')).toBeDisabled();

  await openWorkspace(page, 'Доступ');
  await expect(page.getByRole('heading', { name: 'Daily code и Telegram allowlist' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Новый оператор' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Добавить в allowlist' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Последние staff-операции' })).toBeVisible();
});

test('Master nomad role keeps admin-only surfaces restricted while preserving access context', async ({ page }) => {
  await signIn('nomad', 'nomad', page);

  await openWorkspace(page, 'Доступ');
  await expect(page.getByRole('heading', { name: 'Daily code и Telegram allowlist' })).toBeVisible();
  await expect(page.getByText('Статус Telegram automation доступен только для admin.')).toBeVisible();
  await expect(page.getByText('Allowlist Telegram доступен только для admin.').first()).toBeVisible();
  await expect(page.getByText('Telegram allowlist недоступен для вашей роли.')).toBeVisible();
  await expect(page.getByText('Раздел сотрудников доступен только для admin.').first()).toBeVisible();
  await expect(page.getByText('Staff accounts недоступны для вашей роли.')).toBeVisible();
  await expect(page.getByText('Журнал изменений доступен только для admin.')).toBeVisible();
});
