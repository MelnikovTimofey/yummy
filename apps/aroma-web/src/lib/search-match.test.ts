import test from 'node:test';
import assert from 'node:assert/strict';
import { matchSearch, prepareSearchQuery, prepareSearchTarget, rankBySearch, searchRank } from './search-match';

// Копия этого файла лежит в apps/backend, apps/master-web и apps/aroma-web (#522):
// одна логика сравнения на трёх поверхностях, тест-кейсы держим одинаковыми.

const found = (query: string, ...fields: string[]) => matchSearch(query, fields) !== null;

test('регистр, ё, пробелы, дефисы, апострофы и удвоенные буквы не мешают', () => {
  assert.equal(found('blackburn', 'Black Burn'), true);
  assert.equal(found('BlackBurn', 'Black Burn'), true);
  assert.equal(found('black-burn', 'Black Burn'), true);
  assert.equal(found('troffimofs', 'Trofimoff’s'), true);
  assert.equal(found("trofimoff's", 'Trofimoff’s'), true);
  assert.equal(found('Musthave', 'MUSTHAVE'), true);
  assert.equal(found('must have', 'MUSTHAVE'), true);
  assert.equal(found('елка', 'Ёлка'), true);
  assert.equal(found('Ёлка', 'елка'), true);
});

test('латиница и кириллица сопоставляются транслитом в обе стороны', () => {
  for (const query of ['Hooligan', 'hooligan', 'хулиган', 'khuligan', 'huligan']) {
    assert.equal(found(query, 'Хулиган'), true, query);
  }
  assert.equal(found('дарксайд', 'DARKSIDE'), true);
  assert.equal(found('klubnika', 'Клубника'), true);
  assert.equal(found('клубн', 'Клубника'), true);
  assert.equal(found('клубника', 'Klubnika'), true);
  assert.equal(found('шоколад', 'Shokolad'), true);
  assert.equal(found('Afzal', 'Афзал'), true);
});

test('неверная раскладка клавиатуры', () => {
  assert.equal(found('вфклышву', 'DARKSIDE'), true);
  assert.equal(found('ckjy', 'Слон'), true);
  assert.equal(found('k.,jdm', 'Любовь'), true);
});

test('опечатки: одна правка от 4 букв, две — от 8', () => {
  assert.equal(found('Tangers', 'Tangiers'), true);
  assert.equal(found('Афзал', 'Afzal'), true);
  assert.equal(found('Афзл', 'Afzal'), true);
  assert.equal(found('клубинка', 'Клубника'), true);
  assert.equal(found('mitn', 'Mint'), true);
  assert.equal(found('blakburn', 'Black Burn'), true);
  assert.equal(found('cherrry', 'Cherry'), true);
  assert.equal(found('chocolatte', 'Chocolate'), true);
  assert.equal(found('chokolatt', 'Chocolate'), true);
  assert.equal(found('chkolatte', 'Chocolate'), true);
  assert.equal(found('mng', 'Mango'), false);
  assert.equal(found('tangrs', 'Tangiers'), false);
});

test('короткие запросы — только подстрока, без опечаток', () => {
  assert.equal(found('mi', 'Mint'), true);
  assert.equal(found('mo', 'Mint'), false);
  assert.equal(found('ки', 'Хулиган'), false);
  assert.equal(found('ka', 'Карамель'), false);
  assert.equal(found('кар', 'Karamel'), true);
  assert.equal(found('an', 'Mango'), true);
  assert.equal(found('ab', 'Mango', 'Banana'), false);
  assert.equal(found('mnt', 'Mint'), false);
  assert.equal(found('dfg', 'Афзал'), false);
});

test('каждое слово запроса — в любом поле: бренд плюс вкус', () => {
  assert.equal(found('дарк банан', 'Bananapapa', 'DARKSIDE'), true);
  assert.equal(found('дарк банан', 'Banana', 'MUSTHAVE'), false);
  assert.equal(found('darkside банан', 'Банан', 'Darkside'), true);
  assert.equal(found('сарма мара', 'Маракуйя', 'Сарма'), true);
});

test('пустой запрос ничего не фильтрует', () => {
  assert.equal(prepareSearchQuery('   '), null);
  assert.equal(prepareSearchQuery("' - ."), null);
  assert.deepEqual(rankBySearch(['b', 'a'], '  ', (item) => [item]), ['b', 'a']);
});

test('ранг: с начала слова — 0, внутри слова — 1, похожее — 2', () => {
  assert.equal(matchSearch('burn', ['Black Burn']), 0);
  assert.equal(matchSearch('hooligan', ['Хулиган']), 0);
  assert.equal(matchSearch('вфклышву', ['DARKSIDE']), 0);
  assert.equal(matchSearch('side', ['DARKSIDE']), 1);
  assert.equal(matchSearch('tangers', ['Tangiers']), 2);
  assert.equal(matchSearch('дарк tangers', ['Darkside', 'Tangiers']), 2);
  assert.equal(matchSearch('zzz', ['Mint']), null);
});

test('rankBySearch: точные сверху, внутри группы — исходный порядок', () => {
  const items = ['Mind Fresh', 'Spearmint', 'Mint Shake', 'Hint', 'Mango', 'Ice Mint'];
  assert.deepEqual(
    rankBySearch(items, 'mint', (item) => [item]),
    ['Mint Shake', 'Ice Mint', 'Spearmint', 'Mind Fresh', 'Hint'],
  );
});

test('поля без нечёткого сравнения: только подстрока как есть', () => {
  assert.equal(matchSearch('лаик', [], ['Лайк']), null);
  assert.equal(matchSearch('копченая', [], ['Копчёная груша']), 0);
  assert.equal(matchSearch('kopchenaya', [], ['Копчёная груша']), null);
  assert.equal(matchSearch('груша kopchenaya', ['Груша'], ['Копчёная груша']), null);
  assert.equal(matchSearch('zzzqqq', ['Мята'], ['низкая крепость']), null);
});

test('подготовленный запрос и цель переиспользуются', () => {
  const query = prepareSearchQuery('hooligan');
  assert.ok(query);
  const targets = ['Хулиган', 'Darkside', 'Hooligans Club'].map((name) => prepareSearchTarget([name]));
  assert.deepEqual(targets.map((target) => searchRank(query, target)), [0, null, 0]);
  assert.deepEqual(targets.map((target) => searchRank(query, target)), [0, null, 0]);
});
