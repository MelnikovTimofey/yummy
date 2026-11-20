import test from 'node:test';
import assert from 'node:assert/strict';
import { dragModeFor, dragSelection } from './drag-select';

const order = ['a', 'b', 'c', 'd', 'e'];

test('dragModeFor: с невыбранной строки протягивание выделяет, с выбранной — снимает', () => {
  assert.equal(dragModeFor([], 'a'), 'select');
  assert.equal(dragModeFor(['a'], 'a'), 'deselect');
});

test('dragSelection: вниз выделяет все строки от первой до текущей, прежний выбор сохраняется', () => {
  assert.deepEqual(dragSelection(order, ['e'], 'b', 'd', 'select'), ['e', 'b', 'c', 'd']);
});

test('dragSelection: вверх — тот же диапазон, уже выбранные не дублируются', () => {
  assert.deepEqual(dragSelection(order, ['c'], 'd', 'b', 'select'), ['c', 'b', 'd']);
});

test('dragSelection: снятие убирает строки диапазона и не трогает остальные', () => {
  assert.deepEqual(dragSelection(order, ['a', 'b', 'c', 'd', 'e'], 'b', 'd', 'deselect'), ['a', 'e']);
});

test('dragSelection: возврат назад возвращает строкам за диапазоном прежнее состояние', () => {
  const base = ['d'];
  assert.deepEqual(dragSelection(order, base, 'a', 'c', 'select'), ['d', 'a', 'b', 'c']);
  assert.deepEqual(dragSelection(order, base, 'a', 'a', 'select'), ['d', 'a']);
});

test('dragSelection: строки не с этой страницы — выбор без изменений', () => {
  assert.deepEqual(dragSelection(order, ['a'], 'x', 'c', 'select'), ['a']);
  assert.deepEqual(dragSelection(order, ['a'], 'a', 'x', 'deselect'), ['a']);
});
