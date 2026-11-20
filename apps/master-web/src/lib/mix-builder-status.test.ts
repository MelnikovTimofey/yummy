import test from 'node:test';
import assert from 'node:assert/strict';
import { builderStockTag, builderSumLabel, componentShelfState, componentStockNote } from './mix-builder-status';

// #494: метка наличия в конструкторе совпадает со статусом микса из API (#479).

const substitution = {
  from: { tobaccoId: 'lime-spark', manufacturer: 'Ателье Reserve', name: 'Lime Spark' },
  to: { tobaccoId: 'citrus-breeze', manufacturer: 'Ателье Reserve', name: 'Citrus Breeze' },
};

test('всё в наличии — метки нет', () => {
  assert.equal(builderStockTag([], substitution), null);
});

test('не хватает одного табака, и его закрывает замена — «с заменой» и пара', () => {
  assert.deepEqual(builderStockTag(['lime-spark'], substitution), {
    tone: 'info',
    label: 'с заменой',
    note: 'Citrus Breeze вместо Lime Spark',
  });
});

test('не хватает другого табака или двух — «блокируется наличием»', () => {
  const blocked = { tone: 'warning', label: 'блокируется наличием' };
  assert.deepEqual(builderStockTag(['mint-veil'], substitution), blocked);
  assert.deepEqual(builderStockTag(['lime-spark', 'mint-veil'], substitution), blocked);
  assert.deepEqual(builderStockTag(['lime-spark'], null), blocked);
});

// #540: нижняя панель конструктора на телефоне — сумма и что с ней не так.
test('сумма 100 % — подсказка «сумма пропорций», без предупреждения', () => {
  assert.deepEqual(builderSumLabel(100), { value: '100 %', note: 'сумма пропорций', warn: false });
});

test('сумма больше или меньше 100 % — сколько лишних или не хватает', () => {
  assert.deepEqual(builderSumLabel(110), { value: '110 %', note: 'лишние 10 %', warn: true });
  assert.deepEqual(builderSumLabel(0), { value: '0 %', note: 'не хватает 100 %', warn: true });
});

// #540: у табака в составе на телефоне — что увидит гость, если табак закончился.
test('табак в наличии — пометки нет', () => {
  assert.equal(componentStockNote('lime-spark', true, ['lime-spark'], substitution), null);
});

test('закончился, и его закрывает замена — гостю заменит', () => {
  assert.deepEqual(componentStockNote('lime-spark', false, ['lime-spark'], substitution), {
    tone: 'warning',
    text: 'Закончился, гостю заменит Citrus Breeze',
  });
});

test('закончился без замены или не хватает двух — микс скрыт у гостя', () => {
  const hidden = { tone: 'danger', text: 'Закончился, микс скрыт у гостя' };
  assert.deepEqual(componentStockNote('mint-veil', false, ['mint-veil'], substitution), hidden);
  assert.deepEqual(componentStockNote('lime-spark', false, ['lime-spark', 'mint-veil'], substitution), hidden);
  assert.deepEqual(componentStockNote('lime-spark', false, ['lime-spark'], null), hidden);
});

// #566 (#shot=mix-edit, mix-edit-planned): табаки из плана и «В план» из состава.
test('все недостающие в плане — «Ждёт табак из плана» вместо блокировки', () => {
  const awaits = { tone: 'plan', label: 'Ждёт табак из плана' };
  assert.deepEqual(builderStockTag(['clover-club'], null, ['clover-club']), awaits);
  assert.deepEqual(builderStockTag(['clover-club', 'tarhun'], null, ['clover-club', 'tarhun']), awaits);
});

test('один недостающий не в плане — блокируется наличием; замена важнее плана', () => {
  assert.deepEqual(builderStockTag(['clover-club', 'tarhun'], null, ['clover-club']), { tone: 'warning', label: 'блокируется наличием' });
  assert.equal(builderStockTag(['lime-spark'], substitution, ['lime-spark'])?.label, 'с заменой');
});

test('табак в составе: на полке, в плане, нет на полке, закончился', () => {
  assert.equal(componentShelfState(true, 'active'), 'in');
  assert.equal(componentShelfState(false, 'plan'), 'plan');
  assert.equal(componentShelfState(false, undefined), 'none');
  assert.equal(componentShelfState(false, 'active'), 'out');
});
