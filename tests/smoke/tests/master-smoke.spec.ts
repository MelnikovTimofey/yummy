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
  await expect(page.getByRole('heading', { name: 'Дашборд смены', level: 1 })).toBeVisible();

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
  // Канон #366: счётчики остаются у чипов наличия, у «Все» и категорий чисел нет.
  await expect(page.getByRole('button', { name: 'Фильтр: Все' }).locator('.filter-chip__count')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Фильтр по категории' }).locator('.filter-chip__count')).toHaveCount(0);

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
  // Канон #366: из статусов число только у «Виден гостю», у профилей чисел нет.
  const statusChips = page.getByRole('group', { name: 'Фильтр по статусу' });
  await expect(statusChips.locator('.filter-chip__count')).toHaveCount(1);
  await expect(statusChips.getByRole('button', { name: 'Фильтр: Виден гостю' }).locator('.filter-chip__count')).toHaveCount(1);
  await expect(page.getByRole('group', { name: 'Фильтр по категориям' }).locator('.filter-chip__count')).toHaveCount(0);
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
  await expect(page.locator('.daily-code-rotation')).toHaveText(/^Код меняется каждый день в полночь/);
  await expect(page.locator('.daily-code-rotation svg')).toHaveCount(0);
  await expect(page.locator('.access-toolbar .chip__count')).toHaveCount(0);
  // AuditBlock убран со страницы целиком (mockup-trim) — журнал теперь
  // только за пределами Master, через /staff/audit/events API.
  await expect(page.getByText('Что происходило в системе')).toHaveCount(0);
});

// «Закончился» — главное действие полки (#211, #309): одно нажатие, тост
// с отменой. Сценарий неразрушающий: отмена удаляет отметку 0 г из журнала.
test('Master shelf marks a tobacco out and undoes it from the toast', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  await openWorkspace(page, 'Полка');
  await expect(page.getByRole('heading', { name: 'Полка', level: 1 })).toBeVisible();
  // Канон #363: без KPI-ряда и строки клавиш, у «Все» числа нет, расчётность — в шапке колонки.
  await expect(page.locator('.shelf-page .stats')).toHaveCount(0);
  await expect(page.locator('.shelf-keys')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Статус на полке' }).getByRole('button', { name: 'Все', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Остаток по учёту' })).toBeVisible();

  const emptyButton = (row: Locator) => row.getByRole('button', { name: 'Закончился', exact: true });
  const first = page
    .locator('table.shelf-table tbody tr[data-tobacco-id]')
    .filter({ has: page.getByRole('button', { name: 'Закончился', exact: true }) })
    .first();
  await expect(first).toBeVisible();
  // Строка адресуется по id: после «Закончился» сортировка «Хватит до»
  // переставляет закончившийся табак наверх.
  const id = await first.getAttribute('data-tobacco-id');
  const row = page.locator(`table.shelf-table tbody tr[data-tobacco-id="${id}"]`);

  await emptyButton(row).click();
  const toast = page.locator('.shelf-toast');
  await expect(toast).toBeVisible();
  // Название жирной строкой, ниже отдельное предложение; иконки у успешного тоста нет (#363).
  await expect(toast.locator('b')).not.toBeEmpty();
  await expect(toast).toContainText('Закончился, гости его не видят.');
  await expect(toast.locator('svg')).toHaveCount(0);
  await toast.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(toast).toBeHidden();
  await expect(emptyButton(row)).toBeVisible();
});

// Несколько табаков разом (#333, #shot=shelf-bulk, shelf-bulk-done): чекбоксы,
// панель «Выбрано N», «Закончились» одним действием и одна отмена на всех.
// Неразрушающий: отмена пакета удаляет отметки 0 г из журнала.
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
  await expect(bar.getByRole('button', { name: 'Держим постоянно', exact: true })).toBeVisible();
  // Строки клавиш под таблицей нет: клавиши — в title (#364).
  await expect(page.locator('.shelf-keys')).toHaveCount(0);

  await bar.getByRole('button', { name: 'Закончились', exact: true }).click();
  await expect(bar).toHaveCount(0);
  const toast = page.locator('.shelf-toast');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText('Закончились: 2');
  await expect(toast).toContainText('Гости их не видят.');
  for (const row of rows) await expect(row).toContainText('в заказе');

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
  await expect(page.getByRole('heading', { name: 'Дашборд смены', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Что нового', exact: true })).toBeVisible();
  await expect(unread).toHaveCount(0);
});

test.describe('Master on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('Master shelf on a phone: bottom navigation, «Закончился» with undo, remaining sheet closes without a mark', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Логин', { exact: true }).fill(adminCredentials.login);
    await page.getByLabel('Пароль', { exact: true }).fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByRole('heading', { name: 'Дашборд смены', level: 1 })).toBeVisible();

    // На телефоне вместо вкладок — нижняя навигация.
    await expect(page.getByRole('tablist', { name: 'Рабочие разделы Мастера' })).toHaveCount(0);
    const shelfTab = page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name: 'Полка', exact: true });
    await expect(shelfTab).toBeVisible();
    await shelfTab.click();
    await expect(shelfTab).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: 'Полка', level: 1 })).toBeAttached();

    // Чип «Пробы» (#329) — рядом со статусами, с числом проб.
    await expect(page.getByRole('group', { name: 'Статус на полке' }).getByRole('button', { name: /^Пробы\s*\d+$/ })).toBeVisible();
    // По умолчанию открыт чип «Заканчивается», если там что-то есть, — берём все.
    await page.getByRole('group', { name: 'Статус на полке' }).getByRole('button', { name: /^Все/ }).click();
    const emptyButton = (card: Locator) => card.getByRole('button', { name: 'Закончился', exact: true });
    // У «проверьте остаток» вместо «Указать остаток» — «Отметить остаток»: берём обычную карточку.
    const first = page
      .locator('.m-shelf-card')
      .filter({ has: page.getByRole('button', { name: 'Закончился', exact: true }) })
      .filter({ has: page.getByRole('button', { name: 'Указать остаток', exact: true }) })
      .first();
    await expect(first).toBeVisible();
    const id = await first.getAttribute('data-tobacco-id');
    const card = page.locator(`.m-shelf-card[data-tobacco-id="${id}"]`);
    // Страница не уезжает вбок: карточки вместо широкой таблицы.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await emptyButton(card).click();
    const toast = page.locator('.shelf-toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Закончился, гости его не видят.');
    await toast.getByRole('button', { name: 'Отменить', exact: true }).click();
    await expect(toast).toBeHidden();
    await expect(emptyButton(card)).toBeVisible();

    await card.getByRole('button', { name: 'Указать остаток', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: /^Сколько осталось/ });
    await expect(sheet).toBeVisible();
    // Доли от уровня после прихода — с граммами на кнопке.
    const shares = sheet.getByRole('group', { name: 'Сколько осталось' }).getByRole('button');
    await expect(shares).toHaveCount(4);
    await expect(shares.first()).toContainText(/\d+ г/);
    await expect(sheet).toContainText(/По расчёту сейчас [\d\s ]+ г\./);
    await expect(sheet.getByRole('button', { name: 'Закончился', exact: true })).toBeVisible();
    // Тап по затемнению над шторкой закрывает её без отметки.
    await page.mouse.click(187, 40);
    await expect(sheet).toBeHidden();
    await expect(toast).toBeHidden();
  });

  // Редкие действия и настройки полки на телефоне (#228). Неразрушающий:
  // списание и настройки открываются и закрываются без подтверждения.
  test('Master shelf card on a phone: actions sheet, write-off form and shelf settings close without changes', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Логин', { exact: true }).fill(adminCredentials.login);
    await page.getByLabel('Пароль', { exact: true }).fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByRole('heading', { name: 'Дашборд смены', level: 1 })).toBeVisible();
    await page.getByRole('navigation', { name: 'Разделы' }).getByRole('button', { name: 'Полка', exact: true }).click();
    await page.getByRole('group', { name: 'Статус на полке' }).getByRole('button', { name: /^Все/ }).click();

    // Берём табак с остатком — у него доступно и списание.
    const first = page
      .locator('.m-shelf-card')
      .filter({ has: page.getByRole('button', { name: 'Закончился', exact: true }) })
      .first();
    await expect(first).toBeVisible();
    await first.locator('.m-shelf-card__name').click();
    const card = page.locator('.shelf-card');
    await expect(card).toBeVisible();
    // Бренд строкой под названием, без надзаголовка; кнопка без многоточия (#364).
    await expect(card.locator('.shelf-card__brand')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Указать остаток', exact: true })).toBeVisible();

    await card.getByRole('button', { name: /^Действия:/ }).click();
    const actions = page.getByRole('dialog', { name: /^Действия:/ });
    await expect(actions).toBeVisible();
    for (const name of ['Приход без счёта', 'Списать']) {
      await expect(actions.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await expect(actions.getByRole('button', { name: /стоп для гостей$/i })).toBeVisible();
    await expect(actions.getByRole('button', { name: /^Убрать с полки/ })).toBeVisible();

    await actions.getByRole('button', { name: 'Списать', exact: true }).click();
    const writeOff = page.getByRole('dialog', { name: 'Списать', exact: true });
    await expect(writeOff.getByLabel('Причина')).toBeVisible();
    await expect(writeOff.getByRole('button', { name: /^Списать/ })).toBeDisabled();
    // Тап по затемнению закрывает шторку, карточка остаётся.
    await page.mouse.click(187, 40);
    await expect(writeOff).toBeHidden();
    await expect(card).toBeVisible();
    await expect(page.locator('.shelf-toast')).toBeHidden();
    await card.getByRole('button', { name: 'Закрыть' }).click();
    await expect(card).toBeHidden();

    await page.getByRole('button', { name: 'Меню полки' }).click();
    const menu = page.getByRole('dialog', { name: 'Меню полки' });
    await menu.getByRole('button', { name: /^Настройки полки/ }).click();
    await expect(menu).toBeHidden();
    const settings = page.getByRole('dialog', { name: 'Настройки полки' });
    await expect(settings.getByLabel('Граммовка чаши, г')).toHaveValue(/^\d+$/);
    await expect(settings.getByLabel('Срок поставки, дней')).toHaveValue(/^\d+$/);
    // На телефоне — нижней шторкой на всю ширину.
    await expect.poll(async () => (await settings.boundingBox())?.width).toBe(375);
    await settings.getByRole('button', { name: 'Отмена' }).click();
    await expect(settings).toBeHidden();
  });

  // Выбор нескольких на телефоне (#333, #shot=mobile-bulk): «Выбрать» в шапке,
  // касание по карточке выбирает, внизу «Закончились», число — в шапке. Неразрушающий:
  // режим выбора закрывается «Готово» без действия.
  test('Master shelf on a phone: «Выбрать» picks cards by tap and «Готово» leaves without changes', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Логин', { exact: true }).fill(adminCredentials.login);
    await page.getByLabel('Пароль', { exact: true }).fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByRole('heading', { name: 'Дашборд смены', level: 1 })).toBeVisible();
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
    await expect(bar.getByRole('button', { name: 'Держим постоянно', exact: true })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'Дашборд смены', level: 1 })).toBeVisible();

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

  // Колесо мыши крутит страницу плавно, и после mouse.wheel она ещё едет. Палец
  // на телефоне инерцию останавливает тапом, поэтому ждём, пока страница встанет.
  const scrollAndSettle = async (page: Page) => {
    await page.mouse.wheel(0, 3000);
    let last = -1;
    await expect
      .poll(async () => {
        const y = await page.evaluate(() => window.scrollY);
        const settled = y > 0 && y === last;
        last = y;
        return settled;
      })
      .toBe(true);
  };

  // #334: раздел открывается с начала, а нижнее меню остаётся в ширину экрана
  // и у нижнего края, даже когда страница шире экрана (конструктор микса).
  test('Master on a phone: sections open from the top, the bottom bar stays screen-wide', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Логин', { exact: true }).fill(adminCredentials.login);
    await page.getByLabel('Пароль', { exact: true }).fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByRole('heading', { name: 'Дашборд смены', level: 1 })).toBeVisible();

    const nav = page.getByRole('navigation', { name: 'Разделы' });
    await scrollAndSettle(page);
    await nav.getByRole('button', { name: 'Полка', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Полка', level: 1 })).toBeAttached();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    await scrollAndSettle(page);
    await nav.getByRole('button', { name: 'Ещё', exact: true }).click();
    await page.getByRole('dialog', { name: 'Ещё разделы' }).getByRole('button', { name: /^Миксы/ }).click();
    await expect(page.getByRole('heading', { name: 'Каталог миксов', level: 1 })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    await page.locator('table.mixes-table tbody tr[data-mix-id]').first().click();
    await expect(page.getByRole('button', { name: 'Назад к каталогу миксов' })).toBeVisible();
    await page.mouse.wheel(0, 3000);
    const box = await nav.boundingBox();
    expect(box).toMatchObject({ x: 0, width: 375 });
    expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(812);
    await expect(nav.getByRole('button', { name: 'Ещё', exact: true })).toBeInViewport({ ratio: 1 });
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
    await expect(page.getByRole('heading', { name: 'Дашборд смены', level: 1 })).toBeVisible();

    await expect(page.getByRole('tablist', { name: 'Рабочие разделы Мастера' })).toHaveCount(0);
    const nav = page.getByRole('navigation', { name: 'Разделы' });
    await expect(nav).toBeInViewport({ ratio: 1 });
    await nav.getByRole('button', { name: 'Полка', exact: true }).click();
    await expect(nav.getByRole('button', { name: 'Полка', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.m-shelf-card').first()).toBeVisible();
  });
});

// Прогноз и «К заказу» (#213, #323, #325, #326): блок «Полка» на дашборде с
// бюджетом, переключатель «К заказу» и настройки полки. Неразрушающий: в «К заказу»
// ничего не меняется, настройки закрываются «Отменой».
test('Master dashboard shows the shelf forecast, shelf opens reorder and settings without saving', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  // Канон #365: карточка — заголовок и содержимое, без надписи над ним и без «≈».
  const forecast = page.getByRole('article', { name: 'Прогноз на сегодня' });
  await expect(forecast.getByRole('heading', { name: 'Прогноз на сегодня' })).toBeVisible();
  await expect(forecast).toContainText(/[\d\s ]+ г/);
  await expect(page.locator('.dashboard-page')).not.toContainText('≈');
  // Деньги: бюджет указан — «<Месяц>: бюджет …», нет — «Траты за <месяц>» и «Бюджет на табак не указан».
  await expect(page.getByRole('article', { name: /^Траты за |: бюджет / })).toContainText(/бюджет/i);
  // Ряд KPI остаётся только на дашборде.
  await expect(page.locator('.dashboard-page .stats')).toHaveCount(1);

  await openWorkspace(page, 'Полка');
  await expect(page.getByRole('heading', { name: 'Полка', level: 1 })).toBeVisible();

  const reorderToggle = page.getByRole('group', { name: 'Вид полки' }).getByRole('button', { name: /^К заказу/ });
  await reorderToggle.click();
  await expect(reorderToggle).toHaveAttribute('aria-pressed', 'true');
  // Плашка интервала поставок: известен по счетам или пока нет.
  await expect(page.locator('.reorder-interval')).toContainText(/Поставки примерно раз в|Интервал поставок пока неизвестен/);
  // Группы поставщиков или пустое состояние — зависит от полки в базе.
  await expect(page.locator('.reorder-group, .reorder__empty').first()).toBeVisible();
  const groups = page.locator('.reorder-group');
  if (await groups.count()) {
    await expect(groups.first().getByRole('columnheader', { name: 'Расход в месяц' })).toBeVisible();
    await expect(groups.first().getByRole('button', { name: 'Скопировать заявку' })).toBeVisible();
  }
  // Сколько заказать, решает мастер: ни степпера, ни суммы.
  await expect(page.getByRole('group', { name: /^Заказать:/ })).toHaveCount(0);
  await expect(page.locator('.reorder__hint')).toContainText('Сколько заказать, решает мастер.');

  await page.getByRole('button', { name: 'Меню полки' }).click();
  await page.getByRole('menuitem', { name: /Настройки полки/ }).click();
  const settings = page.getByRole('dialog');
  await expect(settings.getByRole('heading', { name: 'Настройки полки' })).toBeVisible();
  await expect(settings.getByLabel('Граммовка чаши, г')).toHaveValue(/^\d+$/);
  await expect(settings.getByLabel('Срок поставки, дней')).toHaveValue(/^\d+$/);
  // Бюджет необязателен: пусто или рубли с пробелами между разрядами.
  await expect(settings.getByLabel('Бюджет на табак, ₽ в месяц')).toHaveValue(/^[\d\s ]*$/);
  await expect(settings).toContainText('Сколько табака уходит на одну чашу.');
  await expect(settings).toContainText('Считается само:');
  await settings.getByRole('button', { name: 'Отмена' }).click();
  await expect(settings).toBeHidden();
});

// «Закупка» (#327–#331): третий вид «Полки» — полоса бюджета, чипы разделов и
// по каждому разделу либо данные, либо «Данных пока мало» (на seed расхода ещё
// нет). Неразрушающий: «Держим» и отметки пробы не трогаем, настройки — «Отмена».
test('Master shelf opens «Закупка»: budget strip, section chips and few-data state', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);
  await openWorkspace(page, 'Полка');
  await expect(page.getByRole('heading', { name: 'Полка', level: 1 })).toBeVisible();

  const views = page.getByRole('group', { name: 'Вид полки' }).getByRole('button');
  await expect(views).toHaveText([/^Полка$/, /^К заказу/, /^Закупка$/]);
  const purchase = page.getByRole('group', { name: 'Вид полки' }).getByRole('button', { name: 'Закупка', exact: true });
  await purchase.click();
  await expect(purchase).toHaveAttribute('aria-pressed', 'true');

  // Полоса бюджета — одна строка (#364): бюджет указан — бюджет, база и потрачено,
  // нет — стоимость базы и «Указать бюджет».
  const budget = page.getByRole('note', { name: 'Бюджет на табак' });
  await expect(budget).toBeVisible();
  const invite = budget.getByRole('button', { name: 'Указать бюджет' });
  if (await invite.isVisible()) {
    await expect(budget).toContainText('Бюджет на табак не указан.');
    await invite.click();
    const settings = page.getByRole('dialog');
    await expect(settings.getByRole('heading', { name: 'Настройки полки' })).toBeVisible();
    await expect(settings).toContainText('В закупке видно, сколько уходит на базу');
    await settings.getByRole('button', { name: 'Отмена' }).click();
    await expect(settings).toBeHidden();
  } else {
    await expect(budget).toContainText(/^Бюджет на \S+ /);
    await expect(budget).toContainText('По принятым счетам потрачено');
  }

  const sections = page.getByRole('group', { name: 'Разделы закупки' }).getByRole('button');
  await expect(sections).toHaveText([/^База/, /^Закончились быстро/, /^Пробы/, /^Лежит/, /^Вкусы/]);
  await expect(sections.first()).toHaveAttribute('aria-pressed', 'true');
  // Разделы — навигация, а не фильтры-статусы: без счётчиков (#364).
  await expect(page.getByRole('group', { name: 'Разделы закупки' }).locator('.filter-chip__count')).toHaveCount(0);

  const few = page.getByRole('heading', { name: 'Данных пока мало' });
  const titles = ['Что держать в базе', 'Закончились быстро', 'Как зашли пробы', 'Что лежит', 'Вкусы: расход против полки'];
  for (const [index, title] of titles.entries()) {
    await sections.nth(index).click();
    await expect(sections.nth(index)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: title, level: 2 }).or(few)).toBeVisible();
    if (await few.isVisible()) await expect(page.locator('.purchase-few')).toContainText(/Учёт в граммах/);
  }
  // Сколько заказать, решает мастер: ни количества, ни суммы заказа.
  await expect(page.getByRole('group', { name: /^Заказать:/ })).toHaveCount(0);
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

// Поставка вручную (#212): черновик → строка с табаком из каталога → приёмка.
// Табак берётся с полки, поэтому приёмка лишь добавила бы ему граммы:
// гостевое наличие не меняется. Принятую поставку удалить нельзя — в базе
// осталась бы поставка с уникальным номером «SMOKE-…» и приход.
// Неразрушающий, как весь прогон (README smoke): черновик доводится до готовности
// к приёмке и удаляется — принятая поставка оставила бы приход и поставку в базе.
test('Master deliveries prepare a manual draft with a catalog tobacco and discard it', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  await openWorkspace(page, 'Полка');
  const shelfRow = page.locator('table.shelf-table tbody tr[data-tobacco-id]').first();
  await expect(shelfRow).toBeVisible();
  // Вторая ячейка — табак: первая — чекбокс выбора (#333), а в колонке
  // «Приход» тоже есть .shelf-name.
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
  // Без граммов в названии строка ждала бы их и блокировала приёмку.
  await addLine.getByLabel('Граммов в штуке').fill('200');
  await addLine.getByRole('button', { name: 'Добавить строку' }).click();
  await expect(addLine).toBeHidden();

  const line = page.locator('tr[data-line-id]');
  await expect(line).toHaveCount(1);
  await expect(line.getByRole('button', { name: /^Табак для строки 1:/ })).toContainText(tobaccoName);
  await expect(page.locator('.deliv-footbar')).toContainText('На полку 200 г');

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
