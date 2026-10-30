import test from 'node:test';
import assert from 'node:assert/strict';
import { profileLabelMap, profileOptions } from './profile-labels';

// У «Сладкого», «Кислого» и «Свежего» нет своего источника в htreviews (#182):
// гостю их не предлагаем, но вкусы, сохранённые раньше, подписываем по-русски.
test('профили без источника не предлагаются гостю, но остаются подписанными', () => {
  const values = profileOptions.map((option) => option.value);

  for (const key of ['sweet', 'sour', 'fresh']) {
    assert.equal(values.includes(key), false, key);
    assert.match(profileLabelMap[key], /^[А-Я]/, key);
  }
  assert.equal(profileLabelMap.citrus, 'Цитрусовый');
});

test('«Напитки» и «Гастро» предлагаются гостю последними', () => {
  const values = profileOptions.map((option) => option.value);
  assert.deepEqual(values.slice(-2), ['beverage', 'gastro']);
  assert.equal(profileLabelMap.beverage, 'Напитки');
  assert.equal(profileLabelMap.gastro, 'Гастро');
});
