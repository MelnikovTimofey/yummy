import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveMixAvailability, type RuleComponent, type RuleTobacco } from './analogs';

// Issue #479: правило доступности с заменой (PRD §6.2 п.1) — чистая функция.

const tobacco = (id: string, overrides: Partial<RuleTobacco> = {}): RuleTobacco => ({
  id,
  manufacturer: 'Darkside',
  name: id,
  flavors: [],
  inStock: true,
  archived: false,
  onShelf: true,
  ...overrides,
});

const component = (base: RuleTobacco, analogs: RuleTobacco[] = []): RuleComponent => ({ tobacco: base, analogs });

const ref = (item: RuleTobacco) => ({ tobaccoId: item.id, manufacturer: item.manufacturer, name: item.name });

const cola = tobacco('cola');
const lemonblast = tobacco('lemonblast', { inStock: false });
const lemonShock = tobacco('lemon-shock', { manufacturer: 'Black Burn', flavors: ['лимон'] });
const lemonFresh = tobacco('lemon-fresh', { manufacturer: 'AHF Tobacco' });
const redRush = tobacco('red-rush', { inStock: false });

test('все компоненты в наличии — микс виден без замены', () => {
  assert.deepEqual(resolveMixAvailability(true, [component(cola), component(lemonShock)]), {
    status: 'visible',
    substitution: null,
    substitute: null,
    missing: [],
  });
});

test('не хватает одного, аналог в наличии — микс с заменой', () => {
  const result = resolveMixAvailability(true, [component(cola), component(lemonblast, [lemonShock, lemonFresh])]);
  assert.equal(result.status, 'substituted');
  assert.deepEqual(result.substitution, { from: ref(lemonblast), to: ref(lemonShock) });
  assert.deepEqual(result.substitute, { tobaccoId: 'lemonblast', to: { ...ref(lemonShock), flavors: ['лимон'] } });
  assert.deepEqual(result.missing, [{ ...ref(lemonblast), onShelf: true }]);
});

test('первый аналог закончился — заменой встаёт следующий', () => {
  const result = resolveMixAvailability(true, [
    component(cola),
    component(lemonblast, [tobacco('lemon-shock', { inStock: false }), lemonFresh]),
  ]);
  assert.equal(result.status, 'substituted');
  assert.deepEqual(result.substitution?.to, ref(lemonFresh));
});

test('аналог уже стоит в этом миксе — берётся следующий', () => {
  const result = resolveMixAvailability(true, [
    component(lemonShock),
    component(lemonblast, [lemonShock, lemonFresh]),
  ]);
  assert.deepEqual(result.substitution?.to, ref(lemonFresh));
});

test('аналоги не в наличии, в архиве или их нет — микс блокирован', () => {
  for (const analogs of [
    [tobacco('lemon-shock', { inStock: false })],
    [tobacco('lemon-shock', { archived: true })],
    [],
  ]) {
    const result = resolveMixAvailability(true, [component(cola), component(lemonblast, analogs)]);
    assert.equal(result.status, 'blocked');
    assert.equal(result.substitution, null);
    assert.deepEqual(result.missing, [{ ...ref(lemonblast), onShelf: true }]);
  }
});

test('табак в архиве считается недостающим, даже если inStock', () => {
  const archived = tobacco('archived', { archived: true });
  const result = resolveMixAvailability(true, [component(cola), component(archived, [lemonShock])]);
  assert.equal(result.status, 'substituted');
  assert.deepEqual(result.substitution?.from, ref(archived));
});

test('не хватает двух — микс блокирован, даже если у обоих есть аналоги', () => {
  const result = resolveMixAvailability(true, [
    component(lemonblast, [lemonShock]),
    component(redRush, [tobacco('barberry')]),
  ]);
  assert.equal(result.status, 'blocked');
  assert.equal(result.substitute, null);
  assert.deepEqual(
    result.missing.map((item) => item.tobaccoId),
    ['lemonblast', 'red-rush'],
  );
});

test('аналог аналога заменой не становится: в расчёт идут только аналоги самого табака', () => {
  // Lemon Shock — аналог Lemonblast, Лимонный фреш — аналог Lemon Shock, но не Lemonblast.
  const result = resolveMixAvailability(true, [component(lemonblast, [tobacco('lemon-shock', { inStock: false })])]);
  assert.equal(result.status, 'blocked');
});

test('микс скрыт мастером — hidden без замены, недостающие перечислены', () => {
  const result = resolveMixAvailability(false, [component(cola), component(lemonblast, [lemonShock])]);
  assert.deepEqual(result, {
    status: 'hidden',
    substitution: null,
    substitute: null,
    missing: [{ ...ref(lemonblast), onShelf: true }],
  });
});

test('onShelf недостающего табака передаётся как есть', () => {
  const offShelf = tobacco('lime-spark', { inStock: false, onShelf: false });
  const result = resolveMixAvailability(true, [component(offShelf), component(redRush)]);
  assert.deepEqual(result.missing[0], { ...ref(offShelf), onShelf: false });
});
