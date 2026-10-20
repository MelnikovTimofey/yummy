import { expect, test, type Locator } from '@playwright/test';
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
  // Банки при этом не трогаются, поэтому вернувшийся табак снова виден гостю,
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
  // Read-only drawer (статистический рейл): eyebrop «Редактирование рейла»,
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
  // AuditBlock убран со страницы целиком (mockup-trim) — журнал теперь
  // только за пределами Master, через /staff/audit/events API.
  await expect(page.getByText('Что происходило в системе')).toHaveCount(0);
});

// «Закончилась» — главное действие полки (#211): одно нажатие, тост
// с отменой. Сценарий неразрушающий: отмена возвращает банку в работу.
test('Master shelf marks a pack empty and undoes it from the toast', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  await openWorkspace(page, 'Полка');
  await expect(page.getByRole('heading', { name: 'Полка', level: 1 })).toBeVisible();

  const emptyButton = (row: Locator) => row.getByRole('button', { name: 'Закончилась', exact: true });
  const first = page
    .locator('table.shelf-table tbody tr[data-tobacco-id]')
    .filter({ has: page.getByRole('button', { name: 'Закончилась', exact: true }) })
    .first();
  await expect(first).toBeVisible();
  // Строка адресуется по id: после «Закончилась» сортировка «Хватит до»
  // переставляет закончившийся табак наверх.
  const id = await first.getAttribute('data-tobacco-id');
  const row = page.locator(`table.shelf-table tbody tr[data-tobacco-id="${id}"]`);

  await emptyButton(row).click();
  const toast = page.locator('.shelf-toast');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText(/банка пустая|табак закончился/);
  await toast.getByRole('button', { name: /Отменить/ }).click();
  await expect(toast).toBeHidden();
  await expect(emptyButton(row)).toBeVisible();
});

// Прогноз и «К заказу» (#213): блок «Полка» на дашборде, переключатель
// «К заказу» и настройки полки. Неразрушающий: количество в «К заказу» не
// сохраняется, настройки закрываются «Отменой».
test('Master dashboard shows the shelf forecast, shelf opens reorder and settings without saving', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  const forecast = page.getByRole('article', { name: 'Прогноз расхода' });
  await expect(forecast.getByRole('heading', { name: 'Прогноз расхода' })).toBeVisible();
  await expect(forecast).toContainText(/≈ [\d\s ]+ г/);

  await openWorkspace(page, 'Полка');
  await expect(page.getByRole('heading', { name: 'Полка', level: 1 })).toBeVisible();

  const reorderToggle = page.getByRole('group', { name: 'Вид полки' }).getByRole('button', { name: /^К заказу/ });
  await reorderToggle.click();
  await expect(reorderToggle).toHaveAttribute('aria-pressed', 'true');
  // Группы поставщиков или пустое состояние — зависит от полки в базе.
  await expect(page.locator('.reorder-group, .reorder__empty').first()).toBeVisible();
  await expect(page.locator('.reorder__hint')).toContainText('Количество — расход на 21 день');

  await page.getByRole('button', { name: 'Меню полки' }).click();
  await page.getByRole('menuitem', { name: /Настройки полки/ }).click();
  const settings = page.getByRole('dialog');
  await expect(settings.getByRole('heading', { name: 'Настройки полки' })).toBeVisible();
  await expect(settings.getByLabel('Граммовка чаши, г')).toHaveValue(/^\d+$/);
  await expect(settings.getByLabel('Срок поставки, дней')).toHaveValue(/^\d+$/);
  await settings.getByRole('button', { name: 'Отмена' }).click();
  await expect(settings).toBeHidden();
});

// Поставка вручную (#212): черновик → строка с табаком из каталога → приёмка.
// Табак берётся с полки, поэтому приёмка лишь добавляет ему банку в запас:
// гостевое наличие не меняется. Принятую поставку удалить нельзя — в базе
// остаётся поставка с уникальным номером «SMOKE-…» и одна банка.
// Неразрушающий, как весь прогон (README smoke): черновик доводится до готовности
// к приёмке и удаляется — принятая поставка оставила бы банки и поставку в базе.
test('Master deliveries prepare a manual draft with a catalog tobacco and discard it', async ({ page }) => {
  await signIn(adminCredentials.login, adminCredentials.password, page);

  await openWorkspace(page, 'Полка');
  const shelfRow = page.locator('table.shelf-table tbody tr[data-tobacco-id]').first();
  await expect(shelfRow).toBeVisible();
  // Первая ячейка — табак (в колонке «Приход» тоже есть .shelf-name).
  // textContent, а не innerText: подпись бренда в CSS набрана капслоком.
  const nameCell = shelfRow.locator('td').first();
  const tobaccoName = ((await nameCell.locator('.shelf-name b').textContent()) ?? '').trim();
  const manufacturer = ((await nameCell.locator('.shelf-name span').textContent()) ?? '').split(' · ')[0].trim();

  await openWorkspace(page, 'Поставки');
  await expect(page.getByRole('heading', { name: 'Поставки', level: 1 })).toBeVisible();

  const number = `SMOKE-${Date.now()}`;
  await page.getByRole('button', { name: 'Заполнить вручную' }).click();
  const manual = page.getByRole('dialog');
  await manual.getByLabel('Номер счёта').fill(number);
  await manual.getByRole('button', { name: 'Создать черновик' }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`^Счёт № ${number}`), level: 1 })).toBeVisible();
  await expect(page.getByText('ПОСТАВКА · ЧЕРНОВИК')).toBeVisible();

  await page.getByRole('button', { name: '+ Добавить строку' }).click();
  const addLine = page.getByRole('dialog');
  await addLine.getByLabel('Табак из каталога').fill(tobaccoName);
  await addLine
    .getByRole('group', { name: 'Табаки каталога' })
    .getByRole('button')
    .filter({ hasText: tobaccoName })
    .filter({ hasText: manufacturer })
    .first()
    .click();
  await addLine.getByLabel('Цена за банку, ₽').fill('1 550');
  await addLine.getByRole('button', { name: 'Добавить строку' }).click();
  await expect(addLine).toBeHidden();

  const line = page.locator('tr[data-line-id]');
  await expect(line).toHaveCount(1);
  await expect(line.getByRole('button', { name: /^Табак для строки 1:/ })).toContainText(tobaccoName);
  await expect(page.locator('.deliv-footbar')).toContainText('будет 1 банка');

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
