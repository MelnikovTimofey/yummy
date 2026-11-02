import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { buildGuestApp } from './test-app';
import { prisma } from './db';
import { resetAppState } from './state';

// Автор микса (#491): сотрудник, который завёл микс. Виден только персоналу.

type App = ReturnType<typeof buildApp>;
type Author = { id: string; name: string } | null;
type StaffMix = { id: string; name: string; author: Author };

const login = async (app: App, name: string) => {
  const response = await app.inject({ method: 'POST', url: '/staff/auth/login', payload: { login: name, password: name } });
  assert.equal(response.statusCode, 200);
  return { authorization: `Bearer ${(response.json() as { accessToken: string }).accessToken}` };
};

const payload = (name: string) => ({
  name,
  description: 'Цитрус и мята.',
  components: [
    { tobaccoId: 'tobacco-citrus-breeze', proportion: 60, sortOrder: 0 },
    { tobaccoId: 'tobacco-mint-veil', proportion: 40, sortOrder: 1 },
  ],
});

test.describe('автор микса', () => {
  let app: App;
  let admin: Record<string, string>;
  let staff: Record<string, string>;

  const list = async (headers: Record<string, string>, query = '') => {
    const response = await app.inject({ method: 'GET', url: `/staff/mixes?pageSize=100${query}`, headers });
    assert.equal(response.statusCode, 200);
    return response.json() as {
      items: StaffMix[];
      filters: { authors: string[]; options: { authors: string[] } };
      meta: { filteredItems: number; guestVisibleCount: number };
    };
  };

  const create = async (headers: Record<string, string>, name: string) => {
    const response = await app.inject({ method: 'POST', url: '/staff/mixes', payload: payload(name), headers });
    assert.equal(response.statusCode, 201);
    return (response.json() as { item: StaffMix }).item;
  };

  test.beforeEach(async () => {
    await resetAppState();
    app = buildApp();
    admin = await login(app, 'admin');
    staff = await login(app, 'atelier');
  });

  test.afterEach(async () => {
    await app.close();
  });

  test('новый микс и копия: автор — тот, кто сохранил', async () => {
    const created = await create(staff, 'Мятный бриз');
    assert.deepEqual(created.author, { id: 'staff-atelier', name: 'Ателье Staff' });

    const copy = await create(admin, 'Мятный бриз (копия)');
    assert.deepEqual(copy.author, { id: 'staff-admin', name: 'Admin' });

    const items = (await list(admin)).items;
    assert.deepEqual(items.find((item) => item.id === created.id)?.author, { id: 'staff-atelier', name: 'Ателье Staff' });
    assert.equal(items.find((item) => item.id === 'mix-citrus-scout')?.author, null, 'у миксов без автора — null');
  });

  test('правка микса автора не меняет', async () => {
    const created = await create(staff, 'Мятный бриз');
    const response = await app.inject({ method: 'PATCH', url: `/staff/mixes/${created.id}`, payload: { name: 'Мятный бриз 2' }, headers: admin });
    assert.equal(response.statusCode, 200);
    assert.deepEqual((response.json() as { item: StaffMix }).item.author, { id: 'staff-atelier', name: 'Ателье Staff' });
  });

  test('фильтр «Автор»: в вариантах только авторы миксов, выборка и счётчики по выбранным', async () => {
    const created = await create(staff, 'Мятный бриз');
    await create(admin, 'Цитрусовый бриз');

    const all = await list(admin);
    assert.deepEqual(all.filters.options.authors, ['Ателье Staff', 'Admin']);

    const filtered = await list(admin, `&authors=${encodeURIComponent('Ателье Staff')}`);
    assert.deepEqual(filtered.filters.authors, ['Ателье Staff']);
    assert.deepEqual(filtered.items.map((item) => item.id), [created.id]);
    assert.equal(filtered.meta.filteredItems, 1);
    assert.equal(filtered.meta.guestVisibleCount, 1);
  });

  test('удалённая учётка: микс остаётся, автор — null', async () => {
    const created = await create(staff, 'Мятный бриз');
    await prisma.auditEvent.deleteMany({ where: { actorLogin: 'atelier' } });
    await prisma.staffAccount.delete({ where: { id: 'staff-atelier' } });
    assert.equal((await list(admin)).items.find((item) => item.id === created.id)?.author, null);
  });

  test('гость автора не видит', async () => {
    await create(staff, 'Мятный бриз');
    const guest = buildGuestApp();
    const response = await guest.inject({ method: 'GET', url: '/guest/catalog/mixes' });
    await guest.close();
    assert.equal(response.statusCode, 200);
    const body = response.body;
    assert.ok(body.includes('Мятный бриз'));
    assert.ok(!body.includes('Ателье Staff') && !body.includes('"author"'), 'в гостевом каталоге нет автора');
  });
});
