import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShelfCard, normalizeShelfRow, type ShelfRow } from '../contracts';
import {
  afterReceiptLine,
  leftEstimateNote,
  EMPTY_SHELF_FILTERS,
  SHELF_STATUS_CHIPS,
  buildShelfFilterOptions,
  countActiveShelfFilters,
  countToastText,
  countOverToastText,
  countedMarks,
  defaultReceiptGrams,
  describeShelfError,
  emptyToastText,
  filterShelfRows,
  formatBowlCost,
  formatGramPrice,
  formatGrams,
  cardRateHint,
  formatMonthGrams,
  shelfMonthRate,
  formatShelfDate,
  fractionGrams,
  historyEntry,
  trialArrival,
  matchShelfStatus,
  shelfChipCount,
  parseGrams,
  parseReceipt,
  receiptToastText,
  remainHint,
  relativeDay,
  resolveShelfShortcut,
  shelfLevel,
  shelfRowMenu,
  shelfStatusLine,
  shelfUntil,
  sortShelfRows,
  summarizeShelf,
  weekLabel,
  writeOffToastText,
} from './shelf';

const NOW = new Date('2026-11-19T15:00:00');

const row = (patch: Partial<ShelfRow> & { name?: string; brand?: string; profiles?: string[]; strength?: string | null } = {}): ShelfRow => {
  const { name = 'Raspberries', brand = 'Black Burn', profiles = ['berry'], strength = 'Средняя', ...rest } = patch;
  return {
    ...normalizeShelfRow({
      tobacco: { id: `${brand}-${name}`, manufacturer: brand, name, flavorProfiles: profiles, officialStrength: strength },
      status: 'ok',
      leftGrams: 300,
      fullGrams: 400,
      lastReceipt: { at: '2026-11-12T10:00:00', grams: 400, kind: 'invoice', number: '03944', label: 'Каспий Опт' },
      leftSource: 'forecast',
      rate: 10,
      rateKind: 'own',
      monthGrams: 300,
      daysLeft: 20,
      endsAt: '2026-12-09T10:00:00.000Z',
    }),
    ...rest,
  };
};

test('чипы полки: «Проверьте остаток» вместо «Последней банки»', () => {
  assert.deepEqual(SHELF_STATUS_CHIPS, [
    ['all', 'Все'],
    ['ok', 'Есть'],
    ['ending', 'Заканчивается'],
    ['check', 'Проверьте остаток'],
    ['out', 'Закончились'],
    ['stop', 'Стоп'],
    ['plan', 'В плане'],
  ]);
});

test('matchShelfStatus и shelfChipCount: «Пробы» — по признаку trial, а не по статусу (#329)', () => {
  assert.equal(matchShelfStatus(row({ trial: true, status: 'ending' }), 'trial'), true);
  assert.equal(matchShelfStatus(row({ trial: false }), 'trial'), false);
  const rows = [row({ trial: true }), row({ trial: true, status: 'out' }), row()];
  const counters = { all: 3, ok: 2, ending: 0, check: 0, out: 1, stop: 0, plan: 0 };
  assert.equal(shelfChipCount({ rows, counters }, 'trial'), 2);
  assert.equal(shelfChipCount({ rows, counters }, 'out'), 1);
  assert.equal(shelfChipCount(null, 'trial'), 0);
});

test('matchShelfStatus: статусы не пересекаются — как счётчики backend', () => {
  assert.equal(matchShelfStatus(row(), 'all'), true);
  assert.equal(matchShelfStatus(row({ status: 'check' }), 'ok'), false);
  assert.equal(matchShelfStatus(row({ status: 'check' }), 'check'), true);
  assert.equal(matchShelfStatus(row({ status: 'ending' }), 'ok'), false);
  assert.equal(matchShelfStatus(row({ status: 'stop' }), 'stop'), true);
  assert.equal(matchShelfStatus(row({ status: 'plan' }), 'out'), false);
});

test('filterShelfRows ищет по табаку и бренду без учёта регистра', () => {
  const rows = [row({ name: 'Cane Mint' }), row({ name: 'Blackcurrant', brand: 'DARKSIDE' }), row({ name: 'Маракуйя', brand: 'Сарма' })];
  const names = (query: string) => filterShelfRows(rows, { query, status: 'all', filters: EMPTY_SHELF_FILTERS }).map((item) => item.tobacco.name);
  assert.deepEqual(names('darkside'), ['Blackcurrant']);
  assert.deepEqual(names('сарма мара'), ['Маракуйя']);
  assert.deepEqual(names('  '), ['Cane Mint', 'Blackcurrant', 'Маракуйя']);
});

test('filterShelfRows: бренд, характер, крепость, миксы и мало данных', () => {
  const rows = [
    row({ name: 'A', brand: 'DARKSIDE', profiles: ['berry'], strength: 'Средняя', mixCount: 2 }),
    row({ name: 'B', brand: 'Сарма', profiles: ['citrus', 'fruity'], strength: null, mixCount: 0, rateKind: 'none', rate: null }),
    row({ name: 'C', brand: 'Сарма', profiles: ['berry'], strength: 'Крепкая', mixCount: 1, rateKind: 'brand' }),
  ];
  const names = (filters: Partial<typeof EMPTY_SHELF_FILTERS>) =>
    filterShelfRows(rows, { query: '', status: 'all', filters: { ...EMPTY_SHELF_FILTERS, ...filters } }).map((item) => item.tobacco.name);
  assert.deepEqual(names({ brands: ['Сарма'] }), ['B', 'C']);
  assert.deepEqual(names({ profiles: ['berry'] }), ['A', 'C']);
  assert.deepEqual(names({ profiles: ['fruity', 'berry'], brands: ['Сарма'] }), ['B', 'C']);
  assert.deepEqual(names({ strengths: [''] }), ['B']);
  assert.deepEqual(names({ withMixes: true }), ['A', 'C']);
  assert.deepEqual(names({ withoutMixes: true }), ['B']);
  assert.deepEqual(names({ withMixes: true, withoutMixes: true }), ['A', 'B', 'C']);
  assert.deepEqual(names({ fewData: true }), ['B']);
});

test('buildShelfFilterOptions считает варианты по всей полке', () => {
  const rows = [
    row({ name: 'A', brand: 'DARKSIDE', profiles: ['berry'], mixCount: 2 }),
    row({ name: 'B', brand: 'Сарма', profiles: ['berry', 'citrus'], strength: null, rateKind: 'none' }),
    row({ name: 'C', brand: 'Сарма', profiles: [], strength: 'Средняя' }),
  ];
  const options = buildShelfFilterOptions(rows);
  assert.deepEqual(options.brands, [{ value: 'Сарма', count: 2 }, { value: 'DARKSIDE', count: 1 }]);
  assert.deepEqual(options.profiles, [{ value: 'berry', count: 2 }, { value: 'citrus', count: 1 }]);
  assert.deepEqual(options.strengths, [{ value: 'Средняя', count: 2 }, { value: '', count: 1 }]);
  assert.deepEqual(options.extra, { withMixes: 1, withoutMixes: 2, fewData: 1 });
});

test('countActiveShelfFilters считает выбранные пункты панели', () => {
  assert.equal(countActiveShelfFilters(EMPTY_SHELF_FILTERS), 0);
  assert.equal(countActiveShelfFilters({ ...EMPTY_SHELF_FILTERS, brands: ['A', 'B'], fewData: true }), 3);
});

test('sortShelfRows «Хватит до»: сначала закончившиеся и «проверьте», потом по дням, в плане — в конце', () => {
  const rows = [
    row({ name: 'later', daysLeft: 30 }),
    row({ name: 'plan', status: 'plan', daysLeft: null }),
    row({ name: 'soon', daysLeft: 2 }),
    row({ name: 'out', status: 'out', daysLeft: null }),
    row({ name: 'nodata', daysLeft: null, rateKind: 'none' }),
    row({ name: 'check', status: 'check', daysLeft: 25 }),
  ];
  assert.deepEqual(sortShelfRows(rows, 'until').map((item) => item.tobacco.name), ['out', 'check', 'soon', 'later', 'nodata', 'plan']);
});

test('sortShelfRows: по расходу, по остатку, по названию и по приходу', () => {
  const receipt = (at: string) => ({ at, grams: 200, kind: 'invoice' as const, number: null, label: 'X' });
  const rows = [
    row({ name: 'b', brand: 'Б', rate: 5, leftGrams: 40, lastReceipt: receipt('2026-11-01T00:00:00.000Z') }),
    row({ name: 'a', brand: 'А', rate: null, leftGrams: null, fullGrams: null, lastReceipt: null }),
    row({ name: 'c', brand: 'А', rate: 21, leftGrams: 300, lastReceipt: receipt('2026-11-12T00:00:00.000Z') }),
  ];
  assert.deepEqual(sortShelfRows(rows, 'rate').map((item) => item.tobacco.name), ['c', 'b', 'a']);
  // Меньше всего — сверху; прихода не было — в конце.
  assert.deepEqual(sortShelfRows(rows, 'left').map((item) => item.tobacco.name), ['b', 'c', 'a']);
  assert.deepEqual(sortShelfRows(rows, 'name').map((item) => item.tobacco.name), ['a', 'c', 'b']);
  assert.deepEqual(sortShelfRows(rows, 'arrived').map((item) => item.tobacco.name), ['c', 'b', 'a']);
});

test('fractionGrams: доля от уровня после прихода, как на backend', () => {
  assert.equal(fractionGrams(400, 0.75), 300);
  assert.equal(fractionGrams(400, 1 / 3), 133);
  assert.equal(fractionGrams(250, 0.25), 63);
});

test('shelfLevel: полоса — доля от уровня после прихода, цифра — граммы сейчас, подпись — от какого уровня', () => {
  assert.deepEqual(shelfLevel(row()), { share: 0.75, tone: 'normal', none: false, empty: false, value: '300 г', hint: 'из 400 г после прихода' });
  assert.deepEqual(shelfLevel(row({ leftSource: 'mark', leftGrams: 40, fullGrams: 400, status: 'ending', daysLeft: 2 })), {
    share: 0.1,
    tone: 'crit',
    none: false,
    empty: false,
    value: '40 г',
    hint: 'из 400 г после прихода',
  });
  assert.equal(shelfLevel(row({ status: 'ending', daysLeft: 6, leftGrams: 55, fullGrams: 250 })).tone, 'low');
  assert.equal(shelfLevel(row({ status: 'ending', daysLeft: 2, leftGrams: 40 })).tone, 'crit');
  assert.equal(shelfLevel(row({ status: 'check', daysLeft: null, leftGrams: 18, fullGrams: 200 })).tone, 'crit');
  assert.deepEqual(shelfLevel(row({ status: 'out', leftGrams: 0, fullGrams: 200, leftSource: 'mark' })), {
    share: 0,
    tone: 'normal',
    none: true,
    empty: true,
    value: '0 г',
    hint: 'из 200 г после прихода',
  });
  assert.deepEqual(shelfLevel(row({ status: 'plan', leftGrams: null, fullGrams: null, lastReceipt: null })), {
    share: 0,
    tone: 'normal',
    none: true,
    empty: false,
    value: '—',
    hint: 'прихода не было',
  });
  // Расчёт дошёл до нуля, но «Закончился» никто не отмечал — это оценка, а не факт.
  assert.deepEqual(shelfLevel(row({ status: 'check', daysLeft: null, leftGrams: 0, fullGrams: 200 })), {
    share: 0,
    tone: 'crit',
    none: false,
    empty: false,
    value: '0 г',
    hint: 'из 200 г после прихода',
  });
  assert.equal(shelfLevel(row({ leftGrams: 1234.6, fullGrams: 1500 })).value, '1 235 г');
});

test('«Сколько осталось?»: уровень после прихода и остаток по расчёту', () => {
  assert.equal(afterReceiptLine(row()), 'После прихода 12 ноя было 400 г');
  assert.equal(afterReceiptLine(row({ leftGrams: null, fullGrams: null, lastReceipt: null })), null);
  assert.equal(leftEstimateNote(row({ leftGrams: 40.4 })), 'По расчёту сейчас 40 г.');
  assert.equal(leftEstimateNote(row({ leftGrams: -5 })), 'По расчёту сейчас 0 г.');
  assert.equal(leftEstimateNote(row({ leftGrams: null, fullGrams: null, lastReceipt: null })), null);
});

test('relativeDay: сегодня, вчера, иначе дата', () => {
  assert.equal(relativeDay('2026-11-19T09:00:00', NOW), 'сегодня');
  assert.equal(relativeDay('2026-11-18T23:30:00', NOW), 'вчера');
  assert.equal(relativeDay('2026-11-07T10:00:00', NOW), '7 ноя');
});

test('shelfStatusLine: статус под датой, у остальных — последняя отметка после прихода', () => {
  assert.deepEqual(shelfStatusLine(row({ status: 'out' }), NOW), { tone: 'danger', text: 'закончился' });
  assert.deepEqual(shelfStatusLine(row({ status: 'ending' }), NOW), { tone: 'warning', text: 'заканчивается' });
  assert.deepEqual(shelfStatusLine(row({ status: 'check' }), NOW), { tone: 'warning', text: 'проверьте остаток' });
  assert.deepEqual(shelfStatusLine(row({ status: 'stop', stopNote: 'до декабря' }), NOW), { tone: 'faint', text: 'стоп для гостей: до декабря' });
  assert.deepEqual(shelfStatusLine(row({ status: 'stop' }), NOW), { tone: 'faint', text: 'стоп для гостей' });
  assert.deepEqual(shelfStatusLine(row({ status: 'plan' }), NOW), { tone: 'faint', text: 'в плане' });
  assert.equal(shelfStatusLine(row(), NOW), null);
  assert.deepEqual(shelfStatusLine(row({ lastCount: { at: '2026-11-17T10:00:00', grams: 330, fraction: null } }), NOW), {
    tone: 'faint',
    text: 'отметка 330 г 17 ноя',
  });
  assert.deepEqual(shelfStatusLine(row({ lastCount: { at: '2026-11-18T10:00:00', grams: 63, fraction: 0.25 } }), NOW), {
    tone: 'faint',
    text: 'отметка ¼ вчера',
  });
  // Отметка до последнего прихода уже ничего не говорит об остатке.
  assert.equal(shelfStatusLine(row({ lastCount: { at: '2026-11-01T10:00:00', grams: 100, fraction: null } }), NOW), null);
});

test('shelfUntil: дата и дни с тоном по сроку поставки', () => {
  assert.deepEqual(shelfUntil(row({ daysLeft: 22.4, endsAt: '2026-12-11T10:00:00.000Z' }), 7, NOW), { text: '11 дек', days: '22 дн', tone: 'default' });
  assert.deepEqual(shelfUntil(row({ daysLeft: 6, endsAt: '2026-11-25T10:00:00.000Z' }), 7, NOW), { text: '25 ноя', days: '6 дн', tone: 'warning' });
  assert.deepEqual(shelfUntil(row({ daysLeft: 2.2, endsAt: '2026-11-21T10:00:00.000Z' }), 7, NOW), { text: '21 ноя', days: '2 дн', tone: 'danger' });
  assert.deepEqual(shelfUntil(row({ rateKind: 'brand', daysLeft: 16, endsAt: '2026-12-05T10:00:00.000Z' }), 7, NOW), { text: '5 дек', days: '16 дн', tone: 'default' });
  assert.deepEqual(shelfUntil(row({ status: 'check', daysLeft: null }), 7, NOW), { text: 'должен был закончиться', days: null, tone: 'warning' });
  assert.deepEqual(shelfUntil(row({ daysLeft: null, endsAt: null, rateKind: 'none' }), 7, NOW), { text: '—', days: null, tone: 'faint' });
  assert.deepEqual(shelfUntil(row({ status: 'plan', rateKind: 'brand', daysLeft: 0, endsAt: '2026-10-20T10:00:00.000Z' }), 7, NOW), { text: '—', days: null, tone: 'faint' });
});

test('shelfUntil: закончился — когда отметили «Закончился»', () => {
  const out = (lastCount: ShelfRow['lastCount']) => shelfUntil(row({ status: 'out', leftGrams: 0, daysLeft: null, lastCount }), 7, NOW);
  assert.deepEqual(out({ at: '2026-11-17T10:00:00', grams: 0, fraction: null }), { text: 'закончился 17 ноя', days: null, tone: 'danger' });
  assert.deepEqual(out({ at: '2026-11-19T12:00:00', grams: 0, fraction: null }), { text: 'закончился сегодня', days: null, tone: 'danger' });
  // Обнулило списание — даты «Закончился» нет.
  assert.deepEqual(out(null), { text: 'закончился', days: null, tone: 'danger' });
  assert.deepEqual(shelfUntil(row({ status: 'out', leftGrams: null, fullGrams: null, lastReceipt: null }), 7, NOW), { text: '—', days: null, tone: 'faint' });
});

test('форматирование граммов, расхода, дат и денег', () => {
  assert.equal(formatGrams(289.6), '290 г');
  assert.equal(formatGrams(1250), '1 250 г');
  assert.equal(formatGrams(0), '0 г');
  assert.equal(formatShelfDate('2026-05-03T10:00:00.000Z'), '3 мая');
  assert.equal(formatShelfDate(''), '—');
  assert.equal(formatGramPrice(775), '7,75 ₽');
  assert.equal(formatGramPrice(null), '—');
  assert.equal(formatBowlCost(13950, 18), '140 ₽ за чашу 18 г');
  assert.equal(formatBowlCost(null, 18), null);
});

test('parseGrams: целые граммы от минимума до 20 кг', () => {
  assert.equal(parseGrams('180'), 180);
  assert.equal(parseGrams(' 180 '), 180);
  assert.equal(parseGrams('0'), 0);
  assert.equal(parseGrams('0', 1), null);
  assert.equal(parseGrams('12.5'), null);
  assert.equal(parseGrams(''), null);
  assert.equal(parseGrams('abc'), null);
  assert.equal(parseGrams('20001'), null);
});

test('parseReceipt: граммы — целые, цена за весь приход в рублях — по желанию', () => {
  assert.deepEqual(parseReceipt('250', ''), { grams: 250 });
  assert.deepEqual(parseReceipt('400', '3100'), { grams: 400, priceKop: 310000 });
  assert.deepEqual(parseReceipt('400', '3 100,50'), { grams: 400, priceKop: 310050 });
  assert.equal(parseReceipt('0', ''), null);
  assert.equal(parseReceipt('', '100'), null);
  // Цену вписали, но непонятно — не молчим, а не даём добавить.
  assert.equal(parseReceipt('250', 'дорого'), null);
  assert.equal(parseReceipt('250', '-5'), null);
});

test('defaultReceiptGrams: типичная фасовка бренда, как на backend', () => {
  assert.equal(defaultReceiptGrams('DARKSIDE'), 250);
  assert.equal(defaultReceiptGrams('Starline'), 250);
  assert.equal(defaultReceiptGrams('Black Burn'), 200);
});

test('тост «Закончился»: гости, скрытые миксы и заказ', () => {
  assert.equal(
    emptyToastText(row({ status: 'out', leftGrams: 0, mixCount: 3, keepStocked: true })),
    'Закончился, гости его не видят. Скрыто миксов: 3, табак добавлен в заказ.',
  );
  assert.equal(emptyToastText(row({ status: 'out', leftGrams: 0, mixCount: 3, keepStocked: false })), 'Закончился, гости его не видят. Скрыто миксов: 3.');
  assert.equal(emptyToastText(row({ status: 'out', leftGrams: 0, mixCount: 0, keepStocked: true })), 'Закончился, гости его не видят. Табак добавлен в заказ.');
  assert.equal(emptyToastText(row({ status: 'out', leftGrams: 0, mixCount: 0, keepStocked: false })), 'Закончился, гости его не видят.');
});

test('тосты отметки: доля с граммами или точные граммы', () => {
  assert.equal(countToastText({ grams: 300, fraction: 0.75 }), 'Осталось 300 г (¾).');
  assert.equal(countToastText({ grams: 180, fraction: null }), 'Осталось 180 г.');
  assert.equal(
    countOverToastText({ grams: 700, fraction: null }, 600),
    'Осталось 700 г, по расчёту было 600 г. Отметка сохранена, этот отрезок в расход не идёт.',
  );
});

test('тосты списания и прихода', () => {
  assert.equal(writeOffToastText(50, 'отсырел', row({ leftGrams: 250 })), 'Списано 50 г (отсырел). Осталось 250 г.');
  assert.equal(
    writeOffToastText(55, 'отсырел', row({ status: 'out', leftGrams: 0 })),
    'Списано 55 г (отсырел). Остатка нет, гости табак не видят.',
  );
  assert.equal(receiptToastText(250, row({ leftGrams: 290 })), 'Приход +250 г. Сейчас 290 г.');
});

test('summarizeShelf пересчитывает счётчики и килограммы по строкам', () => {
  const summary = summarizeShelf([
    row({ status: 'ok', leftGrams: 300 }),
    row({ status: 'check', leftGrams: 18 }),
    row({ status: 'ending', leftGrams: 40 }),
    row({ status: 'out', leftGrams: 0 }),
    row({ status: 'plan', leftGrams: null, fullGrams: null }),
  ]);
  assert.deepEqual(summary.counters, { all: 5, ok: 1, ending: 1, check: 1, out: 1, stop: 0, plan: 1 });
  assert.equal(summary.totals.kg, 0.358);
});

test('resolveShelfShortcut: клавиши полки по коду клавиши, мимо полей ввода', () => {
  assert.deepEqual(resolveShelfShortcut({ key: '/', code: 'Slash' }), { type: 'search' });
  assert.deepEqual(resolveShelfShortcut({ key: 'ArrowDown', code: 'ArrowDown' }), { type: 'move', delta: 1 });
  assert.deepEqual(resolveShelfShortcut({ key: 'ArrowUp', code: 'ArrowUp' }), { type: 'move', delta: -1 });
  assert.deepEqual(resolveShelfShortcut({ key: 'Enter', code: 'Enter' }), { type: 'open' });
  assert.deepEqual(resolveShelfShortcut({ key: 'у', code: 'KeyE' }), { type: 'empty' });
  assert.deepEqual(resolveShelfShortcut({ key: 'щ', code: 'KeyO' }), { type: 'left' });
  assert.deepEqual(resolveShelfShortcut({ key: '1', code: 'Digit1' }), { type: 'mark', fraction: 0.75 });
  assert.deepEqual(resolveShelfShortcut({ key: '3', code: 'Digit3' }), { type: 'mark', fraction: 1 / 3 });
  assert.deepEqual(resolveShelfShortcut({ key: 'я', code: 'KeyZ' }), { type: 'undo' });
  // Выбор нескольких (#333): X — строка в выделение, Esc — снять выделение.
  assert.deepEqual(resolveShelfShortcut({ key: 'ч', code: 'KeyX' }), { type: 'select' });
  assert.deepEqual(resolveShelfShortcut({ key: 'Escape', code: 'Escape' }), { type: 'clear' });
  assert.equal(resolveShelfShortcut({ key: 'Escape', code: 'Escape', inField: true }), null);
  assert.equal(resolveShelfShortcut({ key: 'e', code: 'KeyE', inField: true }), null);
  assert.equal(resolveShelfShortcut({ key: 'e', code: 'KeyE', modifier: true }), null);
  assert.equal(resolveShelfShortcut({ key: 'q', code: 'KeyQ' }), null);
});

test('describeShelfError: ответ сервера как есть, обрыв сети — понятным текстом', () => {
  assert.equal(describeShelfError(Object.assign(new Error('Табак уже закончился'), { status: 409 })), 'Табак уже закончился');
  assert.equal(describeShelfError(new TypeError('Failed to fetch')), 'Нет связи с сервером, изменение не сохранено. Попробуйте ещё раз.');
});

test('shelfRowMenu: что можно сделать со строкой', () => {
  assert.deepEqual(shelfRowMenu(row()), { canEmpty: true, canMark: true, canWriteOff: true, stopLabel: 'Стоп для гостей' });
  assert.deepEqual(shelfRowMenu(row({ status: 'check' })), { canEmpty: true, canMark: true, canWriteOff: true, stopLabel: 'Стоп для гостей' });
  for (const status of ['out', 'plan'] as const) {
    const menu = shelfRowMenu(row({ status, leftGrams: status === 'out' ? 0 : null }));
    assert.deepEqual([menu.canEmpty, menu.canMark, menu.canWriteOff], [false, false, false]);
  }
  assert.equal(shelfRowMenu(row({ status: 'stop', stopped: true })).stopLabel, 'Снять стоп для гостей');
});

const card = normalizeShelfCard({
  item: {
    tobacco: { id: 't1', manufacturer: 'Black Burn', name: 'Raspberries' },
    history: [
      { id: 'e5', kind: 'count', grams: 330, fraction: null, at: '2026-11-17T10:00:00', actorLogin: 'maxim', usage: { from: '2026-11-12T10:00:00', gramsPerDay: 14 } },
      { id: 'e4', kind: 'receipt', grams: 400, at: '2026-11-12T10:00:00', priceKop: 310000, delivery: { id: 'd1', kind: 'invoice', number: '03944', supplier: 'Каспий Опт' } },
      { id: 'e3', kind: 'count', grams: 0, at: '2026-11-11T10:00:00', actorLogin: 'maxim', usage: { from: '2026-10-29T10:00:00', gramsPerDay: 15.4 } },
      { id: 'e2', kind: 'count', grams: 200, fraction: 0.5, at: '2026-10-29T10:00:00', actorLogin: 'aleksei', usage: { from: '2026-10-15T10:00:00', gramsPerDay: 14.29 } },
      { id: 'e1', kind: 'receipt', grams: 400, at: '2026-10-15T10:00:00', priceKop: 300000, delivery: { id: 'd0', kind: 'start', number: null, supplier: null } },
      { id: 'e0', kind: 'writeoff', grams: 50, at: '2026-10-14T10:00:00', reason: 'отсырел', actorLogin: 'maxim' },
      { id: 'e6', kind: 'receipt', grams: 250, at: '2026-10-01T10:00:00', actorLogin: 'maxim' },
      { id: 'e7', kind: 'count', grams: 700, at: '2026-09-20T10:00:00', actorLogin: 'maxim', excluded: true },
    ],
  },
});

test('historyEntry: дата отдельно, граммы со знаком и строка через запятую', () => {
  const [count, invoice, empty, half, start, writeoff, manual, over] = card.history.map((entry) => historyEntry(entry));
  assert.deepEqual(count, {
    date: '17 ноя',
    grams: '330 г',
    tone: 'count',
    title: 'Осталось 330 г',
    line: 'точно в граммах, maxim, расход с 12 ноя: 14 г/день',
    deletable: true,
  });
  assert.deepEqual(invoice, {
    date: '12 ноя',
    grams: '+400 г',
    tone: 'plus',
    title: 'Приход',
    line: 'Каспий Опт, счёт № 03944, 3 100 ₽, 7,75 ₽/г',
    deletable: false,
  });
  assert.deepEqual(empty, { date: '11 ноя', grams: '0 г', tone: 'zero', title: 'Закончился', line: 'maxim, расход с 29 окт: 15,4 г/день', deletable: true });
  assert.deepEqual(half, {
    date: '29 окт',
    grams: '200 г',
    tone: 'count',
    title: 'Осталось ½',
    line: '½ от 400 г, aleksei, расход с 15 окт: 14,3 г/день',
    deletable: true,
  });
  assert.equal(start.line, 'Стартовый приход, 3 000 ₽, 7,50 ₽/г');
  assert.equal(start.deletable, false);
  assert.deepEqual(writeoff, { date: '14 окт', grams: '−50 г', tone: 'minus', title: 'Списание', line: 'отсырел, maxim', deletable: true });
  assert.deepEqual(manual, { date: '1 окт', grams: '+250 г', tone: 'plus', title: 'Приход', line: 'без счёта, maxim', deletable: true });
  assert.equal(over.line, 'точно в граммах, maxim, в расход не пошло');
  for (const line of [count, invoice, empty, half, start, writeoff, manual, over]) assert.doesNotMatch(line.line, /[·—≈]/);
});

test('countedMarks: отметки, давшие расход за 60 дней', () => {
  assert.equal(countedMarks(card.history, NOW), 3);
  assert.equal(countedMarks(card.history, new Date('2027-02-01T00:00:00')), 0);
});

test('weekLabel: неделя с понедельника, последняя — до сегодня', () => {
  assert.equal(weekLabel({ from: '2026-10-19T00:00:00', to: '2026-10-26T00:00:00', partial: false }), '19–25 окт');
  assert.equal(weekLabel({ from: '2026-10-26T00:00:00', to: '2026-11-02T00:00:00', partial: false }), '26 окт–1 ноя');
  assert.equal(weekLabel({ from: '2026-11-16T00:00:00', to: '2026-11-19T15:00:00', partial: true }), '16–19 ноя');
});

// Уровень после прихода уже под полосой остатка в карточке — здесь только, откуда цифра.
test('remainHint: «указал мастер сегодня» или «прогноз»', () => {
  assert.equal(remainHint(row(), NOW), 'прогноз');
  // Отметка была раньше — дальше остаток по расходу, это прогноз.
  assert.equal(remainHint(row({ lastCount: { at: '2026-11-17T10:00:00', grams: 330, fraction: null } }), NOW), 'прогноз');
  assert.equal(
    remainHint(row({ leftSource: 'mark', leftGrams: 40, lastCount: { at: '2026-11-19T12:00:00', grams: 40, fraction: null } }), NOW),
    'указал мастер сегодня',
  );
  assert.equal(
    remainHint(row({ status: 'out', leftSource: 'mark', leftGrams: 0, lastCount: { at: '2026-11-17T10:00:00', grams: 0, fraction: null } }), NOW),
    'закончился 17 ноя',
  );
  // Обнулило списание — отметки нет, но цифра точная.
  assert.equal(remainHint(row({ status: 'out', leftSource: 'mark', leftGrams: 0 }), NOW), 'указал мастер');
  assert.equal(remainHint(row({ leftGrams: null, fullGrams: null, lastReceipt: null, leftSource: null }), NOW), 'прихода не было');
});

test('formatMonthGrams: расход в месяц до десятков граммов, малый — до грамма', () => {
  assert.equal(formatMonthGrams(441), '440');
  assert.equal(formatMonthGrams(297), '300');
  assert.equal(formatMonthGrams(6.3), '6');
  assert.equal(formatMonthGrams(1234).replace(/\u00a0/g, ' '), '1 230');
});

test('shelfMonthRate: колонка «Расход» — г/мес, по бренду с подписью, без данных — «мало данных»', () => {
  assert.deepEqual(shelfMonthRate(row({ monthGrams: 630 })), { value: '630 г/мес', hint: null, faint: false });
  assert.deepEqual(shelfMonthRate(row({ monthGrams: 297, rateKind: 'brand' })), { value: '300 г/мес', hint: 'по бренду', faint: false });
  assert.deepEqual(shelfMonthRate(row({ monthGrams: null, rate: null, rateKind: 'none' })), { value: 'мало данных', hint: null, faint: true });
});

test('cardRateHint: г/день под расходом в месяц и откуда он', () => {
  assert.equal(cardRateHint(row({ rate: 14.7 }), 3), '14,7 г/день по 3 отметкам за 60 дней');
  assert.equal(cardRateHint(row({ rate: 14.7 }), 1), '14,7 г/день по 1 отметке за 60 дней');
  assert.equal(cardRateHint(row({ rate: 21 }), 0), '21 г/день по отметкам остатка');
  assert.equal(cardRateHint(row({ rate: 10, rateKind: 'brand' }), 0), '10 г/день по бренду');
  // «мало данных» уже в значении — подписи нет.
  assert.equal(cardRateHint(row({ rate: null, rateKind: 'none', monthGrams: null }), 0), null);
});



test('trialArrival: первый приход пробы — самый старый в истории (#329)', () => {
  assert.equal(trialArrival(card.history), 'пришёл впервые 1 окт, 250 г');
  assert.equal(trialArrival(card.history.filter((entry) => entry.kind !== 'receipt')), null);
  assert.equal(trialArrival([]), null);
});
