import { expect, test, type Page } from '@playwright/test';

const signIn = async (login: string, password: string, page: Page) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Вход для персонала' })).toBeVisible();
  await page.getByLabel('Логин').fill(login);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('heading', { name: 'Панель персонала' })).toBeVisible();
};

test('Master admin login exposes access workspace and admin-only controls', async ({ page }) => {
  await signIn('admin', 'admin', page);

  await page.getByRole('button', { name: /Доступ/ }).click();
  await expect(page.getByRole('heading', { name: 'Коды доступа, сотрудники и Telegram' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Новый чат Telegram' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Новый код доступа' })).toBeVisible();
});

test('Master nomad login keeps admin-only surfaces restricted', async ({ page }) => {
  await signIn('nomad', 'nomad', page);

  await page.getByRole('button', { name: /Доступ/ }).click();
  await expect(page.getByRole('heading', { name: 'Коды доступа, сотрудники и Telegram' })).toBeVisible();
  await expect(page.getByText('Статус Telegram automation доступен только для admin.')).toBeVisible();
  await expect(page.getByText('Журнал изменений доступен только для admin.')).toBeVisible();
  await expect(page.getByText('Раздел сотрудников доступен только для admin.').first()).toBeVisible();
  await expect(page.getByText('Staff accounts недоступны для вашей роли.')).toBeVisible();
});
