import assert from 'node:assert/strict';
import test from 'node:test';
import { decideTobaccoUpsert } from './sync';

// Issue #88: в каталог попадают только выпускаемые табаки, но уже заведённые
// обновляются всегда — иначе снятие с производства не дойдёт до productionStatus.

test('новый выпускаемый табак создаётся', () => {
  assert.equal(decideTobaccoUpsert('Выпускается', false), 'create');
});

test('новый неактуальный табак пропускается', () => {
  for (const status of ['Снят с производства', 'Лимитированный', 'Не известен', 'Шуточный 🙃', null]) {
    assert.equal(decideTobaccoUpsert(status, false), 'skip', String(status));
  }
});

test('существующий табак обновляется при любом статусе', () => {
  assert.equal(decideTobaccoUpsert('Выпускается', true), 'update');
  assert.equal(decideTobaccoUpsert('Снят с производства', true), 'update');
  assert.equal(decideTobaccoUpsert(null, true), 'update');
});

test('статус сравнивается без учёта пробелов по краям', () => {
  assert.equal(decideTobaccoUpsert(' Выпускается ', false), 'create');
});
