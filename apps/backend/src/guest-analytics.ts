import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { isTrial } from './shelf';
import { flavorProfileLabels, getAvailableMixCatalog, type MixGuestStatus } from './state';

// Аналитика выборов гостей для Мастера (#520). Выбор — «Покурить» у микса каталога
// (SmokeCtaEvent) или свой микс «Намиксуй» (CustomMixSmokeEvent). Считает Postgres,
// наружу — только агрегаты, без идентификаторов гостей (PRD §4).

export type ChoicesPresetKey = '7d' | '30d' | '90d' | 'all';
export type ChoicesPeriodKey = ChoicesPresetKey | 'custom';

// from = null у «всего времени»: начало — первый выбор, его знает только база.
export type ChoicesPeriodQuery = { key: ChoicesPeriodKey; from: string | null; to: string };

export type GuestChoices = {
  period: { key: ChoicesPeriodKey; from: string; to: string; days: number; bucket: 'day' | 'week' };
  kpi: {
    choices: number;
    ownMixes: number;
    mixesChosen: number;
    mixesOnShowcase: number;
    avgRating: number | null;
    ratingsCount: number;
  };
  timeline: Array<{ date: string; catalog: number; own: number }>;
  topTobaccos: Array<{
    tobaccoId: string;
    manufacturer: string;
    name: string;
    choices: number;
    stock: 'in' | 'out' | 'off-shelf';
    trial: boolean;
  }>;
  // status = null у удалённого микса.
  topMixes: Array<{ mixId: string | null; mixName: string; choices: number; avgRating: number | null; status: MixGuestStatus | null }>;
  profiles: Array<{ key: string; label: string; share: number }>;
  signals: {
    outPopular: Array<{ tobaccoId: string; name: string }>;
    hiddenMixes: Array<{ mixId: string; mixName: string }>;
    emptyRails: Array<{ railId: string; name: string }>;
  };
};

const PRESET_DAYS: Record<Exclude<ChoicesPresetKey, 'all'>, number> = { '7d': 7, '30d': 30, '90d': 90 };
const WEEKLY_AFTER_DAYS = 31;
const TOP = 10;

// Сутки — по часовому поясу процесса, как у остального кода; база считает в нём же.
const processTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const dayKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

const ymd = (key: string): [number, number, number] => {
  const [year, month, day] = key.split('-').map(Number);
  return [year, month - 1, day];
};

const parseDay = (key: string) => new Date(...ymd(key));

const addDays = (key: string, days: number) => {
  const date = parseDay(key);
  date.setDate(date.getDate() + days);
  return dayKey(date);
};

// Через UTC, чтобы переход на летнее время не съедал день.
const daysBetween = (from: string, to: string) => Math.round((Date.UTC(...ymd(to)) - Date.UTC(...ymd(from))) / 86_400_000) + 1;

const isDayKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && dayKey(parseDay(value)) === value;

const mondayOf = (key: string) => {
  const date = parseDay(key);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return dayKey(date);
};

export const parseChoicesPeriod = (
  query: { period?: unknown; from?: unknown; to?: unknown },
  now = new Date(),
): ChoicesPeriodQuery | { error: string } => {
  const today = dayKey(now);

  if (query.from !== undefined || query.to !== undefined) {
    if (!isDayKey(query.from) || !isDayKey(query.to)) return { error: 'from и to — даты в формате YYYY-MM-DD' };
    if (query.from > query.to) return { error: 'Начало периода позже конца' };
    if (query.to > today) return { error: 'Конец периода позже сегодняшнего дня' };
    return { key: 'custom', from: query.from, to: query.to };
  }

  const key = query.period ?? '30d';
  if (key === 'all') return { key, from: null, to: today };
  if (key === '7d' || key === '30d' || key === '90d') return { key, from: addDays(today, 1 - PRESET_DAYS[key]), to: today };
  return { error: 'period — 7d, 30d, 90d или all' };
};

// Доли в процентах, сумма ровно 100: недостающие единицы — самым большим остаткам.
export const roundShares = (counts: number[]) => {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (!total) return counts.map(() => 0);
  const exact = counts.map((count) => (count * 100) / total);
  const shares = exact.map(Math.floor);
  const order = exact.map((value, index) => ({ index, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest || a.index - b.index);
  const missing = 100 - shares.reduce((sum, share) => sum + share, 0);
  for (let i = 0; i < missing; i += 1) shares[order[i].index] += 1;
  return shares;
};

type TobaccoRow = {
  tobaccoId: string;
  manufacturer: string;
  name: string;
  choices: number;
  inStock: boolean;
  shelfStatus: string | null;
  firstArrivalAt: Date | null;
  firstArrivalKind: string | null;
};

// «Закончился» — табак на полке (в плане или в работе), но сейчас не в наличии.
const tobaccoStock = (row: TobaccoRow): GuestChoices['topTobaccos'][number]['stock'] => {
  if (row.shelfStatus === null || row.shelfStatus === 'dropped') return 'off-shelf';
  return row.inStock ? 'in' : 'out';
};

// Проба — первый приход недавно и не стартовый (как trialOf в shelf.ts).
const tobaccoTrial = (row: TobaccoRow, now: Date) =>
  tobaccoStock(row) === 'in' && isTrial(row.firstArrivalKind === 'start' ? null : row.firstArrivalAt, now);

// JIT выключен: jsonb_array_elements Postgres оценивает в 100 строк на вызов, стоимость
// раздувается, и компиляция (~200 мс на снапшоте) в разы дольше самого запроса (~30 мс).
const withoutJit = async <T>(query: Prisma.PrismaPromise<T>) => {
  const [, rows] = await prisma.$transaction([prisma.$executeRaw`SET LOCAL jit = off`, query]);
  return rows;
};

export const getGuestChoices = async (query: ChoicesPeriodQuery, now = new Date()): Promise<GuestChoices> => {
  const tz = processTimeZone();
  const from = query.from ?? (await firstChoiceDay(tz)) ?? query.to;
  const days = daysBetween(from, query.to);
  const bucket = days > WEEKLY_AFTER_DAYS ? 'week' : 'day';
  // Границы — полночь по поясу процесса; в базе createdAt хранится в UTC.
  const start = parseDay(from).toISOString();
  const end = parseDay(addDays(query.to, 1)).toISOString();
  const inWindow = (alias: string) =>
    Prisma.sql`${Prisma.raw(`${alias}."createdAt"`)} >= (${start}::timestamptz AT TIME ZONE 'UTC') AND ${Prisma.raw(`${alias}."createdAt"`)} < (${end}::timestamptz AT TIME ZONE 'UTC')`;

  const [buckets, [totals], tobaccoRows, mixRows, profileRows, mixes, rails] = await Promise.all([
    withoutJit(prisma.$queryRaw<Array<{ date: string; catalog: number; own: number }>>`
      SELECT to_char(date_trunc(${bucket}, (e."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}), 'YYYY-MM-DD') AS "date",
             (count(*) FILTER (WHERE e.src = 'catalog'))::int AS "catalog",
             (count(*) FILTER (WHERE e.src = 'own'))::int AS "own"
      FROM (
        SELECT 'catalog' AS src, s."createdAt" FROM "SmokeCtaEvent" s WHERE ${inWindow('s')}
        UNION ALL
        SELECT 'own', c."createdAt" FROM "CustomMixSmokeEvent" c WHERE ${inWindow('c')}
      ) e
      GROUP BY 1`),
    withoutJit(prisma.$queryRaw<Array<{ mixesChosen: number; avgRating: number | null; ratingsCount: number }>>`
      SELECT (SELECT count(DISTINCT s."mixId") FROM "SmokeCtaEvent" s WHERE ${inWindow('s')})::int AS "mixesChosen",
             round(avg(r.value)::numeric, 1)::float AS "avgRating",
             count(r.id)::int AS "ratingsCount"
      FROM "MixRating" r WHERE ${inWindow('r')}`),
    // Табак +1 за выбор, где он есть; замена аналогом засчитывает табак с полки.
    // Состав каталожного микса — текущий: событие его не хранит. Выборы каталога
    // сначала сворачиваются до «микс и замена», а не разворачиваются по одному.
    withoutJit(prisma.$queryRaw<TobaccoRow[]>`
      WITH catalog AS (
        SELECT s."mixId", s."substitutedFromId" AS "fromId", s."substitutedToId" AS "toId", count(*) AS n
        FROM "SmokeCtaEvent" s
        WHERE ${inWindow('s')} AND s."mixId" IS NOT NULL
        GROUP BY 1, 2, 3
      ), hits AS (
        SELECT DISTINCT c."mixId", c."fromId", c."toId", c.n,
               CASE WHEN mc."tobaccoId" = c."fromId" AND c."toId" IS NOT NULL THEN c."toId" ELSE mc."tobaccoId" END AS "tobaccoId"
        FROM catalog c JOIN "MixComponent" mc ON mc."mixId" = c."mixId"
        UNION ALL
        SELECT NULL, NULL, NULL, 1, part.id
        FROM "CustomMixSmokeEvent" o
        CROSS JOIN LATERAL (SELECT DISTINCT p->>'tobaccoId' AS id FROM jsonb_array_elements(o.components) p) part
        WHERE ${inWindow('o')}
      ), top AS (
        SELECT t.id, t.manufacturer, t.name, t."inStock", sum(h.n)::int AS choices
        FROM hits h JOIN "Tobacco" t ON t.id = h."tobaccoId"
        GROUP BY t.id
        ORDER BY choices DESC, t.manufacturer, t.name
        LIMIT ${TOP}
      )
      SELECT top.id AS "tobaccoId", top.manufacturer, top.name, top.choices, top."inStock",
             si.status AS "shelfStatus", arrival.at AS "firstArrivalAt", arrival.kind AS "firstArrivalKind"
      FROM top
      LEFT JOIN "ShelfItem" si ON si."tobaccoId" = top.id
      LEFT JOIN LATERAL (
        SELECT d."receivedAt" AS at, d.kind FROM "DeliveryLine" l JOIN "Delivery" d ON d.id = l."deliveryId"
        WHERE l."tobaccoId" = top.id AND l.kind = 'tobacco' AND l.arrived AND d.status = 'received'
        ORDER BY d."receivedAt", d."createdAt", d.id LIMIT 1
      ) arrival ON true
      ORDER BY top.choices DESC, top.manufacturer, top.name`),
    // Удалённый микс (mixId = null) — под сохранённым названием; живой — под текущим.
    withoutJit(prisma.$queryRaw<Array<{ mixId: string | null; mixName: string; choices: number; avgRating: number | null }>>`
      SELECT s."mixId", COALESCE(m.name, s."mixName") AS "mixName", count(*)::int AS choices,
             (SELECT round(avg(r.value)::numeric, 1)::float FROM "MixRating" r
              WHERE r."mixId" = s."mixId" AND ${inWindow('r')}) AS "avgRating"
      FROM "SmokeCtaEvent" s LEFT JOIN "Mix" m ON m.id = s."mixId"
      WHERE ${inWindow('s')}
      GROUP BY s."mixId", COALESCE(m.name, s."mixName")
      ORDER BY choices DESC, "mixName"
      LIMIT ${TOP}`),
    // Профили выбора: у каталожного — снимок события, у старых событий без снимка —
    // профили табаков текущего состава; у своего — профили его табаков. Профиль
    // засчитывается выбору один раз.
    withoutJit(prisma.$queryRaw<Array<{ key: string; hits: number }>>`
      WITH catalog AS (
        SELECT s."mixId", s."mixProfiles", count(*) AS n
        FROM "SmokeCtaEvent" s
        WHERE ${inWindow('s')}
        GROUP BY 1, 2
      ), pairs AS (
        SELECT p.key, c.n
        FROM catalog c CROSS JOIN LATERAL (
          SELECT jsonb_array_elements_text(c."mixProfiles") AS key
          UNION
          SELECT jsonb_array_elements_text(t."flavorProfiles"::jsonb)
          FROM "MixComponent" mc JOIN "Tobacco" t ON t.id = mc."tobaccoId"
          WHERE mc."mixId" = c."mixId" AND jsonb_array_length(c."mixProfiles") = 0
        ) p
        UNION ALL
        SELECT p.key, count(DISTINCT o.id)
        FROM "CustomMixSmokeEvent" o
        CROSS JOIN LATERAL jsonb_array_elements(o.components) part
        JOIN "Tobacco" t ON t.id = part->>'tobaccoId'
        CROSS JOIN LATERAL jsonb_array_elements_text(t."flavorProfiles"::jsonb) p(key)
        WHERE ${inWindow('o')}
        GROUP BY p.key
      )
      SELECT key, sum(n)::int AS hits FROM pairs GROUP BY key ORDER BY hits DESC, key`),
    getAvailableMixCatalog(),
    prisma.rail.findMany({
      where: { active: true, isSystem: false, type: { not: 'statistical' } },
      select: { id: true, name: true, mixes: { select: { mixId: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  const mixById = new Map(mixes.map((mix) => [mix.id, mix]));
  const counted = new Map(buckets.map((row) => [row.date, row]));
  const timeline: GuestChoices['timeline'] = [];
  const step = bucket === 'week' ? 7 : 1;
  for (let date = bucket === 'week' ? mondayOf(from) : from; date <= query.to; date = addDays(date, step)) {
    timeline.push({ date, catalog: counted.get(date)?.catalog ?? 0, own: counted.get(date)?.own ?? 0 });
  }

  const ownMixes = buckets.reduce((sum, row) => sum + row.own, 0);
  const choices = ownMixes + buckets.reduce((sum, row) => sum + row.catalog, 0);

  const topTobaccos = tobaccoRows.map((row) => ({
    tobaccoId: row.tobaccoId,
    manufacturer: row.manufacturer,
    name: row.name,
    choices: row.choices,
    stock: tobaccoStock(row),
    trial: tobaccoTrial(row, now),
  }));

  const topMixes = mixRows.map((row) => ({
    mixId: row.mixId,
    mixName: row.mixName,
    choices: row.choices,
    avgRating: row.avgRating,
    status: (row.mixId && mixById.get(row.mixId)?.status) || null,
  }));

  const shares = roundShares(profileRows.map((row) => row.hits));
  const profiles = profileRows.map((row, index) => ({ key: row.key, label: flavorProfileLabels[row.key] ?? row.key, share: shares[index] }));

  // Статистические рейлы пусты, пока гости не выбирают: мастеру там нечего чинить.
  const visible = new Set(mixes.filter((mix) => mix.guestVisible).map((mix) => mix.id));

  return {
    period: { key: query.key, from, to: query.to, days, bucket },
    kpi: {
      choices,
      ownMixes,
      mixesChosen: totals.mixesChosen,
      mixesOnShowcase: visible.size,
      avgRating: totals.avgRating,
      ratingsCount: totals.ratingsCount,
    },
    timeline,
    topTobaccos,
    topMixes,
    profiles,
    signals: {
      outPopular: topTobaccos.filter((row) => row.stock === 'out').map((row) => ({ tobaccoId: row.tobaccoId, name: row.name })),
      hiddenMixes: mixes
        .filter((mix) => mix.status === 'blocked')
        .map((mix) => ({ mixId: mix.id, mixName: mix.name }))
        .sort((left, right) => left.mixName.localeCompare(right.mixName, 'ru')),
      emptyRails: rails
        .filter((rail) => !rail.mixes.some((item) => visible.has(item.mixId)))
        .map((rail) => ({ railId: rail.id, name: rail.name })),
    },
  };
};

const firstChoiceDay = async (tz: string) => {
  const [row] = await prisma.$queryRaw<Array<{ day: string | null }>>`
    SELECT to_char((min(e.at) AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS day
    FROM (
      SELECT min("createdAt") AS at FROM "SmokeCtaEvent"
      UNION ALL
      SELECT min("createdAt") FROM "CustomMixSmokeEvent"
    ) e`;
  return row?.day ?? null;
};
