import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIDENT_MATCH, matchLine, normalizeName, type CatalogTobacco } from './match';

// Названия — с полки прода; id условные.
const catalog: CatalogTobacco[] = [
  ['ds-blackcurrant', 'DARKSIDE', 'Blackcurrant'],
  ['ds-virgin-peach', 'DARKSIDE', 'Virgin Peach 2.0'],
  ['ds-mango-lassi', 'DARKSIDE', 'Mango Lassi 2.0'],
  ['ds-kalee', 'DARKSIDE', 'Kalee Grapefruit 2.0'],
  ['ds-voltage', 'DARKSIDE', 'Voltage'],
  ['ds-grape-core', 'DARKSIDE', 'Grape Core'],
  ['ds-barvy-orange', 'DARKSIDE', 'Barvy Orange'],
  ['ds-yagoda-malina', 'DARKSIDE', 'Yagoda Malina'],
  ['ahf-blackcurrant', 'AHF Tobacco', 'Блэккурант'],
  ['ahf-grapefruit', 'AHF Tobacco', 'Грейпфрутовый сок'],
  ['sl-millefeuille', 'Starline', 'Клубничный мильфей'],
  ['sl-pastille', 'Starline', 'Мятная пастилка'],
  ['sl-crumble', 'Starline', 'Черничный крамбл'],
  ['bb-raspberries', 'Black Burn', 'Raspberries'],
  ['bb-pear-lemonade', 'Black Burn', 'Pear lemonade'],
  ['bb-blackberry-lemonade', 'Black Burn', 'Blackberry Lemonade'],
  ['bb-violet-lemonade', 'Black Burn', 'Фиалковый Лимонад'],
  ['bb-popcorn', 'Black Burn', 'Original Popcorn'],
  ['bb-red-orange', 'Black Burn', 'Red Orange'],
  ['bb-tropical', 'Black Burn', 'Something Tropical'],
  ['bb-ananas', 'Black Burn', 'Ananas Shock'],
  ['hlg-panama', 'Хулиган', 'Panama'],
  ['hlg-tropika', 'Хулиган', 'Тропика'],
  ['sarma-maracuja', 'Сарма', 'Маракуйя'],
  ['sarma-grapefruit', 'Сарма', 'Грейпфрутовый сок'],
  ['sebero-maracuja', 'Sebero', 'Маракуйя'],
  ['sebero-barberry', 'Sebero', 'Барбарис'],
  ['sebero-lemon-fizz', 'Sebero', 'Лимонная шипучка'],
].map(([id, manufacturer, name]) => ({ id, manufacturer, lineName: null, name }));

const top = (name: string) => matchLine({ name }, catalog)[0];

test('matchLine finds exact flavors within the recognized brand', () => {
  const cases: Array<[string, string]> = [
    ['"Старлайн" (Клубничный мильфей), 250 г', 'sl-millefeuille'],
    ['"Старлайн" (Мятная пастилка), 250 г', 'sl-pastille'],
    ['Табак для кальяна Black Burn 200г Raspberries (Спелая лесная малина)', 'bb-raspberries'],
    ['Табак для кальяна Black Burn 200г Pear Lemonade (Грушевый лимонад)', 'bb-pear-lemonade'],
    ['Табак для кальяна Black Burn 200г Original Popcorn (Оригинальный попкорн)', 'bb-popcorn'],
    ['Табак для кальяна Black Burn 200г Red Orange (Красный апельсин)', 'bb-red-orange'],
    ['Табак для кальяна Black Burn 200г Something Tropical (Что-то тропическое)', 'bb-tropical'],
    ['Табак для кальяна Хулиган 200г Panama (Фруктовый салатик)', 'hlg-panama'],
    ['Табак для кальяна Сарма 360 Крепкая 200гр Маракуйя', 'sarma-maracuja'],
  ];
  for (const [name, id] of cases) {
    const best = top(name);
    assert.equal(best?.tobaccoId, id, name);
    assert.equal(best?.confidence, 100, name);
    assert.equal(best?.reason, 'catalog', name);
  }
});

test('matchLine transliterates a Cyrillic flavor to the Latin catalog name', () => {
  const cases: Array<[string, string]> = [
    ['"Дарк Сайд" Кор (Блэккерент), 250 г', 'ds-blackcurrant'],
    ['"Дарк Сайд" Кор (Вирджин Пич 2.0), 250 г', 'ds-virgin-peach'],
    ['"Дарк Сайд" Кор (Манго Ласси 2.0), 250 г', 'ds-mango-lassi'],
    ['"Дарк Сайд" Саботаж (Вольтэйдж) 250гр', 'ds-voltage'],
  ];
  for (const [name, id] of cases) {
    const best = top(name);
    assert.equal(best?.tobaccoId, id, name);
    assert.ok(best.confidence >= CONFIDENT_MATCH, `${name}: ${best.confidence}`);
  }
});

test('matchLine keeps a leading vowel and ignores one-consonant words in transliteration', () => {
  const tricky: CatalogTobacco[] = [
    { id: 'black-honey', manufacturer: 'Black Burn', lineName: null, name: 'Black Honey' },
    { id: 'green-tea', manufacturer: 'Black Burn', lineName: null, name: 'Green Tea' },
    { id: 'ice-apple', manufacturer: 'Black Burn', lineName: null, name: 'Ice Apple' },
  ];
  assert.deepEqual(matchLine({ name: 'Black Burn 200г Облако' }, tricky), []);
  assert.deepEqual(matchLine({ name: 'Black Burn 200г Что-то' }, tricky), []);
  assert.equal(matchLine({ name: 'Black Burn 200г Айс Эппл' }, tricky)[0]?.tobaccoId, 'ice-apple');
});

test('matchLine counts a one-consonant word only next to a matched longer word', () => {
  const short: CatalogTobacco[] = [
    { id: 'pink-me', manufacturer: 'DARKSIDE', lineName: 'Core', name: 'Pink Me' },
    { id: 'forever-young', manufacturer: 'DARKSIDE', lineName: 'Core', name: 'Forever young' },
    { id: 'green-tea', manufacturer: 'DARKSIDE', lineName: 'Core', name: 'Green Tea' },
  ];
  const pinkMe = matchLine({ name: '"Дарк Сайд" Кор (Пинк Ми), 250 г' }, short)[0];
  assert.equal(pinkMe?.tobaccoId, 'pink-me');
  assert.ok(pinkMe.confidence >= CONFIDENT_MATCH, `Пинк Ми: ${pinkMe.confidence}`);

  const foreverYoung = matchLine({ name: '"Дарк Сайд" Кор (Форевер Янг), 250 г' }, short)[0];
  assert.equal(foreverYoung?.tobaccoId, 'forever-young');
  assert.equal(foreverYoung.confidence, 90);

  assert.deepEqual(matchLine({ name: '"Дарк Сайд" Кор (Ми), 250 г' }, short), []);
  assert.deepEqual(matchLine({ name: '"Дарк Сайд" Кор (Что-то), 250 г' }, short), []);
  assert.deepEqual(matchLine({ name: '"Дарк Сайд" Кор (Ми то), 250 г' }, short), []);
});

test('matchLine tells one-consonant words apart by vowels', () => {
  // Пары с одной полки htreviews: скелет согласных у коротких слов совпадает.
  const pairs: CatalogTobacco[] = [
    { id: 'hard-ba', manufacturer: 'Хулиган', lineName: null, name: 'HARD BA' },
    { id: 'hard-boo', manufacturer: 'Хулиган', lineName: null, name: 'Hard Boo' },
    { id: 'kakao-maya', manufacturer: 'Хулиган', lineName: null, name: 'Kakao Maya' },
    { id: 'kakao-mayo', manufacturer: 'Хулиган', lineName: null, name: 'Kakao Mayo' },
    { id: 'ice-tea', manufacturer: 'Хулиган', lineName: null, name: 'Ice Tea' },
    { id: 'papaya', manufacturer: 'Хулиган', lineName: null, name: 'Papaya' },
  ];
  const confident = (name: string) =>
    matchLine({ name }, pairs)
      .filter((candidate) => candidate.confidence >= CONFIDENT_MATCH)
      .map((candidate) => candidate.tobaccoId);
  assert.deepEqual(confident('Табак для кальяна Хулиган 200г Хард Бу'), ['hard-boo']);
  assert.deepEqual(confident('Табак для кальяна Хулиган 200г Хард Ба'), ['hard-ba']);
  assert.deepEqual(confident('Табак для кальяна Хулиган 200г Какао Майо'), ['kakao-mayo']);
  assert.deepEqual(confident('Табак для кальяна Хулиган 200г Айс Ти'), ['ice-tea']);
  assert.deepEqual(confident('Табак для кальяна Хулиган 200г Папайя'), ['papaya']);
});

test('matchLine matches word forms by a common stem', () => {
  assert.equal(top('Табак для кальяна SEBERO Блэк БЧК 200гр Барбарисовая Шипучка')?.tobaccoId, 'sebero-barberry');
  assert.equal(top('Табак для кальяна Black Burn 200г Raspberry')?.tobaccoId, 'bb-raspberries');
});

test('matchLine does not stem short words or compound words', () => {
  const tricky: CatalogTobacco[] = [
    { id: 'pearl', manufacturer: 'Black Burn', lineName: null, name: 'Pearl' },
    { id: 'mint-pastille', manufacturer: 'Black Burn', lineName: null, name: 'Мятная пастилка' },
    { id: 'grape-core', manufacturer: 'Black Burn', lineName: null, name: 'Grape Core' },
    { id: 'kalee-grapefruit', manufacturer: 'Black Burn', lineName: null, name: 'Kalee Grapefruit 2.0' },
  ];
  assert.deepEqual(matchLine({ name: 'Black Burn 200г Pear' }, tricky), []);
  assert.deepEqual(matchLine({ name: 'Black Burn 200г Мята' }, tricky), []);
  assert.deepEqual(
    matchLine({ name: 'Black Burn 200г Grapefruit' }, tricky).map((candidate) => candidate.tobaccoId),
    ['kalee-grapefruit'],
  );
});

test('matchLine does not offer tobaccos of another brand when the brand is in the catalog', () => {
  const candidates = matchLine({ name: '"Дарк Сайд" Кор (Блэккерент), 250 г' }, catalog);
  assert.ok(candidates.every((candidate) => candidate.tobaccoId.startsWith('ds-')));
});

test('matchLine ranks candidates by confidence and keeps partial matches below exact ones', () => {
  const candidates = matchLine({ name: '"Дарк Сайд" Кор (Манго Ласси 2.0), 250 г' }, catalog);
  for (let index = 1; index < candidates.length; index += 1) {
    assert.ok(candidates[index - 1].confidence >= candidates[index].confidence);
  }
  const kalee = candidates.find((candidate) => candidate.tobaccoId === 'ds-kalee');
  assert.ok(kalee && kalee.confidence < CONFIDENT_MATCH);
});

test('matchLine prefers the catalog line named in the invoice between equal flavors', () => {
  const withLines: CatalogTobacco[] = [
    { id: 'sarma-classic', manufacturer: 'Сарма', lineName: 'Классическая', name: 'Маракуйя' },
    { id: 'sarma-360', manufacturer: 'Сарма', lineName: '360 Крепкая', name: 'Маракуйя' },
  ];
  const candidates = matchLine({ name: 'Табак для кальяна Сарма 360 Крепкая 200гр Маракуйя' }, withLines);
  assert.deepEqual(
    candidates.map((candidate) => candidate.tobaccoId),
    ['sarma-360', 'sarma-classic'],
  );
});

test('matchLine gives no high confidence for a flavor the brand does not have', () => {
  const candidates = matchLine(
    { name: 'Табак для кальяна Black Burn 200г Pineapple (Сочный ананас)' },
    catalog,
  );
  assert.ok(candidates.every((candidate) => candidate.confidence < CONFIDENT_MATCH));
});

test('matchLine gives no high confidence without a brand from the catalog', () => {
  const blansh = matchLine({ name: 'Табак для кальяна BLANSH 200 гр Грейпфрутовый Сок' }, catalog);
  assert.ok(blansh.length > 0);
  assert.ok(blansh.every((candidate) => candidate.confidence < CONFIDENT_MATCH && candidate.reason === 'no-brand'));

  const noBrand = matchLine({ name: 'Маракуйя 200г' }, catalog);
  assert.ok(noBrand.every((candidate) => candidate.confidence < CONFIDENT_MATCH));
});

test('matchLine returns nothing for a line that shares no tokens with the catalog', () => {
  assert.deepEqual(matchLine({ name: 'ОБЛАКО Египетская' }, catalog), []);
});

test('matchLine trusts supplier memory by article first', () => {
  const memory = [{ article: 'DS751', normalizedName: 'что-то другое', tobaccoId: 'ds-grape-core' }];
  const candidates = matchLine({ article: 'DS751', name: '"Дарк Сайд" Кор (Блэккерент), 250 г' }, catalog, memory);
  assert.deepEqual(candidates[0], { tobaccoId: 'ds-grape-core', confidence: 100, reason: 'memory' });
  assert.equal(candidates.filter((candidate) => candidate.tobaccoId === 'ds-grape-core').length, 1);
  assert.equal(candidates[1]?.tobaccoId, 'ds-blackcurrant');
});

test('matchLine trusts supplier memory by normalized name', () => {
  const memory = [{ normalizedName: normalizeName('ОБЛАКО  египетская.'), tobaccoId: 'sarma-maracuja' }];
  const candidates = matchLine({ name: 'Облако Египетская' }, catalog, memory);
  assert.deepEqual(candidates, [{ tobaccoId: 'sarma-maracuja', confidence: 100, reason: 'memory' }]);
});

test('normalizeName ignores case, ё and punctuation but keeps version numbers', () => {
  assert.equal(normalizeName('"Дарк Сайд" Кор (Манго Ласси 2.0), 250 г'), 'дарк сайд кор манго ласси 2.0 250 г');
  assert.equal(normalizeName('Чёрная  ваниль!'), normalizeName('черная ваниль'));
});
