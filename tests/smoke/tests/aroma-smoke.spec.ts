import { expect, test, type Page } from '@playwright/test';
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

  // Компактная Витрина (#175): тип полки — значком и в aria-label заголовка,
  // заголовок открывает подборку, карточка-постер — микс. Таб ищем через
  // навигацию: подстрочный поиск по «Витрина» зацепит полку «Мягкая витрина».
  // Полки «выбор гостей» и «оценки гостей» появляются только после «Покурить»
  // и оценок (#197), а в seed событий нет, поэтому открываем полку редакции.
  const nav = page.getByRole('navigation', { name: 'Гостевая навигация' });
  const editorialShelf = page.getByRole('button', { name: /^Открыть подборку «.+», редакция$/ }).first();
  await expect(editorialShelf).toBeVisible();
  await editorialShelf.click();
  await expect(page.getByText('Витрина · Редакция')).toBeVisible();
  await page.getByRole('button', { name: 'Назад к витрине' }).click();

  await page.locator('.aroma-showcase-card').first().click();
  await expect(page.getByRole('button', { name: 'Покурить' })).toBeVisible();
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();

  await nav.getByRole('button', { name: 'Каталог', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: 'Поиск по каталогу' })).toBeVisible();
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

  // Правке нужен второй профиль. На продуктовом снапшоте наличие — только полка
  // Nomad, и гостю доступны миксы одного профиля: сценарий там не применим.
  const profiles = page.locator('.aroma-onboarding-profile-grid button');
  await expect(profiles.first()).toBeVisible();
  test.skip((await profiles.count()) < 2, 'в онбординге меньше двух профилей — нечего добавить при правке');

  const firstProfile = page.locator('.aroma-onboarding-profile-grid button').first();
  await firstProfile.click();
  await expect(firstProfile).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByRole('button', { name: 'Показать подбор' }).click();

  const editEntry = page.getByRole('button', { name: /Изменить вкусы|Открыть предпочтения/ });
  await expect(editEntry).toBeVisible();
  await editEntry.click();

  // Повторный вход отличим от первого прохода: без «Открыть каталог сразу» и с
  // выбранным ранее.
  await expect(page.getByRole('progressbar', { name: 'Шаг 1 из 2' })).toBeVisible();
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

  // Вход — строка-приглашение первой на «Витрине».
  await page.getByRole('button', { name: 'Витрина' }).click();
  await page.getByRole('button', { name: 'Собрать свой микс' }).click();
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
  const mixName = (await page.getByLabel('Название микса').inputValue()).trim();
  await expect(page.getByText('Доли · тяните бегунки')).toBeVisible();
  await expect(page.getByRole('slider').first()).toBeVisible();
  await page.getByRole('button', { name: 'Покурить' }).click();

  // Карточка для мастера открывается и при сбое аналитического события.
  await expect(page.getByText('Покажите мастеру')).toBeVisible();
  await expect(page.getByText(/Собран гостем/)).toBeVisible();
  await page.getByRole('button', { name: 'Готово' }).click();
  await expect(page.getByRole('button', { name: 'Собрать свой микс' })).toBeVisible();

  // Собранный микс — карточка для мастера в шапке (#289, #291); «Готово»
  // возвращает туда, откуда её открыли.
  await page.getByRole('button', { name: `Карточка для мастера: ${mixName}` }).click();
  await expect(page.getByText('Покажите мастеру')).toBeVisible();
  await expect(page.getByRole('heading', { name: mixName, level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Готово' }).click();
  await expect(page.getByRole('button', { name: 'Собрать свой микс' })).toBeVisible();
});

// Нижняя панель (#168, #243, #263): шесть значков, имена — в aria-label. Панели нет на
// знакомстве и в онбординге; Миксер из панели открывается на весь экран и
// «Назад» возвращает на экран, откуда гость пришёл, — и посреди сборки (#293).
test('Aroma guest navigates with the bottom bar and opens the mixer from it', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Код мастера').fill(guestAccessCode);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();

  const nav = page.getByRole('navigation', { name: 'Гостевая навигация' });
  await expect(page.getByRole('button', { name: 'Начать подбор' })).toBeVisible();
  await expect(nav).toHaveCount(0);
  await page.getByRole('button', { name: 'Начать подбор' }).click();
  await expect(page.getByText('С чего начнём?')).toBeVisible();
  await expect(nav).toHaveCount(0);
  await page.getByRole('button', { name: 'Открыть каталог сразу' }).click();

  await expect(nav).toBeVisible();
  await expect(nav.getByRole('button')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Сменить код', exact: true })).toHaveCount(0);
  const catalogTab = nav.getByRole('button', { name: 'Каталог', exact: true });
  await expect(catalogTab).toHaveAttribute('aria-current', 'page');

  const showcaseTab = nav.getByRole('button', { name: 'Витрина', exact: true });
  await showcaseTab.click();
  await expect(showcaseTab).toHaveAttribute('aria-current', 'page');
  await expect(catalogTab).not.toHaveAttribute('aria-current', 'page');

  await catalogTab.click();
  await nav.getByRole('button', { name: 'Миксер', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Намиксуй', level: 1 })).toBeVisible();
  await expect(nav).toHaveCount(0);
  const take = page.getByRole('button', { name: 'Беру', exact: true });
  await expect(take).toBeEnabled();
  await take.click();
  await expect(page.getByText('Ход 02 · из 03')).toBeVisible();

  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: 'Поиск по каталогу' })).toBeVisible();
  await expect(catalogTab).toHaveAttribute('aria-current', 'page');
});

// Каталог (#181): поиск и фильтры в одном месте. «Фильтры» открывает шторку
// с характером и вкусами, выбор виден метками под полем и снимается касанием.
// Вкус берётся первым из шторки, поэтому сценарий не зависит от демо-фикстур.
test('Aroma catalog keeps filters in one sheet and shows them as removable tags', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Код мастера').fill(guestAccessCode);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();
  await page.getByRole('button', { name: 'Начать подбор' }).click();
  await page.getByRole('button', { name: 'Открыть каталог сразу' }).click();

  await expect(page.getByRole('searchbox', { name: 'Поиск по каталогу' })).toBeVisible();
  const filtersButton = page.getByRole('button', { name: 'Фильтры', exact: true });
  await filtersButton.click();

  const sheet = page.getByRole('dialog', { name: 'Фильтры' });
  await expect(sheet).toBeVisible();
  const flavor = sheet.getByRole('group', { name: 'Вкусы' }).getByRole('button').first();
  const flavorName = (await flavor.getAttribute('aria-label'))?.split(',')[0] ?? '';
  await flavor.click();
  await expect(flavor).toHaveAttribute('aria-pressed', 'true');
  await sheet.getByRole('button', { name: /^Показать \d+ микс/ }).click();
  await expect(sheet).toHaveCount(0);

  const tag = page.getByRole('button', { name: `Убрать фильтр «${flavorName}»` });
  await expect(tag).toBeVisible();
  await expect(page.getByRole('button', { name: 'Фильтры, выбрано 1' })).toBeVisible();
  await tag.click();
  await expect(tag).toHaveCount(0);
  await expect(filtersButton).toBeVisible();
});

// Кабинет гостя (#243): последний пункт панели. Анонимный путь — согласие и CTA
// «Войти через Telegram»; сам вход через Telegram smoke не проверяет. Бот
// входа задаётся env backend, поэтому конфиг подменяется в браузере.
const openCabinet = async (page: Page, botUsername: string | null) => {
  await page.route('**/guest/auth/telegram/config', (route) => route.fulfill({ json: { botUsername } }));
  await page.goto('/');

  await page.getByLabel('Код мастера').fill(guestAccessCode);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();
  await page.getByRole('button', { name: 'Начать подбор' }).click();
  await page.getByRole('button', { name: 'Открыть каталог сразу' }).click();

  const nav = page.getByRole('navigation', { name: 'Гостевая навигация' });
  const cabinetTab = nav.getByRole('button', { name: 'Кабинет', exact: true });
  await cabinetTab.click();
  await expect(cabinetTab).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'Запомним, что вам понравилось', level: 1 })).toBeVisible();
};

test('Aroma cabinet asks for consent before «Войти через Telegram»', async ({ page }) => {
  await openCabinet(page, 'aroma_atelier_client_bot');

  const login = page.getByRole('button', { name: 'Войти через Telegram' });
  await expect(login).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Политика' })).toHaveAttribute('href', 'https://nomadlounge.ru/agreement/');

  const consent = page.getByRole('checkbox', { name: /Согласен на обработку Telegram id/ });
  await consent.click();
  await expect(consent).toHaveAttribute('aria-checked', 'true');
  await expect(login).toBeEnabled();
});

test('Aroma cabinet without a login bot only explains itself', async ({ page }) => {
  await openCabinet(page, null);

  await expect(page.getByText('Без входа всё работает как прежде. Кабинет действует в этом заведении.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Войти через Telegram' })).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
});

test('Aroma intro offers the returning guest to log in', async ({ page }) => {
  await page.route('**/guest/auth/telegram/config', (route) =>
    route.fulfill({ json: { botUsername: 'aroma_atelier_client_bot' } }),
  );
  await page.goto('/');

  await page.getByLabel('Код мастера').fill(guestAccessCode);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();

  await expect(page.getByRole('button', { name: 'Начать подбор' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Уже были у нас\? Войти через Telegram/ })).toBeVisible();
});

// Сердечко в карточке микса (#244): у анонима оно не прячется — по нажатию
// шторка «Избранное живёт в кабинете», «Не сейчас» закрывает только её.
test('Aroma anonymous heart offers the cabinet and «Не сейчас» closes the prompt', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Код мастера').fill(guestAccessCode);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();
  await page.getByRole('button', { name: 'Начать подбор' }).click();
  await page.getByRole('button', { name: 'Открыть каталог сразу' }).click();

  await page.locator('.aroma-catalog-row').first().click();
  const heart = page.getByRole('button', { name: 'В избранное' });
  await expect(heart).toHaveAttribute('aria-pressed', 'false');
  await heart.click();

  const prompt = page.getByRole('dialog', { name: 'Избранное живёт в кабинете' });
  await expect(prompt).toBeVisible();
  await expect(prompt.getByRole('button', { name: 'Войти', exact: true })).toBeVisible();
  await prompt.getByRole('button', { name: 'Не сейчас' }).click();
  await expect(prompt).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Покурить' })).toBeVisible();
});

// «Для вас» (#245) — только у вошедшего гостя. Аноним после онбординга видит
// Подбор как раньше: без «Для вас», подсказки и «Подобрать под настроение»,
// и Подбор не ходит в /guest/me/for-you.
test('Aroma anonymous recommendations stay without «Для вас»', async ({ page }) => {
  const forYouRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/guest/me/for-you')) forYouRequests.push(request.url());
  });
  await page.goto('/');

  await page.getByLabel('Код мастера').fill(guestAccessCode);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();
  await page.getByRole('button', { name: 'Начать подбор' }).click();
  await page.locator('.aroma-onboarding-profile-grid button').first().click();
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByRole('button', { name: 'Показать подбор' }).click();

  await expect(page.getByRole('button', { name: /Изменить вкусы|Открыть предпочтения/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Для вас', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Подобрать под настроение' })).toHaveCount(0);
  await expect(page.getByText('Давно на одном вкусе')).toHaveCount(0);
  expect(forYouRequests).toEqual([]);
});

// Ошибки backend гостю — только по-русски (#267): служебный `error` ответа на
// экран не попадает, а сбой «Покурить» у героя виден на экране подбора.
test('Aroma guest sees Russian errors instead of backend messages', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Код мастера').fill('0000');
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();
  await expect(page.getByText('Код не подошёл. Уточните его у мастера зала.')).toBeVisible();
  await expect(page.getByText('Invalid access code')).toHaveCount(0);

  await page.getByLabel('Код мастера').fill(guestAccessCode);
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();
  await page.getByRole('button', { name: 'Начать подбор' }).click();
  await page.locator('.aroma-onboarding-profile-grid button').first().click();
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByRole('button', { name: 'Показать подбор' }).click();

  const heroSmoke = page.locator('.aroma-recs-hero').getByRole('button', { name: 'Покурить' });
  await expect(page.getByRole('button', { name: /Изменить вкусы|Открыть предпочтения/ })).toBeVisible();
  test.skip((await heroSmoke.count()) === 0, 'подбор пуст — нет героя с «Покурить»');

  await page.route('**/guest/events/smoke-cta', (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Mix not found' }) }),
  );
  await heroSmoke.click();
  await expect(page.getByText('Этот микс сейчас недоступен по наличию.')).toBeVisible();
  await expect(page.getByText('Mix not found')).toHaveCount(0);
});

// «Рилсы» (#263): третий пункт панели — лента миксов со снапом «один жест — один
// рилс». Колесо переводит на следующий рилс; «Покурить» — то же событие и тот же
// экран «Покажите мастеру», «Готово» возвращает на тот же рилс.
test('Aroma reels feed swipes to the next mix and returns after «Покурить»', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Код мастера').fill(guestAccessCode);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();
  await page.getByRole('button', { name: 'Начать подбор' }).click();
  await page.getByRole('button', { name: 'Открыть каталог сразу' }).click();

  const nav = page.getByRole('navigation', { name: 'Гостевая навигация' });
  const reelsTab = nav.getByRole('button', { name: 'Рилсы', exact: true });
  await expect(reelsTab).toBeVisible();
  await reelsTab.click();
  await expect(reelsTab).toHaveAttribute('aria-current', 'page');
  // Без видимой шапки и счётчика (#290): «Рилсы» — заголовок для скринридера.
  await expect(page.getByRole('heading', { name: 'Рилсы', level: 1 })).toBeAttached();
  await expect(page.getByText(/· из \d+/)).toHaveCount(0);
  await expect(page.getByText('Листайте вверх')).toBeVisible();

  const activeName = page.locator('.reel-reveal .reel-name');
  const firstName = (await activeName.innerText()).trim();
  // Афиша (#314): описание (без него — вкусы) и состав видны без «Подробнее».
  const firstReel = page.locator('.reel', { has: page.locator('.reel-reveal') });
  await expect(firstReel.locator('.reel-desc, .reel-flavors')).toBeVisible();
  await expect(firstReel.getByRole('list', { name: 'Состав микса' })).toBeVisible();
  test.skip((await page.locator('.reel-slot').count()) < 2, 'в наличии один микс — листать некуда');

  const feed = page.locator('.reels');
  const box = await feed.boundingBox();
  if (!box) throw new Error('Нет ленты рилсов');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
  await page.mouse.wheel(0, box.height);
  await expect(activeName).not.toHaveText(firstName);
  await expect(page.getByText('Листайте вверх')).toHaveCount(0);

  const reel = page.locator('.reel', { has: page.locator('.reel-reveal') });
  const mixName = (await reel.locator('.reel-name').innerText()).trim();
  await reel.getByRole('button', { name: 'Покурить' }).click();

  await expect(page.getByText('Покажите мастеру')).toBeVisible();
  await expect(page.getByRole('heading', { name: mixName, level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Готово' }).click();

  await expect(activeName).toHaveText(mixName);
  await expect(reelsTab).toHaveAttribute('aria-current', 'page');
});

// Конец ленты (#298): после последнего микса — слайд-приглашение, «Намиксуй»
// открывает Миксер, «Назад» возвращает в рилсы.
test('Aroma reels feed ends with an invitation to «Намиксуй»', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Код мастера').fill(guestAccessCode);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();
  await page.getByRole('button', { name: 'Начать подбор' }).click();
  await page.getByRole('button', { name: 'Открыть каталог сразу' }).click();

  const nav = page.getByRole('navigation', { name: 'Гостевая навигация' });
  const reelsTab = nav.getByRole('button', { name: 'Рилсы', exact: true });
  await reelsTab.click();
  await expect(page.locator('.reel-reveal .reel-name')).toBeVisible();

  const end = page.getByRole('region', { name: 'Конец ленты' });
  const feed = page.locator('.reels');
  await feed.evaluate((node) => node.scrollTo({ top: node.scrollHeight }));
  await expect(end).toBeInViewport();
  await expect(end.getByText('Не нашли своё?')).toBeVisible();

  await end.getByRole('button', { name: 'Намиксуй' }).click();
  await expect(page.getByRole('heading', { name: 'Намиксуй', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await expect(reelsTab).toHaveAttribute('aria-current', 'page');
});

// Полоса рилсов над Подбором (#264): кружки в порядке ленты, кружок открывает
// раздел «Рилсы» на своём миксе. Remotion на Подборе не рендерится.
test('Aroma reel strip above recommendations opens the feed on the tapped mix', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Код мастера').fill(guestAccessCode);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();
  await page.getByRole('button', { name: 'Начать подбор' }).click();
  await page.locator('.aroma-onboarding-profile-grid button').first().click();
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByRole('button', { name: 'Показать подбор' }).click();

  const strip = page.getByRole('list', { name: 'Рилсы' });
  await expect(strip).toBeVisible();
  const circles = strip.getByRole('button');
  const count = await circles.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(8);

  const index = count > 1 ? 1 : 0;
  const name = (await circles.nth(index).innerText()).trim();
  await circles.nth(index).click();

  const nav = page.getByRole('navigation', { name: 'Гостевая навигация' });
  await expect(nav.getByRole('button', { name: 'Рилсы', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.reel-reveal .reel-name')).toHaveText(name);
});

// Сердечко на рилсе (#265): у гостя без входа — та же шторка «Избранное живёт
// в кабинете», что в карточке микса (#244); «Не сейчас» возвращает в ленту.
test('Aroma anonymous heart on a reel offers the cabinet and «Не сейчас» closes the prompt', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Код мастера').fill(guestAccessCode);
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Войти в Ателье' }).click();
  await page.getByRole('button', { name: 'Начать подбор' }).click();
  await page.getByRole('button', { name: 'Открыть каталог сразу' }).click();

  await page.getByRole('navigation', { name: 'Гостевая навигация' }).getByRole('button', { name: 'Рилсы', exact: true }).click();
  const reel = page.locator('.reel', { has: page.locator('.reel-reveal') });
  const heart = reel.getByRole('button', { name: 'В избранное' });
  await expect(heart).toHaveAttribute('aria-pressed', 'false');
  await heart.click();

  const prompt = page.getByRole('dialog', { name: 'Избранное живёт в кабинете' });
  await expect(prompt).toBeVisible();
  await expect(prompt.getByRole('button', { name: 'Войти', exact: true })).toBeVisible();
  await prompt.getByRole('button', { name: 'Не сейчас' }).click();
  await expect(prompt).toHaveCount(0);
  await expect(reel.getByRole('button', { name: 'Покурить' })).toBeVisible();
});
