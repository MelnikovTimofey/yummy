import { expect, test } from '@playwright/test';
import { guestAccessCode } from './helpers';

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
