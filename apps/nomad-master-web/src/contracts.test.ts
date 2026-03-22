import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInventorySummary,
  normalizeDashboardSummary,
  normalizeMixRecord,
  normalizeRailRecord,
  parseDelimitedList,
  sortInventoryItems,
  sortMixes,
  sortRails,
} from './contracts';

test('buildInventorySummary counts stock states', () => {
  const summary = buildInventorySummary([
    { id: '1', name: 'A', manufacturer: 'Nomad', inStock: true },
    { id: '2', name: 'B', manufacturer: 'Nomad', inStock: false },
    { id: '3', name: 'C', manufacturer: 'Nomad', inStock: true },
  ]);

  assert.deepEqual(summary, {
    totalTobaccos: 3,
    inStockCount: 2,
    outOfStockCount: 1,
  });
});

test('sortInventoryItems places in-stock tobaccos first', () => {
  const sorted = sortInventoryItems([
    { id: '2', name: 'Zulu', manufacturer: 'Nomad', inStock: false },
    { id: '1', name: 'Alpha', manufacturer: 'Nomad', inStock: true },
    { id: '3', name: 'Beta', manufacturer: 'Nomad', inStock: false },
  ]);

  assert.deepEqual(sorted.map((item) => item.id), ['1', '3', '2']);
});

test('parseDelimitedList trims empty chunks and duplicates', () => {
  assert.deepEqual(parseDelimitedList(' fresh, citrus\nfresh; mint '), ['fresh', 'citrus', 'mint']);
});

test('normalizeMixRecord accepts inStock alias and component objects', () => {
  const mix = normalizeMixRecord({
    mixId: 'mix-1',
    name: 'Тестовый микс',
    description: 'Описание',
    componentIds: ['c-1'],
    components: [
      {
        id: 'c-2',
        name: 'Компонент',
        manufacturer: 'Nomad',
        flavors: ['мята'],
      },
    ],
    flavorProfiles: ['fresh'],
    flavors: ['мята'],
    avgRating: '4.7',
    popularity: 11,
    inStock: false,
  });

  assert.equal(mix.id, 'mix-1');
  assert.equal(mix.available, false);
  assert.deepEqual(mix.componentIds, ['c-1', 'c-2']);
  assert.deepEqual(mix.components[0], {
    id: 'c-2',
    name: 'Компонент',
    manufacturer: 'Nomad',
    flavors: ['мята'],
  });
});

test('normalizeRailRecord accepts mix refs and active alias', () => {
  const rail = normalizeRailRecord({
    id: 'rail-1',
    name: 'Тестовый рейл',
    type: 'curated',
    description: 'Описание',
    mixes: [
      {
        mixId: 'mix-1',
        mixName: 'Цитрусовый караван',
      },
    ],
    active: false,
  });

  assert.equal(rail.id, 'rail-1');
  assert.equal(rail.active, false);
  assert.deepEqual(rail.mixIds, ['mix-1']);
  assert.deepEqual(rail.mixes[0], {
    id: 'mix-1',
    name: 'Цитрусовый караван',
  });
});

test('normalizeDashboardSummary supports nested inventory payload', () => {
  const summary = normalizeDashboardSummary({
    inventory: {
      total: 6,
      inStockCount: 5,
      outOfStockCount: 1,
    },
    smokeCtaTotal: 7,
    topMixes: [
      {
        mixId: 'mix-1',
        mixName: 'Цитрусовый караван',
        count: 3,
      },
    ],
  });

  assert.deepEqual(summary, {
    totalTobaccos: 6,
    inStockCount: 5,
    outOfStockCount: 1,
    smokeCtaTotal: 7,
    topMixes: [
      {
        mixId: 'mix-1',
        name: 'Цитрусовый караван',
        smokeCtaCount: 3,
      },
    ],
  });
});

test('sortMixes keeps available items and popularity first', () => {
  const sorted = sortMixes([
    {
      id: 'mix-2',
      name: 'B',
      description: '',
      componentIds: [],
      components: [],
      flavorProfiles: [],
      flavors: [],
      avgRating: 4.5,
      popularity: 20,
      available: false,
    },
    {
      id: 'mix-1',
      name: 'A',
      description: '',
      componentIds: [],
      components: [],
      flavorProfiles: [],
      flavors: [],
      avgRating: 4.7,
      popularity: 30,
      available: true,
    },
  ]);

  assert.deepEqual(sorted.map((item) => item.id), ['mix-1', 'mix-2']);
});

test('sortRails keeps active statistical rails first', () => {
  const sorted = sortRails([
    {
      id: 'rail-2',
      name: 'B',
      type: 'curated',
      description: '',
      mixIds: [],
      mixes: [],
      active: false,
    },
    {
      id: 'rail-1',
      name: 'A',
      type: 'statistical',
      description: '',
      mixIds: [],
      mixes: [],
      active: true,
    },
  ]);

  assert.deepEqual(sorted.map((item) => item.id), ['rail-1', 'rail-2']);
});
