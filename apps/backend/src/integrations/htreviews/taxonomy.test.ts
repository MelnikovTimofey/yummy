import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTaxonomyCandidate } from './taxonomy';

// Issue #118: табак, у которого ВСЕ исходные теги — profile-only, оставался
// без вкусов. Fallback (Option 1+) возвращает осмысленные profile-only теги,
// но не зонтичные категорийные (фрукты/ягоды/цитрус/десерт).

test('осмысленный profile-only тег попадает во flavors как fallback (issue #118)', () => {
  const result = buildTaxonomyCandidate(['Парфюм']);
  assert.deepEqual(result.flavorProfiles, ['perfume']);
  assert.deepEqual(result.flavors, ['парфюм']);
});

test('одиночный табачный тег даёт и категорию, и вкус-fallback (issue #118)', () => {
  const result = buildTaxonomyCandidate(['Табачный']);
  assert.deepEqual(result.flavorProfiles, ['tobacco']);
  assert.deepEqual(result.flavors, ['табачный']);
});

test('зонтичный категорийный тег НЕ попадает во flavors (issue #118)', () => {
  const result = buildTaxonomyCandidate(['Фрукты']);
  assert.deepEqual(result.flavorProfiles, ['fruity']);
  assert.deepEqual(result.flavors, []);
});

test('при наличии настоящего вкуса fallback не срабатывает', () => {
  // Алкоголь+Табачный — profile-only, Орех — настоящий вкус: остаётся только орех.
  const result = buildTaxonomyCandidate(['Алкоголь', 'Орех', 'Табачный']);
  assert.deepEqual(result.flavors, ['орех']);
  assert.equal(result.flavorProfiles.includes('tobacco'), true);
  assert.equal(result.flavorTags.includes('напитки'), true);
});

test('без исходных тегов flavors остаётся пустым', () => {
  const result = buildTaxonomyCandidate([]);
  assert.deepEqual(result.flavors, []);
  assert.deepEqual(result.flavorProfiles, []);
});

test('смесь зонтичного и осмысленного profile-only: во flavors только осмысленный', () => {
  // Фрукты (зонтичный) + Специи (осмысленный) и оба profile-only → fallback
  // отдаёт только «специи».
  const result = buildTaxonomyCandidate(['Фрукты', 'Специи']);
  assert.deepEqual(result.flavors, ['специи']);
});

// Issue #182: один тег htreviews даёт ровно один профиль. Производных
// sour/fresh/sweet нет, fruity — только по фруктовым тегам.

test('цитрусовый тег даёт только citrus (issue #182)', () => {
  assert.deepEqual(buildTaxonomyCandidate(['Лимон']).flavorProfiles, ['citrus']);
  assert.deepEqual(buildTaxonomyCandidate(['Юдзу']).flavorProfiles, ['citrus']);
});

test('ягодный тег даёт только berry (issue #182)', () => {
  assert.deepEqual(buildTaxonomyCandidate(['Малина']).flavorProfiles, ['berry']);
});

test('мятный тег даёт только minty и оставляет холодок мета-тегом (issue #182)', () => {
  const result = buildTaxonomyCandidate(['Мята']);
  assert.deepEqual(result.flavorProfiles, ['minty']);
  assert.deepEqual(result.flavorTags, ['охлаждающий']);
});

test('десертный тег даёт только dessert (issue #182)', () => {
  assert.deepEqual(buildTaxonomyCandidate(['Ваниль']).flavorProfiles, ['dessert']);
});

test('fruity ставится только по фруктовым тегам (issue #182)', () => {
  assert.deepEqual(buildTaxonomyCandidate(['Манго', 'Лайм', 'Клубника']).flavorProfiles, ['berry', 'citrus', 'fruity']);
});

test('ни один тег не даёт sour, fresh или sweet (issue #182)', () => {
  const tags = ['Лимон', 'Апельсин', 'Мята', 'Ментол', 'Карамель', 'Шоколад', 'Ягоды', 'Цитрус', 'Десерт'];
  const { flavorProfiles } = buildTaxonomyCandidate(tags);
  for (const key of ['sour', 'fresh', 'sweet']) {
    assert.equal(flavorProfiles.includes(key), false, key);
  }
});
