import { loadRuleContext, resolveMixAvailability, toRuleComponent } from './analogs';
import { prisma } from './db';
import { arrivalView, loadArrivals, type Arrival, type ArrivalView } from './shelf';

// «К заказу» (#518): закончились и держим постоянно. Группа — поставщик последнего
// принятого счёта с этим табаком; сколько заказать, пишет мастер.

export type OrderTobacco = { id: string; manufacturer: string; lineName: string; name: string };

// hidden — микс не виден гостю, substituted — закрыт аналогом с полки.
export type OrderMixes = { total: number; hidden: number; substituted: number };

export type OrderLine = { tobacco: OrderTobacco; outAt: string; mixes: OrderMixes; lastArrival: ArrivalView | null };

export type OrderGroup = {
  supplier: { id: string; name: string } | null;
  // Последний принятый счёт поставщика.
  lastDeliveryAt: string | null;
  lines: OrderLine[];
};

export type ShelfOrderView = {
  groups: OrderGroup[];
  // Закончились, но не держим постоянно: в заявку не идут.
  notKept: Array<{ tobaccoId: string; manufacturer: string; lineName: string; name: string; outAt: string }>;
};

// Статус миксов табаков по правилу доступности с аналогами (#479) — один проход на все строки.
const mixesOf = async (tobaccoIds: string[]) => {
  const [mixes, context] = await Promise.all([
    prisma.mix.findMany({
      where: { available: true, components: { some: { tobaccoId: { in: tobaccoIds } } } },
      select: {
        components: {
          orderBy: { sortOrder: 'asc' },
          select: { tobacco: { select: { id: true, manufacturer: true, name: true, flavors: true, inStock: true, archived: true } } },
        },
      },
    }),
    loadRuleContext(),
  ]);
  const wanted = new Set(tobaccoIds);
  const counts = new Map<string, OrderMixes>(tobaccoIds.map((id) => [id, { total: 0, hidden: 0, substituted: 0 }]));
  for (const mix of mixes) {
    const { status } = resolveMixAvailability(true, mix.components.map((item) => toRuleComponent(item.tobacco, context)));
    for (const id of new Set(mix.components.map((item) => item.tobacco.id))) {
      if (!wanted.has(id)) continue;
      const count = counts.get(id)!;
      count.total += 1;
      if (status === 'blocked') count.hidden += 1;
      if (status === 'substituted') count.substituted += 1;
    }
  }
  return counts;
};

export const getShelfOrder = async (): Promise<ShelfOrderView> => {
  const out = await prisma.shelfItem.findMany({
    where: { status: 'active', outAt: { not: null } },
    select: { keepStocked: true, outAt: true, tobacco: { select: { id: true, manufacturer: true, lineName: true, name: true } } },
    orderBy: [{ outAt: 'desc' }, { tobaccoId: 'asc' }],
  });
  const kept = out.filter((item) => item.keepStocked);
  const notKept = out
    .filter((item) => !item.keepStocked)
    .map(({ tobacco, outAt }) => ({
      tobaccoId: tobacco.id,
      manufacturer: tobacco.manufacturer,
      lineName: tobacco.lineName,
      name: tobacco.name,
      outAt: outAt!.toISOString(),
    }));
  if (!kept.length) return { groups: [], notKept };

  const ids = kept.map((item) => item.tobacco.id);
  const [arrivals, mixes] = await Promise.all([loadArrivals(prisma, ids), mixesOf(ids)]);
  const lastInvoice = (id: string): Arrival | undefined => arrivals.get(id)?.find((arrival) => arrival.fromInvoice);

  const groups = new Map<string, OrderGroup>();
  for (const item of kept) {
    const invoice = lastInvoice(item.tobacco.id);
    const supplier = invoice?.supplierId ? { id: invoice.supplierId, name: invoice.supplier! } : null;
    const key = supplier?.id ?? '';
    if (!groups.has(key)) groups.set(key, { supplier, lastDeliveryAt: null, lines: [] });
    const own = arrivals.get(item.tobacco.id) ?? [];
    groups.get(key)!.lines.push({
      tobacco: item.tobacco,
      outAt: item.outAt!.toISOString(),
      mixes: mixes.get(item.tobacco.id)!,
      lastArrival: own.length ? arrivalView(own[0]) : null,
    });
  }

  const supplierIds = [...groups.keys()].filter(Boolean);
  const latest = await prisma.delivery.groupBy({
    by: ['supplierId'],
    where: { status: 'received', supplierId: { in: supplierIds } },
    _max: { receivedAt: true },
  });
  for (const row of latest) {
    const group = groups.get(row.supplierId!);
    if (group) group.lastDeliveryAt = row._max.receivedAt?.toISOString() ?? null;
  }

  return {
    groups: [...groups.values()].sort(
      (a, b) =>
        Number(a.supplier === null) - Number(b.supplier === null)
        || b.lines.length - a.lines.length
        || (a.supplier?.name ?? '').localeCompare(b.supplier?.name ?? '', 'ru'),
    ),
    notKept,
  };
};
