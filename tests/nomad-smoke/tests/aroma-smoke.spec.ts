import { expect, test } from '@playwright/test';

test('Aroma guest flow opens after daily code and exposes showcase/catalog without login', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Код мастера')).toBeVisible();
  await page.getByLabel('Код мастера').fill('NMD7');
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();

  await expect(page.getByRole('button', { name: 'Пропустить' })).toBeVisible();
  await page.getByRole('button', { name: 'Пропустить' }).click();

  await expect(page.getByText('С чего начнём?')).toBeVisible();
  await page.getByRole('button', { name: 'Открыть каталог сразу' }).click();

  await expect(page.getByRole('button', { name: 'Витрина' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Каталог' })).toBeVisible();

  await page.getByRole('button', { name: 'Витрина' }).click();
  await expect(page.getByText('Здесь собраны готовые подборки')).toBeVisible();

  await page.getByRole('button', { name: 'Каталог' }).click();
  await expect(page.getByPlaceholder('Поиск по названию и описанию')).toBeVisible();
  await expect(page.getByText('Результат')).toBeVisible();
  await expect(page.getByText('Вход для персонала')).toHaveCount(0);
});
