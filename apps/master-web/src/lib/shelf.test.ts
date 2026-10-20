import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShelfCard, normalizeShelfRow, type ShelfRow } from '../contracts';
import {
  EMPTY_SHELF_FILTERS,
  buildShelfFilterOptions,
  countActiveShelfFilters,
  describeShelfError,
  emptyToastText,
  filterShelfRows,
  formatBowlCost,
  formatGramPrice,
  formatGrams,
  formatRate,
  formatShelfDate,
  matchShelfStatus,
  packLine,
  packTitle,
  pickWriteOffPack,
  resolveShelfShortcut,
  shelfPips,
  shelfStatusLine,
  shelfUntil,
  sortShelfRows,
  summarizeShelf,
} from './shelf';

const row = (patch: Partial<ShelfRow> & { name?: string; brand?: string; profiles?: string[]; strength?: string | null } = {}): ShelfRow => {
  const { name = 'Raspberries', brand = 'Black Burn', profiles = ['berry'], strength = 'Средняя', ...rest } = patch;
  return {
    ...normalizeShelfRow({
      tobacco: { id: `${brand}-${name}`, manufacturer: brand, name, flavorProfiles: profiles, officialStrength: strength },
      status: 'ok',
      openPacks: [{ id: 'p1', weight: 200, openedAt: '2026-11-14T10:00:00.000Z', fraction: 0.5 }],
      sealedCount: 1,
      rate: 10,
      rateKind: 'own',
      daysLeft: 20,
      endsAt: '2026-12-09T10:00:00.000Z',
      packWeight: 200,
    }),
    ...rest,
  };
};

test('matchShelfStatus: «Есть» включает и «проверьте остаток», «Последняя банка» — по флагу', () => {
  assert.equal(matchShelfStatus(row(), 'all'), true);
  assert.equal(matchShelfStatus(row({ status: 'check' }), 'ok'), true);
  assert.equal(matchShelfStatus(row({ status: 'ending' }), 'ok'), false);
  assert.equal(matchShelfStatus(row({ status: 'ending', last: true }), 'last'), true);
  assert.equal(matchShelfStatus(row({ status: 'ok' }), 'last'), false);
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

test('sortShelfRows «Хватит до»: сначала закончившиеся и просроченные, потом по дням, в плане — в конце', () => {
  const rows = [
    row({ name: 'later', daysLeft: 30 }),
    row({ name: 'plan', status: 'plan', daysLeft: null }),
    row({ name: 'soon', daysLeft: 2 }),
    row({ name: 'out', status: 'out', daysLeft: 0 }),
    row({ name: 'nodata', daysLeft: null, rateKind: 'none' }),
    row({ name: 'check', status: 'check', daysLeft: 25 }),
  ];
  assert.deepEqual(sortShelfRows(rows, 'until').map((item) => item.tobacco.name), ['out', 'check', 'soon', 'later', 'nodata', 'plan']);
});

test('sortShelfRows: по расходу, по названию и по приходу', () => {
  const receipt = (receivedAt: string) => ({ receivedAt, kind: 'invoice' as const, number: null, label: 'X' });
  const rows = [
    row({ name: 'b', brand: 'Б', rate: 5, lastReceipt: receipt('2026-11-01T00:00:00.000Z') }),
    row({ name: 'a', brand: 'А', rate: null, lastReceipt: null }),
    row({ name: 'c', brand: 'А', rate: 21, lastReceipt: receipt('2026-11-12T00:00:00.000Z') }),
  ];
  assert.deepEqual(sortShelfRows(rows, 'rate').map((item) => item.tobacco.name), ['c', 'b', 'a']);
  assert.deepEqual(sortShelfRows(rows, 'name').map((item) => item.tobacco.name), ['a', 'c', 'b']);
  assert.deepEqual(sortShelfRows(rows, 'arrived').map((item) => item.tobacco.name), ['c', 'b', 'a']);
});

test('shelfStatusLine: текст статуса под датой', () => {
  assert.deepEqual(shelfStatusLine(row({ status: 'out' })), { tone: 'danger', text: 'закончился' });
  assert.deepEqual(shelfStatusLine(row({ status: 'ending', last: true })), { tone: 'warning', text: 'заканчивается · последняя банка' });
  assert.deepEqual(shelfStatusLine(row({ status: 'ending' })), { tone: 'warning', text: 'заканчивается' });
  assert.deepEqual(shelfStatusLine(row({ status: 'check' })), { tone: 'warning', text: 'проверьте остаток' });
  assert.deepEqual(shelfStatusLine(row({ status: 'ok', last: true })), { tone: 'muted', text: 'последняя банка' });
  assert.deepEqual(shelfStatusLine(row({ status: 'stop', stopNote: 'до декабря' })), { tone: 'faint', text: 'стоп для гостей · до декабря' });
  assert.deepEqual(shelfStatusLine(row({ status: 'stop' })), { tone: 'faint', text: 'стоп для гостей' });
  assert.deepEqual(shelfStatusLine(row({ status: 'plan' })), { tone: 'faint', text: 'в плане' });
  assert.equal(shelfStatusLine(row()), null);
});

test('shelfUntil: дата и дни с тоном по сроку поставки', () => {
  assert.deepEqual(shelfUntil(row({ daysLeft: 22.4, endsAt: '2026-12-11T10:00:00.000Z' }), 7), { text: '11 дек', days: '22 дн', tone: 'default' });
  assert.deepEqual(shelfUntil(row({ daysLeft: 6, endsAt: '2026-11-25T10:00:00.000Z' }), 7), { text: '25 ноя', days: '6 дн', tone: 'warning' });
  assert.deepEqual(shelfUntil(row({ daysLeft: 2.2, endsAt: '2026-11-21T10:00:00.000Z' }), 7), { text: '21 ноя', days: '2 дн', tone: 'danger' });
  assert.deepEqual(shelfUntil(row({ rateKind: 'brand', daysLeft: 16, endsAt: '2026-12-05T10:00:00.000Z' }), 7), { text: '~5 дек', days: '16 дн', tone: 'default' });
  assert.deepEqual(shelfUntil(row({ status: 'check', overdue: true }), 7), { text: 'должна была закончиться', days: null, tone: 'warning' });
  assert.deepEqual(shelfUntil(row({ status: 'out', daysLeft: 0 }), 7), { text: 'нет банок', days: null, tone: 'danger' });
  assert.deepEqual(shelfUntil(row({ daysLeft: null, endsAt: null, rateKind: 'none' }), 7), { text: '—', days: null, tone: 'faint' });
  // В плане банок ещё не было: оценка по бренду даёт «0 дней», но прогноза нет.
  assert.deepEqual(shelfUntil(row({ status: 'plan', rateKind: 'brand', daysLeft: 0, endsAt: '2026-10-20T10:00:00.000Z' }), 7), { text: '—', days: null, tone: 'faint' });
});

test('shelfPips: открытые с заливкой, запасные сплошные, подпись «1 + 2»', () => {
  assert.deepEqual(shelfPips(row({ sealedCount: 2 })), { open: [{ id: 'p1', fill: 0.5, tone: 'normal' }], sealed: 2, label: '1 + 2' });
  assert.deepEqual(
    shelfPips(row({ sealedCount: 0, openPacks: [{ id: 'p1', weight: 200, openedAt: '', fraction: 0.2 }] })).open,
    [{ id: 'p1', fill: 0.2, tone: 'low' }],
  );
  assert.equal(
    shelfPips(row({ status: 'ending', daysLeft: 2, sealedCount: 0, openPacks: [{ id: 'p1', weight: 200, openedAt: '', fraction: 0.6 }] })).open[0].tone,
    'crit',
  );
  assert.deepEqual(shelfPips(row({ openPacks: [], sealedCount: 0 })), { open: [], sealed: 0, label: 'нет' });
  assert.equal(shelfPips(row({ openPacks: [], sealedCount: 1 })).label, '0 + 1');
});

test('форматирование граммов, расхода, дат и денег', () => {
  assert.equal(formatGrams(289.6), '≈ 290 г');
  assert.equal(formatGrams(1250), '≈ 1 250 г');
  assert.equal(formatGrams(0), '—');
  assert.equal(formatRate(row({ rate: 13.2 })), '13 г/день');
  assert.equal(formatRate(row({ rate: 8.46 })), '8,5 г/день');
  assert.equal(formatRate(row({ rate: 10, rateKind: 'brand' })), '≈ 10 г/день · бренд');
  assert.equal(formatRate(row({ rate: null, rateKind: 'none' })), 'мало данных');
  assert.equal(formatShelfDate('2026-05-03T10:00:00.000Z'), '3 мая');
  assert.equal(formatShelfDate(''), '—');
  assert.equal(formatGramPrice(775), '7,75 ₽');
  assert.equal(formatGramPrice(null), '—');
  assert.equal(formatBowlCost(13950, 18), '≈ 140 ₽ на чашу 18 г');
  assert.equal(formatBowlCost(null, 18), null);
});

test('emptyToastText: табак закончился или вскрыта следующая банка', () => {
  const before = row({ sealedCount: 0, mixCount: 3 });
  const out = row({ status: 'out', openPacks: [], sealedCount: 0, mixCount: 3 });
  assert.equal(emptyToastText(before, out), 'табак закончился, гости его больше не видят. Миксов скрыто: 3.');
  assert.equal(
    emptyToastText(row({ sealedCount: 0, mixCount: 0 }), row({ status: 'out', openPacks: [], sealedCount: 0, mixCount: 0 })),
    'табак закончился, гости его больше не видят.',
  );
  assert.equal(emptyToastText(row({ sealedCount: 2 }), row({ sealedCount: 1 })), 'банка пустая, следующая вскрыта. В запасе: 1.');
});

test('summarizeShelf пересчитывает счётчики и итоги по строкам', () => {
  const summary = summarizeShelf([
    row({ status: 'ok', remainingGrams: 300 }),
    row({ status: 'check', remainingGrams: 200 }),
    row({ status: 'ending', last: true, sealedCount: 0, remainingGrams: 40 }),
    row({ status: 'out', openPacks: [], sealedCount: 0, remainingGrams: 0 }),
    row({ status: 'plan', openPacks: [], sealedCount: 0, remainingGrams: 0 }),
  ]);
  assert.deepEqual(summary.counters, { all: 5, ok: 2, last: 1, ending: 1, out: 1, stop: 0, plan: 1 });
  assert.equal(summary.totals.packs, 5);
  assert.equal(summary.totals.kg, 0.54);
});

test('resolveShelfShortcut: клавиши полки по коду клавиши, мимо полей ввода', () => {
  assert.deepEqual(resolveShelfShortcut({ key: '/', code: 'Slash' }), { type: 'search' });
  assert.deepEqual(resolveShelfShortcut({ key: 'ArrowDown', code: 'ArrowDown' }), { type: 'move', delta: 1 });
  assert.deepEqual(resolveShelfShortcut({ key: 'ArrowUp', code: 'ArrowUp' }), { type: 'move', delta: -1 });
  assert.deepEqual(resolveShelfShortcut({ key: 'Enter', code: 'Enter' }), { type: 'open' });
  assert.deepEqual(resolveShelfShortcut({ key: 'у', code: 'KeyE' }), { type: 'empty' });
  assert.deepEqual(resolveShelfShortcut({ key: '2', code: 'Digit2' }), { type: 'mark', fraction: 0.5 });
  assert.deepEqual(resolveShelfShortcut({ key: '3', code: 'Digit3' }), { type: 'mark', fraction: 1 / 3 });
  assert.deepEqual(resolveShelfShortcut({ key: 'я', code: 'KeyZ' }), { type: 'undo' });
  assert.equal(resolveShelfShortcut({ key: 'e', code: 'KeyE', inField: true }), null);
  assert.equal(resolveShelfShortcut({ key: 'e', code: 'KeyE', modifier: true }), null);
  assert.equal(resolveShelfShortcut({ key: 'q', code: 'KeyQ' }), null);
});

test('describeShelfError: ответ сервера как есть, обрыв сети — понятным текстом', () => {
  assert.equal(describeShelfError(Object.assign(new Error('У табака нет открытой банки'), { status: 409 })), 'У табака нет открытой банки');
  assert.equal(describeShelfError(new TypeError('Failed to fetch')), 'Нет связи с сервером — изменение не сохранено. Повторить позже.');
});

const card = normalizeShelfCard({
  item: {
    tobacco: { id: 't1', manufacturer: 'Black Burn', name: 'Raspberries' },
    packs: [
      { id: 'p2', state: 'empty', weight: 200, receivedAt: '2026-10-15T10:00:00.000Z', openedAt: '2026-10-15T10:00:00.000Z', emptiedAt: '2026-10-29T10:00:00.000Z', delivery: { id: 'd0', kind: 'start' }, marks: [], usage: { days: 14, gramsPerDay: 14.29 } },
      { id: 'p3', state: 'written_off', weight: 200, receivedAt: '2026-10-29T10:00:00.000Z', writtenOffAt: '2026-11-01T10:00:00.000Z', writeOffReason: 'брак', marks: [] },
      { id: 'p4', state: 'open', weight: 200, receivedAt: '2026-11-12T10:00:00.000Z', openedAt: '2026-11-14T10:00:00.000Z', marks: [{ at: '2026-11-17T10:00:00.000Z', fraction: 0.5 }] },
      { id: 'p5', state: 'sealed', weight: 200, priceKop: 155000, receivedAt: '2026-11-12T10:00:00.000Z', delivery: { id: 'd1', kind: 'invoice', number: '03944', supplier: 'Каспий Опт' }, marks: [] },
    ],
  },
});

test('pickWriteOffPack: открытая банка, иначе самая старая в запасе', () => {
  assert.equal(pickWriteOffPack(card)?.id, 'p4');
  const sealedOnly = { ...card, packs: card.packs.filter((pack) => pack.state !== 'open') };
  assert.equal(pickWriteOffPack(sealedOnly)?.id, 'p5');
  assert.equal(pickWriteOffPack({ ...card, packs: [] }), null);
});

test('packTitle и packLine описывают историю банки', () => {
  assert.equal(packTitle(card.packs[3], 4), 'В запасе · банка 4');
  assert.equal(packLine(card.packs[3]), 'пришла 12 ноя · Каспий Опт · счёт № 03944 · 1 550 ₽');
  assert.equal(packTitle(card.packs[2], 3), 'В работе · банка 3');
  assert.equal(packLine(card.packs[2]), 'пришла 12 ноя · вскрыта 14 ноя · отметка ½ 17 ноя');
  assert.equal(packTitle(card.packs[0], 1), 'Пустая · банка 1');
  assert.equal(packLine(card.packs[0]), 'Стартовый приход · 15 окт → 29 окт · 14 дн · 14,3 г/день');
  assert.equal(packTitle(card.packs[1], 2), 'Списана · банка 2');
  assert.equal(packLine(card.packs[1]), 'пришла 29 окт · списана 1 ноя · брак');
});
