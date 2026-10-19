import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from './app';
import { prisma } from './db';
import {
  acceptDelivery,
  addLine,
  createDraftFromPages,
  createManualDraft,
  deleteDelivery,
  deleteLine,
  DeliveryConflictError,
  DeliveryNotFoundError,
  DeliveryValidationError,
  getDelivery,
  InvoiceUnreadableError,
  listDeliveries,
  updateDelivery,
  updateLine,
  type DeliveryCard,
} from './deliveries';
import type { TextPage } from './invoices/types';
import { resetAppState } from './state';

const actor = { login: 'admin', name: 'Админ', role: 'admin' as const };
const FILE = Buffer.from('%PDF-1.4 fixture');

const loadFixture = (name: 'a' | 'b'): TextPage[] =>
  JSON.parse(readFileSync(join(__dirname, 'invoices', 'fixtures', `invoice-format-${name}.items.json`), 'utf8'));

const replaceItem = (pages: TextPage[], str: string, next: string) =>
  pages.map((page) => page.map((item) => (item.str === str ? { ...item, str: next } : item)));

const TITLE_B = 'СЧЕТ № 01001 от 13.10.2026';

// Табаки прода, которые есть в счетах фикстур; в сиде тестов их нет.
const CATALOG: Array<[id: string, manufacturer: string, name: string]> = [
  ['ds-blackcurrant', 'DARKSIDE', 'Blackcurrant'],
  ['ds-virgin-peach', 'DARKSIDE', 'Virgin Peach 2.0'],
  ['bb-raspberries', 'Black Burn', 'Raspberries'],
  ['bb-pear-lemonade', 'Black Burn', 'Pear lemonade'],
  ['bb-popcorn', 'Black Burn', 'Original Popcorn'],
  ['bb-red-orange', 'Black Burn', 'Red Orange'],
  ['bb-tropical', 'Black Burn', 'Something Tropical'],
  ['bb-ananas', 'Black Burn', 'Ananas Shock'],
  ['sebero-barberry', 'Sebero', 'Барбарис'],
  ['sarma-bubble', 'Сарма', 'Бабл Гам'],
  ['sarma-maracuja', 'Сарма', 'Маракуйя'],
  ['hlg-panama', 'Хулиган', 'Panama'],
];

const seedCatalog = () =>
  prisma.tobacco.createMany({
    data: CATALOG.map(([id, manufacturer, name]) => ({
      id,
      manufacturer,
      name,
      flavorProfiles: '[]',
      flavors: '[]',
      flavorTags: '[]',
      inStock: false,
    })),
  });

const lineOf = (card: DeliveryCard, n: number) => {
  const line = card.lines.find((item) => item.n === n);
  assert.ok(line, `строка ${n}`);
  return line;
};

const inStock = async (id: string) =>
  (await prisma.tobacco.findUniqueOrThrow({ where: { id }, select: { inStock: true } })).inStock;

// Счёт B с выбранным табаком во всех табачных строках: Blansh не держим, Sebero
// «Смородиновая» не пришла, ананас и барбарис выбраны вручную.
const resolveInvoiceB = async (card: DeliveryCard) => {
  for (const n of [2, 3, 4]) await updateLine(card.id, lineOf(card, n).id, { kind: 'skip' });
  await updateLine(card.id, lineOf(card, 7).id, { tobaccoId: 'bb-ananas' });
  await updateLine(card.id, lineOf(card, 11).id, { tobaccoId: 'sebero-barberry' });
  return updateLine(card.id, lineOf(card, 12).id, { arrived: false, kind: 'skip' });
};

test.beforeEach(async () => {
  await resetAppState();
  await seedCatalog();
});

test.describe('черновик из счёта', () => {
  test('формат B: поставщик по ИНН, строки, сопоставление с каталогом, «не табак»', async () => {
    const card = await createDraftFromPages(actor, 'invoice.pdf', FILE, loadFixture('b'));

    assert.equal(card.kind, 'invoice');
    assert.equal(card.status, 'draft');
    assert.equal(card.number, '01001');
    assert.equal(card.invoiceDate, '2026-10-13');
    assert.equal(card.receivedAt, null);
    assert.equal(card.totalKop, 2227000);
    assert.equal(card.fileName, 'invoice.pdf');
    assert.equal(card.hasFile, true);
    assert.equal(card.supplier?.inn, '7700000001');
    assert.equal(card.lines.length, 15);
    assert.equal(card.linesSumKop, 2227000);
    assert.equal(card.sumMatches, true);

    const cloud = lineOf(card, 1);
    assert.equal(cloud.kind, 'skip');
    assert.equal(cloud.tobacco, null);

    const raspberries = lineOf(card, 8);
    assert.equal(raspberries.kind, 'tobacco');
    assert.equal(raspberries.qty, 2);
    assert.equal(raspberries.grams, 200);
    assert.equal(raspberries.priceKop, 155000);
    assert.equal(raspberries.tobacco?.id, 'bb-raspberries');
    assert.equal(raspberries.tobacco?.shelfStatus, null);
    assert.equal(raspberries.matchReason, 'catalog');
    assert.equal(raspberries.confidence, 100);
    assert.equal(raspberries.newOnShelf, true);

    // Вкус «Pineapple» не совпал с «Ananas Shock» уверенно: табак не выбран, но предложен.
    const pineapple = lineOf(card, 7);
    assert.equal(pineapple.tobacco, null);
    assert.equal(pineapple.matchReason, null);
    assert.ok(pineapple.candidates.some((candidate) => candidate.id === 'bb-ananas'));
    assert.ok(pineapple.candidates.length <= 5);

    assert.equal(lineOf(card, 2).tobacco, null, 'Blansh нет в каталоге');
    assert.equal(lineOf(card, 13).grams, 25);
    assert.equal(lineOf(card, 13).tobacco?.id, 'sarma-bubble');

    // Без табака: 3 × Blansh, ананас, две шипучки Sebero.
    assert.equal(card.pendingLines, 6);
    assert.equal(card.packsToCreate, 9);

    const supplier = await prisma.supplier.findUniqueOrThrow({ where: { inn: '7700000001' } });
    assert.equal(supplier.format, 'b');
  });

  test('формат A: артикулы и транслит бренда', async () => {
    const card = await createDraftFromPages(actor, 'a.pdf', FILE, loadFixture('a'));
    assert.equal(card.supplier?.name, 'ИП Петров П. П.');
    assert.equal(lineOf(card, 2).article, 'DS751');
    assert.equal(lineOf(card, 2).tobacco?.id, 'ds-blackcurrant');
    assert.equal(lineOf(card, 2).grams, 250);
  });

  test('сумма строк не сходится с итогом — предупреждение', async () => {
    const card = await createDraftFromPages(actor, 'b.pdf', FILE, replaceItem(loadFixture('b'), '22270,00', '22370,00'));
    assert.equal(card.totalKop, 2237000);
    assert.equal(card.linesSumKop, 2227000);
    assert.equal(card.sumMatches, false);
  });

  test('нет текста или формат не узнан — черновик не создаётся', async () => {
    await assert.rejects(createDraftFromPages(actor, 'scan.pdf', FILE, [[]]), (error) =>
      error instanceof InvoiceUnreadableError && error.code === 'no_text');
    await assert.rejects(
      createDraftFromPages(actor, 'x.pdf', FILE, [[{ str: 'Накладная № 7', x: 40, y: 700, w: 100, h: 10 }]]),
      (error) => error instanceof InvoiceUnreadableError && error.code === 'unknown_format',
    );
    assert.equal(await prisma.delivery.count({ where: { kind: { not: 'start' } } }), 0);
  });

  test('тот же счёт того же поставщика — дубликат, второй черновик не создаётся', async () => {
    const first = await createDraftFromPages(actor, 'b.pdf', FILE, loadFixture('b'));
    await assert.rejects(createDraftFromPages(actor, 'b-again.pdf', FILE, loadFixture('b')), (error) => {
      assert.ok(error instanceof DeliveryConflictError);
      assert.equal(error.code, 'duplicate');
      assert.deepEqual(error.extra, { deliveryId: first.id, status: 'draft' });
      return true;
    });
    assert.equal(await prisma.delivery.count({ where: { kind: 'invoice' } }), 1);

    const forced = await createDraftFromPages(actor, 'b-again.pdf', FILE, loadFixture('b'), { allowDuplicate: true });
    assert.notEqual(forced.id, first.id);
    assert.equal(await prisma.supplier.count(), 1);
  });
});

test.describe('правка черновика', () => {
  test('строка: выбор табака, количество, фасовка, цена, «пришло», «не табак»', async () => {
    const card = await createDraftFromPages(actor, 'b.pdf', FILE, loadFixture('b'));
    const pineapple = lineOf(card, 7);

    let next = await updateLine(card.id, pineapple.id, { tobaccoId: 'bb-ananas', qty: 3, grams: 250, priceKop: 150000 });
    let line = lineOf(next, 7);
    assert.equal(line.tobacco?.id, 'bb-ananas');
    assert.equal(line.matchReason, 'manual');
    assert.equal(line.qty, 3);
    assert.equal(line.grams, 250);
    assert.equal(line.priceKop, 150000);
    assert.equal(next.pendingLines, 5);

    next = await updateLine(card.id, lineOf(card, 2).id, { arrived: false });
    assert.equal(next.pendingLines, 4, 'не пришедшая строка выбора табака не требует');

    next = await updateLine(card.id, lineOf(card, 1).id, { kind: 'tobacco' });
    assert.equal(next.pendingLines, 5);

    next = await updateLine(card.id, pineapple.id, { tobaccoId: null });
    line = lineOf(next, 7);
    assert.equal(line.tobacco, null);
    assert.equal(line.matchReason, null);

    await assert.rejects(updateLine(card.id, pineapple.id, { qty: 0 }), DeliveryValidationError);
    await assert.rejects(updateLine(card.id, pineapple.id, { qty: 51 }), DeliveryValidationError);
    await assert.rejects(updateLine(card.id, pineapple.id, { grams: 5001 }), DeliveryValidationError);
    await assert.rejects(updateLine(card.id, pineapple.id, { priceKop: -1 }), DeliveryValidationError);
    await assert.rejects(updateLine(card.id, pineapple.id, { tobaccoId: 'tobacco-nope' }), DeliveryValidationError);
    await assert.rejects(updateLine(card.id, 'line-nope', { qty: 1 }), DeliveryNotFoundError);
    await assert.rejects(updateLine('delivery-nope', pineapple.id, { qty: 1 }), DeliveryNotFoundError);
  });

  test('шапка: дата прихода, номер, дата счёта; номер чужого счёта — дубликат', async () => {
    const card = await createDraftFromPages(actor, 'b.pdf', FILE, loadFixture('b'));
    const updated = await updateDelivery(card.id, {
      receivedAt: new Date('2026-10-15T10:00:00Z'),
      number: '01001-1',
      invoiceDate: new Date('2026-10-14'),
    });
    assert.equal(updated.receivedAt, '2026-10-15T10:00:00.000Z');
    assert.equal(updated.number, '01001-1');
    assert.equal(updated.invoiceDate, '2026-10-14');

    const other = await createDraftFromPages(actor, 'b.pdf', FILE, loadFixture('b'));
    await assert.rejects(updateDelivery(other.id, { number: '01001-1' }), DeliveryConflictError);
  });
});

test.describe('приёмка', () => {
  test('строки без табака блокируют приёмку', async () => {
    const card = await createDraftFromPages(actor, 'b.pdf', FILE, loadFixture('b'));
    await assert.rejects(acceptDelivery(actor, card.id), (error) => {
      assert.ok(error instanceof DeliveryConflictError);
      assert.equal(error.code, 'pending_lines');
      assert.deepEqual(error.extra, { count: 6 });
      return true;
    });
    assert.equal(await prisma.pack.count({ where: { deliveryId: card.id } }), 0);
  });

  test('создаёт банки с ценой и весом, ставит новые табаки на полку, запоминает строки', async () => {
    const card = await createDraftFromPages(actor, 'b.pdf', FILE, loadFixture('b'));
    const ready = await resolveInvoiceB(card);
    assert.equal(ready.pendingLines, 0);
    assert.equal(lineOf(ready, 13).newOnShelf, true);
    const receivedAt = new Date('2026-10-16T09:00:00Z');

    const accepted = await acceptDelivery(actor, card.id, { receivedAt });

    assert.equal(accepted.status, 'received');
    assert.equal(accepted.receivedAt, receivedAt.toISOString());
    // 6 строк Black Burn (малина ×2) + барбарис + 2 × Сарма + Хулиган.
    assert.equal(accepted.packs, 11);

    const raspberries = await prisma.pack.findMany({ where: { shelfItem: { tobaccoId: 'bb-raspberries' } } });
    assert.equal(raspberries.length, 2);
    for (const pack of raspberries) {
      assert.equal(pack.weight, 200);
      assert.equal(pack.priceKop, 155000);
      assert.deepEqual(pack.receivedAt, receivedAt);
      assert.equal(pack.deliveryId, card.id);
      assert.equal(pack.deliveryLineId, lineOf(card, 8).id);
    }

    const bubble = await prisma.shelfItem.findUniqueOrThrow({ where: { tobaccoId: 'sarma-bubble' }, include: { packs: true } });
    assert.equal(bubble.status, 'active');
    assert.equal(bubble.packWeight, 25);
    assert.deepEqual(bubble.packs.map((pack) => pack.weight), [25]);
    assert.equal(await inStock('sarma-bubble'), true);
    assert.equal(lineOf(accepted, 13).newOnShelf, false);

    // «Смородиновая» не пришла, Blansh и «ОБЛАКО» — не табак.
    assert.equal(await prisma.pack.count({ where: { deliveryLineId: { in: [1, 2, 3, 4, 12].map((n) => lineOf(card, n).id) } } }), 0);

    const memory = await prisma.supplierItem.findMany({ where: { supplierId: card.supplier!.id } });
    assert.equal(memory.length, 10);
    assert.equal(
      memory.find((item) => item.tobaccoId === 'bb-ananas')?.normalizedName,
      'табак для кальяна black burn 200г pineapple сочный ананас',
    );
    assert.equal(memory.find((item) => item.tobaccoId === 'sarma-bubble')?.packWeight, 25);

    const events = await prisma.auditEvent.findMany({ where: { entityType: 'delivery', action: 'accept' } });
    assert.equal(events.length, 1);
    assert.deepEqual(JSON.parse(events[0].details!), { packs: 11, sumKop: 1575000 });

    await assert.rejects(acceptDelivery(actor, card.id), (error) => error instanceof DeliveryConflictError && error.code === 'not_draft');
    await assert.rejects(updateLine(card.id, lineOf(card, 8).id, { qty: 1 }), DeliveryConflictError);
    await assert.rejects(deleteDelivery(actor, card.id), DeliveryConflictError);
  });

  test('табак из плана или убранный с полки оживает, фасовка записи не меняется', async () => {
    await prisma.shelfItem.create({ data: { tobaccoId: 'bb-raspberries', status: 'dropped', packWeight: 250 } });
    const card = await createDraftFromPages(actor, 'b.pdf', FILE, loadFixture('b'));
    assert.equal(lineOf(card, 8).tobacco?.shelfStatus, 'dropped');
    assert.equal(lineOf(card, 8).newOnShelf, true);
    await resolveInvoiceB(card);
    await acceptDelivery(actor, card.id);

    const item = await prisma.shelfItem.findUniqueOrThrow({ where: { tobaccoId: 'bb-raspberries' }, include: { packs: true } });
    assert.equal(item.status, 'active');
    assert.equal(item.packWeight, 250);
    assert.deepEqual(item.packs.map((pack) => pack.weight), [200, 200]);
    assert.equal(await inStock('bb-raspberries'), true);
  });

  test('второй счёт того же поставщика сопоставляется по памяти', async () => {
    const first = await createDraftFromPages(actor, 'b.pdf', FILE, loadFixture('b'));
    await resolveInvoiceB(first);
    await acceptDelivery(actor, first.id);

    const second = await createDraftFromPages(actor, 'b2.pdf', FILE, replaceItem(loadFixture('b'), TITLE_B, 'СЧЕТ № 01002 от 20.10.2026'));
    assert.equal(second.supplier?.id, first.supplier?.id);
    const pineapple = lineOf(second, 7);
    assert.equal(pineapple.tobacco?.id, 'bb-ananas');
    assert.equal(pineapple.matchReason, 'memory');
    assert.equal(pineapple.confidence, 100);
    assert.equal(pineapple.newOnShelf, false);
    assert.equal(lineOf(second, 11).tobacco?.id, 'sebero-barberry');
    assert.equal(lineOf(second, 8).matchReason, 'memory');
  });

  test('двойное нажатие «Принять» не создаёт банки дважды', async () => {
    const card = await createDraftFromPages(actor, 'b.pdf', FILE, loadFixture('b'));
    await resolveInvoiceB(card);
    const results = await Promise.allSettled([acceptDelivery(actor, card.id), acceptDelivery(actor, card.id)]);

    assert.deepEqual(results.map((result) => result.status).sort(), ['fulfilled', 'rejected']);
    const rejected = results.find((result) => result.status === 'rejected') as PromiseRejectedResult;
    assert.ok(rejected.reason instanceof DeliveryConflictError && rejected.reason.code === 'not_draft');
    assert.equal(await prisma.pack.count({ where: { deliveryId: card.id } }), 11);
  });

  test('принятая поставка с тем же номером — тоже дубликат', async () => {
    const first = await createDraftFromPages(actor, 'b.pdf', FILE, loadFixture('b'));
    await resolveInvoiceB(first);
    await acceptDelivery(actor, first.id);
    await assert.rejects(createDraftFromPages(actor, 'b.pdf', FILE, loadFixture('b')), (error) =>
      error instanceof DeliveryConflictError && (error.extra as { status: string }).status === 'received');
  });
});

test.describe('ручная поставка', () => {
  test('пустой черновик, добавленная строка, приёмка', async () => {
    const draft = await createManualDraft(actor, { supplierName: 'Южный табак', number: '17', invoiceDate: new Date('2026-10-18') });
    assert.equal(draft.kind, 'manual');
    assert.equal(draft.status, 'draft');
    assert.equal(draft.supplier?.name, 'Южный табак');
    assert.equal(draft.lines.length, 0);
    assert.equal(draft.hasFile, false);
    assert.equal(draft.sumMatches, null);

    let card = await addLine(draft.id, { rawName: 'Black Burn 200г Raspberries', qty: 2, priceKop: 150000 });
    let line = lineOf(card, 1);
    assert.equal(line.tobacco?.id, 'bb-raspberries', 'строку сопоставили сами');
    assert.equal(line.grams, 200);
    assert.equal(line.sumKop, null);
    assert.equal(card.linesSumKop, 300000);

    card = await addLine(draft.id, { rawName: 'Уголь кокосовый', qty: 1, priceKop: 50000, kind: 'skip' });
    card = await addLine(draft.id, { rawName: 'Что-то своё', qty: 1, tobaccoId: 'hlg-panama' });
    line = lineOf(card, 3);
    assert.equal(line.tobacco?.id, 'hlg-panama');
    assert.equal(line.matchReason, 'manual');
    assert.equal(card.linesSumKop, 350000);

    card = await deleteLine(draft.id, lineOf(card, 2).id);
    assert.deepEqual(card.lines.map((item) => item.n), [1, 3]);

    await assert.rejects(addLine(draft.id, { rawName: ' ', qty: 1 }), DeliveryValidationError);
    await assert.rejects(addLine(draft.id, { rawName: 'x', qty: 0 }), DeliveryValidationError);

    const accepted = await acceptDelivery(actor, draft.id);
    assert.equal(accepted.packs, 3);
    const panama = await prisma.shelfItem.findUniqueOrThrow({ where: { tobaccoId: 'hlg-panama' }, include: { packs: true } });
    assert.equal(panama.packWeight, 200);
    assert.deepEqual(panama.packs.map((pack) => [pack.weight, pack.priceKop]), [[200, null]]);
  });

  test('без поставщика — черновик без поставщика, память не пишется', async () => {
    const draft = await createManualDraft(actor, {});
    assert.equal(draft.supplier, null);
    await addLine(draft.id, { rawName: 'Panama', qty: 1, tobaccoId: 'hlg-panama' });
    await acceptDelivery(actor, draft.id);
    assert.equal(await prisma.supplierItem.count(), 0);
  });
});

test.describe('список и удаление', () => {
  test('KPI месяца — по принятым в этом месяце, стартовый приход в суммы не идёт', async () => {
    const now = new Date('2026-10-20T12:00:00Z');
    const old = await createManualDraft(actor, { supplierName: 'Южный табак', number: '1' });
    await addLine(old.id, { rawName: 'x', qty: 1, priceKop: 100000, tobaccoId: 'hlg-panama' });
    await acceptDelivery(actor, old.id, { receivedAt: new Date('2026-09-20T12:00:00Z') });

    const card = await createDraftFromPages(actor, 'b.pdf', FILE, loadFixture('b'));
    await resolveInvoiceB(card);
    await acceptDelivery(actor, card.id, { receivedAt: new Date('2026-10-16T12:00:00Z') });
    await createDraftFromPages(actor, 'b2.pdf', FILE, replaceItem(loadFixture('b'), TITLE_B, 'СЧЕТ № 01002 от 20.10.2026'));

    const list = await listDeliveries(now);
    assert.deepEqual(list.totals, { monthKop: 1575000, monthPacks: 11, drafts: 1, suppliers: 2, memoryItems: 11 });
    assert.equal(list.items.length, 4);
    assert.ok(list.items.some((item) => item.kind === 'start'));

    const draft = list.items.find((item) => item.status === 'draft')!;
    assert.equal(draft.number, '01002');
    assert.equal(draft.lines, 15);
    assert.equal(draft.supplier, 'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "ОПТ-ПРИМЕР"');
    assert.equal(draft.totalKop, 2227000);

    const received = list.items.find((item) => item.id === card.id)!;
    assert.equal(received.packs, 11);
    assert.equal(received.receivedAt, '2026-10-16T12:00:00.000Z');
  });

  test('удалить можно только черновик', async () => {
    const card = await createDraftFromPages(actor, 'b.pdf', FILE, loadFixture('b'));
    await deleteDelivery(actor, card.id);
    assert.equal(await prisma.deliveryLine.count(), 0);
    await assert.rejects(getDelivery(card.id), DeliveryNotFoundError);
    await assert.rejects(deleteDelivery(actor, card.id), DeliveryNotFoundError);
  });
});

// --- HTTP --------------------------------------------------------------------

const buildPdf = (content: string) => {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
};

const login = async (app: ReturnType<typeof buildApp>) => {
  const response = await app.inject({ method: 'POST', url: '/staff/auth/login', payload: { login: 'admin', password: 'admin' } });
  return { authorization: `Bearer ${(response.json() as { accessToken: string }).accessToken}` };
};

test.describe('HTTP', () => {
  test('без токена — 401', async () => {
    const app = buildApp();
    for (const [method, url] of [
      ['GET', '/staff/deliveries'],
      ['POST', '/staff/deliveries'],
      ['POST', '/staff/deliveries/manual'],
      ['GET', '/staff/deliveries/x'],
      ['GET', '/staff/deliveries/x/file'],
      ['PATCH', '/staff/deliveries/x'],
      ['DELETE', '/staff/deliveries/x'],
      ['POST', '/staff/deliveries/x/accept'],
      ['POST', '/staff/deliveries/x/lines'],
      ['PATCH', '/staff/deliveries/x/lines/y'],
      ['DELETE', '/staff/deliveries/x/lines/y'],
    ] as const) {
      const response = await app.inject({ method, url });
      assert.equal(response.statusCode, 401, `${method} ${url}`);
    }
  });

  test('загрузка: не base64, не PDF, без текста, неизвестный формат', async () => {
    const app = buildApp();
    const headers = await login(app);
    const upload = (payload: unknown) => app.inject({ method: 'POST', url: '/staff/deliveries', headers, payload: payload as object });

    let response = await upload({ fileName: 'a.pdf', contentBase64: 'не base64!' });
    assert.equal(response.statusCode, 400);
    response = await upload({ fileName: 'a.pdf' });
    assert.equal(response.statusCode, 400);
    response = await upload({ fileName: 'a.pdf', contentBase64: Buffer.from('hello').toString('base64') });
    assert.equal(response.statusCode, 400);
    assert.match((response.json() as { error: string }).error, /PDF/);
    response = await upload({ fileName: 'a.pdf', contentBase64: Buffer.from('%PDF-1.4 garbage').toString('base64') });
    assert.equal(response.statusCode, 400);

    response = await upload({ fileName: 'scan.pdf', contentBase64: buildPdf('').toString('base64') });
    assert.equal(response.statusCode, 422);
    assert.equal((response.json() as { code: string }).code, 'no_text');

    response = await upload({
      fileName: 'x.pdf',
      contentBase64: `data:application/pdf;base64,${buildPdf('BT /F1 12 Tf 100 700 Td (Nakladnaya 7) Tj ET').toString('base64')}`,
    });
    assert.equal(response.statusCode, 422);
    assert.equal((response.json() as { code: string }).code, 'unknown_format');
    assert.equal(await prisma.delivery.count({ where: { kind: { not: 'start' } } }), 0);
  });

  test('список, карточка, файл, правка, приёмка, удаление', async () => {
    const app = buildApp();
    const headers = await login(app);
    const card = await createDraftFromPages(actor, 'b.pdf', FILE, loadFixture('b'));

    const list = await app.inject({ method: 'GET', url: '/staff/deliveries', headers });
    assert.equal(list.statusCode, 200);
    const listBody = list.json() as { items: Array<{ id: string }>; totals: { drafts: number } };
    assert.ok(listBody.items.some((item) => item.id === card.id));
    assert.equal(listBody.totals.drafts, 1);

    const read = await app.inject({ method: 'GET', url: `/staff/deliveries/${card.id}`, headers });
    assert.equal(read.statusCode, 200);
    const body = read.json() as DeliveryCard & { file?: unknown };
    assert.equal(body.lines.length, 15);
    assert.equal(body.file, undefined);

    const file = await app.inject({ method: 'GET', url: `/staff/deliveries/${card.id}/file`, headers });
    assert.equal(file.statusCode, 200);
    assert.equal(file.headers['content-type'], 'application/pdf');
    assert.deepEqual(file.rawPayload, FILE);

    assert.equal((await app.inject({ method: 'GET', url: '/staff/deliveries/nope', headers })).statusCode, 404);

    const accept = await app.inject({ method: 'POST', url: `/staff/deliveries/${card.id}/accept`, headers, payload: {} });
    assert.equal(accept.statusCode, 409);
    assert.deepEqual(
      (({ code, count }) => ({ code, count }))(accept.json() as { code: string; count: number }),
      { code: 'pending_lines', count: 6 },
    );

    const bad = await app.inject({
      method: 'PATCH',
      url: `/staff/deliveries/${card.id}/lines/${lineOf(card, 7).id}`,
      headers,
      payload: { qty: 'много' },
    });
    assert.equal(bad.statusCode, 400);

    for (const n of [2, 3, 4, 7, 11, 12]) {
      const patched = await app.inject({
        method: 'PATCH',
        url: `/staff/deliveries/${card.id}/lines/${lineOf(card, n).id}`,
        headers,
        payload: { kind: 'skip' },
      });
      assert.equal(patched.statusCode, 200);
    }
    const header = await app.inject({
      method: 'PATCH',
      url: `/staff/deliveries/${card.id}`,
      headers,
      payload: { receivedAt: '2026-10-16T09:00:00.000Z' },
    });
    assert.equal(header.statusCode, 200);

    const accepted = await app.inject({ method: 'POST', url: `/staff/deliveries/${card.id}/accept`, headers, payload: {} });
    assert.equal(accepted.statusCode, 200);
    const acceptedBody = accepted.json() as DeliveryCard;
    assert.equal(acceptedBody.status, 'received');
    assert.equal(acceptedBody.receivedAt, '2026-10-16T09:00:00.000Z');

    const removed = await app.inject({ method: 'DELETE', url: `/staff/deliveries/${card.id}`, headers });
    assert.equal(removed.statusCode, 409);
  });

  test('ручная поставка через API', async () => {
    const app = buildApp();
    const headers = await login(app);
    const created = await app.inject({ method: 'POST', url: '/staff/deliveries/manual', headers, payload: { supplierName: 'Южный табак' } });
    assert.equal(created.statusCode, 201);
    const id = (created.json() as DeliveryCard).id;

    const line = await app.inject({
      method: 'POST',
      url: `/staff/deliveries/${id}/lines`,
      headers,
      payload: { rawName: 'Panama', qty: 1, tobaccoId: 'hlg-panama', priceKop: 160000 },
    });
    assert.equal(line.statusCode, 201);
    const lineId = (line.json() as DeliveryCard).lines[0].id;

    const removed = await app.inject({ method: 'DELETE', url: `/staff/deliveries/${id}/lines/${lineId}`, headers });
    assert.equal(removed.statusCode, 200);
    assert.equal((removed.json() as DeliveryCard).lines.length, 0);

    const deleted = await app.inject({ method: 'DELETE', url: `/staff/deliveries/${id}`, headers });
    assert.equal(deleted.statusCode, 204);
  });

  test('создание карточки табака с inStock: false не кладёт его на полку', async () => {
    const app = buildApp();
    const headers = await login(app);
    const response = await app.inject({
      method: 'POST',
      url: '/staff/inventory/tobaccos',
      headers,
      payload: { manufacturer: 'Blansh', name: 'Грейпфрутовый Сок', inStock: false },
    });
    assert.equal(response.statusCode, 201);
    const id = (response.json() as { item: { id: string } }).item.id;
    assert.equal(await prisma.shelfItem.count({ where: { tobaccoId: id } }), 0);
    assert.equal(await inStock(id), false);
  });
});
