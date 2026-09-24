import { expect, test } from '@playwright/test';
import { guestAccessCode } from './helpers';

test('Aroma guest flow opens after daily code and exposes showcase/catalog without login', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Код мастера')).toBeVisible();
  await page.getByLabel('Код мастера').fill(guestAccessCode);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();

  // Знакомство — один экран с кнопкой «Начать подбор» (#114).
  await expect(page.getByRole('button', { name: 'Начать подбор' })).toBeVisible();
  await page.getByRole('button', { name: 'Начать подбор' }).click();

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

  await page.getByRole('button', { name: 'Начать подбор' }).click();
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
  await expect(page.getByText('Правка вкусов · Шаг 01 · из 02 · Профили')).toBeVisible();
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

// Связность онбординга с картотекой (#36). Не зависит от демо-фикстур:
// проверяется наличие живого счётчика и его реакция на выбор, а не конкретные
// числа — на продуктовом снапшоте они другие.
test('Aroma onboarding shows how many mixes stand behind the current choice', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Код мастера').fill(guestAccessCode);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();

  await page.getByRole('button', { name: 'Начать подбор' }).click();
  await expect(page.getByText('С чего начнём?')).toBeVisible();

  const tally = page.locator('.aroma-onboarding-tally');
  await expect(tally).toBeVisible();
  await expect(tally).not.toBeEmpty();

  const beforeChoice = (await tally.innerText()).trim();
  await page.locator('.aroma-onboarding-profile-grid button').first().click();
  await expect(tally).not.toHaveText(beforeChoice);

  await page.getByRole('button', { name: 'Далее' }).click();
  await expect(page.getByText('Любимые ноты')).toBeVisible();
  await expect(tally).toBeVisible();
});

// «Намиксуй» (#127): гость собирает микс свайпами и доходит до карточки для
// мастера. Сценарий не зависит от конкретных табаков: берёт верхнюю карту
// каждой колоды, а если штриха в наличии нет — пропускает ход.
test('Aroma guest mixes a bowl in «Намиксуй» and gets the master card', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Код мастера').fill(guestAccessCode);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();
  await page.getByRole('button', { name: 'Начать подбор' }).click();
  await page.getByRole('button', { name: 'Открыть каталог сразу' }).click();

  // Вход — карточка-приглашение первой на «Витрине».
  await page.getByRole('button', { name: 'Витрина' }).click();
  await page.getByRole('button', { name: /Намиксуйте сами/ }).click();
  await expect(page.getByRole('heading', { name: 'Намиксуй', level: 1 })).toBeVisible();

  const take = page.getByRole('button', { name: 'Беру', exact: true });
  await expect(page.getByText('Ход 01 · из 03')).toBeVisible();
  await expect(take).toBeEnabled();

  // Основа — свайп вправо дальше порога 90 px.
  const card = page.locator('.mixer-card[data-pos="0"]');
  const box = await card.boundingBox();
  if (!box) throw new Error('Нет верхней карты колоды');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 160, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();

  // Акцент — кнопкой «Беру».
  await expect(page.getByText('Ход 02 · из 03')).toBeVisible();
  await expect(page.getByText('совпадение с чашей').first()).toBeVisible();
  await take.click();

  // Штрих — необязательный ход.
  await expect(page.getByText('Ход 03 · из 03')).toBeVisible();
  if (await take.isEnabled()) {
    await take.click();
  } else {
    await page.getByRole('button', { name: 'Без штриха' }).click();
  }

  // Раскрытие: имя, доли, «Покурить».
  await expect(page.getByText('Раскрытие')).toBeVisible();
  await expect(page.getByLabel('Название микса')).not.toHaveValue('');
  await expect(page.getByText('Доли · тяните бегунки')).toBeVisible();
  await expect(page.getByRole('slider').first()).toBeVisible();
  await page.getByRole('button', { name: 'Покурить' }).click();

  // Карточка для мастера открывается и при сбое аналитического события.
  await expect(page.getByText('Покажите мастеру')).toBeVisible();
  await expect(page.getByText(/Собран гостем/)).toBeVisible();
  await page.getByRole('button', { name: 'Готово' }).click();
  await expect(page.getByRole('button', { name: /Намиксуйте сами/ })).toBeVisible();
});
