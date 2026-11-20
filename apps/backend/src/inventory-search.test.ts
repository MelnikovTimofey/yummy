import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from './db';
import { getInventoryTobaccos, getStaffMixes, resetAppState } from './state';

// Поиск «Каталога» по неточному совпадению (#522): бренды клиента так, как он их пишет.

const tobacco = (id: string, manufacturer: string, name: string, flavors: string[] = []) =>
  prisma.tobacco.create({
    data: {
      id,
      manufacturer,
      name,
      flavorProfiles: JSON.stringify([]),
      flavors: JSON.stringify(flavors),
      flavorTags: JSON.stringify([]),
    },
  });

const ids = async (search: string, extra: Parameters<typeof getInventoryTobaccos>[0] = {}) =>
  (await getInventoryTobaccos({ search, archived: 'all', ...extra })).items.map((item) => item.id);

test.beforeEach(async () => {
  await resetAppState();
  await tobacco('t-hooligan', 'Хулиган', 'Манго');
  await tobacco('t-blackburn', 'Black Burn', 'Overdose');
  await tobacco('t-trofimoffs', 'Trofimoff’s', 'Cola');
  await tobacco('t-darkside', 'DARKSIDE', 'Bananapapa', ['банан']);
  await tobacco('t-tangiers', 'Tangiers', 'Cane Mint', ['мята']);
  await tobacco('t-afzal', 'Afzal', 'Pan Raas');
  await tobacco('t-spearmint', 'Sebero', 'Spearmint');
  await tobacco('t-mind', 'Sebero', 'Mind');
});

test('бренды находятся в другом алфавите, слитно, без апострофа, в другой раскладке и с опечаткой', async () => {
  for (const search of ['hooligan', 'хулиган', 'khuligan', 'Hooligan']) {
    assert.deepEqual(await ids(search), ['t-hooligan'], search);
  }
  assert.deepEqual(await ids('blackburn'), ['t-blackburn']);
  assert.deepEqual(await ids('troffimofs'), ['t-trofimoffs']);
  assert.deepEqual(await ids('дарксайд'), ['t-darkside']);
  assert.deepEqual(await ids('вфклышву'), ['t-darkside']);
  assert.deepEqual(await ids('Tangers'), ['t-tangiers']);
  assert.deepEqual(await ids('Афзал'), ['t-afzal']);
  assert.deepEqual(await ids('дарк банан'), ['t-darkside']);
});

test('точные совпадения выше похожих, внутри групп — выбранная сортировка, страница режется после ранга', async () => {
  const mint = await ids('mint', { sort: 'name', direction: 'desc' });
  // «Mint Veil», «Iced Plum» (характер minty) и «Cane Mint» — с начала слова,
  // «Spearmint» — внутри слова, «Mind» — опечатка.
  assert.deepEqual(mint, ['tobacco-mint-veil', 'tobacco-iced-plum', 't-tangiers', 't-spearmint', 't-mind']);
  assert.deepEqual(await ids('mint', { sort: 'name', direction: 'desc', page: 1, pageSize: 1 }), ['tobacco-mint-veil']);
  assert.deepEqual(await ids('mint', { sort: 'name', direction: 'asc', page: 5, pageSize: 1 }), ['t-mind']);
});

test('бренд не из списка в фильтре раскрывается в похожие бренды', async () => {
  const result = await getInventoryTobaccos({ manufacturers: ['дарксайд'] });
  assert.deepEqual(result.items.map((item) => item.id), ['t-darkside']);
  assert.deepEqual(result.filters.manufacturers, ['DARKSIDE']);

  const exact = await getInventoryTobaccos({ manufacturers: ['sebero'] });
  assert.deepEqual(exact.filters.manufacturers, ['Sebero']);
  assert.equal(exact.items.length, 2);

  const missing = await getInventoryTobaccos({ manufacturers: ['совсем-не-бренд'] });
  assert.deepEqual(missing.items, []);
});

test('поиск «Миксов» — той же функцией', async () => {
  const search = async (value: string) => (await getStaffMixes({ search: value })).items.map((mix) => mix.name);
  assert.deepEqual(await search('yantarnyi'), ['Янтарный базар']);
  assert.deepEqual(await search('Янтарны базар'), ['Янтарный базар']);
});
