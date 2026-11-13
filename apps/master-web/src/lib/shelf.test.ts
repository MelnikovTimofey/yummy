import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShelfRow, type ShelfArrival, type ShelfRow } from '../contracts';
import {
  EMPTY_SHELF_FILTERS,
  SHELF_SORT_OPTIONS,
  SHELF_STATUS_CHIPS,
  arrivalCell,
  arrivalLine,
  buildShelfFilterOptions,
  cardMixState,
  countActiveShelfFilters,
  describeShelfError,
  emptyToast,
  filterShelfRows,
  formatShelfDate,
  keepToast,
  matchShelfStatus,
  nextTrialVerdict,
  resolveShelfShortcut,
  restockLabel,
  restockToast,
  shelfCounts,
  shelfRowAction,
  shelfRowMenu,
  shelfState,
  shelfStatusCell,
  sortShelfRows,
  trialArrival,
} from './shelf';

const OUT = '2026-11-03T09:00:00';

const arrival = (patch: Partial<ShelfArrival> = {}): ShelfArrival => ({
  at: '2026-10-12T10:00:00',
  kind: 'invoice',
  supplier: 'Каспий Опт',
  number: '1184',
  qty: 2,
  deliveryId: 'd1',
  ...patch,
});

const row = (patch: Partial<ShelfRow> & { name?: string; brand?: string; profiles?: string[]; strength?: string | null } = {}): ShelfRow => {
  const { name = 'Raspberries', brand = 'Black Burn', profiles = ['berry'], strength = 'Средняя', ...rest } = patch;
  return {
    ...normalizeShelfRow({
      tobacco: { id: `${brand}-${name}`, manufacturer: brand, name, flavorProfiles: profiles, officialStrength: strength },
      lastArrival: arrival(),
    }),
    ...rest,
  };
};

test('shelfState: в плане, закончился, стоп, иначе «Есть» (#518)', () => {
  assert.equal(shelfState(row()), 'in');
  assert.equal(shelfState(row({ outAt: OUT })), 'out');
  assert.equal(shelfState(row({ stopped: true })), 'stop');
  // Закончился важнее стопа: его нет на полке совсем.
  assert.equal(shelfState(row({ stopped: true, outAt: OUT })), 'out');
  assert.equal(shelfState(row({ shelfStatus: 'plan', outAt: OUT })), 'plan');
});

test('чипы полки: Все, Есть, Закончились, Стоп, В плане, Проба', () => {
  assert.deepEqual(SHELF_STATUS_CHIPS, [
    ['all', 'Все'],
    ['in', 'Есть'],
    ['out', 'Закончились'],
    ['stop', 'Стоп'],
    ['plan', 'В плане'],
    ['trial', 'Проба'],
  ]);
});

test('matchShelfStatus и shelfCounts: статусы не пересекаются, «Проба» — признак', () => {
  const rows = [
    row({ name: 'A' }),
    row({ name: 'B', trial: true }),
    row({ name: 'C', outAt: OUT, trial: true }),
    row({ name: 'D', stopped: true }),
    row({ name: 'E', shelfStatus: 'plan' }),
  ];
  assert.equal(matchShelfStatus(rows[1], 'trial'), true);
  assert.equal(matchShelfStatus(rows[2], 'in'), false);
  assert.equal(matchShelfStatus(rows[3], 'all'), true);
  assert.deepEqual(shelfCounts(rows), { all: 5, in: 2, out: 1, stop: 1, plan: 1, trial: 2 });
});

test('filterShelfRows ищет по табаку и бренду без учёта регистра', () => {
  const rows = [row({ name: 'Cane Mint' }), row({ name: 'Blackcurrant', brand: 'DARKSIDE' }), row({ name: 'Маракуйя', brand: 'Сарма' })];
  const names = (query: string) => filterShelfRows(rows, { query, status: 'all', filters: EMPTY_SHELF_FILTERS }).map((item) => item.tobacco.name);
  assert.deepEqual(names('darkside'), ['Blackcurrant']);
  assert.deepEqual(names('сарма мара'), ['Маракуйя']);
  assert.deepEqual(names('  '), ['Cane Mint', 'Blackcurrant', 'Маракуйя']);
});

test('filterShelfRows ищет по неточному совпадению, точные — выше похожих (#522)', () => {
  const rows = [
    row({ name: 'Mind', brand: 'Sebero' }),
    row({ name: 'Манго', brand: 'Хулиган' }),
    row({ name: 'Spearmint', brand: 'Sebero' }),
    row({ name: 'Cane Mint', brand: 'Tangiers' }),
  ];
  const names = (query: string) => filterShelfRows(rows, { query, status: 'all', filters: EMPTY_SHELF_FILTERS }).map((item) => item.tobacco.name);
  assert.deepEqual(names('hooligan'), ['Манго']);
  assert.deepEqual(names('Tangers'), ['Cane Mint']);
  assert.deepEqual(names('mint'), ['Cane Mint', 'Spearmint', 'Mind']);
});

test('filterShelfRows: статус, бренд, характер, крепость и миксы', () => {
  const rows = [
    row({ name: 'A', brand: 'DARKSIDE', profiles: ['berry'], strength: 'Средняя', mixCount: 2 }),
    row({ name: 'B', brand: 'Сарма', profiles: ['citrus', 'fruity'], strength: null, mixCount: 0, outAt: OUT }),
    row({ name: 'C', brand: 'Сарма', profiles: ['berry'], strength: 'Крепкая', mixCount: 1 }),
  ];
  const names = (filters: Partial<typeof EMPTY_SHELF_FILTERS>, status: 'all' | 'out' = 'all') =>
    filterShelfRows(rows, { query: '', status, filters: { ...EMPTY_SHELF_FILTERS, ...filters } }).map((item) => item.tobacco.name);
  assert.deepEqual(names({}, 'out'), ['B']);
  assert.deepEqual(names({ brands: ['Сарма'] }), ['B', 'C']);
  assert.deepEqual(names({ profiles: ['berry'] }), ['A', 'C']);
  assert.deepEqual(names({ profiles: ['fruity', 'berry'], brands: ['Сарма'] }), ['B', 'C']);
  assert.deepEqual(names({ strengths: [''] }), ['B']);
  assert.deepEqual(names({ mixes: 'with' }), ['A', 'C']);
  assert.deepEqual(names({ mixes: 'without' }), ['B']);
});

test('buildShelfFilterOptions считает варианты по всей полке', () => {
  const rows = [
    row({ name: 'A', brand: 'DARKSIDE', profiles: ['berry'], mixCount: 2 }),
    row({ name: 'B', brand: 'Сарма', profiles: ['berry', 'citrus'], strength: null }),
    row({ name: 'C', brand: 'Сарма', profiles: [], strength: 'Средняя' }),
  ];
  const options = buildShelfFilterOptions(rows);
  assert.deepEqual(options.brands, [{ value: 'Сарма', count: 2 }, { value: 'DARKSIDE', count: 1 }]);
  assert.deepEqual(options.profiles, [{ value: 'berry', count: 2 }, { value: 'citrus', count: 1 }]);
  assert.deepEqual(options.strengths, [{ value: 'Средняя', count: 2 }, { value: '', count: 1 }]);
});

test('countActiveShelfFilters считает выбранные значения атрибутов', () => {
  assert.equal(countActiveShelfFilters(EMPTY_SHELF_FILTERS), 0);
  assert.equal(countActiveShelfFilters({ ...EMPTY_SHELF_FILTERS, brands: ['A', 'B'], mixes: 'with' }), 3);
});

test('сортировка полки: по наличию, по названию, по приходу', () => {
  assert.deepEqual(SHELF_SORT_OPTIONS, [
    ['status', 'По наличию'],
    ['name', 'По названию'],
    ['arrived', 'По приходу'],
  ]);
});

test('sortShelfRows «По наличию»: закончившиеся (новые первыми), есть, стоп, в плане', () => {
  const rows = [
    row({ name: 'План', shelfStatus: 'plan' }),
    row({ name: 'Стоп', stopped: true }),
    row({ name: 'Есть Б' }),
    row({ name: 'Раньше', outAt: '2026-10-30T10:00:00' }),
    row({ name: 'Есть А' }),
    row({ name: 'Позже', outAt: OUT }),
  ];
  assert.deepEqual(sortShelfRows(rows, 'status').map((item) => item.tobacco.name), ['Позже', 'Раньше', 'Есть А', 'Есть Б', 'Стоп', 'План']);
});

test('sortShelfRows: по названию и по приходу (без прихода — в конце)', () => {
  const rows = [
    row({ name: 'B', lastArrival: arrival({ at: '2026-09-24T10:00:00' }) }),
    row({ name: 'A', lastArrival: null }),
    row({ name: 'C', lastArrival: arrival({ at: '2026-10-20T10:00:00' }) }),
  ];
  assert.deepEqual(sortShelfRows(rows, 'name').map((item) => item.tobacco.name), ['A', 'B', 'C']);
  assert.deepEqual(sortShelfRows(rows, 'arrived').map((item) => item.tobacco.name), ['C', 'B', 'A']);
});

test('formatShelfDate: день и месяц коротко', () => {
  assert.equal(formatShelfDate(OUT), '3 ноя');
  assert.equal(formatShelfDate(null), '—');
  assert.equal(formatShelfDate('мусор'), '—');
});

test('shelfStatusCell: «Наличие» с датой и строкой ниже (#shot=shelf)', () => {
  assert.deepEqual(shelfStatusCell(row()), { tone: 'in', label: 'Есть', note: null });
  assert.deepEqual(shelfStatusCell(row({ outAt: OUT })), { tone: 'out', label: 'Закончился 3 ноя', note: 'в заявке' });
  assert.deepEqual(shelfStatusCell(row({ outAt: OUT, keepStocked: false })), { tone: 'out', label: 'Закончился 3 ноя', note: 'не держим' });
  assert.deepEqual(shelfStatusCell(row({ stopped: true, stopNote: 'пересушен' })), { tone: 'stop', label: 'Стоп для гостей', note: 'пересушен' });
  assert.deepEqual(shelfStatusCell(row({ stopped: true })), { tone: 'stop', label: 'Стоп для гостей', note: null });
  assert.deepEqual(shelfStatusCell(row({ shelfStatus: 'plan' })), { tone: 'plan', label: 'В плане', note: 'ждёт прихода' });
});

test('arrivalCell: «Приход» — дата и откуда', () => {
  assert.deepEqual(arrivalCell(arrival()), { date: '12 окт', source: 'Каспий Опт' });
  assert.deepEqual(arrivalCell(arrival({ kind: 'start', supplier: null })), { date: '12 окт', source: 'Стартовый приход' });
  assert.deepEqual(arrivalCell(arrival({ kind: 'manual', supplier: null })), { date: '12 окт', source: 'без счёта' });
  assert.equal(arrivalCell(null), null);
});

test('arrivalLine: «Приходы» в карточке — дата и поставщик, штуки и счёт', () => {
  assert.deepEqual(arrivalLine(arrival()), { title: '12 окт, Каспий Опт', detail: '2 шт., счёт 1184' });
  assert.deepEqual(arrivalLine(arrival({ number: null })), { title: '12 окт, Каспий Опт', detail: '2 шт., по счёту' });
  assert.deepEqual(arrivalLine(arrival({ kind: 'start', supplier: null, number: null, qty: null })), { title: '12 окт, Стартовый приход', detail: 'вручную' });
  assert.deepEqual(arrivalLine(arrival({ kind: 'manual', supplier: null, number: null, qty: null })), { title: '12 окт, без счёта', detail: 'вручную' });
});

test('trialArrival: первый приход пробы — последний в списке (новые первыми)', () => {
  assert.equal(trialArrival([arrival({ at: '2026-11-01T10:00:00' }), arrival({ at: '2026-10-20T10:00:00' })]), 'пришёл впервые 20 окт');
  assert.equal(trialArrival([]), null);
});

test('shelfRowAction: одна кнопка строки по статусу', () => {
  assert.equal(shelfRowAction(row()), 'empty');
  assert.equal(shelfRowAction(row({ outAt: OUT })), 'restock');
  assert.equal(shelfRowAction(row({ stopped: true })), 'unstop');
  assert.equal(shelfRowAction(row({ shelfStatus: 'plan' })), 'restock');
});

test('restockLabel: из плана — «В наличие», закончившийся — «Вернуть в наличие» (#558)', () => {
  assert.equal(restockLabel(row({ shelfStatus: 'plan' })), 'В наличие');
  assert.equal(restockLabel(row({ outAt: OUT })), 'Вернуть в наличие');
});

test('shelfRowMenu: что можно сделать со строкой', () => {
  assert.deepEqual(shelfRowMenu(row()), { canEmpty: true, canRestock: false, stopLabel: 'Стоп для гостей' });
  assert.deepEqual(shelfRowMenu(row({ stopped: true })), { canEmpty: true, canRestock: false, stopLabel: 'Снять стоп для гостей' });
  assert.deepEqual(shelfRowMenu(row({ outAt: OUT })), { canEmpty: false, canRestock: true, stopLabel: 'Стоп для гостей' });
  assert.deepEqual(shelfRowMenu(row({ shelfStatus: 'plan' })), { canEmpty: false, canRestock: true, stopLabel: 'Стоп для гостей' });
});

test('тост «Закончился»: держим — в заявке, не держим — не попадёт (#shot=shelf-out, shelf-out-notkept)', () => {
  assert.deepEqual(emptyToast(row({ mixCount: 4 })), { title: 'Raspberries закончился', text: 'Снят с витрины. Добавлен в заявку.' });
  assert.deepEqual(emptyToast(row({ mixCount: 0 })), { title: 'Raspberries закончился', text: 'Добавлен в заявку.' });
  assert.deepEqual(emptyToast(row({ name: 'Panama', keepStocked: false })), { title: 'Panama закончился', text: 'В заявку не попадёт: не держим постоянно.' });
});

test('тост «Вернуть в наличие» и «Держать постоянно»', () => {
  assert.deepEqual(restockToast(row()), { title: 'Raspberries снова есть', text: 'Вернулся на витрину.' });
  assert.deepEqual(restockToast(row({ stopped: true })), { title: 'Raspberries снова есть', text: 'Стоп для гостей остался.' });
  assert.deepEqual(restockToast(row(), true), { title: 'Raspberries есть', text: 'Появился на витрине.' });
  assert.deepEqual(restockToast(row({ stopped: true }), true), { title: 'Raspberries есть', text: 'Стоп для гостей остался.' });
  assert.deepEqual(keepToast(row({ outAt: OUT })), { title: 'Raspberries', text: 'Держим постоянно. Добавлен в заявку.' });
  assert.deepEqual(keepToast(row()), { title: 'Raspberries', text: 'Держим постоянно. Закончится, попадёт в заявку.' });
});

test('cardMixState: «В миксах» карточки — аналог, скрыт или на витрине', () => {
  const to = { tobaccoId: 'mh', manufacturer: 'Musthave', name: 'Ice Mint' };
  const from = { tobaccoId: 'bb', manufacturer: 'Black Burn', name: 'Cane Mint' };
  assert.deepEqual(cardMixState({ status: 'substituted', substitution: { from, to } }), { text: 'аналог Musthave Ice Mint', danger: false });
  assert.deepEqual(cardMixState({ status: 'blocked', substitution: null }), { text: 'скрыт', danger: true });
  assert.deepEqual(cardMixState({ status: 'hidden', substitution: null }), { text: 'скрыт', danger: true });
  assert.deepEqual(cardMixState({ status: 'visible', substitution: null }), { text: 'на витрине', danger: false });
  assert.equal(cardMixState({ status: null, substitution: null }), null);
});

test('resolveShelfShortcut: клавиши полки по коду клавиши, мимо полей ввода', () => {
  assert.deepEqual(resolveShelfShortcut({ key: '/', code: 'Slash' }), { type: 'search' });
  assert.deepEqual(resolveShelfShortcut({ key: 'ArrowDown', code: 'ArrowDown' }), { type: 'move', delta: 1 });
  assert.deepEqual(resolveShelfShortcut({ key: 'ArrowUp', code: 'ArrowUp' }), { type: 'move', delta: -1 });
  assert.deepEqual(resolveShelfShortcut({ key: 'Enter', code: 'Enter' }), { type: 'open' });
  assert.deepEqual(resolveShelfShortcut({ key: 'у', code: 'KeyE' }), { type: 'empty' });
  assert.deepEqual(resolveShelfShortcut({ key: 'я', code: 'KeyZ' }), { type: 'undo' });
  assert.deepEqual(resolveShelfShortcut({ key: 'ч', code: 'KeyX' }), { type: 'select' });
  assert.deepEqual(resolveShelfShortcut({ key: 'Escape', code: 'Escape' }), { type: 'clear' });
  // Отметок остатка больше нет: O и цифры свободны.
  assert.equal(resolveShelfShortcut({ key: 'щ', code: 'KeyO' }), null);
  assert.equal(resolveShelfShortcut({ key: '1', code: 'Digit1' }), null);
  assert.equal(resolveShelfShortcut({ key: 'e', code: 'KeyE', inField: true }), null);
  assert.equal(resolveShelfShortcut({ key: 'e', code: 'KeyE', modifier: true }), null);
});

test('describeShelfError: ответ сервера как есть, обрыв сети — понятным текстом', () => {
  assert.equal(describeShelfError(Object.assign(new Error('Табак уже закончился'), { status: 409 })), 'Табак уже закончился');
  assert.equal(describeShelfError(new TypeError('Failed to fetch')), 'Нет связи с сервером, изменение не сохранено. Попробуйте ещё раз.');
});

test('nextTrialVerdict: повторный клик по выбранному снимает отметку', () => {
  assert.equal(nextTrialVerdict(null, 'yes'), 'yes');
  assert.equal(nextTrialVerdict('yes', 'no'), 'no');
  assert.equal(nextTrialVerdict('yes', 'yes'), null);
});
