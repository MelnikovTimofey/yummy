import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignRails,
  matchesRule,
  parsePool,
  parseRailRule,
  parseRails,
  termShares,
  type PoolMix,
  type RuleTobacco,
} from './editorial-rails';

const tobacco = (overrides: Partial<RuleTobacco> = {}): RuleTobacco => ({
  flavorProfiles: [],
  flavors: [],
  flavorTags: [],
  ...overrides,
});

const berry = tobacco({ flavorProfiles: ['berry', 'fruity'], flavors: ['земляника'] });
const tea = tobacco({ flavorProfiles: ['floral_herbal'], flavors: ['чай'], flavorTags: ['напитки'] });
const ice = tobacco({ flavorProfiles: ['fresh', 'minty'], flavors: ['холодок'], flavorTags: ['охлаждающий'] });
const cake = tobacco({ flavorProfiles: ['dessert', 'sweet'], flavors: ['чизкейк'] });
const leaf = tobacco({ flavorProfiles: ['tobacco'], flavors: ['табачный'] });

const mix = (slug: string, set: PoolMix['set'], components: Array<[RuleTobacco, number]>): PoolMix => ({
  slug,
  set,
  components: components.map(([item, proportion]) => ({ tobacco: item, proportion })),
});

test('parseRailRule: набор, основа, наличие, исключения и лимит табаков', () => {
  assert.deepEqual(parseRailRule('хиты · основа berry|citrus · есть охлаждающий · без tobacco, spicy · до 3 табаков'), {
    set: 'хиты',
    lead: [['berry', 'citrus']],
    has: [['охлаждающий']],
    none: ['tobacco', 'spicy'],
    maxComponents: 3,
  });
  assert.deepEqual(parseRailRule('основа dessert'), {
    set: 'все',
    lead: [['dessert']],
    has: [],
    none: [],
    maxComponents: null,
  });
});

test('parseRailRule: незнакомая часть правила — ошибка, а не молчаливый пропуск', () => {
  assert.throws(() => parseRailRule('основа berry · сладко'), /сладко/);
});

test('termShares: доля термина — сумма долей табаков, в таксономии которых он есть', () => {
  const shares = termShares(mix('m', 'хиты', [[berry, 40], [tea, 50], [ice, 10]]).components);
  assert.equal(shares.get('berry'), 40);
  assert.equal(shares.get('чай'), 50);
  assert.equal(shares.get('охлаждающий'), 10);
  assert.equal(shares.get('dessert'), undefined);
});

test('matchesRule: основа требует ведущей доли, «есть» — любой', () => {
  const frostBerry = mix('frost', 'хиты', [[berry, 40], [tea, 50], [ice, 10]]);
  assert.equal(matchesRule(frostBerry, parseRailRule('основа berry · есть охлаждающий')), true);
  // 10% холодка — штрих, а не основа.
  assert.equal(matchesRule(frostBerry, parseRailRule('основа охлаждающий')), false);
  assert.equal(matchesRule(frostBerry, parseRailRule('основа dessert|berry')), true);
});

test('matchesRule: исключение срабатывает на любой доле', () => {
  const frostBerry = mix('frost', 'хиты', [[berry, 40], [tea, 50], [ice, 10]]);
  assert.equal(matchesRule(frostBerry, parseRailRule('основа berry · без охлаждающий')), false);
});

test('matchesRule: набор и число табаков', () => {
  const niche = mix('leaf', 'ниша', [[leaf, 60], [tea, 40]]);
  assert.equal(matchesRule(niche, parseRailRule('хиты · основа tobacco')), false);
  assert.equal(matchesRule(niche, parseRailRule('ниша · основа tobacco')), true);
  assert.equal(matchesRule(niche, parseRailRule('основа tobacco · до 1 табака')), false);
});

test('matchesRule: крепость табака — тоже термин правила', () => {
  const strong = tobacco({ flavorProfiles: ['fruity'], flavors: ['вишня'], strength: 'Крепкая' });
  const dark = mix('dark', 'ниша', [[strong, 60], [ice, 40]]);
  assert.equal(matchesRule(dark, parseRailRule('основа крепкая')), true);
  assert.equal(matchesRule(mix('soft', 'ниша', [[strong, 30], [ice, 70]]), parseRailRule('основа крепкая')), false);
});

test('assignRails: порядок пула, лимит размера и не больше двух рейлов на микс', () => {
  const pool = [
    mix('a', 'хиты', [[berry, 100]]),
    mix('b', 'хиты', [[berry, 70], [ice, 30]]),
    mix('c', 'хиты', [[berry, 60], [cake, 40]]),
    mix('d', 'хиты', [[cake, 100]]),
  ];
  const rails = [
    { slug: 'berries', rule: parseRailRule('основа berry') },
    { slug: 'berries-again', rule: parseRailRule('основа berry') },
    { slug: 'berries-third', rule: parseRailRule('основа berry') },
    { slug: 'desserts', rule: parseRailRule('основа dessert') },
  ];

  const assigned = assignRails(rails, pool, { maxSize: 2, maxRailsPerMix: 2 });

  assert.deepEqual(assigned.get('berries'), ['a', 'b']);
  assert.deepEqual(assigned.get('berries-again'), ['a', 'b']);
  // a и b уже в двух рейлах — третьему достаётся только c.
  assert.deepEqual(assigned.get('berries-third'), ['c']);
  assert.deepEqual(assigned.get('desserts'), ['c', 'd']);
});

test('parsePool: секции задают набор, состав — «производитель / линейка / название NN%»', () => {
  const md = [
    '## Хиты',
    '',
    '| № | Название | Состав | Описание | Сигнал спроса | Источник |',
    '|---|---|---|---|---|---|',
    '| 1 | Морозная ягода | DARKSIDE / Core / Wildberry 40% · DARKSIDE / Core / Red Tea 50% · DARKSIDE / Core / Supernova 10% | Ягоды на чае. | хит | [сайт](https://example.ru/a) |',
    '',
    '## Ниша',
    '',
    '| № | Название | Состав | Описание | Сигнал спроса | Источник |',
    '|---|---|---|---|---|---|',
    '| 1 | Лист | Tangiers / — / Cane Mint 100% | Мята. | ниша | [сайт](https://example.ru/b) |',
  ].join('\n');

  const pool = parsePool(md);

  assert.deepEqual(
    pool.map((item) => [item.slug, item.set, item.name, item.description]),
    [
      ['hit-01', 'хиты', 'Морозная ягода', 'Ягоды на чае.'],
      ['niche-01', 'ниша', 'Лист', 'Мята.'],
    ],
  );
  assert.deepEqual(pool[0].components[2], {
    manufacturer: 'DARKSIDE',
    lineName: 'Core',
    name: 'Supernova',
    proportion: 10,
  });
  assert.deepEqual(pool[1].components, [{ manufacturer: 'Tangiers', lineName: '', name: 'Cane Mint', proportion: 100 }]);
});

test('parsePool: сумма долей не 100 — ошибка с номером микса', () => {
  const md = [
    '## Хиты',
    '| № | Название | Состав | Описание | Сигнал спроса | Источник |',
    '|---|---|---|---|---|---|',
    '| 7 | Кривой | DARKSIDE / Core / Cola 50% · DARKSIDE / Core / Supernova 10% | . | . | . |',
  ].join('\n');
  assert.throws(() => parsePool(md), /hit-07.*60/);
});

test('parseRails: таблица рейлов с правилами', () => {
  const md = [
    '| Slug | Заголовок | Подпись | Правило |',
    '|---|---|---|---|',
    '| `berry-ice` | Ягоды со льдом | Сочно и морозно. | `хиты · основа berry · есть охлаждающий` |',
  ].join('\n');

  assert.deepEqual(parseRails(md), [
    {
      slug: 'berry-ice',
      title: 'Ягоды со льдом',
      subtitle: 'Сочно и морозно.',
      rule: { set: 'хиты', lead: [['berry']], has: [['охлаждающий']], none: [], maxComponents: null },
    },
  ]);
});

test('parseRails: экранированный «\\|» в ячейке — альтернатива, а не граница колонки', () => {
  const md = '| `tropics` | Тропики | Манго и ананас. | `основа манго\\|ананас` |';
  assert.deepEqual(parseRails(md)[0].rule.lead, [['манго', 'ананас']]);
});
