import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app';
import { rankSimilar } from './analogs';
import { prisma } from './db';
import { resetAppState } from './state';

// Аналоги в «Мастере» (#480, PRD §9.3 п.6): мастер ведёт список аналогов табака,
// связь взаимная, порядок у каждого табака свой; подсказки похожих — по полке.

const A = 'tobacco-citrus-breeze';
const B = 'tobacco-apple-fizz';
const C = 'tobacco-herbal-dawn';
const D = 'tobacco-mint-veil';
const OFF_SHELF = 'tobacco-peach-silk';

type App = ReturnType<typeof buildApp>;
type Analog = { tobaccoId: string; name: string; inStock: boolean; substituting: boolean };
type Card = {
  tobacco: { id: string };
  analogs: Analog[];
  similar: Array<{ tobaccoId: string; flavors: string[] }>;
  mixes: Array<{ id: string; status: string; substitution: { from: { tobaccoId: string }; to: { tobaccoId: string } } | null }>;
};

const login = async (app: App) => {
  const response = await app.inject({ method: 'POST', url: '/staff/auth/login', payload: { login: 'admin', password: 'admin' } });
  assert.equal(response.statusCode, 200);
  return { authorization: `Bearer ${(response.json() as { accessToken: string }).accessToken}` };
};

const listOf = async (tobaccoId: string) =>
  (await prisma.tobaccoAnalog.findMany({ where: { tobaccoId }, orderBy: { sortOrder: 'asc' } })).map((link) => link.analogId);

test.describe('аналоги в «Мастере»', () => {
  let app: App;
  let headers: Record<string, string>;

  const put = (tobaccoId: string, analogs: unknown) =>
    app.inject({ method: 'PUT', url: `/staff/shelf/${tobaccoId}/analogs`, payload: { analogs }, headers });

  const card = async (tobaccoId: string) => {
    const response = await app.inject({ method: 'GET', url: `/staff/shelf/${tobaccoId}`, headers });
    assert.equal(response.statusCode, 200);
    return (response.json() as { item: Card }).item;
  };

  test.beforeEach(async () => {
    await resetAppState();
    app = buildApp();
    headers = await login(app);
  });

  test.afterEach(async () => {
    await app.close();
  });

  test('нужна сессия мастера', async () => {
    const response = await app.inject({ method: 'PUT', url: `/staff/shelf/${A}/analogs`, payload: { analogs: [B] } });
    assert.equal(response.statusCode, 401);
  });

  test('взаимность: добавленный аналог получает табак в конец своего списка, порядок у каждого свой', async () => {
    await prisma.tobaccoAnalog.create({ data: { tobaccoId: B, analogId: D, sortOrder: 0 } });
    await prisma.tobaccoAnalog.create({ data: { tobaccoId: D, analogId: B, sortOrder: 0 } });

    const response = await put(A, [B, C]);
    assert.equal(response.statusCode, 200);
    const body = response.json() as { item: Card; unblockedMixes: unknown[] };
    assert.deepEqual(body.item.analogs.map((item) => item.tobaccoId), [B, C]);

    assert.deepEqual(await listOf(A), [B, C]);
    assert.deepEqual(await listOf(B), [D, A]);
    assert.deepEqual(await listOf(C), [A]);
    // Транзитивности нет: D — аналог B, но не A.
    assert.ok(!(await listOf(A)).includes(D));

    const audit = await prisma.auditEvent.findFirst({ where: { entityType: 'shelf', entityId: A }, orderBy: { createdAt: 'desc' } });
    assert.equal(audit?.action, 'update');
    assert.deepEqual(JSON.parse(audit?.details ?? '{}'), { analogs: { before: [], after: [B, C] } });
  });

  test('убранный аналог теряет связь с обеих сторон; один табак — аналог у нескольких', async () => {
    await put(A, [B, C]);
    await put(D, [C]);
    assert.deepEqual(await listOf(C), [A, D]);

    const response = await put(A, [C]);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(await listOf(A), [C]);
    assert.deepEqual(await listOf(B), []);
    assert.deepEqual(await listOf(C), [A, D]);

    await put(A, [C, B]);
    await put(A, [B, C]);
    assert.deepEqual(await listOf(A), [B, C], 'смена порядка');
    assert.deepEqual(await listOf(C), [A, D], 'порядок C не трогаем');
  });

  test('аналог можно взять из каталога, не только с полки', async () => {
    const response = await put(A, [OFF_SHELF]);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(await listOf(OFF_SHELF), [A]);
  });

  test('дубликаты, сам табак, неизвестные id и не список — 400; табака нет на полке — 404', async () => {
    for (const analogs of [[B, B], [A], ['tobacco-unknown'], 'oops', [42]]) {
      const response = await put(A, analogs);
      assert.equal(response.statusCode, 400, JSON.stringify(analogs));
    }
    assert.deepEqual(await listOf(A), []);
    assert.equal((await put(OFF_SHELF, [A])).statusCode, 404);
  });

  test('unblockedMixes: микс из «блокирован» стал «с заменой»; строка и карточка показывают замену', async () => {
    await prisma.tobacco.update({ where: { id: A }, data: { inStock: false } });

    const response = await put(A, [B]);
    const body = response.json() as { item: Card; unblockedMixes: Array<{ id: string; name: string }> };
    assert.deepEqual(body.unblockedMixes, [{ id: 'mix-citrus-scout', name: 'Цитрусовый караван' }]);
    assert.deepEqual(body.item.analogs[0], {
      tobaccoId: B,
      manufacturer: 'North Wind',
      name: 'Apple Fizz',
      inStock: true,
      substituting: true,
    });
    const mix = body.item.mixes.find((item) => item.id === 'mix-citrus-scout');
    assert.equal(mix?.status, 'substituted');
    assert.equal(mix?.substitution?.to.tobaccoId, B);

    const again = await put(A, [B]);
    assert.deepEqual((again.json() as { unblockedMixes: unknown[] }).unblockedMixes, []);

    const shelf = await app.inject({ method: 'GET', url: '/staff/shelf', headers });
    const rows = (shelf.json() as { rows: Array<{ tobacco: { id: string }; analogs: Analog[] }> }).rows;
    assert.deepEqual(rows.find((row) => row.tobacco.id === B)?.analogs.map((item) => [item.tobaccoId, item.inStock, item.substituting]), [[A, false, false]]);
  });

  test('похожие на полке: в наличии, не сам табак и не его аналоги, по пересечению вкусов и категорий', async () => {
    const before = await card(A);
    assert.ok(before.similar.length > 0 && before.similar.length <= 5);
    assert.equal(before.similar[0].tobaccoId, B, 'больше всего общих вкусов и категорий — Apple Fizz');
    assert.ok(!before.similar.some((item) => item.tobaccoId === A || item.tobaccoId === OFF_SHELF));

    await put(A, [B]);
    assert.ok(!(await card(A)).similar.some((item) => item.tobaccoId === B));

    await prisma.tobacco.update({ where: { id: C }, data: { inStock: false } });
    assert.ok(!(await card(A)).similar.some((item) => item.tobaccoId === C), 'закончившийся не подсказываем');
  });
});

test('rankSimilar: по flavors и flavorProfiles, flavorTags не участвуют', () => {
  const target = { tobaccoId: 't', flavorProfiles: ['citrus'], flavors: ['лимон'] };
  const candidates = [
    { tobaccoId: 'tag-only', manufacturer: 'X', name: 'Tag', flavorProfiles: ['berry'], flavors: ['малина'], flavorTags: ['citrus'] },
    { tobaccoId: 'one', manufacturer: 'X', name: 'One', flavorProfiles: ['citrus'], flavors: ['апельсин'], flavorTags: [] },
    { tobaccoId: 'two', manufacturer: 'X', name: 'Two', flavorProfiles: ['citrus'], flavors: ['лимон'], flavorTags: [] },
    { tobaccoId: 't', manufacturer: 'X', name: 'Self', flavorProfiles: ['citrus'], flavors: ['лимон'], flavorTags: [] },
  ];
  assert.deepEqual(
    rankSimilar(target, candidates, new Set()).map((item) => item.tobaccoId),
    ['two', 'one'],
  );
  assert.deepEqual(
    rankSimilar(target, candidates, new Set(['two'])).map((item) => item.tobaccoId),
    ['one'],
  );
});
