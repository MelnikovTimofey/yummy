import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDeliveryCard, type DeliveryCard, type DeliveryLine, type DeliveryListItem } from '../contracts';
import {
  CONFIDENT_MATCH,
  acceptBarSummary,
  acceptLabel,
  acceptedToast,
  deliveryHeadline,
  deliveryListCard,
  deliveryPhoneHead,
  deliveryStatusTag,
  deliveryTitle,
  formatDay,
  formatFullDate,
  formatMoney,
  formatPrice,
  fromPlan,
  guessTobaccoFromLine,
  lineMatch,
  lineQty,
  lineMatchHint,
  localDateInput,
  monthMeta,
  parseRubles,
  readUploadError,
  receivedAtFromInput,
  parseSummary,
  summarizeLines,
  tobaccosToReceive,
  sumCheck,
} from './deliveries';

// Intl ставит неразрывный пробел между разрядами — в ожиданиях пишем обычный.
const plain = <T,>(value: T): T => JSON.parse(JSON.stringify(value).replace(/\u00a0|\u202f/g, ' '));

const line = (patch: Partial<DeliveryLine> = {}): DeliveryLine => ({
  id: 'l1',
  n: 1,
  rawName: 'Табак для кальяна Black Burn 200г Raspberries',
  article: null,
  qty: 1,
  unit: 'шт',
  priceKop: 155000,
  sumKop: 155000,
  grams: 200,
  kind: 'tobacco',
  arrived: true,
  tobacco: { id: 't1', manufacturer: 'Black Burn', lineName: '', name: 'Raspberries', shelfStatus: 'active' },
  matchReason: 'memory',
  confidence: 100,
  candidates: [],
  newOnShelf: false,
  ...patch,
});

const card = (patch: Partial<DeliveryCard> = {}): DeliveryCard => ({
  ...normalizeDeliveryCard({ id: 'd1', kind: 'invoice', status: 'draft', createdAt: '2026-11-18T09:00:00.000Z' }),
  ...patch,
});

test('lineMatch различает память, предложение, ручной выбор, «не найдено» и «не табак»', () => {
  assert.equal(lineMatch(line()), 'memory');
  // Уверенное совпадение с каталогом (от CONFIDENT_MATCH) не требует проверки, слабее — «проверьте».
  assert.equal(lineMatch(line({ matchReason: 'catalog', confidence: CONFIDENT_MATCH })), 'catalog');
  assert.equal(lineMatch(line({ matchReason: 'catalog', confidence: 64 })), 'suggest');
  assert.equal(lineMatch(line({ matchReason: 'catalog', confidence: null })), 'suggest');
  assert.equal(lineMatch(line({ matchReason: 'manual' })), 'manual');
  assert.equal(lineMatch(line({ kind: 'skip', tobacco: null, matchReason: null })), 'skip');
  assert.equal(lineMatch(line({ tobacco: null, matchReason: null })), 'none');
  // Слабое предложение backend не назначает: табак не выбран, но кандидат есть — «проверьте».
  const weak = line({
    tobacco: null,
    matchReason: null,
    candidates: [{ id: 't9', manufacturer: 'Black Burn', lineName: '', name: 'Ananas Shock', confidence: 64, reason: 'catalog' }],
  });
  assert.equal(lineMatch(weak), 'weak');
  // Кандидаты без бренда (бренда строки нет в каталоге) — это «не найдено», а не предложение.
  const noBrand = line({
    tobacco: null,
    matchReason: null,
    candidates: [{ id: 't8', manufacturer: 'Sebero', lineName: '', name: 'Клубника', confidence: 40, reason: 'no-brand' }],
  });
  assert.equal(lineMatch(noBrand), 'none');
  assert.equal(lineMatchHint(noBrand), 'бренда нет в каталоге');
});

test('lineMatchHint: только то, чего не видно в селекте и метке, через запятую', () => {
  assert.equal(lineMatchHint(line()), '');
  assert.equal(lineMatchHint(line({ matchReason: 'catalog', confidence: 86 })), '');
  assert.equal(lineMatchHint(line({ matchReason: 'catalog', confidence: 64 })), 'похоже на 64 %');
  assert.equal(lineMatchHint(line({ matchReason: 'catalog', confidence: 64, newOnShelf: true })), 'похоже на 64 %, новый на полке');
  assert.equal(lineMatchHint(line({ matchReason: 'catalog', confidence: null })), 'предложено по каталогу');
  assert.equal(lineMatchHint(line({ matchReason: 'manual' })), '');
  assert.equal(lineMatchHint(line({ matchReason: 'manual', newOnShelf: true })), 'новый на полке');
  assert.equal(lineMatchHint(line({ tobacco: null, matchReason: null })), '');
  assert.equal(
    lineMatchHint(
      line({
        tobacco: null,
        matchReason: null,
        candidates: [{ id: 't9', manufacturer: 'Black Burn', lineName: '', name: 'Ananas Shock', confidence: 64, reason: 'catalog' }],
      }),
    ),
    'похоже на Black Burn Ananas Shock, 64 %',
  );
  assert.equal(lineMatchHint(line({ kind: 'skip', tobacco: null, matchReason: null })), 'не табак');
});

test('fromPlan: строка черновика с табаком в плане помечается «из плана»', () => {
  const planned = line({ tobacco: { id: 't1', manufacturer: 'Bonche', lineName: '', name: 'Caramel', shelfStatus: 'plan' } });
  assert.equal(fromPlan(planned, true), true);
  // Пришло ли по счёту — неважно: строка всё равно закрывает план.
  assert.equal(fromPlan(line({ ...planned, arrived: false }), true), true);
  // У принятой поставки метки нет: табак уже в работе.
  assert.equal(fromPlan(planned, false), false);
  assert.equal(fromPlan(line(), true), false);
  assert.equal(fromPlan(line({ tobacco: { id: 't1', manufacturer: 'A', lineName: '', name: 'B', shelfStatus: null } }), true), false);
  assert.equal(fromPlan(line({ tobacco: null, matchReason: null }), true), false);
  assert.equal(fromPlan(line({ ...planned, kind: 'skip' }), true), false);
});

test('summarizeLines считает сводные метки разбора', () => {
  const summary = summarizeLines([
    line(),
    line({ id: 'l2' }),
    line({ id: 'l3', matchReason: 'catalog', confidence: 90 }),
    line({ id: 'l3b', matchReason: 'catalog', confidence: 70 }),
    line({ id: 'l4', tobacco: null, matchReason: null, candidates: [{ id: 'x', manufacturer: 'A', lineName: '', name: 'B', confidence: 40, reason: 'catalog' }] }),
    line({ id: 'l5', tobacco: null, matchReason: null }),
    line({ id: 'l6', kind: 'skip', tobacco: null, matchReason: null }),
    line({ id: 'l7', matchReason: 'manual' }),
  ]);
  assert.deepEqual(summary, { memory: 2, catalog: 1, suggest: 2, none: 1, skip: 1, manual: 1 });
});

const skipLine = (id: string) => line({ id, kind: 'skip', tobacco: null, matchReason: null });
const segmentsText = (segments: Array<{ text: string }>) => segments.map((segment) => segment.text).join('');

test('parseSummary: итог разбора одной фразой вместо ряда меток', () => {
  const full = parseSummary([
    line(),
    line({ id: 'l2' }),
    line({ id: 'l3', matchReason: 'catalog', confidence: 90 }),
    line({ id: 'l3b', matchReason: 'catalog', confidence: 70 }),
    line({ id: 'l4', tobacco: null, matchReason: null, candidates: [{ id: 'x', manufacturer: 'A', lineName: '', name: 'B', confidence: 40, reason: 'catalog' }] }),
    line({ id: 'l5', tobacco: null, matchReason: null }),
    skipLine('l6'),
    line({ id: 'l7', matchReason: 'manual' }),
  ]);
  assert.equal(
    segmentsText(full),
    'Найдено 4 из 7 табаков. Проверьте 2 строки, ещё 1 табака нет в каталоге. Одна строка не табак, она пропущена.',
  );
  assert.deepEqual(full.filter((segment) => segment.strong).map((segment) => segment.text), ['4 из 7 табаков']);

  assert.equal(segmentsText(parseSummary([line()])), 'Найдено 1 из 1 табака.');
  assert.equal(
    segmentsText(parseSummary([line(), line({ id: 'l2', matchReason: 'catalog', confidence: 64 })])),
    'Найдено 1 из 2 табаков. Проверьте 1 строку.',
  );
  assert.equal(
    segmentsText(parseSummary([line(), line({ id: 'l2', tobacco: null, matchReason: null })])),
    'Найдено 1 из 2 табаков. Ещё 1 табака нет в каталоге.',
  );
  assert.equal(segmentsText(parseSummary([line(), skipLine('s1'), skipLine('s2')])), 'Найдено 1 из 1 табака. 2 строки не табак, они пропущены.');
  assert.equal(segmentsText(parseSummary([skipLine('s1')])), 'Одна строка не табак, она пропущена.');
  assert.deepEqual(parseSummary([]), []);
});

test('деньги из копеек: итог в рублях и цена с копейками', () => {
  assert.equal(plain(formatMoney(2227000)), '22 270 ₽');
  assert.equal(plain(formatMoney(155050)), '1 550,50 ₽');
  assert.equal(plain(formatMoney(null)), '—');
  assert.equal(plain(formatPrice(155000)), '1 550,00');
  assert.equal(plain(formatPrice(null)), '—');
});

test('parseRubles читает цену, введённую мастером', () => {
  assert.equal(parseRubles('1 550,00'), 155000);
  assert.equal(parseRubles('1550.5'), 155050);
  assert.equal(parseRubles(' 990 '), 99000);
  assert.equal(parseRubles(''), null);
  assert.equal(parseRubles('abc'), undefined);
  assert.equal(parseRubles('-5'), undefined);
});

test('даты: «18 ноя» и «18.11.2026», дата счёта без сдвига часового пояса', () => {
  assert.equal(formatDay('2026-11-18'), '18 ноя');
  assert.equal(formatDay(null), '—');
  assert.equal(formatFullDate('2026-11-18'), '18.11.2026');
  assert.equal(formatFullDate('2026-01-05T10:00:00.000Z'), '05.01.2026');
});

test('deliveryTitle: поставщик и номер счёта, дата уходит в подзаголовок', () => {
  const supplier = { id: 's', name: 'Каспий Опт', inn: null };
  assert.equal(deliveryTitle(card({ number: '04102', invoiceDate: '2026-11-18', supplier })), 'Каспий Опт, счёт № 04102');
  assert.equal(deliveryTitle(card({ number: '04102' })), 'Счёт № 04102');
  assert.equal(deliveryTitle(card({ kind: 'manual', supplier })), 'Каспий Опт, поставка без номера');
  assert.equal(deliveryTitle(card({ kind: 'manual', invoiceDate: '2026-11-18' })), 'Поставка без номера');
  assert.equal(deliveryTitle(card({ kind: 'start' })), 'Стартовый приход');
});

test('deliveryHeadline: дата счёта и приход предложениями, без middot', () => {
  const now = new Date(2026, 10, 20, 12);
  assert.equal(
    deliveryHeadline(card({ invoiceDate: '2026-11-18' }), now),
    'Счёт от 18 ноября. Принимайте поставку, когда товар придёт.',
  );
  assert.equal(deliveryHeadline(card({}), now), 'Загружен 18 ноября. Принимайте поставку, когда товар придёт.');
  assert.equal(deliveryHeadline(card({ kind: 'manual' }), now), 'Заполнена вручную 18 ноября. Принимайте поставку, когда товар придёт.');
  assert.equal(
    deliveryHeadline(card({ status: 'received', invoiceDate: '2026-11-18', receivedAt: '2026-11-19T12:00:00.000Z' }), now),
    'Счёт от 18 ноября, принята 19 ноября.',
  );
  assert.equal(
    deliveryHeadline(card({ kind: 'start', status: 'received', receivedAt: '2026-09-20T10:00:00.000Z' }), now),
    'Принят 20 сентября.',
  );
  // Другой год называем явно.
  assert.equal(
    deliveryHeadline(card({ status: 'received', invoiceDate: '2025-12-30', receivedAt: '2026-01-05T12:00:00.000Z' }), now),
    'Счёт от 30 декабря 2025, принята 5 января.',
  );
});

test('deliveryStatusTag: черновик, принята, стартовый приход', () => {
  const item = (patch: Partial<DeliveryListItem>): DeliveryListItem => ({
    id: 'd',
    kind: 'invoice',
    status: 'draft',
    supplier: null,
    number: null,
    invoiceDate: null,
    receivedAt: null,
    lines: 0,
    totalKop: null,
    createdAt: '',
    ...patch,
  });
  assert.deepEqual(deliveryStatusTag(item({})), { tone: 'warning', text: 'ждёт прихода' });
  assert.deepEqual(deliveryStatusTag(item({ status: 'received' })), { tone: 'success', text: 'принята' });
  assert.deepEqual(deliveryStatusTag(item({ kind: 'start', status: 'received' })), { tone: 'ghost', text: 'стартовый приход' });
});

test('sumCheck сверяет сумму строк с итогом счёта словами, без «=» и «≠»', () => {
  assert.deepEqual(plain(sumCheck(card({ linesSumKop: 2227000, totalKop: 2227000, sumMatches: true }))), {
    tone: 'ok',
    short: 'Сумма строк совпадает с итогом счёта',
    alert: null,
  });
  assert.deepEqual(plain(sumCheck(card({ linesSumKop: 2177000, totalKop: 2227000, sumMatches: false }))), {
    tone: 'warn',
    short: 'Сумма строк не совпадает с итогом счёта',
    alert: 'Сумма строк 21 770 ₽ не сходится с итогом счёта 22 270 ₽ (не хватает 500 ₽)',
  });
  assert.equal(
    plain(sumCheck(card({ linesSumKop: 2277000, totalKop: 2227000, sumMatches: false }))).alert,
    'Сумма строк 22 770 ₽ не сходится с итогом счёта 22 270 ₽ (лишние 500 ₽)',
  );
  assert.deepEqual(plain(sumCheck(card({ linesSumKop: 310000, totalKop: null, sumMatches: null }))), {
    tone: null,
    short: 'Сумма строк 3 100 ₽',
    alert: null,
  });
});

test('acceptLabel: приёмку блокируют только строки без табака (#518)', () => {
  assert.equal(acceptLabel(0), 'Принять поставку');
  assert.equal(acceptLabel(1), 'Выберите табак в 1 строке');
  assert.equal(acceptLabel(4), 'Выберите табак в 4 строках');
  assert.equal(acceptLabel(21), 'Выберите табак в 21 строке');
});

test('tobaccosToReceive: сколько разных табаков вернётся в наличие', () => {
  const lines = [
    line(),
    line({ id: 'l2', n: 2, qty: 2 }),
    line({ id: 'l3', n: 3, tobacco: { id: 't2', manufacturer: 'Darkside', lineName: '', name: 'Wildberry', shelfStatus: null } }),
    line({ id: 'l4', n: 4, arrived: false, tobacco: { id: 't3', manufacturer: 'Sebero', lineName: '', name: 'Mint', shelfStatus: 'active' } }),
    line({ id: 'l5', n: 5, tobacco: null }),
    line({ id: 'l6', n: 6, kind: 'skip', tobacco: null }),
  ];
  assert.equal(tobaccosToReceive(lines), 2);
  assert.equal(tobaccosToReceive([]), 0);
});

test('тост приёмки: сколько пришло из плана и сколько миксов открылось', () => {
  const lines = [line(), line({ id: 'l2', tobacco: { id: 't2', manufacturer: 'Bonche', lineName: '', name: 'Caramel', shelfStatus: 'active' } })];
  assert.deepEqual(acceptedToast({ lines, fromPlan: 2, openedMixes: 2 }), { title: 'Поставка принята', text: 'Из плана пришли: 2. Открылись миксы: 2.' });
  // Часть с нулём не показывается.
  assert.deepEqual(acceptedToast({ lines, fromPlan: 1, openedMixes: 0 }), { title: 'Поставка принята', text: 'Из плана пришли: 1.' });
  assert.deepEqual(acceptedToast({ lines, fromPlan: 0, openedMixes: 3 }), { title: 'Поставка принята', text: 'Открылись миксы: 3.' });
  // Обе нулевые — тост как раньше: сколько табаков снова в наличии.
  assert.deepEqual(acceptedToast({ lines, fromPlan: 0, openedMixes: 0 }), { title: 'Принято: 2 табака в наличии', text: '' });
  assert.deepEqual(acceptedToast({ lines: [line()], fromPlan: 0, openedMixes: 0 }), { title: 'Принято: 1 табак в наличии', text: '' });
  assert.deepEqual(acceptedToast({ lines: [], fromPlan: 0, openedMixes: 0 }), { title: 'Поставка принята', text: '' });
});

test('lineQty: «Приход» строки — штуки по счёту, без граммов', () => {
  assert.equal(lineQty(line()), '1 шт.');
  assert.equal(lineQty(line({ qty: 12 })), '12 шт.');
});
test('readUploadError различает нечитаемый PDF, дубликат и прочие ошибки', () => {
  const error = (status: number, payload: unknown) => Object.assign(new Error(String((payload as { error?: string }).error)), { status, payload });
  assert.deepEqual(readUploadError(error(422, { error: 'В файле нет текста', code: 'no_text' })), {
    kind: 'unreadable',
    message: 'В файле нет текста',
  });
  assert.deepEqual(readUploadError(error(409, { error: 'Счёт № 1 уже загружен', code: 'duplicate', deliveryId: 'd7', status: 'received' })), {
    kind: 'duplicate',
    message: 'Счёт № 1 уже загружен',
    deliveryId: 'd7',
    deliveryStatus: 'received',
  });
  assert.deepEqual(readUploadError(error(400, { error: 'Файл больше 5 МБ' })), { kind: 'other', message: 'Файл больше 5 МБ' });
  assert.deepEqual(readUploadError(new TypeError('Failed to fetch')), {
    kind: 'other',
    message: 'Нет связи с сервером, счёт не загружен. Попробуйте ещё раз.',
  });
});

test('мета месяца: «Октябрь: 2 счёта, 28 500 ₽» по принятым в этом месяце счетам', () => {
  const now = new Date(2026, 9, 20, 12);
  const items: DeliveryListItem[] = [
    // Черновик не считается: денег за него ещё не отдали, как и в «Тратах» Дашборда.
    { id: '1', kind: 'invoice', status: 'draft', supplier: null, number: null, invoiceDate: '2026-10-18', receivedAt: null, lines: 1, totalKop: 2480000, createdAt: '2026-10-18T09:00:00.000Z' },
    { id: '2', kind: 'manual', status: 'received', supplier: null, number: null, invoiceDate: null, receivedAt: '2026-10-02T09:00:00.000Z', lines: 1, totalKop: 1860000, createdAt: '2026-10-02T09:00:00.000Z' },
    // Месяц — по дате прихода, а не счёта: так же считает Дашборд.
    { id: '3', kind: 'invoice', status: 'received', supplier: null, number: null, invoiceDate: '2026-09-30', receivedAt: '2026-10-01T09:00:00.000Z', lines: 1, totalKop: 990000, createdAt: '2026-09-30T09:00:00.000Z' },
    { id: '4', kind: 'invoice', status: 'received', supplier: null, number: null, invoiceDate: '2026-09-28', receivedAt: '2026-09-29T09:00:00.000Z', lines: 1, totalKop: 500000, createdAt: '2026-09-28T09:00:00.000Z' },
    { id: '5', kind: 'start', status: 'received', supplier: null, number: null, invoiceDate: null, receivedAt: '2026-10-19T09:00:00.000Z', lines: 0, totalKop: null, createdAt: '2026-10-19T09:00:00.000Z' },
  ];
  assert.equal(plain(monthMeta(items, now)), 'Октябрь: 2 счёта, 28 500 ₽');
  // Счёт без суммы не мешает: сумма только по тем, где она есть; без сумм — только число.
  assert.equal(plain(monthMeta([{ ...items[1], totalKop: null }], now)), 'Октябрь: 1 счёт');
  assert.equal(monthMeta([items[0]], now), 'Октябрь: 0 счетов');
  assert.equal(monthMeta([], now), 'Октябрь: 0 счетов');
});

test('дата прихода: сегодня — текущее время, другой день — полдень этого дня', () => {
  const now = new Date(2026, 10, 19, 15, 30);
  assert.equal(localDateInput(now), '2026-11-19');
  assert.equal(receivedAtFromInput('2026-11-19', now), now.toISOString());
  assert.equal(receivedAtFromInput('2026-11-17', now), new Date(2026, 10, 17, 12).toISOString());
  assert.equal(receivedAtFromInput('', now), now.toISOString());
});

test('guessTobaccoFromLine предзаполняет карточку каталога из строки счёта', () => {
  assert.deepEqual(guessTobaccoFromLine('Табак для кальяна BLANSH 200 гр Грейпфрутовый Сок'), {
    manufacturer: 'Blansh',
    name: 'Грейпфрутовый Сок',
  });
  assert.deepEqual(guessTobaccoFromLine('Табак для кальяна Black Burn 200г Raspberries (Спелая лесная малина)'), {
    manufacturer: 'Black Burn',
    name: 'Raspberries (Спелая лесная малина)',
  });
  assert.deepEqual(guessTobaccoFromLine('"Дарк Сайд" Кор (Блэккерент), 250 г'), { manufacturer: 'Дарк Сайд', name: 'Кор (Блэккерент)' });
  assert.deepEqual(guessTobaccoFromLine('Sebero Клубника'), { manufacturer: 'Sebero', name: 'Клубника' });
  assert.deepEqual(guessTobaccoFromLine('ОБЛАКО'), { manufacturer: 'ОБЛАКО', name: '' });
});

// Телефон (#540, #shot=deliveries, delivery).
test('deliveryListCard: поставщик, дата счёта с номером, строки и сумма', () => {
  const item: DeliveryListItem = {
    id: 'd',
    kind: 'invoice',
    status: 'draft',
    supplier: 'Каспий Опт',
    number: '1201',
    invoiceDate: '2026-11-03',
    receivedAt: null,
    lines: 14,
    totalKop: 3842000,
    createdAt: '2026-11-04T09:00:00.000Z',
  };
  assert.deepEqual(plain(deliveryListCard(item)), { title: 'Каспий Опт', sub: '3 ноя, счёт 1201', lines: '14 строк', sum: '38 420 ₽' });
  // Без даты счёта — дата загрузки; без номера — только дата.
  assert.deepEqual(plain(deliveryListCard({ ...item, invoiceDate: null, number: null, lines: 1, totalKop: null })), {
    title: 'Каспий Опт',
    sub: '4 ноя',
    lines: '1 строка',
    sum: '—',
  });
  assert.equal(deliveryListCard({ ...item, kind: 'start', supplier: null }).title, 'Стартовый приход');
  assert.equal(deliveryListCard({ ...item, kind: 'manual', supplier: null }).title, 'Без поставщика');
});

test('deliveryPhoneHead: короткий заголовок шапки, поставщик и дата строчными', () => {
  const now = new Date(2026, 10, 20, 12);
  const supplier = { id: 's', name: 'Каспий Опт', inn: null };
  assert.deepEqual(deliveryPhoneHead(card({ number: '1201', invoiceDate: '2026-11-03', supplier }), now), {
    title: 'Счёт 1201',
    name: 'Каспий Опт',
    sub: 'счёт от 3 ноября',
  });
  assert.deepEqual(deliveryPhoneHead(card({ kind: 'manual' }), now), {
    title: 'Поставка без номера',
    name: 'Без поставщика',
    sub: 'заполнена вручную 18 ноября',
  });
  assert.deepEqual(
    deliveryPhoneHead(card({ status: 'received', number: '7', supplier, invoiceDate: '2026-11-18', receivedAt: '2026-11-19T12:00:00.000Z' }), now),
    { title: 'Счёт 7', name: 'Каспий Опт', sub: 'счёт от 18 ноября, принята 19 ноября' },
  );
  assert.equal(deliveryPhoneHead(card({ kind: 'start' }), now).title, 'Стартовый приход');
});

test('acceptBarSummary: главная строка нижней панели телефона', () => {
  const t2 = { id: 't2', manufacturer: 'Darkside', lineName: '', name: 'Blackcurrant', shelfStatus: 'active' as const };
  const lines = [line(), line({ id: 'l2', tobacco: t2 }), line({ id: 'l3', tobacco: null, matchReason: null })];
  assert.deepEqual(acceptBarSummary(card({ lines, pendingLines: 1 })), {
    warn: true,
    main: 'Без табака: 1 строка',
    sub: 'вернутся в наличие 2 табака',
  });
  assert.deepEqual(acceptBarSummary(card({ lines: lines.slice(0, 2), pendingLines: 0 })), {
    warn: false,
    main: 'Вернутся в наличие: 2 табака',
    sub: '',
  });
});
