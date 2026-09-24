import test from 'node:test';
import assert from 'node:assert/strict';
import { createTobacco, resetAppState, updateTobacco } from './state';
import {
  affinityKey,
  buildAffinity,
  characterOf,
  findSimilarMix,
  getMixerPalette,
  harmonyOf,
  nameOf,
  verdictOf,
  type BowlComponent,
  type MixerTobacco,
} from './mixer';

const tobacco = (overrides: Partial<MixerTobacco> & { id: string }): MixerTobacco => ({
  manufacturer: 'Тест',
  name: overrides.id,
  flavorProfiles: [],
  flavors: [],
  flavorTags: [],
  cooling: false,
  twist: false,
  mixCount: 0,
  officialStrength: null,
  communityStrength: null,
  ...overrides,
});

const bowl = (...items: Array<[MixerTobacco, number]>): BowlComponent[] =>
  items.map(([item, proportion]) => ({ tobacco: item, proportion }));

const berry = tobacco({ id: 'berry', flavorProfiles: ['berry', 'sweet'], flavors: ['земляника'] });
const tea = tobacco({ id: 'tea', flavorProfiles: ['floral_herbal'], flavors: ['чёрный чай', 'бергамот'] });
const ice = tobacco({
  id: 'ice',
  flavorProfiles: ['minty', 'fresh'],
  flavors: ['мята'],
  flavorTags: ['охлаждающий'],
  cooling: true,
  twist: true,
});
const spice = tobacco({ id: 'spice', flavorProfiles: ['spicy'], flavors: ['корица'], twist: true });

// --- палитра ---------------------------------------------------------------

test.describe('palette', () => {
  test.beforeEach(async () => {
    await resetAppState();
  });

  test('palette lists only in-stock, non-archived tobaccos', async () => {
    await updateTobacco('tobacco-grape-fog', { archived: true });

    const { tobaccos } = await getMixerPalette();
    const ids = tobaccos.map((item) => item.id);

    assert.equal(ids.includes('tobacco-peach-silk'), false);
    assert.equal(ids.includes('tobacco-grape-fog'), false);
    assert.equal(ids.includes('tobacco-citrus-breeze'), true);
  });

  test('palette marks cooling by the htreviews tag and twist by cooling or minty/spicy profile', async () => {
    const created = await createTobacco({
      manufacturer: 'Тест',
      name: 'Ледяная земляника',
      flavorProfiles: ['berry'],
      flavors: ['земляника'],
      flavorTags: ['охлаждающий'],
    });
    assert.ok(created && !('error' in created));

    const { tobaccos } = await getMixerPalette();
    const byId = new Map(tobaccos.map((item) => [item.id, item]));

    assert.deepEqual(
      [byId.get(created.id)?.cooling, byId.get(created.id)?.twist],
      [true, true],
    );
    // Mint Veil мятный, но без тега холодка: в колоде штриха, но не холодит.
    assert.deepEqual(
      [byId.get('tobacco-mint-veil')?.cooling, byId.get('tobacco-mint-veil')?.twist],
      [false, true],
    );
    assert.equal(byId.get('tobacco-spice-route')?.twist, true);
    assert.deepEqual(
      [byId.get('tobacco-berry-oasis')?.cooling, byId.get('tobacco-berry-oasis')?.twist],
      [false, false],
    );
  });

  test('palette counts catalogue mixes per tobacco', async () => {
    const { tobaccos } = await getMixerPalette();
    const byId = new Map(tobaccos.map((item) => [item.id, item]));

    // Mint Veil — в пяти миксах фикстуры, включая «Персиковый мираж» без персика в наличии.
    assert.equal(byId.get('tobacco-mint-veil')?.mixCount, 5);
    assert.equal(byId.get('tobacco-berry-oasis')?.mixCount, 3);
    assert.equal(byId.get('tobacco-melon-solo')?.mixCount, 0);
  });

  test('palette affinity uses sorted profile keys within 0..1', async () => {
    const { affinity } = await getMixerPalette();
    const keys = Object.keys(affinity);

    assert.ok(keys.length > 0);
    for (const key of keys) {
      const [left, right] = key.split('|');
      assert.equal(affinityKey(right!, left!), key);
      assert.ok(affinity[key]! >= 0 && affinity[key]! <= 1);
    }
    // Мята встречается с фрешем в каталоге чаще, чем с пряностью (ни разу).
    assert.ok(affinity['fresh|minty']! > affinity['minty|spicy']!);
  });
});

// --- сродство профилей -----------------------------------------------------

test('affinity key is symmetric and alphabetical', () => {
  assert.equal(affinityKey('sweet', 'fresh'), 'fresh|sweet');
  assert.equal(affinityKey('fresh', 'sweet'), 'fresh|sweet');
  assert.equal(affinityKey('berry', 'berry'), 'berry|berry');
});

test('affinity ranks frequent pairs above rare ones and unmet known pairs below met', () => {
  const affinity = buildAffinity(
    [
      [['sweet'], ['fresh']],
      [['sweet'], ['fresh']],
      [['sweet'], ['sour']],
    ],
    ['fresh', 'sour', 'sweet'],
  );

  assert.ok(affinity['fresh|sweet']! > affinity['sour|sweet']!);
  assert.ok(affinity['fresh|sour']! < affinity['sour|sweet']!);
});

test('affinity is neutral without catalogue data', () => {
  const empty = buildAffinity([], ['fresh', 'sweet']);
  assert.deepEqual(empty, { 'fresh|fresh': 0.5, 'fresh|sweet': 0.5, 'sweet|sweet': 0.5 });

  // Пряность в миксах не встречалась вовсе — о ней данных нет.
  const partial = buildAffinity([[['sweet'], ['fresh']]], ['fresh', 'spicy', 'sweet']);
  assert.equal(partial['spicy|sweet'], 0.5);
});

// --- гармония --------------------------------------------------------------

const neutral = buildAffinity([], ['berry', 'sweet', 'floral_herbal', 'minty', 'fresh', 'spicy']);

test('single component is a mono bowl with harmony 70', () => {
  assert.deepEqual(harmonyOf(bowl([berry, 100]), neutral), { harmony: 70, hints: [{ kind: 'mono' }] });
  assert.deepEqual(harmonyOf(bowl([ice, 100]), neutral), { harmony: 70, hints: [{ kind: 'mono' }] });
});

test('balanced bowl has no hints', () => {
  const result = harmonyOf(bowl([berry, 50], [tea, 35], [spice, 15]), neutral);
  assert.deepEqual(result.hints, []);
  assert.equal(result.harmony, 70);
});

test('pairs with higher affinity give higher harmony', () => {
  const affinity = buildAffinity(
    [
      [['berry', 'sweet'], ['floral_herbal']],
      [['berry', 'sweet'], ['floral_herbal']],
      [['berry'], ['spicy']],
    ],
    ['berry', 'sweet', 'floral_herbal', 'spicy'],
  );
  const loved = harmonyOf(bowl([berry, 60], [tea, 40]), affinity).harmony;
  const unmet = harmonyOf(bowl([tea, 75], [spice, 25]), affinity).harmony;

  assert.ok(loved > 70);
  assert.ok(unmet < 70);
});

test('cooling above 20% is penalised with its share', () => {
  const calm = harmonyOf(bowl([berry, 50], [tea, 30], [ice, 20]), neutral);
  const cold = harmonyOf(bowl([berry, 50], [tea, 20], [ice, 30]), neutral);

  assert.equal(calm.hints.some((hint) => hint.kind === 'too-cold'), false);
  assert.deepEqual(cold.hints.find((hint) => hint.kind === 'too-cold'), { kind: 'too-cold', value: 30 });
  assert.ok(cold.harmony < calm.harmony);
});

test('base below 35% is a weak base', () => {
  const weak = harmonyOf(bowl([berry, 30], [tea, 70]), neutral);
  const solid = harmonyOf(bowl([berry, 35], [tea, 65]), neutral);

  assert.deepEqual(weak.hints, [{ kind: 'weak-base' }]);
  assert.deepEqual(solid.hints, []);
  assert.ok(weak.harmony < solid.harmony);
});

test('twist above 25% is heavy', () => {
  const heavy = harmonyOf(bowl([berry, 60], [spice, 40]), neutral);
  const light = harmonyOf(bowl([berry, 75], [spice, 25]), neutral);

  assert.deepEqual(heavy.hints, [{ kind: 'heavy-twist' }]);
  assert.deepEqual(light.hints, []);
  assert.ok(heavy.harmony < light.harmony);
});

test('verdict steps at 85, 70 and 55', () => {
  assert.equal(verdictOf(100), 'classic');
  assert.equal(verdictOf(85), 'classic');
  assert.equal(verdictOf(84), 'confident');
  assert.equal(verdictOf(70), 'confident');
  assert.equal(verdictOf(69), 'bold');
  assert.equal(verdictOf(55), 'bold');
  assert.equal(verdictOf(54), 'ask-master');
  assert.equal(verdictOf(0), 'ask-master');
});

// --- характер --------------------------------------------------------------

test('character stays within 0..1 and follows the profiles', () => {
  const sour = tobacco({ id: 'sour', flavorProfiles: ['citrus', 'sour'] });
  const dark = tobacco({ id: 'dark', flavorProfiles: ['tobacco', 'spicy'] });

  for (const components of [bowl([berry, 100]), bowl([sour, 50], [ice, 50]), bowl([dark, 70], [tea, 30])]) {
    for (const value of Object.values(characterOf(components))) {
      assert.ok(value >= 0 && value <= 1);
    }
  }

  assert.ok(characterOf(bowl([berry, 100])).sweet > characterOf(bowl([sour, 100])).sweet);
  assert.ok(characterOf(bowl([sour, 100])).sour > characterOf(bowl([berry, 100])).sour);
  assert.ok(characterOf(bowl([ice, 100])).fresh > characterOf(bowl([dark, 100])).fresh);
  assert.ok(characterOf(bowl([dark, 100])).dense > characterOf(bowl([ice, 100])).dense);
});

test('recognised strength moves density, unrecognised is ignored', () => {
  const strong = tobacco({ id: 'strong', flavorProfiles: ['berry'], communityStrength: 'Крепкая' });
  const light = tobacco({ id: 'light', flavorProfiles: ['berry'], officialStrength: 'Лёгкая' });
  const aboveMedium = tobacco({ id: 'above', flavorProfiles: ['berry'], officialStrength: 'Выше средней' });
  const medium = tobacco({ id: 'medium', flavorProfiles: ['berry'], officialStrength: 'Средняя' });
  const unknown = tobacco({ id: 'unknown', flavorProfiles: ['berry'], officialStrength: 'как повезёт' });
  const plain = tobacco({ id: 'plain', flavorProfiles: ['berry'] });

  const dense = (item: MixerTobacco) => characterOf(bowl([item, 100])).dense;

  assert.ok(dense(strong) > dense(aboveMedium));
  assert.ok(dense(aboveMedium) > dense(medium));
  assert.ok(dense(medium) > dense(light));
  assert.equal(dense(unknown), dense(plain));
});

// --- имя -------------------------------------------------------------------

test('name joins first notes and turns a cooling twist into «со льдом»', () => {
  assert.equal(nameOf(bowl([berry, 100])), 'Земляника');
  assert.equal(nameOf(bowl([berry, 60], [tea, 40])), 'Земляника и чёрный чай');
  assert.equal(nameOf(bowl([berry, 50], [tea, 30], [spice, 20])), 'Земляника, чёрный чай и корица');
  assert.equal(nameOf(bowl([berry, 50], [tea, 35], [ice, 15])), 'Земляника и чёрный чай со льдом');
  // Холодная основа — это нота, а не штрих.
  assert.equal(nameOf(bowl([ice, 70], [berry, 30])), 'Мята и земляника');
});

test('name falls back to the tobacco name without notes and skips repeated notes', () => {
  const noNotes = tobacco({ id: 'x', name: 'Секрет мастера' });
  const berryToo = tobacco({ id: 'berry-2', flavors: ['земляника', 'сливки'] });

  assert.equal(nameOf(bowl([noNotes, 100])), 'Секрет мастера');
  assert.equal(nameOf(bowl([berry, 50], [berryToo, 50])), 'Земляника');
});

// --- похожий микс ----------------------------------------------------------

test('similar mix blends shared proportions and profile overlap with a threshold of 30', () => {
  const mixes = [
    {
      id: 'same',
      name: 'Тот же',
      avgRating: 4.5,
      flavorProfiles: ['berry', 'sweet', 'floral_herbal'],
      components: [
        { tobaccoId: 'berry', proportion: 60 },
        { tobaccoId: 'tea', proportion: 40 },
      ],
    },
    {
      id: 'far',
      name: 'Далёкий',
      avgRating: 4.9,
      flavorProfiles: ['spicy'],
      components: [{ tobaccoId: 'spice', proportion: 100 }],
    },
  ];

  // Пересечение долей — 50 (земляника 50 из 60), профили — Жаккар 2/5: 0,7·50 + 0,3·40 = 47.
  assert.deepEqual(findSimilarMix(bowl([berry, 50], [ice, 50]), mixes), {
    id: 'same',
    name: 'Тот же',
    avgRating: 4.5,
    similarity: 47,
  });
  assert.equal(findSimilarMix(bowl([berry, 60], [tea, 40]), mixes)?.similarity, 100);
  // Общих табаков нет, профили не пересекаются.
  assert.equal(findSimilarMix(bowl([ice, 100]), mixes), null);
});
