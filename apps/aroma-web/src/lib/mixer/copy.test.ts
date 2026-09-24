import test from 'node:test';
import assert from 'node:assert/strict';
import { hintText, mixCountCaption, pluralize, verdictLabel } from './copy';

test('verdictLabel — спокойные фактические вердикты', () => {
  assert.equal(verdictLabel('classic'), 'Классическое сочетание');
  assert.equal(verdictLabel('confident'), 'Уверенное сочетание');
  assert.equal(verdictLabel('bold'), 'Смелый эксперимент');
  assert.equal(verdictLabel('ask-master'), 'Мастер переспросит');
});

test('hintText по видам подсказок evaluate', () => {
  assert.equal(hintText({ kind: 'too-cold', value: 25 }), 'Холодка 25%. Обычно хватает 10–15%.');
  assert.equal(hintText({ kind: 'too-cold' }), 'Холодка больше 20%. Обычно хватает 10–15%.');
  assert.equal(hintText({ kind: 'weak-base' }), 'Основа меньше 35% — главный вкус теряется.');
  assert.equal(hintText({ kind: 'heavy-twist' }), 'Штрих больше 25% — он перетягивает вкус.');
  assert.equal(hintText({ kind: 'mono' }), 'Один табак. Добавьте акцент.');
});

test('pluralize согласует число руками', () => {
  const forms = ['табак', 'табака', 'табаков'] as const;
  assert.equal(pluralize(1, forms), 'табак');
  assert.equal(pluralize(3, forms), 'табака');
  assert.equal(pluralize(11, forms), 'табаков');
  assert.equal(pluralize(21, forms), 'табак');
  assert.equal(pluralize(112, forms), 'табаков');
});

test('mixCountCaption на карте основы', () => {
  assert.deepEqual(mixCountCaption(0), { value: '—', caption: 'в миксах мастеров пока нет' });
  assert.deepEqual(mixCountCaption(1), { value: '1', caption: 'микс мастеров с ним' });
  assert.deepEqual(mixCountCaption(4), { value: '4', caption: 'микса мастеров с ним' });
  assert.deepEqual(mixCountCaption(12), { value: '12', caption: 'миксов мастеров с ним' });
});
