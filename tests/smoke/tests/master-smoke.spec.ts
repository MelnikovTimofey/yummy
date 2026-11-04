import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  adminCredentials,
  applyStockFilter,
  getWorkspaceTab,
  openWorkspace,
  operatorCredentials,
  pinFirstInventoryRow,
  pinFirstMixRow,
  readStockFilterCount,
  readMixName,
  signIn,
} from './helpers';

test('Master workspace tabs support keyboard navigation for critical admin sections', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  await expect(page.getByRole('tablist', { name: 'Рабочие разделы Мастера' })).toBeVisible();
  await expect(getWorkspaceTab(page, 'Дашборд')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Дашборд', exact: true, level: 1 })).toBeVisible();

  await getWorkspaceTab(page, 'Дашборд').press('ArrowRight');
  // #211: вкладка «Табаки» разделилась на «Полку» (что держим) и «Каталог»
  // (что бывает); следом за дашбордом идёт «Полка».
  await expect(getWorkspaceTab(page, 'Полка')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Полка', level: 1 })).toBeVisible();

  // #212: между «Полкой» и «Каталогом» — «Поставки» (счета поставщиков и приход).
  await getWorkspaceTab(page, 'Полка').press('ArrowRight');
  await expect(getWorkspaceTab(page, 'Поставки')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Поставки', level: 1 })).toBeVisible();

  await getWorkspaceTab(page, 'Поставки').press('ArrowRight');
  await expect(getWorkspaceTab(page, 'Каталог')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Каталог', level: 1 })).toBeVisible();

  await getWorkspaceTab(page, 'Каталог').press('End');
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

test('Master admin smoke covers catalog shelf batch flow, mixes editor, rails read-only mode and access observability', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  await openWorkspace(page, 'Каталог');
  const { row: tobaccoRow } = await pinFirstInventoryRow(page);

  const outOfStockBefore = await readStockFilterCount(page, 'Нет наличия');

  await tobaccoRow.getByRole('checkbox').check();
  await expect(page.getByText('Выбрано позиций: 1')).toBeVisible();
  // Батч-флоу неразрушающий: табак убирается с полки и тут же возвращается.
  // Остаток при этом не трогается, поэтому вернувшийся табак снова виден гостю,
  // а прогон не меняет состояние базы — важно и для демо-seed, и для снапшота.
  // Первая строка при сортировке по умолчанию («сначала по наличию») — табак
  // в наличии, то есть на полке (#211).
  // exact: у кнопки «На полку» в строке каталога aria-label «На полку: <табак>».
  await page.getByRole('button', { name: 'Убрать с полки', exact: true }).click();
  // Результат читается по счётчику чипа, а не по статусу в исходной строке:
  // при сортировке по умолчанию («сначала по наличию») строка уезжает в конец
  // списка, а на каталоге из 11 505 позиций — вообще на другую страницу.
  await expect
    .poll(() => readStockFilterCount(page, 'Нет наличия'))
    .toBe(outOfStockBefore + 1);

  // Возврат — из отфильтрованного списка снятых, где строка гарантированно
  // видна независимо от размера каталога.
  await applyStockFilter(page, 'Нет наличия');
  await expect(tobaccoRow).toBeVisible();
  await tobaccoRow.getByRole('checkbox').check();
  await expect(page.getByText('Выбрано позиций: 1')).toBeVisible();
  await page.getByRole('button', { name: 'На полку', exact: true }).click();
  await expect
    .poll(() => readStockFilterCount(page, 'Нет наличия'))
    .toBe(outOfStockBefore);

  await applyStockFilter(page, 'Все');
  // Единая панель фильтров (#464, #467): число у каждого статуса, кроме «Все»,
  // у атрибутов чисел нет.
  const catalogStatuses = page.getByRole('group', { name: 'Статус в каталоге' });
  await expect(catalogStatuses.locator('.filter-chip__count')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Фильтр: Все' }).locator('.filter-chip__count')).toHaveCount(0);
  const catalogAttributes = page.getByRole('group', { name: 'Фильтры каталога' });
  await expect(catalogAttributes.locator('.filter-chip__count')).toHaveCount(0);
  await expect(page.getByText('Ещё фильтры', { exact: true })).toHaveCount(0);
  await catalogAttributes.getByRole('button', { name: 'Бренд', exact: true }).click();
  await page.getByRole('group', { name: 'Бренд', exact: true }).getByRole('checkbox').first().check();
  await expect(catalogAttributes.getByRole('button', { name: /^Бренд: / })).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await catalogAttributes.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await expect(catalogAttributes.getByRole('button', { name: 'Бренд', exact: true })).toBeVisible();

  // «Архив» — статус из того же ряда (#467): по умолчанию архивные скрыты,
  // выбор другого статуса возвращает к действующим табакам.
  const archiveFilter = page.getByRole('button', { name: 'Фильтр: Архив' });
  await expect(archiveFilter).toHaveAttribute('aria-pressed', 'false');
  await expect(archiveFilter.locator('.filter-chip__count')).toHaveCount(1);
  await archiveFilter.click();
  await expect(archiveFilter).toHaveAttribute('aria-pressed', 'true');
  await applyStockFilter(page, 'Все');
  await expect(archiveFilter).toHaveAttribute('aria-pressed', 'false');

  // Пилюля «По …» и заголовок колонки меняют одну сортировку.
  await expect(page.getByRole('button', { name: 'Сортировка: По наличию' })).toBeVisible();
  await page.getByRole('columnheader', { name: 'Табак' }).getByRole('button').click();
  await expect(page.getByRole('button', { name: 'Сортировка: По названию' })).toBeVisible();

  await openWorkspace(page, 'Миксы');
  const statusChips = page.getByRole('group', { name: 'Статус микса' });
  await expect(statusChips.locator('.filter-chip__count')).toHaveCount(4);
  await expect(statusChips.getByRole('button', { name: 'Фильтр: Все' }).locator('.filter-chip__count')).toHaveCount(0);
  const mixAttributes = page.getByRole('group', { name: 'Фильтры миксов' });
  await expect(mixAttributes.locator('.filter-chip__count')).toHaveCount(0);
  await mixAttributes.getByRole('button', { name: 'Рейлы', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Рейлы', exact: true }).getByRole('checkbox')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Сортировка: По спросу' })).toBeVisible();
  const mixRow = await pinFirstMixRow(page);
  const mixName = await readMixName(mixRow);
  // Row-click открывает редактор (drawer-pattern из mockup'а Master).
  // Прежняя кнопка «Открыть» в actions-cell заменена на icon edit/copy/hide;
  // edit-icon скрыт до hover, поэтому кликаем по самой строке.
  await mixRow.click();
  // MixBuilder открывается full-page (3-колоночный layout) — Sheet удалён
  // в шаге 5 рефактора по design/design_handoff_master_refactor §Микс —
  // конструктор. Имя микса — `<h2>` в sticky-breadcrumb сверху-слева.
  await expect(page.getByRole('heading', { name: mixName })).toBeVisible();
  // Предупреждение о сумме долей зависит от конкретного микса. Проверяем сам
  // breadcrumb и наличие состава — они есть у любого микса.
  await expect(page.locator('.mix-builder__breadcrumb')).toBeVisible();
  await expect(page.locator('.mix-builder__component').first()).toBeVisible();

  // Возвращаемся в каталог через кнопку «Отмена» в шапке MixBuilder —
  // полноэкранный layout не оверлей, но всё равно прячем его перед
  // переключением на следующий раздел.
  await page.getByRole('button', { name: 'Отмена' }).click();
  await expect(page.locator('.mix-builder')).toBeHidden();

  // Удаление микса = подтверждающий диалог. Не подтверждаем (Отмена) — smoke
  // остаётся неразрушающим. Перечисление рейлов внутри диалога зависит от
  // того, входит ли микс в рейл, поэтому живёт в master-seed.spec.ts.
  await mixRow.getByRole('button', { name: `Удалить ${mixName}` }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: `Удалить микс «${mixName}»?` }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Отмена' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(mixRow).toBeVisible();

  await openWorkspace(page, 'Рейлы');
  // «Больше всего выбирают» — системный statistical-рейл: backend синтезирует
  // его на лету (`buildTopRail` в apps/backend/src/state.ts), строкой в базе
  // он не лежит. Имя продуктовое, а не фикстурное, поэтому опора на него не
  // возвращает зависимость от seed.
  // Рейлы — строки таблицы (#101), а не карточки с заголовком.
  const statisticalRail = page.locator('table.rails-table tbody tr').filter({
    has: page.getByText('Больше всего выбирают', { exact: true }),
  });
  await statisticalRail.getByRole('button', { name: 'Просмотр' }).click();
  // Read-only drawer (статистический рейл): без надзаголовка (#366),
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
  // Канон #366: код смены меняется ежедневно, подсказка одной строкой без иконки;
  // фильтры операторов без счётчиков.
  await expect(page.locator('.daily-code-rotation')).toHaveText(/Код меняется каждый день в 06:00/);
  await expect(page.locator('.daily-code-rotation svg')).toHaveCount(0);
  const operatorFilters = page.getByRole('group', { name: 'Статус оператора' });
  await expect(operatorFilters.getByRole('button', { name: 'Ждут привязки', exact: true })).toBeVisible();
  await expect(operatorFilters.locator('.filter-chip__count')).toHaveCount(0);
  // AuditBlock убран со страницы целиком (mockup-trim) — журнал теперь
  // только за пределами Master, через /staff/audit/events API.
  await expect(page.getByText('Что происходило в системе')).toHaveCount(0);
});

// «Закончился» — главное действие полки (#211, #518): одно нажатие, тост
// с отменой. Сценарий неразрушающий: отмена возвращает табак в наличие.
test('Master shelf marks a tobacco out and undoes it from the toast', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  await openWorkspace(page, 'Полка');
  await expect(page.getByRole('heading', { name: 'Полка', level: 1 })).toBeVisible();
  // Без KPI-ряда и строки клавиш; граммов нет (#518): колонки «Наличие», «Приход», «Держим».
  await expect(page.locator('.shelf-page .stats')).toHaveCount(0);
  await expect(page.locator('.shelf-keys')).toHaveCount(0);
  for (const name of ['Наличие', 'Приход', 'Миксы', 'Держим']) {
    await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('columnheader', { name: 'Остаток по учёту' })).toHaveCount(0);

  // Единая панель фильтров (#464): статусы с числом, атрибуты списком, сортировка «По …».
  const statuses = page.getByRole('group', { name: 'Статус на полке' });
  await expect(statuses.getByRole('button')).toHaveText([/^Все/, /^Есть/, /^Закончились/, /^Стоп/, /^В плане/, /^Проба/]);
  await expect(statuses.getByRole('button', { name: /^Проба\s*\d+$/ })).toBeVisible();
  const attributes = page.getByRole('group', { name: 'Фильтры полки' });
  await expect(attributes.locator('.filter-chip__count')).toHaveCount(0);
  await attributes.getByRole('button', { name: 'Бренд', exact: true }).click();
  const brands = page.getByRole('group', { name: 'Бренд', exact: true });
  await brands.getByRole('checkbox').first().check();
  await expect(attributes.getByRole('button', { name: /^Бренд: / })).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await attributes.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await expect(attributes.getByRole('button', { name: 'Бренд', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Сортировка: По наличию' })).toBeVisible();

  const emptyButton = (row: Locator) => row.getByRole('button', { name: 'Закончился', exact: true });
  const first = page
    .locator('table.shelf-table tbody tr[data-tobacco-id]')
    .filter({ has: page.getByRole('button', { name: 'Закончился', exact: true }) })
    .first();
  await expect(first).toBeVisible();
  // Строка адресуется по id: после «Закончился» сортировка «По наличию»
  // переставляет закончившийся табак наверх.
  const id = await first.getAttribute('data-tobacco-id');
  const row = page.locator(`table.shelf-table tbody tr[data-tobacco-id="${id}"]`);

  await emptyButton(row).click();
  const toast = page.locator('.shelf-toast');
  await expect(toast).toBeVisible();
  // Название жирной строкой, ниже отдельное предложение про заявку; иконки у успешного тоста нет (#363).
  await expect(toast.locator('b')).toHaveText(/ закончился$/);
  await expect(toast).toContainText(/Добавлен в заявку\.|В заявку не попадёт: не держим постоянно\./);
  await expect(toast.locator('svg')).toHaveCount(0);
  await expect(row).toContainText('Закончился');
  await expect(row.getByRole('button', { name: 'Вернуть в наличие', exact: true })).toBeVisible();
  await toast.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(toast).toBeHidden();
  await expect(emptyButton(row)).toBeVisible();
});

// «Убрать с полки» для выбранных: строки уходят, одна отмена возвращает все.
test('Master shelf removes several tobaccos at once and undoes it', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  await openWorkspace(page, 'Полка');
  await expect(page.getByRole('heading', { name: 'Полка', level: 1 })).toBeVisible();

  const tableRows = page.locator('table.shelf-table tbody tr[data-tobacco-id]');
  await expect(tableRows.nth(1)).toBeVisible();
  const ids = [await tableRows.nth(0).getAttribute('data-tobacco-id'), await tableRows.nth(1).getAttribute('data-tobacco-id')];
  const rows = ids.map((id) => page.locator(`table.shelf-table tbody tr[data-tobacco-id="${id}"]`));

  for (const row of rows) await row.getByRole('checkbox', { name: /^Выбрать / }).click();
  const bar = page.getByRole('toolbar', { name: 'Выбранные табаки' });
  await expect(bar).toContainText('Выбрано 2');

  await bar.getByRole('button', { name: 'Убрать с полки', exact: true }).click();
  await expect(bar).toHaveCount(0);
  const toast = page.locator('.shelf-toast');
  await expect(toast).toContainText('Убраны с полки: 2');
  await expect(toast).toContainText('История осталась.');
  for (const row of rows) await expect(row).toHaveCount(0);

  await toast.getByRole('button', { name: /Отменить/ }).click();
  await expect(toast).toBeHidden();
  for (const row of rows) await expect(row).toBeVisible();
});

// Несколько табаков разом (#333, #518, #shot=shelf-bulk): чекбоксы,
// панель «Выбрано N», «Закончились» одним действием и одна отмена на всех.
// Неразрушающий: отмена пакета возвращает табаки в наличие.
test('Master shelf selects several tobaccos, marks them out at once and undoes it', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  await openWorkspace(page, 'Полка');
  await expect(page.getByRole('heading', { name: 'Полка', level: 1 })).toBeVisible();

  const emptyButton = page.getByRole('button', { name: 'Закончился', exact: true });
  const inStock = page.locator('table.shelf-table tbody tr[data-tobacco-id]').filter({ has: emptyButton });
  await expect(inStock.nth(1)).toBeVisible();
  // Строки — по id: после «Закончились» сортировка переставит их наверх.
  const ids = [await inStock.nth(0).getAttribute('data-tobacco-id'), await inStock.nth(1).getAttribute('data-tobacco-id')];
  const rows = ids.map((id) => page.locator(`table.shelf-table tbody tr[data-tobacco-id="${id}"]`));

  const selectAll = page.getByRole('checkbox', { name: 'Выбрать все' });
  await expect(selectAll).toHaveAttribute('aria-checked', 'false');
  const bar = page.getByRole('toolbar', { name: 'Выбранные табаки' });

  // Esc снимает выделение.
  await rows[0].getByRole('checkbox', { name: /^Выбрать / }).click();
  await expect(bar).toContainText('Выбрано 1');
  await expect(selectAll).toHaveAttribute('aria-checked', 'mixed');
  await page.keyboard.press('Escape');
  await expect(bar).toHaveCount(0);

  for (const row of rows) await row.getByRole('checkbox', { name: /^Выбрать / }).click();
  await expect(bar).toContainText('Выбрано 2');
  for (const row of rows) await expect(row.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  // В режиме выбора кнопок строки нет.
  await expect(emptyButton).toHaveCount(0);
  await expect(bar.getByRole('button', { name: 'Стоп для гостей' })).toBeVisible();
  await expect(bar.getByRole('button', { name: /^(Не держать|Держать) постоянно$/ })).toBeVisible();
  // Оба выбранных в наличии: возвращать нечего.
  await expect(bar.getByRole('button', { name: 'Вернуть в наличие', exact: true })).toBeDisabled();
  await expect(bar.getByRole('button', { name: 'Убрать с полки', exact: true })).toBeVisible();
  // Строки клавиш под таблицей нет: клавиши — в title (#364).
  await expect(page.locator('.shelf-keys')).toHaveCount(0);

  await bar.getByRole('button', { name: 'Закончились', exact: true }).click();
  await expect(bar).toHaveCount(0);
  const toast = page.locator('.shelf-toast');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText('Закончились: 2');
  await expect(toast).toContainText('Гости их не видят.');
  for (const row of rows) await expect(row.getByRole('button', { name: 'Вернуть в наличие', exact: true })).toBeVisible();

  await toast.getByRole('button', { name: /Отменить/ }).click();
  await expect(toast).toBeHidden();
  for (const row of rows) await expect(row.getByRole('button', { name: 'Закончился', exact: true })).toBeVisible();
});

// «Что нового» (#226): точка горит, пока выпуск не просмотрен; любое закрытие
// окна отмечает его просмотренным для логина. Неразрушающий: отметка живёт в
// localStorage, а он у Playwright свежий на каждый тест.
test('Master «What\'s new»: the dot stays until the release is read, then is gone after reload', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);
  await expect(page).toHaveTitle('Дашборд, Ателье Мастер');

  const unread = page.getByRole('button', { name: 'Что нового, есть непрочитанное' });
  await expect(unread).toBeVisible();
  await unread.click();

  const dialog = page.getByRole('dialog', { name: /^Что нового/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Назад' })).toBeDisabled();
  const pips = dialog.getByRole('button', { name: /^Слайд \d+ из \d+$/ });
  const total = await pips.count();
  expect(total).toBeGreaterThan(0);
  await expect(dialog.getByRole('button', { name: `Слайд 1 из ${total}` })).toHaveAttribute('aria-current', 'step');

  for (let step = 1; step < total; step += 1) {
    await dialog.getByRole('button', { name: 'Далее' }).click();
    await expect(dialog.getByRole('button', { name: `Слайд ${step + 1} из ${total}` })).toHaveAttribute('aria-current', 'step');
  }
  await dialog.getByRole('button', { name: 'Готово' }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByRole('button', { name: 'Что нового', exact: true })).toBeVisible();
  await expect(unread).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Дашборд', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Что нового', exact: true })).toBeVisible();
  await expect(unread).toHaveCount(0);
});

test.describe('Master on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('Master shelf on a phone: bottom navigation, «Закончился» with undo', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Логин', { exact: true }).fill(adminCredentials.login);
    await page.getByLabel('Пароль', { exact: true }).fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    // На телефоне заголовок раздела — в верхней панели, h1 только для экранного диктора (#520), как у «Полки».
    await expect(page.getByRole('heading', { name: 'Дашборд', exact: true, level: 1 })).toBeAttached();

    // На телефоне вместо вкладок — нижняя навигация.
    await expect(page.getByRole('tablist', { name: 'Рабочие разделы Мастера' })).toHaveCount(0);
    const shelfTab = page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name: 'Полка', exact: true });
    await expect(shelfTab).toBeVisible();
    await shelfTab.click();
    await expect(shelfTab).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: 'Полка', level: 1 })).toBeAttached();
    // «Полка, К заказу» — переключатель над списком (#shot=mobile-order), в верхней панели только «Выбрать».
    await expect(page.getByRole('group', { name: 'Вид полки' }).getByRole('button')).toHaveText([/^Полка$/, /^К заказу/]);
    await expect(page.locator('.m-topbar').getByRole('button', { name: 'К заказу' })).toHaveCount(0);

    // Чип «Проба» (#329) — рядом со статусами, с числом проб.
    await expect(page.getByRole('group', { name: 'Статус на полке' }).getByRole('button', { name: /^Проба\s*\d+$/ })).toBeVisible();
    // Порядок и подписи статусов — как на десктопе (#466), старт с «Все».
    await expect(page.getByRole('group', { name: 'Статус на полке' }).getByRole('button').first()).toHaveText(/^Все/);
    const emptyButton = (card: Locator) => card.getByRole('button', { name: 'Закончился', exact: true });
    const first = page
      .locator('.m-shelf-card')
      .filter({ has: page.getByRole('button', { name: 'Закончился', exact: true }) })
      .first();
    await expect(first).toBeVisible();
    const id = await first.getAttribute('data-tobacco-id');
    const card = page.locator(`.m-shelf-card[data-tobacco-id="${id}"]`);
    // Страница не уезжает вбок: карточки вместо широкой таблицы.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // Граммов и отметок остатка нет (#518): в карточке только статус.
    await expect(card).toContainText('Есть');
    await expect(card.getByRole('button', { name: 'Указать остаток' })).toHaveCount(0);

    await emptyButton(card).click();
    const toast = page.locator('.shelf-toast');
    await expect(toast).toBeVisible();
    await expect(toast.locator('b')).toHaveText(/ закончился$/);
    await expect(card.getByRole('button', { name: /^Вернуть в наличие / })).toBeVisible();
    await toast.getByRole('button', { name: 'Отменить', exact: true }).click();
    await expect(toast).toBeHidden();
    await expect(emptyButton(card)).toBeVisible();
  });

  // Карточка и редкие действия на телефоне (#228, #518). Неразрушающий:
  // шторка действий закрывается без выбора.
  test('Master shelf card on a phone: availability segment and actions sheet close without changes', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Логин', { exact: true }).fill(adminCredentials.login);
    await page.getByLabel('Пароль', { exact: true }).fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByRole('heading', { name: 'Дашборд', exact: true, level: 1 })).toBeAttached();
    await page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name: 'Полка', exact: true }).click();
    await page.getByRole('group', { name: 'Статус на полке' }).getByRole('button', { name: /^Все/ }).click();

    // Берём табак в наличии.
    const first = page
      .locator('.m-shelf-card')
      .filter({ has: page.getByRole('button', { name: 'Закончился', exact: true }) })
      .first();
    await expect(first).toBeVisible();
    await first.locator('.m-shelf-card__name').click();
    const card = page.locator('.shelf-card');
    await expect(card).toBeVisible();
    // Бренд строкой под названием, без надзаголовка (#364).
    await expect(card.locator('.shelf-card__brand')).toBeVisible();
    // Наличие одной кнопкой, граммов и отметок нет (#518, #shot=card-in).
    const availability = card.getByRole('group', { name: 'Наличие' });
    await expect(availability.getByRole('button', { name: 'Есть', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(availability.getByRole('button', { name: 'Закончился', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(card.getByRole('switch', { name: 'Держим постоянно' })).toBeVisible();
    await expect(card.getByRole('heading', { name: 'Приходы', level: 3 })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Указать остаток' })).toHaveCount(0);

    await card.getByRole('button', { name: /^Действия:/ }).click();
    const actions = page.getByRole('dialog', { name: /^Действия:/ });
    await expect(actions).toBeVisible();
    await expect(actions.getByRole('button', { name: /стоп для гостей$/i })).toBeVisible();
    await expect(actions.getByRole('button', { name: /^Убрать с полки/ })).toBeVisible();
    for (const name of ['Приход без счёта', 'Списать']) {
      await expect(actions.getByRole('button', { name, exact: true })).toHaveCount(0);
    }
    // Тап по затемнению закрывает шторку, карточка остаётся.
    await page.mouse.click(187, 40);
    await expect(actions).toBeHidden();
    await expect(card).toBeVisible();
    await expect(page.locator('.shelf-toast')).toBeHidden();
    await card.getByRole('button', { name: 'Закрыть' }).click();
    await expect(card).toBeHidden();
    // Настроек полки (порция, срок поставки) больше нет.
    await expect(page.getByRole('button', { name: 'Меню полки' })).toHaveCount(0);
  });

  // Выбор нескольких на телефоне (#333, #shot=mobile-bulk): «Выбрать» в шапке,
  // касание по карточке выбирает, внизу «Закончились», число — в шапке. Неразрушающий:
  // режим выбора закрывается «Готово» без действия.
  test('Master shelf on a phone: «Выбрать» picks cards by tap and «Готово» leaves without changes', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Логин', { exact: true }).fill(adminCredentials.login);
    await page.getByLabel('Пароль', { exact: true }).fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByRole('heading', { name: 'Дашборд', exact: true, level: 1 })).toBeAttached();
    await page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name: 'Полка', exact: true }).click();
    await page.getByRole('group', { name: 'Статус на полке' }).getByRole('button', { name: /^Все/ }).click();

    const first = page
      .locator('.m-shelf-card')
      .filter({ has: page.getByRole('button', { name: 'Закончился', exact: true }) })
      .first();
    await expect(first).toBeVisible();
    const id = await first.getAttribute('data-tobacco-id');
    const card = page.locator(`.m-shelf-card[data-tobacco-id="${id}"]`);

    const title = page.locator('.m-topbar__title');
    await page.getByRole('button', { name: 'Выбрать', exact: true }).click();
    await expect(title).toHaveText('Выбрано 0');
    // В режиме выбора кнопок карточек нет.
    await expect(page.getByRole('button', { name: 'Закончился', exact: true })).toHaveCount(0);
    const bar = page.getByRole('toolbar', { name: 'Выбранные табаки' });
    await expect(bar.getByRole('button', { name: 'Закончились', exact: true })).toBeDisabled();

    await card.tap();
    await expect(title).toHaveText('Выбрано 1');
    await expect(card.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
    await expect(bar.getByRole('button', { name: 'Закончились', exact: true })).toBeEnabled();
    await expect(bar.getByRole('button', { name: 'Стоп для гостей' })).toBeVisible();
    await expect(bar.getByRole('button', { name: /^(Не держать|Держать) постоянно$/ })).toBeVisible();
    await expect(bar.getByRole('button', { name: 'Вернуть в наличие', exact: true })).toBeDisabled();
    await expect(bar.getByRole('button', { name: 'Убрать с полки', exact: true })).toBeVisible();
    // Повторное касание снимает выбор.
    await card.tap();
    await expect(title).toHaveText('Выбрано 0');
    await card.tap();

    await page.getByRole('button', { name: 'Готово', exact: true }).click();
    await expect(title).toHaveText('Полка');
    await expect(bar).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Закончился', exact: true })).toBeVisible();
    await expect(page.locator('.shelf-toast')).toBeHidden();
  });

  test('Master «What\'s new» on a phone opens full screen from «Ещё»', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Логин', { exact: true }).fill(adminCredentials.login);
    await page.getByLabel('Пароль', { exact: true }).fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByRole('heading', { name: 'Дашборд', exact: true, level: 1 })).toBeAttached();

    await page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name: 'Ещё', exact: true }).click();
    const more = page.getByRole('dialog', { name: 'Ещё разделы' });
    await expect(more).toBeVisible();
    await more.getByRole('button', { name: 'Что нового, есть непрочитанное' }).click();
    await expect(more).toBeHidden();

    const dialog = page.getByRole('dialog', { name: /^Что нового/ });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).toMatchObject({ x: 0, y: 0, width: 375, height: 812 });
    await dialog.getByRole('button', { name: 'Закрыть' }).click();
    await expect(dialog).toBeHidden();
  });

  // Прокрутка вниз без анимации (#400). Колесо мыши крутит плавно: упёршись в
  // низ, страница стоит, а анимация ещё не доиграла и после перехода в раздел
  // утаскивает его вниз. Палец на телефоне инерцию останавливает тапом.
  // Прокрутка повторяется, пока раздел догружается и ему есть куда ехать.
  const scrollDown = async (page: Page) => {
    await expect
      .poll(() =>
        page.evaluate(() => {
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
          return window.scrollY;
        }),
      )
      .toBeGreaterThan(0);
  };

  // #334: раздел открывается с начала, а нижнее меню остаётся в ширину экрана
  // и у нижнего края, даже когда страница шире экрана (конструктор микса).
  test('Master on a phone: sections open from the top, the bottom bar stays screen-wide', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Логин', { exact: true }).fill(adminCredentials.login);
    await page.getByLabel('Пароль', { exact: true }).fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByRole('heading', { name: 'Дашборд', exact: true, level: 1 })).toBeAttached();

    // На seed Дашборд (#520) и Полка (#518) короче экрана; длинный — список
    // миксов карточками (#540): прокручиваем его и уходим на «Полку».
    const nav = page.getByRole('navigation', { name: 'Разделы' });
    await nav.getByRole('button', { name: 'Ещё', exact: true }).click();
    await page.getByRole('dialog', { name: 'Ещё разделы' }).getByRole('button', { name: /^Миксы/ }).click();
    await expect(page.getByRole('heading', { name: 'Каталог миксов', level: 1 })).toBeAttached();
    await expect(page.locator('.m-mix-card').first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    await page.mouse.wheel(0, 3000);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const box = await nav.boundingBox();
    expect(box).toMatchObject({ x: 0, width: 375 });
    expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(812);
    await expect(nav.getByRole('button', { name: 'Ещё', exact: true })).toBeInViewport({ ratio: 1 });

    await scrollDown(page);
    await nav.getByRole('button', { name: 'Полка', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Полка', level: 1 })).toBeAttached();
    await expect(page.locator('.m-shelf-card').first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  // #339, #341, #342 (#540): поле мельче 16 px iOS увеличивает при фокусе;
  // панель уже экрана оставляет полоску слева; заголовок раздела — один, в шапке.
  // Неразрушающий: «Новый табак» закрывается без сохранения.
  test('Master on a phone: fields are 16 px, drawers are screen-wide, one section title', async ({ page }) => {
    const smallFields = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('input, select, textarea')]
          .filter((el) => (el as HTMLElement).offsetParent && !['checkbox', 'radio', 'range', 'file'].includes((el as HTMLInputElement).type))
          .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
          .map((el) => el.getAttribute('aria-label') ?? el.getAttribute('placeholder') ?? el.className),
      );

    await page.goto('/');
    await expect(page.getByLabel('Логин', { exact: true })).toBeVisible();
    expect(await smallFields()).toEqual([]);
    await page.getByLabel('Логин', { exact: true }).fill(adminCredentials.login);
    await page.getByLabel('Пароль', { exact: true }).fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByRole('heading', { name: 'Дашборд', exact: true, level: 1 })).toBeAttached();

    const nav = page.getByRole('navigation', { name: 'Разделы' });
    await nav.getByRole('button', { name: 'Ещё', exact: true }).click();
    await page.getByRole('dialog', { name: 'Ещё разделы' }).getByRole('button', { name: /^Каталог/ }).click();
    const title = page.getByRole('heading', { name: 'Каталог', exact: true, level: 1 });
    await expect(title).toBeAttached();
    expect(await title.evaluate((el) => el.getBoundingClientRect().height)).toBeLessThanOrEqual(1);
    expect(await smallFields()).toEqual([]);

    await page.getByRole('button', { name: /Новый табак/ }).click();
    const drawer = page.locator('[data-slot="sheet-content"]');
    await expect(drawer).toBeVisible();
    await expect.poll(async () => (await drawer.boundingBox())?.x).toBe(0);
    expect((await drawer.boundingBox())?.width).toBe(375);
    expect(await smallFields()).toEqual([]);
    await drawer.getByRole('button', { name: 'Отмена', exact: true }).click();
    await expect(drawer).toBeHidden();
  });
});

// #334: повёрнутый телефон получает телефонную навигацию, а не десктопную
// шапку с вкладками в несколько строк.
test.describe('Master on a phone in landscape', () => {
  test.use({ viewport: { width: 812, height: 375 }, isMobile: true, hasTouch: true });

  test('Master on a landscape phone: bottom navigation instead of desktop tabs', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Логин', { exact: true }).fill(adminCredentials.login);
    await page.getByLabel('Пароль', { exact: true }).fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByRole('heading', { name: 'Дашборд', exact: true, level: 1 })).toBeAttached();

    await expect(page.getByRole('tablist', { name: 'Рабочие разделы Мастера' })).toHaveCount(0);
    const nav = page.getByRole('navigation', { name: 'Разделы' });
    await expect(nav).toBeInViewport({ ratio: 1 });
    await nav.getByRole('button', { name: 'Полка', exact: true }).click();
    await expect(nav.getByRole('button', { name: 'Полка', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.m-shelf-card').first()).toBeVisible();
  });
});

// Дашборд — выборы гостей (#520): период меняет диапазон дат; на seed выборов
// мало, поэтому годится и график, и «Мало данных» / «Выборов нет». Блока полки на
// дашборде больше нет. Дальше «К заказу» на полке (#518, #shot=order,
// edge-order-empty); настроек полки больше нет.
// Неразрушающий: в «К заказу» ничего не меняется.
test('Master dashboard switches the period, shelf opens «К заказу» without changes', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  const periods = page.getByRole('group', { name: 'Период' });
  await expect(periods.getByRole('button')).toHaveText(['Неделя', 'Месяц', 'Квартал', 'Всё время', 'Даты']);
  const month = periods.getByRole('button', { name: 'Месяц', exact: true });
  await expect(month).toHaveAttribute('aria-pressed', 'true');
  const range = page.locator('.dash-range');
  await expect(range).toHaveText(/^\d{1,2}( [а-я]+( \d{4})?)? – \d{1,2} [а-я]+( \d{4})?$/);
  const monthRange = await range.textContent();

  const week = periods.getByRole('button', { name: 'Неделя', exact: true });
  await week.click();
  await expect(week).toHaveAttribute('aria-pressed', 'true');
  await expect(range).not.toHaveText(monthRange ?? '');
  await expect(range).toHaveText(/^\d{1,2}( [а-я]+( \d{4})?)? – \d{1,2} [а-я]+( \d{4})?$/);

  // Плитки есть всегда; графики — с 20 выборов, иначе одна карточка вместо них.
  await expect(page.locator('.dashboard-page .stats')).toContainText('Выборов');
  const chart = page.getByRole('heading', { name: 'Выборы по дням', level: 2 });
  const few = page.locator('.dash-few').filter({ hasText: /^(Мало данных|Выборов нет)/ });
  await expect(chart.or(few)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Сигналы', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Прогноз на сегодня' })).toHaveCount(0);

  await openWorkspace(page, 'Полка');
  await expect(page.getByRole('heading', { name: 'Полка', level: 1 })).toBeVisible();

  // Вида «Закупка» больше нет: только «Полка» и «К заказу» (#518).
  const views = page.getByRole('group', { name: 'Вид полки' }).getByRole('button');
  await expect(views).toHaveText([/^Полка$/, /^К заказу/]);
  const orderToggle = views.filter({ hasText: /^К заказу/ });
  await orderToggle.click();
  await expect(orderToggle).toHaveAttribute('aria-pressed', 'true');
  // Группы поставщиков или «Всё в наличии» — зависит от полки в базе.
  await expect(page.locator('section.shelf-order, .shelf-order-empty').first()).toBeVisible();
  const groups = page.locator('section.shelf-order');
  if (await groups.count()) {
    for (const name of ['Табак', 'Закончился', 'Миксы', 'Последний приход']) {
      await expect(groups.first().getByRole('columnheader', { name, exact: true })).toBeVisible();
    }
    await expect(groups.first().getByRole('button', { name: 'Скопировать заявку' })).toBeVisible();
  } else {
    await expect(page.getByRole('heading', { name: 'Всё в наличии', level: 2 })).toBeVisible();
  }
  // Сколько заказать, решает мастер: ни расхода, ни суммы, ни настроек полки.
  await expect(page.getByRole('columnheader', { name: 'Расход в месяц' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Меню полки' })).toHaveCount(0);
});

// «Закончился» у табака, который держим постоянно, кладёт его в «К заказу» (#518).
// Неразрушающий: «Отменить» в тосте возвращает табак в наличие и убирает из заявки.
test('Master shelf: a kept tobacco marked out appears in «К заказу», undo removes it', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);
  await openWorkspace(page, 'Полка');
  await expect(page.getByRole('heading', { name: 'Полка', level: 1 })).toBeVisible();

  const kept = page
    .locator('table.shelf-table tbody tr[data-tobacco-id]')
    .filter({ has: page.getByRole('img', { name: 'Держим постоянно' }) })
    .filter({ has: page.getByRole('button', { name: 'Закончился', exact: true }) })
    .first();
  await expect(kept).toBeVisible();
  const id = await kept.getAttribute('data-tobacco-id');
  const row = page.locator(`table.shelf-table tbody tr[data-tobacco-id="${id}"]`);

  await row.getByRole('button', { name: 'Закончился', exact: true }).click();
  const toast = page.locator('.shelf-toast');
  await expect(toast).toContainText('Добавлен в заявку.');
  await expect(row).toContainText('в заявке');

  const views = page.getByRole('group', { name: 'Вид полки' });
  await views.getByRole('button', { name: /^К заказу/ }).click();
  const line = page.locator(`section.shelf-order tr[data-tobacco-id="${id}"]`);
  await expect(line).toBeVisible();

  await toast.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(toast).toBeHidden();
  await expect(line).toHaveCount(0);
  await views.getByRole('button', { name: 'Полка', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Закончился', exact: true })).toBeVisible();
});

// «Идеи для закупки» (#214): подборки htreviews или пустое состояние — на seed
// статистики нет, на снапшоте прода она есть. Неразрушающий: «В план» не жмём.
test('Master catalog shows purchase ideas from htreviews without planning anything', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  await openWorkspace(page, 'Каталог');
  await expect(page.getByRole('columnheader', { name: 'Просмотров' })).toBeVisible();

  const catalogView = page.getByRole('group', { name: 'Вид каталога' });
  const ideasToggle = catalogView.getByRole('button', { name: 'Идеи для закупки' });
  await ideasToggle.click();
  await expect(ideasToggle).toHaveAttribute('aria-pressed', 'true');

  const section = page.getByRole('heading', {
    level: 2,
    name: /^(Популярное у ваших брендов|Высокий рейтинг|Похоже на то, что быстро уходит)$/,
  });
  const empty = page.getByText('Идей пока нет. Статистика htreviews появится после следующей синхронизации каталога.');
  await expect(section.or(empty).first()).toBeVisible();

  await catalogView.getByRole('button', { name: 'Все табаки' }).click();
  await expect(page.locator('tbody tr[data-tobacco-id]').first()).toBeVisible();
});

// Поставка вручную (#212, #518): черновик → строка с табаком из каталога → приёмка.
// Граммы не вводятся: приёмка только вернула бы табак в «Есть». Принятую поставку удалить нельзя — в базе
// осталась бы поставка с уникальным номером «SMOKE-…» и приход.
// Неразрушающий, как весь прогон (README smoke): черновик доводится до готовности
// к приёмке и удаляется — принятая поставка оставила бы приход и поставку в базе.
test('Master deliveries prepare a manual draft with a catalog tobacco and discard it', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  await openWorkspace(page, 'Полка');
  const shelfRow = page.locator('table.shelf-table tbody tr[data-tobacco-id]').first();
  await expect(shelfRow).toBeVisible();
  // Вторая ячейка — табак: первая — чекбокс выбора (#333).
  const nameCell = shelfRow.locator('td').nth(1);
  const tobaccoName = ((await nameCell.locator('.shelf-name b').textContent()) ?? '').trim();
  const manufacturer = ((await nameCell.locator('.shelf-name span').textContent()) ?? '').trim();

  await openWorkspace(page, 'Поставки');
  await expect(page.getByRole('heading', { name: 'Поставки', level: 1 })).toBeVisible();
  // Итог месяца в мете шапки вместо ряда KPI (#365): «Октябрь: 3 счёта, 43 400 ₽».
  await expect(page.locator('.master-page-header__meta')).toHaveText(/^[А-ЯЁ][а-яё]+: \d+ сч(ёт|ёта|етов)/);
  await expect(page.locator('.deliv-page .stats')).toHaveCount(0);

  const number = `SMOKE-${Date.now()}`;
  await page.getByRole('button', { name: 'Заполнить вручную' }).click();
  const manual = page.getByRole('dialog');
  await manual.getByLabel('Номер счёта').fill(number);
  await manual.getByRole('button', { name: 'Создать черновик' }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`^Счёт № ${number}`), level: 1 })).toBeVisible();
  // Канон #365: статус тегом в мете шапки, а не надписью над заголовком.
  await expect(page.locator('.master-page-header__meta')).toContainText('черновик');

  await page.getByRole('button', { name: 'Добавить строку', exact: true }).click();
  const addLine = page.getByRole('dialog');
  await addLine.getByLabel('Табак из каталога').fill(tobaccoName);
  await addLine
    .getByRole('group', { name: 'Табаки каталога' })
    .getByRole('button')
    .filter({ hasText: tobaccoName })
    .filter({ hasText: manufacturer })
    .first()
    .click();
  await addLine.getByLabel('Цена за штуку, ₽').fill('1 550');
  // Вес в Мастер не вносится (#518): поля граммов нет.
  await expect(addLine.getByLabel('Граммов в штуке')).toHaveCount(0);
  await addLine.getByRole('button', { name: 'Добавить строку' }).click();
  await expect(addLine).toBeHidden();

  const line = page.locator('tr[data-line-id]');
  await expect(line).toHaveCount(1);
  await expect(line.getByRole('button', { name: /^Табак для строки 1:/ })).toContainText(tobaccoName);
  // Подвал: сколько табаков вернётся в наличие, без граммов.
  await expect(page.locator('.deliv-footbar')).toContainText('Вернутся в наличие: 1 табак');
  await expect(page.getByRole('columnheader', { name: 'Приход' })).toBeVisible();
  await expect(line).toContainText('1 шт.');

  await expect(page.getByRole('button', { name: 'Принять поставку' })).toBeEnabled();

  await page.getByRole('button', { name: 'Удалить черновик' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Удалить черновик' }).click();
  await expect(page.getByRole('heading', { name: 'Поставки', level: 1 })).toBeVisible();
  await expect(page.locator('tr[data-delivery-id]').filter({ hasText: `№ ${number}` })).toHaveCount(0);
});

// Каталог длиннее экрана: редактор микса из конца списка должен открываться
// с начала страницы, а не на прокрутке, унаследованной от каталога.
test('Master mix editor opened from the bottom of the catalog starts at the top', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await signIn(adminCredentials.login, adminCredentials.password, page);

  await openWorkspace(page, 'Миксы');
  const lastRow = page.locator('table.mixes-table tbody tr[data-mix-id]').last();
  await lastRow.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  await lastRow.click();
  await expect(page.getByRole('button', { name: 'Назад к каталогу миксов' })).toBeInViewport();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  // Библиотека прокручивается внутри своей колонки и не выходит за экран.
  await page.mouse.wheel(0, 2000);
  const library = page.getByRole('complementary', { name: 'Библиотека табаков' });
  await expect(library.getByRole('searchbox')).toBeInViewport({ ratio: 1 });
  const topbarBottom = await page.locator('.topbar').evaluate((el) => el.getBoundingClientRect().bottom);
  const libraryTop = await library.evaluate((el) => el.getBoundingClientRect().top);
  expect(libraryTop).toBeGreaterThanOrEqual(topbarBottom);
});

// Аналоги (#481): у микса с заменой видна пара, у блокированного — чего нет;
// имя недостающего табака открывает его карточку. Данные — из seed (#478).
test('Master mixes show substitution and missing tobaccos linked to their cards', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  // Скрытые миксы в «Сигналах» дашборда (#520): в seed скрыт «Персиковый мираж»,
  // строка ведёт в «Миксы».
  await openWorkspace(page, 'Дашборд');
  const hiddenSignal = page
    .getByRole('region', { name: 'Сигналы' })
    .getByRole('listitem')
    .filter({ hasText: /^Скрыты? у гостя, нет табака: / });
  await hiddenSignal.getByRole('button', { name: 'Миксы', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Каталог миксов', level: 1 })).toBeVisible();

  await openWorkspace(page, 'Миксы');
  const statusChips = page.getByRole('group', { name: 'Статус микса' });
  await statusChips.getByRole('button', { name: 'Фильтр: С заменой' }).click();
  const substituted = page.locator('tr[data-mix-id="mix-lime-tonic"]');
  await expect(substituted.locator('.mix-status')).toHaveText(/с заменой\s*Citrus Breeze вместо Lime Spark/);
  await expect(substituted).toContainText('Lime Spark + Mint Veil');
  // Обе стороны замены ведут в карточку табака, как «Нет: …» у блокированного.
  await substituted.locator('.mix-status').getByRole('button', { name: 'Lime Spark' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Lime Spark' })).toBeVisible();
  await page.keyboard.press('Escape');
  await openWorkspace(page, 'Миксы');
  await statusChips.getByRole('button', { name: 'Фильтр: С заменой' }).click();
  // Конструктор показывает тот же статус, что список (#494).
  await substituted.locator('td').first().click();
  const breadcrumb = page.locator('.mix-builder__breadcrumb');
  await expect(breadcrumb).toContainText('с заменой');
  await expect(breadcrumb).toContainText('Citrus Breeze вместо Lime Spark');
  await expect(breadcrumb).not.toContainText('блокируется наличием');
  await page.getByRole('button', { name: 'Назад к каталогу миксов' }).click();

  await statusChips.getByRole('button', { name: 'Фильтр: Блокирован' }).click();
  const blocked = page.locator('tr[data-mix-id="mix-peach-mirage"]');
  await expect(blocked.locator('.mix-status')).toHaveText(/блокирован\s*Нет: Peach Silk/);
  await blocked.getByRole('button', { name: 'Peach Silk' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Peach Silk' })).toBeVisible();
});

// Миксы на телефоне (#540, #shot=mixes, mix-edit, mix-library): карточки вместо
// таблицы; конструктор в одну колонку, назад в шапке, сумма и сохранение внизу
// вместо меню разделов, библиотека шторкой. Неразрушающий: правка не сохраняется.
test.describe('Master mixes on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('Master mixes on a phone: cards, one-column builder, library sheet, back without saving', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Логин', { exact: true }).fill(adminCredentials.login);
    await page.getByLabel('Пароль', { exact: true }).fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByRole('heading', { name: 'Дашборд', exact: true, level: 1 })).toBeAttached();

    const nav = page.getByRole('navigation', { name: 'Разделы' });
    await nav.getByRole('button', { name: 'Ещё', exact: true }).click();
    await page.getByRole('dialog', { name: 'Ещё разделы' }).getByRole('button', { name: /^Миксы/ }).click();
    const card = page.locator('.m-mix-card').first();
    await expect(card).toBeVisible();
    await expect(page.locator('table.mixes-table')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);

    // «⋯» — те же действия, что у строки таблицы; закрываем без изменений.
    await card.getByRole('button', { name: /^Действия: / }).click();
    const actions = page.getByRole('dialog', { name: /^Действия: / });
    await expect(actions.getByRole('button', { name: 'Дублировать' })).toBeVisible();
    await expect(actions.getByRole('button', { name: 'Удалить микс' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(actions).toBeHidden();

    await card.locator('.m-mix-card__open').click();
    const back = page.getByRole('button', { name: 'Назад к каталогу миксов' });
    await expect(back).toBeVisible();
    await expect(nav).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);

    const sum = page.locator('.mix-builder__phone-sum');
    const save = page.locator('.mix-builder__phone-bar').getByRole('button', { name: 'Сохранить', exact: true });
    await expect(sum).toContainText('100 %');
    await expect(save).toBeEnabled();
    await page.locator('.mix-builder__phone-component').first().getByRole('button', { name: /больше на 5 %/ }).click();
    await expect(sum).toContainText('лишние 5 %');
    await expect(save).toBeDisabled();

    await page.getByRole('button', { name: 'Добавить табак' }).click();
    const library = page.getByRole('dialog', { name: 'Добавить табак' });
    await expect(library.getByRole('searchbox', { name: 'Поиск по библиотеке табаков' })).toBeVisible();
    await library.getByRole('button', { name: 'Готово' }).click();
    await expect(library).toBeHidden();

    await back.click();
    await expect(page.locator('.m-mix-card').first()).toBeVisible();
    await expect(nav).toBeVisible();
  });
});

// Аналоги на «Полке» (#482): «Сделать аналогом» из похожих — тост с названием,
// аналог в карточках обоих табаков (связь взаимная), «Отменить» возвращает как было.
// Колонки «Аналоги» в таблице нет (#518, #shot=shelf): аналоги живут в карточке.
test('Master shelf card makes a similar tobacco an analog and undo restores it', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);
  await openWorkspace(page, 'Полка');

  const rowOf = (id: string) => page.locator(`table.shelf-table tbody tr[data-tobacco-id="${id}"]`);
  const source = rowOf('tobacco-citrus-breeze');
  await expect(page.getByRole('columnheader', { name: 'Аналоги' })).toHaveCount(0);

  await source.locator('td').nth(1).click();
  const card = page.getByRole('dialog');
  await expect(card.getByRole('heading', { name: 'Аналоги', level: 3 })).toBeVisible();
  await expect(card.locator('.shelf-analog')).toHaveCount(1);
  // Lime Spark не на полке и закончился (seed #478).
  await expect(card.locator('.shelf-analog')).toContainText('Lime Spark');
  await expect(card.locator('.shelf-analog__stock[data-off]')).toHaveText('закончился');
  const makeAnalog = card.getByRole('button', { name: /^Сделать аналогом: / }).first();
  const analogName = ((await makeAnalog.getAttribute('aria-label')) ?? '').replace('Сделать аналогом: ', '');
  await makeAnalog.click();

  const toast = page.locator('.shelf-toast');
  await expect(toast.locator('b')).toHaveText(analogName);
  await expect(toast).toContainText('Аналог Citrus Breeze.');
  await expect(card.locator('.shelf-analog')).toHaveCount(2);
  await expect(card.locator('.shelf-analog').nth(1)).toContainText(analogName);

  // Связь взаимная: у аналога в карточке — Citrus Breeze. Тост с отменой живёт 10 с.
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
  const analogRow = page.locator('table.shelf-table tbody tr').filter({ has: page.locator('td:nth-child(2) .shelf-name b', { hasText: analogName }) }).first();
  await analogRow.locator('td').nth(1).click();
  await expect(card.locator('.shelf-analog').filter({ hasText: 'Citrus Breeze' })).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();

  await toast.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(toast).toBeHidden();
  await source.locator('td').nth(1).click();
  await expect(card.locator('.shelf-analog')).toHaveCount(1);
});

// Автор микса (#491): копию сохраняет admin — он и автор; фильтр «Автор» её находит,
// в шапке конструктора «автор Admin». В конце копия удаляется.
test('Master mix copy gets its author and the author filter finds it', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);
  await openWorkspace(page, 'Миксы');

  await expect(page.getByRole('columnheader', { name: 'Автор' })).toBeVisible();
  const source = page.locator('tr[data-mix-id="mix-citrus-scout"]');
  // У миксов из seed автора нет.
  await expect(source.locator('.mixes-cell__author')).toHaveText('—');
  await source.getByRole('button', { name: 'Дублировать Цитрусовый караван' }).click();
  await page.getByRole('button', { name: 'Создать микс' }).click();

  const copy = page.locator('tr[data-mix-id]').filter({ hasText: 'Цитрусовый караван (копия)' });
  await expect(copy.locator('.mixes-cell__author')).toHaveText('Admin');

  await page.getByRole('group', { name: 'Фильтры миксов' }).getByRole('button', { name: 'Автор', exact: true }).click();
  await page.getByRole('group', { name: 'Автор', exact: true }).getByRole('checkbox', { name: 'Admin' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('table.mixes-table tbody tr[data-mix-id]')).toHaveCount(1);
  await expect(copy).toBeVisible();

  await copy.locator('td').first().click();
  await expect(page.locator('.mix-builder__breadcrumb')).toContainText('автор Admin');
  await page.getByRole('button', { name: 'Назад к каталогу миксов' }).click();

  await copy.getByRole('button', { name: 'Удалить Цитрусовый караван (копия)' }).click();
  await page.getByRole('button', { name: 'Удалить микс' }).click();
  await expect(copy).toHaveCount(0);
});

// «Рейлы» на телефоне (#338, #341, #shot=rails, rail-stat, rail-new): карточки
// вместо таблицы, в редакторе метки под названием. Неразрушающий: редакторы
// закрываются без сохранения.
test.describe('Master rails on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('Master rails on a phone: cards, the statistical rail opens read-only with badges under the title', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Логин', { exact: true }).fill(adminCredentials.login);
    await page.getByLabel('Пароль', { exact: true }).fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByRole('heading', { name: 'Дашборд', exact: true, level: 1 })).toBeAttached();

    await page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name: 'Ещё', exact: true }).click();
    await page.getByRole('dialog', { name: 'Ещё разделы' }).getByRole('button', { name: /^Рейлы/ }).click();
    await expect(page.getByRole('heading', { name: 'Рейлы', level: 1 })).toBeAttached();

    const cards = page.getByRole('list', { name: 'Рейлы' }).locator('.m-rail-card');
    await expect(cards.first()).toBeVisible();
    await expect(page.locator('table.rails-table')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);

    // «Больше всего выбирают» синтезирует backend (`buildTopRail`), от seed не зависит.
    const statistical = cards.filter({ has: page.getByText('Больше всего выбирают', { exact: true }) });
    await expect(statistical).toContainText('Статистический');
    // Статистический рейл не удаляется: «⋯» только у рейлов мастера.
    await expect(statistical.getByRole('button', { name: /^Действия: / })).toHaveCount(0);
    await statistical.getByRole('button').first().click();

    const editor = page.locator('.rails-surface__sheet');
    const title = editor.getByRole('heading', { name: 'Больше всего выбирают' });
    const badge = editor.locator('.rail-drawer__head').getByText('только просмотр');
    await expect(title).toBeVisible();
    await expect(badge).toBeVisible();
    const titleBox = await title.boundingBox();
    const badgeBox = await badge.boundingBox();
    expect(badgeBox!.y).toBeGreaterThanOrEqual(titleBox!.y + titleBox!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
    await expect(editor.getByRole('button', { name: 'Сохранить' })).toHaveCount(0);
    await expect(editor.getByRole('button', { name: 'Добавить микс' })).toHaveCount(0);
    await editor.getByRole('button', { name: 'Закрыть' }).last().click();
    await expect(editor).toBeHidden();

    // «Новый» в верхней панели: миксы добавляются кнопкой, без «из списка слева».
    await page.locator('.m-topbar').getByRole('button', { name: 'Новый' }).click();
    await expect(editor.getByText('Рейл пуст')).toBeVisible();
    await expect(editor.getByText(/слева/)).toHaveCount(0);
    await editor.getByRole('button', { name: 'Добавить микс' }).click();
    const picker = page.getByRole('dialog', { name: 'Добавить микс' });
    await expect(picker.getByPlaceholder('Поиск миксов')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(picker).toBeHidden();
    await expect(editor.getByRole('button', { name: 'Создать' })).toBeInViewport({ ratio: 1 });
    await editor.getByRole('button', { name: 'Отмена' }).click();
    await expect(editor).toBeHidden();
  });
});

test('Master non-admin role keeps admin-only surfaces restricted while preserving access context', async ({ page }) => {
  await signIn(operatorCredentials.login, operatorCredentials.password, page);

  await openWorkspace(page, 'Доступ');
  await expect(page.getByRole('heading', { name: 'Доступ и персонал', level: 1 })).toBeVisible();
  await expect(page.getByText('Статус Telegram-бота доступен только администратору.')).toBeVisible();
  await expect(page.getByText('Список операторов доступен только администратору.').first()).toBeVisible();
  // Текст о недоступном списке операторов переехал внутрь Dialog
  // «Новый оператор» после UX-рефактора PR #14 — на странице сразу не виден,
  // нужен клик. Не разворачиваем dialog в smoke, чтобы не множить шаги; inline
  // forbidden-сообщения по Telegram уже проверяет assertion выше.
  await expect(page.getByText('Раздел сотрудников доступен только администратору.').first()).toBeVisible();
  // Сообщение о недоступных учётках переехало внутрь Dialog'а
  // «Создать сотрудника» после mockup-parity рефактора — на странице сразу
  // не виден, нужен клик. Основное forbidden-сообщение по staff выше уже
  // проверено assertion'ом «Раздел сотрудников доступен только администратору.».
  // AuditBlock убран со страницы целиком — forbidden-сообщение по журналу
  // больше не рендерится на /access.
  await expect(page.getByText('Журнал изменений доступен только администратору.')).toHaveCount(0);
});
