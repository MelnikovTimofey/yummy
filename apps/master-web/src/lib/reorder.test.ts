import test from 'node:test';
import assert from 'node:assert/strict';
import type { ShelfStatus } from '../contracts';
import {
  budgetInput,
  settingsCalcNote,
  untilLabel,
  validateShelfSettings,
} from './reorder';

// Intl ставит неразрывный пробел между разрядами.
const plain = (value: string) => value.replace(/\u00a0/g, ' ');
const text = (segments: Array<{ text: string; strong?: boolean }>) => segments.map((segment) => segment.text).join('');
const strong = (segments: Array<{ text: string; strong?: boolean }>) => segments.filter((segment) => segment.strong).map((segment) => segment.text);

type Item = { status: ShelfStatus; daysLeft: number | null; endsAt: string | null };

const item = (patch: Partial<Item> = {}): Item => ({ status: 'ending', daysLeft: 2, endsAt: '2026-11-21T10:00:00.000Z', ...patch });

test('settingsCalcNote: «Считается само» — интервал и горизонт заказа', () => {
  const known = settingsCalcNote({ days: 10, deliveries: 6 }, { days: 17, until: '2026-12-06T10:00:00.000Z' }, 7);
  assert.equal(
    text(known),
    'Считается само: интервал между поставками по принятым счетам, сейчас примерно раз в 10 дней. В заказе то, что закончится до 6 дек: 10 дней до следующей заявки и 7 дней поставки.',
  );
  assert.deepEqual(strong(known), ['Считается само:']);
  assert.equal(
    text(settingsCalcNote({ days: null, deliveries: 2 }, { days: 7, until: '2026-11-26T10:00:00.000Z' }, 7)),
    'Считается само: интервал между поставками по принятым счетам. Пока принято 2 счёта из 3 нужных, поэтому в заказе то, что закончится за срок поставки, до 26 ноя.',
  );
});

test('тексты настроек без middot, тире между частями, кавычек и «+»', () => {
  const all = [
    text(settingsCalcNote({ days: 10, deliveries: 6 }, { days: 17, until: '2026-12-06T10:00:00.000Z' }, 7)),
    text(settingsCalcNote({ days: null, deliveries: 2 }, { days: 7, until: '2026-11-26T10:00:00.000Z' }, 7)),
  ];
  for (const line of all) assert.doesNotMatch(line, /[·—«»≈~+…;]/);
});

test('untilLabel: закончился, в плане, дата с днями и тон по срочности', () => {
  assert.deepEqual(untilLabel(item({ status: 'out', daysLeft: null, endsAt: null }), 7), { text: 'закончился', days: null, tone: 'danger' });
  assert.deepEqual(untilLabel(item({ status: 'plan', daysLeft: null, endsAt: null }), 7), { text: 'в плане', days: null, tone: 'faint' });
  assert.deepEqual(untilLabel(item({ status: 'check' }), 7), { text: 'проверьте остаток', days: null, tone: 'warning' });
  assert.equal(untilLabel(item({ daysLeft: 2.4 }), 7).tone, 'danger');
  assert.equal(untilLabel(item({ daysLeft: 2.4 }), 7).days, '2 дн');
  assert.equal(untilLabel(item({ daysLeft: 6 }), 7).tone, 'warning');
  assert.equal(untilLabel(item({ daysLeft: 16 }), 7).tone, 'default');
  assert.deepEqual(untilLabel(item({ daysLeft: null, endsAt: null }), 7), { text: '—', days: null, tone: 'faint' });
});

test('validateShelfSettings: целые числа в границах backend, бюджет в рублях — в копейки', () => {
  const form = (patch: Partial<Record<'bowlGrams' | 'leadDays' | 'budget', string>> = {}) => ({ bowlGrams: '18', leadDays: '7', budget: '', ...patch });
  assert.deepEqual(validateShelfSettings(form({ bowlGrams: '20', leadDays: '10' })), { ok: true, value: { bowlGrams: 20, leadDays: 10, budgetKop: null } });
  assert.deepEqual(validateShelfSettings(form({ bowlGrams: ' 18 ' })), { ok: true, value: { bowlGrams: 18, leadDays: 7, budgetKop: null } });
  assert.deepEqual(validateShelfSettings(form({ bowlGrams: '0' })), { ok: false, error: 'Укажите граммовку чаши от 1 до 100 г.' });
  assert.deepEqual(validateShelfSettings(form({ bowlGrams: '18,5' })), { ok: false, error: 'Укажите граммовку чаши от 1 до 100 г.' });
  assert.deepEqual(validateShelfSettings(form({ leadDays: '61' })), { ok: false, error: 'Укажите срок поставки от 1 до 60 дней.' });
  assert.deepEqual(validateShelfSettings(form({ leadDays: '' })), { ok: false, error: 'Укажите срок поставки от 1 до 60 дней.' });
  // Бюджет необязателен; пробелы между разрядами — как пишут люди и как показывает поле.
  assert.deepEqual(validateShelfSettings(form({ budget: '150 000' })), { ok: true, value: { bowlGrams: 18, leadDays: 7, budgetKop: 15000000 } });
  assert.deepEqual(validateShelfSettings(form({ budget: '150\u00a0000' })), { ok: true, value: { bowlGrams: 18, leadDays: 7, budgetKop: 15000000 } });
  assert.deepEqual(validateShelfSettings(form({ budget: '  ' })), { ok: true, value: { bowlGrams: 18, leadDays: 7, budgetKop: null } });
  assert.deepEqual(validateShelfSettings(form({ budget: '0' })), { ok: true, value: { bowlGrams: 18, leadDays: 7, budgetKop: 0 } });
  const budgetError = { ok: false, error: 'Укажите бюджет в целых рублях, до 10 000 000, или оставьте поле пустым.' };
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
