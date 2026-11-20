import test from 'node:test';
import assert from 'node:assert/strict';
import { lineLabel } from './line';

// Линейка в карточке для мастера (#627, Р5 #621): мастер берёт Sebero Black, а не Classic.

test('префикс бренда из названия линейки htreviews убирается без учёта регистра', () => {
  assert.equal(lineLabel('Sebero', 'Sebero Black'), 'Black');
  assert.equal(lineLabel('SEBERO', 'sebero Classic'), 'Classic');
  assert.equal(lineLabel('Сарма', 'Крепкая Сарма 360'), 'Крепкая Сарма 360');
});

test('линейка, не повторяющая бренд, остаётся как есть', () => {
  assert.equal(lineLabel('DARKSIDE', 'Core'), 'Core');
  assert.equal(lineLabel('Trofimoff’s', 'Terror'), 'Terror');
});

test('пустая линейка и «Основная» не показываются', () => {
  assert.equal(lineLabel('Serbetli', 'Основная'), '');
  assert.equal(lineLabel('Black Burn', ' основная '), '');
  assert.equal(lineLabel('Deus', ''), '');
  assert.equal(lineLabel('Deus', undefined), '');
  assert.equal(lineLabel('Sebero', 'Sebero'), '');
});
