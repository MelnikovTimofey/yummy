import test from 'node:test';
import assert from 'node:assert/strict';
import { lineLabel, tobaccoFullName } from './tobacco-line';

test('lineLabel: префикс бренда из названия линейки htreviews убирается без учёта регистра', () => {
  assert.equal(lineLabel('Sebero', 'Sebero Black'), 'Black');
  assert.equal(lineLabel('Sebero', 'SEBERO Classic'), 'Classic');
  assert.equal(lineLabel('Trofimoff’s', 'Trofimoff’s Terror'), 'Terror');
});

test('lineLabel: линейка не повторяет бренд — как есть', () => {
  assert.equal(lineLabel('DARKSIDE', 'Core'), 'Core');
  assert.equal(lineLabel('Сарма', 'Крепкая Сарма 360'), 'Крепкая Сарма 360');
  assert.equal(lineLabel('Seberolite', 'Sebero Black'), 'Sebero Black');
});

test('lineLabel: пустая линейка, «Основная» и линейка, равная бренду, не показываются', () => {
  assert.equal(lineLabel('Sebero', ''), '');
  assert.equal(lineLabel('Sebero', undefined), '');
  assert.equal(lineLabel('Sebero', '  '), '');
  assert.equal(lineLabel('Musthave', 'Основная'), '');
  assert.equal(lineLabel('Musthave', 'Musthave основная'), '');
  assert.equal(lineLabel('Bonche', 'Bonche'), '');
});

test('tobaccoFullName: однострочное имя «бренд линейка название»', () => {
  assert.equal(tobaccoFullName({ manufacturer: 'Sebero', lineName: 'Sebero Black', name: 'Strawberry' }), 'Sebero Black Strawberry');
  assert.equal(tobaccoFullName({ manufacturer: 'Musthave', lineName: 'Основная', name: 'Pineapple Rings' }), 'Musthave Pineapple Rings');
  assert.equal(tobaccoFullName({ manufacturer: 'Sebero', name: 'Мармеладные красные мишки' }), 'Sebero Мармеладные красные мишки');
});
