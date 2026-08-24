import { expect, test } from '@playwright/test';
import { guestAccessCode } from './helpers';

test('Aroma guest flow opens after daily code and exposes showcase/catalog without login', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Код мастера')).toBeVisible();
  await page.getByLabel('Код мастера').fill(guestAccessCode);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();

  await expect(page.getByRole('button', { name: 'Пропустить' })).toBeVisible();
  await page.getByRole('button', { name: 'Пропустить' }).click();

  await expect(page.getByText('С чего начнём?')).toBeVisible();
  await page.getByRole('button', { name: 'Открыть каталог сразу' }).click();

  await expect(page.getByRole('button', { name: 'Витрина' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Каталог' })).toBeVisible();

  await page.getByRole('button', { name: 'Витрина' }).click();
  await expect(page.getByText('Выбор гостей').first()).toBeVisible();

  await page.getByRole('button', { name: 'Каталог' }).click();
  await expect(page.getByPlaceholder('Поиск по названию и описанию')).toBeVisible();
  await expect(page.getByText(/Найдено/)).toBeVisible();
  await expect(page.getByText('Вход для персонала')).toHaveCount(0);
});

// Возврат в предпочтения после пройденного онбординга (#37). Сценарий не
// зависит от демо-фикстур: профиль берётся первым из грида, а точка входа
// на экране подбора называется по-разному в пустом и заполненном состоянии.
test('Aroma guest returns to preferences from the recommendations screen and can cancel edits', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Код мастера').fill(guestAccessCode);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();

  await page.getByRole('button', { name: 'Пропустить' }).click();
  await expect(page.getByText('С чего начнём?')).toBeVisible();

  const firstProfile = page.locator('.aroma-onboarding-profile-grid button').first();
  await firstProfile.click();
  await expect(firstProfile).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByRole('button', { name: 'Показать подбор' }).click();

  const editEntry = page.getByRole('button', { name: /Изменить вкусы|Открыть предпочтения/ });
  await expect(editEntry).toBeVisible();
  await editEntry.click();

  // Повторный вход отличим от первого прохода и открывается с выбранным ранее.
  await expect(page.getByText('Правка вкусов · Шаг 1 · Профили')).toBeVisible();
  await expect(page.locator('.aroma-onboarding-profile-grid button[aria-pressed="true"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Открыть каталог сразу' })).toHaveCount(0);

  // Правка — черновик: «←» возвращает на подбор и откатывает выбор.
  await page.locator('.aroma-onboarding-profile-grid button').nth(1).click();
  await expect(page.locator('.aroma-onboarding-profile-grid button[aria-pressed="true"]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Назад' }).click();

  await expect(editEntry).toBeVisible();
  await editEntry.click();
  await expect(page.locator('.aroma-onboarding-profile-grid button[aria-pressed="true"]')).toHaveCount(1);
});
