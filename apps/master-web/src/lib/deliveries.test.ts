import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDeliveryCard, type DeliveryCard, type DeliveryLine, type DeliveryListItem } from '../contracts';
import {
  CONFIDENT_MATCH,
  acceptLabel,
  acceptedToastTitle,
  deliveryHeadline,
  deliveryStatusTag,
  deliveryTitle,
  formatDay,
  formatFullDate,
  formatWeight,
  formatMoney,
  formatPrice,
  guessTobaccoFromLine,
  lineMatch,
  lineGramsHint,
  lineMatchHint,
  localDateInput,
  monthMeta,
  parseReceivedGrams,
  parseRubles,
  readUploadError,
  receivedAtFromInput,
  parseSummary,
  summarizeLines,
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
  receivedGrams: 200,
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
    grams: 0,
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

test('acceptLabel: строки без табака или граммов блокируют приёмку', () => {
  assert.equal(acceptLabel(0), 'Принять поставку');
  assert.equal(acceptLabel(1), 'Выберите табак или граммы в 1 строке');
  assert.equal(acceptLabel(4), 'Выберите табак или граммы в 4 строках');
  assert.equal(acceptLabel(21), 'Выберите табак или граммы в 21 строке');
});

test('formatWeight: до килограмма — граммы, дальше — кг с одной цифрой после запятой', () => {
  assert.equal(formatWeight(0), '0 г');
  assert.equal(formatWeight(450), '450 г');
  assert.equal(formatWeight(1000), '1 кг');
  assert.equal(formatWeight(2600), '2,6 кг');
  assert.equal(formatWeight(2649), '2,6 кг');
  assert.equal(formatWeight(2650), '2,7 кг');
  assert.equal(plain(formatWeight(12400)), '12,4 кг');
});

test('тост приёмки — в граммах и килограммах на полке', () => {
  assert.equal(acceptedToastTitle(2600), 'Принято: 2,6 кг на полке');
  assert.equal(acceptedToastTitle(400), 'Принято: 400 г на полке');
});

test('lineGramsHint: «2 × 200 г по счёту», «200 г по счёту», без граммов — «укажите граммы»', () => {
  assert.equal(lineGramsHint(line()), '200 г по счёту');
  assert.equal(lineGramsHint(line({ qty: 2, receivedGrams: 400 })), '2 × 200 г по счёту');
  assert.equal(lineGramsHint(line({ grams: null, receivedGrams: null })), 'укажите граммы');
  // Мастер вписал граммы руками, фасовки в счёте нет.
  assert.equal(lineGramsHint(line({ grams: null, receivedGrams: 250 })), 'указано вручную');
});

test('parseReceivedGrams: пусто — сброс к счёту, целое > 0 — граммы, иначе — ошибка', () => {
  assert.equal(parseReceivedGrams(''), null);
  assert.equal(parseReceivedGrams('  '), null);
  assert.equal(parseReceivedGrams('400'), 400);
  assert.equal(parseReceivedGrams(' 1 200 '), 1200);
  assert.equal(parseReceivedGrams('0'), undefined);
  assert.equal(parseReceivedGrams('12,5'), undefined);
  assert.equal(parseReceivedGrams('много'), undefined);
  assert.equal(parseReceivedGrams('250001'), undefined);
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
    { id: '1', kind: 'invoice', status: 'draft', supplier: null, number: null, invoiceDate: '2026-10-18', receivedAt: null, lines: 1, grams: 200, totalKop: 2480000, createdAt: '2026-10-18T09:00:00.000Z' },
    { id: '2', kind: 'manual', status: 'received', supplier: null, number: null, invoiceDate: null, receivedAt: '2026-10-02T09:00:00.000Z', lines: 1, grams: 200, totalKop: 1860000, createdAt: '2026-10-02T09:00:00.000Z' },
    // Месяц — по дате прихода, а не счёта: так же считает Дашборд.
    { id: '3', kind: 'invoice', status: 'received', supplier: null, number: null, invoiceDate: '2026-09-30', receivedAt: '2026-10-01T09:00:00.000Z', lines: 1, grams: 200, totalKop: 990000, createdAt: '2026-09-30T09:00:00.000Z' },
    { id: '4', kind: 'invoice', status: 'received', supplier: null, number: null, invoiceDate: '2026-09-28', receivedAt: '2026-09-29T09:00:00.000Z', lines: 1, grams: 200, totalKop: 500000, createdAt: '2026-09-28T09:00:00.000Z' },
    { id: '5', kind: 'start', status: 'received', supplier: null, number: null, invoiceDate: null, receivedAt: '2026-10-19T09:00:00.000Z', lines: 0, grams: 1800, totalKop: null, createdAt: '2026-10-19T09:00:00.000Z' },
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
