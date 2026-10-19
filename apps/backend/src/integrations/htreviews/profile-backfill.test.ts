import assert from 'node:assert/strict';
import test from 'node:test';
import { planMixProfileBackfill, planTobaccoProfileBackfill } from './profile-backfill';

// Issue #182: пересчёт уже сохранённых профилей из rawSourceTags.

test('склеенные профили табака пересчитываются по новой таксономии', () => {
  const plan = planTobaccoProfileBackfill([
    { id: 'lemon', flavorProfiles: ['citrus', 'fruity', 'sour'], rawSourceTags: ['Лимон'] },
    { id: 'mint', flavorProfiles: ['fresh', 'minty'], rawSourceTags: ['Мята'] },
    { id: 'vanilla', flavorProfiles: ['dessert', 'sweet'], rawSourceTags: ['Ваниль'] },
  ]);
  assert.deepEqual(plan.updates, [
    { id: 'lemon', from: ['citrus', 'fruity', 'sour'], to: ['citrus'] },
    { id: 'mint', from: ['fresh', 'minty'], to: ['minty'] },
    { id: 'vanilla', from: ['dessert', 'sweet'], to: ['dessert'] },
  ]);
  assert.deepEqual(plan.curated, []);
});

test('табак, уже совпадающий с новой таксономией, не трогается', () => {
  const plan = planTobaccoProfileBackfill([
    { id: 'mango', flavorProfiles: ['fruity'], rawSourceTags: ['Манго'] },
  ]);
  assert.deepEqual(plan.updates, []);
  assert.deepEqual(plan.curated, []);
});

test('ручная курация не затирается: профили, отличные от прежней логики, уходят в список', () => {
  const plan = planTobaccoProfileBackfill([
    { id: 'apple', flavorProfiles: ['dessert', 'fruity', 'sweet'], rawSourceTags: ['Яблоко'] },
  ]);
  assert.deepEqual(plan.updates, []);
  assert.deepEqual(plan.curated, [
    { id: 'apple', current: ['dessert', 'fruity', 'sweet'], expected: ['fruity'] },
  ]);
});

test('порядок профилей в БД не важен при сверке с прежней логикой', () => {
  const plan = planTobaccoProfileBackfill([
    { id: 'lime', flavorProfiles: ['sour', 'fruity', 'citrus'], rawSourceTags: ['Лайм'] },
  ]);
  assert.deepEqual(plan.updates, [{ id: 'lime', from: ['sour', 'fruity', 'citrus'], to: ['citrus'] }]);
});

test('профили микса собираются объединением профилей его табаков', () => {
  const plan = planMixProfileBackfill([
    { id: 'a', flavorProfiles: ['citrus', 'sour', 'fruity', 'minty', 'fresh'], componentProfiles: [['citrus'], ['minty']] },
    { id: 'b', flavorProfiles: ['berry', 'minty'], componentProfiles: [['berry'], ['minty', 'berry']] },
  ]);
  assert.deepEqual(plan, [{ id: 'a', from: ['citrus', 'sour', 'fruity', 'minty', 'fresh'], to: ['citrus', 'minty'] }]);
});

test('микс без профилей у табаков сохраняет колонку как есть', () => {
  assert.deepEqual(planMixProfileBackfill([{ id: 'c', flavorProfiles: ['sweet'], componentProfiles: [[], []] }]), []);
});
