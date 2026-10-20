import test from 'node:test';
import assert from 'node:assert/strict';
import {
  customDescription,
  favoriteKey,
  groupHistory,
  heartLabel,
  isFavorite,
  missingTobacco,
  rowMark,
  rowNote,
  rowOpens,
  smokeBlockReason,
  withFavorite,
  withOwnRating,
  withoutFavorite,
  type GuestCabinetCard,
  type GuestCabinetItem,
  type GuestFavoriteItem,
  type GuestHistoryItem,
} from './cabinet';

// Даты — в локальном времени устройства: «Сегодня» считается по часам гостя.
const local = (year: number, month: number, day: number, hour = 12) => new Date(year, month - 1, day, hour).toISOString();
const NOW = new Date(2026, 9, 20, 21, 30);

const catalogCard: GuestCabinetCard = {
  description: 'Черника и холодок.',
  flavors: ['черника'],
  components: [{ tobaccoId: 't1', manufacturer: 'DARKSIDE', name: 'Wildberry', proportion: 100 }],
  harmony: null,
  madeAt: null,
};

const customCard: GuestCabinetCard = {
  description: '',
  flavors: [],
  components: [
    { tobaccoId: 't1', manufacturer: 'DARKSIDE', name: 'Wildberry', proportion: 55 },
    { tobaccoId: 't2', manufacturer: 'Black Burn', name: 'Cherry Shock', proportion: 45 },
  ],
  harmony: 78,
  madeAt: local(2026, 10, 11),
};

const catalogItem = (mixId: string, extra: Partial<GuestCabinetItem> = {}): GuestCabinetItem => ({
  ref: { kind: 'catalog', mixId },
  name: `Микс ${mixId}`,
  flavorProfiles: ['berry'],
  status: { kind: 'available' },
  ownRating: null,
  card: catalogCard,
  ...extra,
});

const customItem = (eventId: string, extra: Partial<GuestCabinetItem> = {}): GuestCabinetItem => ({
  ref: { kind: 'custom', eventId },
  name: 'Ягодный лёд по-своему',
  flavorProfiles: ['berry', 'fresh'],
  status: { kind: 'available' },
  ownRating: null,
  card: customCard,
  ...extra,
});

const historyItem = (id: string, at: string, item: GuestCabinetItem = catalogItem(id)): GuestHistoryItem => ({
  ...item,
  id,
  at,
});

test('история группируется по дням, сегодняшний день — «Сегодня»', () => {
  const items = [
    historyItem('a', local(2026, 10, 20, 20)),
    historyItem('b', local(2026, 10, 20, 9)),
    historyItem('c', local(2026, 10, 17)),
    historyItem('d', local(2026, 9, 27)),
  ];

  const groups = groupHistory(items, NOW);

  assert.deepEqual(
    groups.map((group) => [group.label, group.items.map((item) => item.id)]),
    [
      ['Сегодня', ['a', 'b']],
      ['17 октября', ['c']],
      ['27 сентября', ['d']],
    ],
  );
});

test('день прошлого года подписан с годом', () => {
  const [group] = groupHistory([historyItem('a', local(2025, 12, 31))], NOW);
  assert.equal(group.label, '31 декабря 2025');
});

test('полночь по местному времени начинает новый день', () => {
  const groups = groupHistory(
    [historyItem('a', new Date(2026, 9, 20, 0, 5).toISOString()), historyItem('b', new Date(2026, 9, 19, 23, 55).toISOString())],
    NOW,
  );
  assert.deepEqual(groups.map((group) => group.label), ['Сегодня', '19 октября']);
});

test('строка: собранный микс помечен «Собран вами»', () => {
  assert.equal(rowMark(customItem('e1')), 'Собран вами');
  assert.equal(rowMark(catalogItem('m1')), null);
});

test('строка: подпись по статусу', () => {
  assert.equal(rowNote(catalogItem('m1')), null);
  assert.equal(rowNote(catalogItem('m1', { status: { kind: 'deleted' }, card: null })), 'Больше не готовим');
  assert.equal(
    rowNote(catalogItem('m1', { status: { kind: 'unavailable', missing: 'Oven Black Currant' } })),
    'Сейчас нет: Oven Black Currant',
  );
});

test('строка удалённого или скрытого микса не открывается, остальные открываются', () => {
  assert.equal(rowOpens(catalogItem('m1')), true);
  assert.equal(rowOpens(catalogItem('m1', { status: { kind: 'unavailable', missing: 'Oven Black Currant' } })), true);
  assert.equal(rowOpens(customItem('e1', { status: { kind: 'unavailable', missing: 'Black Burn Cherry Shock' } })), true);
  assert.equal(rowOpens(catalogItem('m1', { status: { kind: 'deleted' }, card: null })), false);
  assert.equal(rowOpens(catalogItem('m1', { ref: { kind: 'catalog', mixId: null }, status: { kind: 'deleted' }, card: null })), false);
});

test('карточка: нет табака — «Покурить» неактивна и причина названа', () => {
  assert.equal(smokeBlockReason({ kind: 'available' }), null);
  assert.equal(
    smokeBlockReason({ kind: 'unavailable', missing: 'Oven Black Currant' }),
    'Сейчас нет: Oven Black Currant. Покурить этот микс сегодня не получится.',
  );
});

test('карточка собранного микса: дата и вердикт гармонии, как в «Намиксуй»', () => {
  assert.equal(
    customDescription(customCard, NOW),
    'Собран вами в «Намиксуй» 11 октября. Вердикт гармонии — «Классическое сочетание».',
  );
  assert.equal(customDescription({ ...customCard, harmony: null }, NOW), 'Собран вами в «Намиксуй» 11 октября.');
});

test('409 на собранном миксе называет табак «бренд табак»', () => {
  assert.equal(missingTobacco(customCard, 't2'), 'Black Burn Cherry Shock');
  assert.equal(missingTobacco(customCard, 'unknown'), null);
  assert.equal(missingTobacco(customCard, null), null);
});

test('сердечко: ключ избранного у каталожного и собранного микса', () => {
  assert.equal(favoriteKey({ kind: 'catalog', mixId: 'm1' }), 'mix:m1');
  assert.equal(favoriteKey({ kind: 'custom', eventId: 'e1' }), 'custom:e1');
  assert.equal(favoriteKey({ kind: 'catalog', mixId: null }), null);
});

test('сердечко: состояние берётся из загруженного избранного', () => {
  const favorites: GuestFavoriteItem[] = [{ ...catalogItem('m1'), id: 'f1', addedAt: local(2026, 10, 1) }];

  assert.equal(isFavorite(favorites, { kind: 'catalog', mixId: 'm1' }), true);
  assert.equal(isFavorite(favorites, { kind: 'catalog', mixId: 'm2' }), false);
  assert.equal(isFavorite(favorites, { kind: 'custom', eventId: 'm1' }), false);
  assert.equal(isFavorite(null, { kind: 'catalog', mixId: 'm1' }), false);
  assert.equal(heartLabel(true), 'Убрать из избранного');
  assert.equal(heartLabel(false), 'В избранное');
});

test('сердечко: добавление ставит микс первым и не дублирует, снятие убирает', () => {
  const first: GuestFavoriteItem = { ...catalogItem('m1'), id: 'f1', addedAt: local(2026, 10, 1) };
  const added = withFavorite([first], historyItem('e1', local(2026, 10, 11), customItem('e1')), NOW);

  assert.deepEqual(added.map((item) => favoriteKey(item.ref)), ['custom:e1', 'mix:m1']);
  assert.equal(added[0].addedAt, NOW.toISOString());
  assert.equal(withFavorite(added, catalogItem('m1'), NOW), added);

  const removed = withoutFavorite(added, { kind: 'catalog', mixId: 'm1' });
  assert.deepEqual(removed.map((item) => favoriteKey(item.ref)), ['custom:e1']);
});

test('оценка из карточки обновляет «★ N» во всех строках этого микса', () => {
  const items = [historyItem('a', local(2026, 10, 20)), historyItem('b', local(2026, 10, 19), catalogItem('m2'))];
  const rated = withOwnRating(items, 'a', 4);

  assert.deepEqual(rated.map((item) => item.ownRating), [4, null]);
  assert.equal(rated[1], items[1]);
});
