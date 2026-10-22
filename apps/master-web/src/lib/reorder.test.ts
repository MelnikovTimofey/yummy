import test from 'node:test';
import assert from 'node:assert/strict';
import type { ReorderGroup, ReorderItem } from '../contracts';
import {
  REORDER_COPY_HINT,
  REORDER_HINT,
  budgetInput,
  countReorder,
  groupCaption,
  groupKey,
  groupOrderText,
  intervalNote,
  orderText,
  reorderItemName,
  reorderMonth,
  settingsCalcNote,
  untilLabel,
  validateShelfSettings,
} from './reorder';

// Intl ставит неразрывный пробел между разрядами.
const plain = (value: string) => value.replace(/\u00a0/g, ' ');
const text = (segments: Array<{ text: string; strong?: boolean }>) => segments.map((segment) => segment.text).join('');
const strong = (segments: Array<{ text: string; strong?: boolean }>) => segments.filter((segment) => segment.strong).map((segment) => segment.text);

const item = (patch: Partial<ReorderItem> & { id?: string; name?: string; brand?: string; line?: string } = {}): ReorderItem => {
  const { id = 't1', name = 'Cane Mint', brand = 'Black Burn', line = '', ...rest } = patch;
  return {
    tobacco: { id, manufacturer: brand, lineName: line, name },
    status: 'ending',
    daysLeft: 2,
    endsAt: '2026-11-21T10:00:00.000Z',
    rate: 21,
    rateKind: 'own',
    monthGrams: 630,
    leftGrams: 40,
    gramPriceKop: 775,
    byInterval: false,
    ...rest,
  };
};

const group = (items: ReorderItem[], patch: Partial<ReorderGroup> = {}): ReorderGroup => ({
  supplier: { id: 's1', name: 'Каспий Опт' },
  lastInvoice: { number: '04102', date: '2026-11-18', status: 'draft' },
  items,
  ...patch,
});

test('reorderItemName: бренд, линейка и вкус через пробел, без пустой линейки', () => {
  assert.equal(reorderItemName(item()), 'Black Burn Cane Mint');
  assert.equal(reorderItemName(item({ brand: 'DARKSIDE', line: 'Core', name: 'Blackcurrant' })), 'DARKSIDE Core Blackcurrant');
});

test('orderText повторяет формат backend (shelf-insights orderText): только названия', () => {
  assert.equal(
    orderText([item(), item({ id: 't2', brand: 'Sebero', name: 'Лимонная шипучка' })]),
    'Добрый день! Заказ:\nBlack Burn Cane Mint\nSebero Лимонная шипучка\nСпасибо!',
  );
});

test('groupOrderText: текст из ответа backend, нет его — собираем сами', () => {
  const items = [item(), item({ id: 't2', name: 'Pear lemonade' })];
  assert.equal(groupOrderText(group(items), [{ supplierId: 's1', text: 'текст backend' }]), 'текст backend');
  // Группа без поставщика — ключ null.
  assert.equal(groupOrderText(group(items, { supplier: null }), [{ supplierId: null, text: 'без поставщика' }]), 'без поставщика');
  assert.equal(groupOrderText(group(items), []), orderText(items));
});

test('reorderMonth: расход в месяц до десятков граммов; бренд — с ≈; нет расхода — «мало данных»', () => {
  assert.deepEqual(reorderMonth(item({ monthGrams: 441 })), { value: '440 г', brand: false, few: false });
  assert.deepEqual(reorderMonth(item({ monthGrams: 297, rateKind: 'brand' })), { value: '≈ 300 г', brand: true, few: false });
  assert.deepEqual(reorderMonth(item({ monthGrams: 6, rate: 0.2 })), { value: '6 г', brand: false, few: false });
  assert.deepEqual(reorderMonth(item({ monthGrams: null, rate: null, rateKind: 'none' })), { value: 'мало данных', brand: false, few: true });
  assert.equal(plain(reorderMonth(item({ monthGrams: 1234 })).value), '1 230 г');
});

test('REORDER_HINT и REORDER_COPY_HINT — тексты мокапа', () => {
  assert.equal(REORDER_HINT, 'Сколько заказать, решает мастер. Расход в месяц — средний за 60 дней; «бренд» — своих отметок мало, взята медиана бренда.');
  assert.equal(REORDER_COPY_HINT, 'Объём впишите сами — перед отправкой в чате.');
});

test('intervalNote: интервал известен — раз в N дней по счетам и дата горизонта', () => {
  const note = intervalNote({ days: 10, deliveries: 6 }, { days: 17, until: '2026-12-06T10:00:00.000Z' }, 7);
  assert.equal(note.known, true);
  assert.equal(
    text(note.segments),
    'Поставки примерно раз в 10 дней · по 6 счетам за 90 дней. В списке — что закончится до следующей поставки с запасом на срок поставки: до 6 дек.',
  );
  assert.deepEqual(strong(note.segments), ['раз в 10 дней', 'до 6 дек']);
  assert.match(text(intervalNote({ days: 21, deliveries: 21 }, { days: 28, until: '2026-12-17T10:00:00.000Z' }, 7).segments), /раз в 21 день · по 21 счёту/);
});

test('intervalNote: интервал неизвестен — сколько счетов принято и срок поставки', () => {
  const note = intervalNote({ days: null, deliveries: 2 }, { days: 7, until: '2026-11-26T10:00:00.000Z' }, 7);
  assert.equal(note.known, false);
  assert.equal(
    text(note.segments),
    'Интервал поставок пока неизвестен: принято 2 счёта из 3 нужных. В списке — что закончится за срок поставки, 7 дней.',
  );
  assert.deepEqual(strong(note.segments), ['2 счёта', '7 дней']);
  assert.match(text(intervalNote({ days: null, deliveries: 0 }, { days: 1, until: '' }, 1).segments), /принято 0 счетов из 3 нужных.*срок поставки, 1 день\.$/);
});

test('settingsCalcNote: «Считается само» — интервал и горизонт «К заказу»', () => {
  const known = settingsCalcNote({ days: 10, deliveries: 6 }, { days: 17, until: '2026-12-06T10:00:00.000Z' }, 7);
  assert.equal(
    text(known),
    'Считается само: интервал между поставками — по принятым счетам, сейчас примерно раз в 10 дней. С ним «К заказу» видит до 6 дек: 10 дней до следующей заявки + 7 дней поставки.',
  );
  assert.deepEqual(strong(known), ['Считается само:']);
  assert.equal(
    text(settingsCalcNote({ days: null, deliveries: 2 }, { days: 7, until: '2026-11-26T10:00:00.000Z' }, 7)),
    'Считается само: интервал между поставками — по принятым счетам. Пока принято 2 счёта из 3 нужных — «К заказу» видит только срок поставки: до 26 ноя.',
  );
});

test('countReorder считает строки во всех группах, без данных — null', () => {
  assert.equal(countReorder(null), null);
  assert.equal(countReorder({ groups: [group([item(), item({ id: 't2' })]), group([item({ id: 't3' })], { supplier: null })] }), 3);
  assert.equal(countReorder({ groups: [] }), 0);
});

test('groupKey: поставщик или «не выбран»', () => {
  assert.equal(groupKey(group([])), 's1');
  assert.equal(groupKey(group([], { supplier: null })), 'none');
});

test('groupCaption: последний счёт со статусом, план из каталога, без счёта', () => {
  assert.equal(groupCaption(group([item()])), 'последний счёт 18 ноя, черновик');
  assert.equal(
    groupCaption(group([item()], { lastInvoice: { number: null, date: '2026-11-12', status: 'received' } })),
    'последний счёт 12 ноя, принят',
  );
  assert.equal(groupCaption(group([item({ status: 'plan' })], { supplier: null, lastInvoice: null })), 'в плане из каталога');
  assert.equal(groupCaption(group([item({ status: 'out' })], { supplier: null, lastInvoice: null })), 'приход без счёта поставщика');
  assert.equal(groupCaption(group([item()], { lastInvoice: null })), '');
});

test('untilLabel: закончился, в плане, дата с днями и тон по срочности', () => {
  assert.deepEqual(untilLabel(item({ status: 'out', daysLeft: null, endsAt: null }), 7), { text: 'закончился', days: null, tone: 'danger' });
  assert.deepEqual(untilLabel(item({ status: 'plan', daysLeft: null, endsAt: null }), 7), { text: 'в плане', days: null, tone: 'faint' });
  assert.deepEqual(untilLabel(item({ status: 'check' }), 7), { text: 'проверьте остаток', days: null, tone: 'warning' });
  assert.equal(untilLabel(item({ daysLeft: 2.4 }), 7).tone, 'danger');
  assert.equal(untilLabel(item({ daysLeft: 2.4 }), 7).days, '2 дн');
  assert.equal(untilLabel(item({ daysLeft: 6 }), 7).tone, 'warning');
  assert.equal(untilLabel(item({ daysLeft: 16 }), 7).tone, 'default');
  assert.equal(untilLabel(item({ daysLeft: 16, rateKind: 'brand' }), 7).text.startsWith('~'), true);
  assert.deepEqual(untilLabel(item({ daysLeft: null, endsAt: null }), 7), { text: '—', days: null, tone: 'faint' });
});

test('validateShelfSettings: целые числа в границах backend, бюджет в рублях — в копейки', () => {
  const form = (patch: Partial<Record<'bowlGrams' | 'leadDays' | 'budget', string>> = {}) => ({ bowlGrams: '18', leadDays: '7', budget: '', ...patch });
  assert.deepEqual(validateShelfSettings(form({ bowlGrams: '20', leadDays: '10' })), { ok: true, value: { bowlGrams: 20, leadDays: 10, budgetKop: null } });
  assert.deepEqual(validateShelfSettings(form({ bowlGrams: ' 18 ' })), { ok: true, value: { bowlGrams: 18, leadDays: 7, budgetKop: null } });
  assert.deepEqual(validateShelfSettings(form({ bowlGrams: '0' })), { ok: false, error: 'Граммовка чаши — целое число от 1 до 100.' });
  assert.deepEqual(validateShelfSettings(form({ bowlGrams: '18,5' })), { ok: false, error: 'Граммовка чаши — целое число от 1 до 100.' });
  assert.deepEqual(validateShelfSettings(form({ leadDays: '61' })), { ok: false, error: 'Срок поставки — целое число от 1 до 60.' });
  assert.deepEqual(validateShelfSettings(form({ leadDays: '' })), { ok: false, error: 'Срок поставки — целое число от 1 до 60.' });
  // Бюджет необязателен; пробелы между разрядами — как пишут люди и как показывает поле.
  assert.deepEqual(validateShelfSettings(form({ budget: '150 000' })), { ok: true, value: { bowlGrams: 18, leadDays: 7, budgetKop: 15000000 } });
  assert.deepEqual(validateShelfSettings(form({ budget: '150\u00a0000' })), { ok: true, value: { bowlGrams: 18, leadDays: 7, budgetKop: 15000000 } });
  assert.deepEqual(validateShelfSettings(form({ budget: '  ' })), { ok: true, value: { bowlGrams: 18, leadDays: 7, budgetKop: null } });
  assert.deepEqual(validateShelfSettings(form({ budget: '0' })), { ok: true, value: { bowlGrams: 18, leadDays: 7, budgetKop: 0 } });
  const budgetError = { ok: false, error: 'Бюджет на табак — целое число рублей до 10 000 000 или пусто.' };
  assert.deepEqual(validateShelfSettings(form({ budget: '150000,50' })), budgetError);
  assert.deepEqual(validateShelfSettings(form({ budget: '-5' })), budgetError);
  assert.deepEqual(validateShelfSettings(form({ budget: '10000001' })), budgetError);
  assert.deepEqual(validateShelfSettings(form({ budget: '10 000 000' })), { ok: true, value: { bowlGrams: 18, leadDays: 7, budgetKop: 1_000_000_000 } });
});

test('budgetInput: копейки из API — рубли в поле, не указан — пусто', () => {
  assert.equal(plain(budgetInput(15000000)), '150 000');
  assert.equal(budgetInput(null), '');
  assert.equal(budgetInput(0), '0');
});
