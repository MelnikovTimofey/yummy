import test from 'node:test';
import assert from 'node:assert/strict';
import { byCountDesc, filterCatalogMixes, flavorsMatchedFirst } from './catalog';

const mix = (
  name: string,
  extra: Partial<{
    description: string;
    flavorProfiles: string[];
    flavors: string[];
    available: boolean;
    components: Array<{ name: string; manufacturer: string }>;
  }> = {},
) => ({
  id: name,
  name,
  description: '',
  flavorProfiles: [],
  flavors: [],
  available: true,
  components: [],
  ...extra,
});

const names = (items: Array<{ name: string }>) => items.map((item) => item.name);
const noFilter = { query: '', profiles: [], flavors: [] };

// Сортировки в Каталоге нет (#181): гость видит меню по алфавиту.
test('filterCatalogMixes без фильтров отдаёт доступные миксы по алфавиту', () => {
  const mixes = [mix('Янтарный базар'), mix('Ананас с мятой'), mix('Банан', { available: false }), mix('Космокола')];

  assert.deepEqual(names(filterCatalogMixes(mixes, noFilter)), ['Ананас с мятой', 'Космокола', 'Янтарный базар']);
});

test('filterCatalogMixes ищет текст в названии, описании, вкусах, табаках и брендах', () => {
  const mixes = [
    mix('Вишнёвый чизкейк'),
    mix('Космокола', { description: 'Черника и кола со льдом' }),
    mix('Лимон с хвоей', { flavors: ['хвойный'] }),
    mix('Банановая сторона', { components: [{ name: 'Bananapapa', manufacturer: 'DARKSIDE' }] }),
  ];

  assert.deepEqual(names(filterCatalogMixes(mixes, { ...noFilter, query: 'ЧИЗ' })), ['Вишнёвый чизкейк']);
  assert.deepEqual(names(filterCatalogMixes(mixes, { ...noFilter, query: 'кола' })), ['Космокола']);
  assert.deepEqual(names(filterCatalogMixes(mixes, { ...noFilter, query: 'хвой' })), ['Лимон с хвоей']);
  assert.deepEqual(names(filterCatalogMixes(mixes, { ...noFilter, query: 'darkside' })), ['Банановая сторона']);
  assert.deepEqual(names(filterCatalogMixes(mixes, { ...noFilter, query: '  papa ' })), ['Банановая сторона']);
});

// Внутри характеров и внутри вкусов — «или», между ними и с текстом — «и».
test('filterCatalogMixes: «или» внутри типа метки, «и» между типами и с текстом', () => {
  const mixes = [
    mix('Дыня с малиной', { flavorProfiles: ['berry', 'fruity'], flavors: ['дыня', 'малина'] }),
    mix('Космокола', { flavorProfiles: ['berry', 'fresh'], flavors: ['черника', 'холодок'] }),
    mix('Лимон с хвоей', { flavorProfiles: ['citrus', 'fresh'], flavors: ['лимон', 'холодок'] }),
    mix('Молоко и банан', { flavorProfiles: ['dessert'], flavors: ['молоко', 'банан'] }),
  ];

  assert.deepEqual(
    names(filterCatalogMixes(mixes, { ...noFilter, profiles: ['berry', 'citrus'] })),
    ['Дыня с малиной', 'Космокола', 'Лимон с хвоей'],
  );
  assert.deepEqual(
    names(filterCatalogMixes(mixes, { ...noFilter, profiles: ['berry'], flavors: ['холодок', 'банан'] })),
    ['Космокола'],
  );
  assert.deepEqual(
    names(filterCatalogMixes(mixes, { query: 'хвоей', profiles: ['fresh'], flavors: ['холодок'] })),
    ['Лимон с хвоей'],
  );
  assert.deepEqual(names(filterCatalogMixes(mixes, { query: 'дыня', profiles: ['dessert'], flavors: [] })), []);
});

// Совпавший вкус идёт первым, чтобы в строке было видно, почему микс в выдаче.
test('flavorsMatchedFirst поднимает выбранные и найденные вкусы, сохраняя порядок остальных', () => {
  const flavors = ['арбуз', 'барбарис', 'дыня', 'лайм', 'лимон', 'холодок'];

  assert.deepEqual(flavorsMatchedFirst(flavors, '', ['холодок']), ['холодок', 'арбуз', 'барбарис', 'дыня', 'лайм', 'лимон']);
  assert.deepEqual(flavorsMatchedFirst(flavors, 'ЛИМ', ['дыня']), ['дыня', 'лимон', 'арбуз', 'барбарис', 'лайм', 'холодок']);
  assert.deepEqual(flavorsMatchedFirst(flavors, '', []), flavors);
});

// Частые вкусы и характеры первыми — в шторке «Фильтры» и в счётчиках (#181).
test('byCountDesc сортирует по убыванию счётчика, при равенстве — по алфавиту', () => {
  const counts = { мята: 11, лимон: 11, малина: 7, ваниль: 2 };

  assert.deepEqual(byCountDesc(['ваниль', 'малина', 'мята', 'лимон', 'кашмир'], counts), ['лимон', 'мята', 'малина', 'ваниль', 'кашмир']);

  // Ключи характеров латиницей, гость видит русские подписи: равные счётчики — по подписи.
  const labels: Record<string, string> = { sour: 'Кислый', citrus: 'Цитрусовый', fruity: 'Фруктовый' };
  assert.deepEqual(
    byCountDesc(['citrus', 'sour', 'fruity'], { citrus: 21, sour: 21, fruity: 47 }, (key) => labels[key]),
    ['fruity', 'sour', 'citrus'],
  );
});
