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
  formatMoney,
  formatPrice,
  guessTobaccoFromLine,
  lineMatch,
  lineMatchHint,
  localDateInput,
  monthMeta,
  monthTitle,
  parseRubles,
  readUploadError,
  receivedAtFromInput,
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

test('lineMatchHint подписывает выбор под селектом', () => {
  assert.equal(lineMatchHint(line()), 'по памяти: строка этого поставщика');
  assert.equal(lineMatchHint(line({ matchReason: 'catalog', confidence: 86 })), 'похоже на 86 % · Black Burn');
  assert.equal(lineMatchHint(line({ matchReason: 'catalog', confidence: 64 })), 'похоже на 64 % · Black Burn');
  assert.equal(lineMatchHint(line({ matchReason: 'catalog', confidence: null })), 'предложено по каталогу');
  assert.equal(lineMatchHint(line({ matchReason: 'manual' })), 'выбрано вручную');
  assert.equal(lineMatchHint(line({ matchReason: 'manual', newOnShelf: true })), 'выбрано вручную · новый на полке');
  assert.equal(lineMatchHint(line({ tobacco: null, matchReason: null })), 'нет в каталоге');
  assert.equal(
    lineMatchHint(
      line({
        tobacco: null,
        matchReason: null,
        candidates: [{ id: 't9', manufacturer: 'Black Burn', lineName: '', name: 'Ananas Shock', confidence: 64, reason: 'catalog' }],
      }),
    ),
    'похоже на 64 % · Black Burn Ananas Shock',
  );
  assert.equal(lineMatchHint(line({ kind: 'skip', tobacco: null, matchReason: null })), 'нет бренда и веса');
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

test('deliveryTitle собирает заголовок карточки', () => {
  assert.equal(deliveryTitle(card({ number: '04102', invoiceDate: '2026-11-18' })), 'Счёт № 04102 от 18.11.2026');
  assert.equal(deliveryTitle(card({ number: '04102' })), 'Счёт № 04102');
  assert.equal(deliveryTitle(card({ kind: 'manual', invoiceDate: '2026-11-18' })), 'Поставка от 18.11.2026');
  assert.equal(deliveryTitle(card({ kind: 'manual' })), 'Поставка без номера');
  assert.equal(deliveryTitle(card({ kind: 'start' })), 'Стартовый приход');
});

test('deliveryHeadline: поставщик, загрузка и приход', () => {
  assert.equal(
    deliveryHeadline(card({ supplier: { id: 's', name: 'Каспий Опт', inn: null } })),
    'Каспий Опт · загружен 18 ноя',
  );
  assert.equal(deliveryHeadline(card({ kind: 'manual' })), 'Поставщик не указан · заполнена вручную 18 ноя');
  assert.equal(
    deliveryHeadline(card({ status: 'received', receivedAt: '2026-11-19T12:00:00.000Z', supplier: { id: 's', name: 'Каспий Опт', inn: null } })),
    'Каспий Опт · загружен 18 ноя · принята 19 ноя',
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
    packs: 0,
    totalKop: null,
    createdAt: '',
    ...patch,
  });
  assert.deepEqual(deliveryStatusTag(item({})), { tone: 'warning', text: 'черновик · ждёт прихода' });
  assert.deepEqual(deliveryStatusTag(item({ status: 'received' })), { tone: 'success', text: 'принята' });
  assert.deepEqual(deliveryStatusTag(item({ kind: 'start', status: 'received' })), { tone: 'ghost', text: 'Стартовый приход' });
});

test('sumCheck сверяет сумму строк с итогом счёта', () => {
  assert.deepEqual(plain(sumCheck(card({ linesSumKop: 2227000, totalKop: 2227000, sumMatches: true }))), {
    tone: 'ok',
    short: 'Сумма строк 22 270 ₽ = итог счёта',
    alert: null,
  });
  assert.deepEqual(plain(sumCheck(card({ linesSumKop: 2177000, totalKop: 2227000, sumMatches: false }))), {
    tone: 'warn',
    short: 'Сумма строк 21 770 ₽ ≠ итог 22 270 ₽',
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

test('acceptLabel и тост приёмки', () => {
  assert.equal(acceptLabel(0), 'Принять поставку');
  assert.equal(acceptLabel(1), 'Выберите табак в 1 строке');
  assert.equal(acceptLabel(4), 'Выберите табак в 4 строках');
  assert.equal(acceptLabel(21), 'Выберите табак в 21 строке');
  assert.equal(acceptedToastTitle(15), 'Принято: 15 банок на полке');
  assert.equal(acceptedToastTitle(1), 'Принято: 1 банка на полке');
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
    message: 'Нет связи с сервером — счёт не загружен. Повторить позже.',
  });
});

test('месяц: «ЗА ОКТЯБРЬ» и «октябрь: 3 счёта»', () => {
  const now = new Date(2026, 9, 20, 12);
  assert.equal(monthTitle(now), 'октябрь');
  const items: DeliveryListItem[] = [
    { id: '1', kind: 'invoice', status: 'draft', supplier: null, number: null, invoiceDate: '2026-10-18', receivedAt: null, lines: 1, packs: 1, totalKop: 1, createdAt: '2026-10-18T09:00:00.000Z' },
    { id: '2', kind: 'manual', status: 'received', supplier: null, number: null, invoiceDate: null, receivedAt: null, lines: 1, packs: 1, totalKop: 1, createdAt: '2026-10-02T09:00:00.000Z' },
    { id: '3', kind: 'invoice', status: 'received', supplier: null, number: null, invoiceDate: '2026-09-30', receivedAt: null, lines: 1, packs: 1, totalKop: 1, createdAt: '2026-10-01T09:00:00.000Z' },
    { id: '4', kind: 'start', status: 'received', supplier: null, number: null, invoiceDate: null, receivedAt: null, lines: 0, packs: 9, totalKop: null, createdAt: '2026-10-19T09:00:00.000Z' },
  ];
  assert.equal(monthMeta(items, now), 'октябрь: 2 счёта');
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
