import { prisma } from './db';
import type { GuestCabinetItem, GuestFavoriteItem, GuestHistoryItem, GuestHistoryResponse, GuestMixStatus } from './types';

// История и избранное гостя (#240, PRD §8.9). Строка показывает снимок названия
// и статус: в наличии, нет табака (первый отсутствующий) или «Больше не готовим».

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const asStringList = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

type SnapshotComponent = { tobaccoId: string; manufacturer: string; name: string; proportion: number };

const asComponents = (value: unknown): SnapshotComponent[] =>
  Array.isArray(value) ? value.filter((item): item is SnapshotComponent => typeof item?.tobaccoId === 'string') : [];

const parseList = (value: string) => {
  try {
    return asStringList(JSON.parse(value));
  } catch {
    return [];
  }
};

type TobaccoState = { id: string; manufacturer: string; name: string; inStock: boolean; archived: boolean; flavorProfiles: string };

const loadTobaccos = async (ids: string[]) => {
  const tobaccos = await prisma.tobacco.findMany({
    where: { id: { in: Array.from(new Set(ids)) } },
    select: { id: true, manufacturer: true, name: true, inStock: true, archived: true, flavorProfiles: true },
  });
  return new Map<string, TobaccoState>(tobaccos.map((tobacco) => [tobacco.id, tobacco]));
};

const loadMixes = async (ids: string[]) => {
  const mixes = await prisma.mix.findMany({
    where: { id: { in: Array.from(new Set(ids)) } },
    select: {
      id: true,
      name: true,
      available: true,
      flavorProfiles: true,
      components: { orderBy: { sortOrder: 'asc' }, select: { tobaccoId: true } },
    },
  });
  return new Map(mixes.map((mix) => [mix.id, mix]));
};

const missingOf = (tobaccoIds: string[], tobaccos: Map<string, TobaccoState>, snapshot: SnapshotComponent[] = []) => {
  for (const id of tobaccoIds) {
    const tobacco = tobaccos.get(id);
    if (!tobacco) {
      const fromSnapshot = snapshot.find((item) => item.tobaccoId === id);
      return fromSnapshot ? `${fromSnapshot.manufacturer} ${fromSnapshot.name}` : id;
    }
    if (!tobacco.inStock || tobacco.archived) {
      return `${tobacco.manufacturer} ${tobacco.name}`;
    }
  }
  return null;
};

type Mixes = Awaited<ReturnType<typeof loadMixes>>;

// Удалённый или скрытый мастером микс — «Больше не готовим».
const catalogStatus = (mixId: string | null, mixes: Mixes, tobaccos: Map<string, TobaccoState>): GuestMixStatus => {
  const mix = mixId ? mixes.get(mixId) : undefined;
  if (!mix || !mix.available) {
    return { kind: 'deleted' };
  }
  const missing = missingOf(mix.components.map((item) => item.tobaccoId), tobaccos);
  return missing ? { kind: 'unavailable', missing } : { kind: 'available' };
};

const customStatus = (components: SnapshotComponent[], tobaccos: Map<string, TobaccoState>): GuestMixStatus => {
  const missing = missingOf(components.map((item) => item.tobaccoId), tobaccos, components);
  return missing ? { kind: 'unavailable', missing } : { kind: 'available' };
};

const customProfiles = (components: SnapshotComponent[], tobaccos: Map<string, TobaccoState>) =>
  Array.from(new Set(components.flatMap((item) => {
    const tobacco = tobaccos.get(item.tobaccoId);
    return tobacco ? parseList(tobacco.flavorProfiles) : [];
  })));

type CatalogRow = { mixId: string | null; mixName: string; mixProfiles: unknown };
type CustomRow = { id: string; name: string; components: unknown };

// Общая сборка строк истории и избранного: одним запросом миксы, табаки и оценки.
const buildItems = async (guestId: string, catalog: CatalogRow[], custom: CustomRow[]) => {
  const mixIds = catalog.flatMap((row) => (row.mixId ? [row.mixId] : []));
  const mixes = await loadMixes(mixIds);
  const customComponents = new Map(custom.map((row) => [row.id, asComponents(row.components)]));
  const tobaccos = await loadTobaccos([
    ...[...mixes.values()].flatMap((mix) => mix.components.map((item) => item.tobaccoId)),
    ...[...customComponents.values()].flat().map((item) => item.tobaccoId),
  ]);
  const ratings = await prisma.mixRating.findMany({ where: { guestId, mixId: { in: mixIds } }, select: { mixId: true, value: true } });
  const ownRating = new Map(ratings.map((rating) => [rating.mixId, rating.value]));

  const catalogItem = (row: CatalogRow): GuestCabinetItem => {
    const live = row.mixId ? mixes.get(row.mixId) : undefined;
    return {
      ref: { kind: 'catalog', mixId: row.mixId },
      name: live?.name ?? row.mixName,
      flavorProfiles: asStringList(row.mixProfiles).length ? asStringList(row.mixProfiles) : parseList(live?.flavorProfiles ?? '[]'),
      status: catalogStatus(row.mixId, mixes, tobaccos),
      ownRating: row.mixId ? ownRating.get(row.mixId) ?? null : null,
    };
  };
  const customItem = (row: CustomRow): GuestCabinetItem => {
    const components = customComponents.get(row.id) ?? [];
    return {
      ref: { kind: 'custom', eventId: row.id },
      name: row.name,
      flavorProfiles: customProfiles(components, tobaccos),
      status: customStatus(components, tobaccos),
      ownRating: null,
    };
  };
  return { catalogItem, customItem };
};

export const parseHistoryQuery = (query: unknown): { before: Date | null; limit: number } | { error: string } => {
  const { before, limit } = (query ?? {}) as { before?: unknown; limit?: unknown };
  const parsedLimit = limit === undefined ? DEFAULT_LIMIT : Number(limit);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_LIMIT) {
    return { error: `limit must be an integer from 1 to ${MAX_LIMIT}` };
  }
  if (before === undefined) {
    return { before: null, limit: parsedLimit };
  }
  const date = typeof before === 'string' ? new Date(before) : new Date(Number.NaN);
  return Number.isNaN(date.getTime()) ? { error: 'before must be an ISO date' } : { before: date, limit: parsedLimit };
};

export const getGuestHistory = async (guestId: string, before: Date | null, limit: number): Promise<GuestHistoryResponse> => {
  const where = { guestId, ...(before ? { createdAt: { lt: before } } : {}) };
  const orderBy = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];
  const [smokes, customs] = await Promise.all([
    prisma.smokeCtaEvent.findMany({ where, orderBy, take: limit + 1 }),
    prisma.customMixSmokeEvent.findMany({ where, orderBy, take: limit + 1, select: { id: true, name: true, components: true, createdAt: true } }),
  ]);

  const merged = [
    ...smokes.map((row) => ({ at: row.createdAt, catalog: row, custom: null })),
    ...customs.map((row) => ({ at: row.createdAt, catalog: null, custom: row })),
  ].sort((left, right) => right.at.getTime() - left.at.getTime());
  const page = merged.slice(0, limit);

  const { catalogItem, customItem } = await buildItems(
    guestId,
    page.flatMap((row) => (row.catalog ? [row.catalog] : [])),
    page.flatMap((row) => (row.custom ? [row.custom] : [])),
  );
  const items: GuestHistoryItem[] = page.map((row) => ({
    id: row.catalog?.id ?? row.custom!.id,
    at: row.at.toISOString(),
    ...(row.catalog ? catalogItem(row.catalog) : customItem(row.custom!)),
  }));
  return { items, nextBefore: merged.length > limit ? page[page.length - 1].at.toISOString() : null };
};

export const getGuestFavorites = async (guestId: string): Promise<{ items: GuestFavoriteItem[] }> => {
  const favorites = await prisma.guestFavorite.findMany({
    where: { guestId },
    orderBy: { createdAt: 'desc' },
    include: { customMixEvent: { select: { id: true, name: true, components: true } } },
  });
  const { catalogItem, customItem } = await buildItems(
    guestId,
    favorites.filter((row) => !row.customMixEventId),
    favorites.flatMap((row) => (row.customMixEvent ? [row.customMixEvent] : [])),
  );
  return {
    items: favorites.map((row) => ({
      id: row.id,
      addedAt: row.createdAt.toISOString(),
      ...(row.customMixEvent ? customItem(row.customMixEvent) : catalogItem(row)),
    })),
  };
};

export const addFavoriteMix = async (guestId: string, mixId: string) => {
  const mix = await prisma.mix.findUnique({ where: { id: mixId }, select: { id: true, name: true, flavorProfiles: true } });
  if (!mix) {
    return false;
  }
  await prisma.guestFavorite.upsert({
    where: { guestId_mixId: { guestId, mixId } },
    create: { guestId, mixId, mixName: mix.name, mixProfiles: parseList(mix.flavorProfiles) },
    update: {},
  });
  return true;
};

// Собранный микс в избранное — только из своей истории.
export const addFavoriteCustom = async (guestId: string, eventId: string) => {
  const event = await prisma.customMixSmokeEvent.findFirst({ where: { id: eventId, guestId }, select: { id: true, name: true } });
  if (!event) {
    return false;
  }
  await prisma.guestFavorite.upsert({
    where: { guestId_customMixEventId: { guestId, customMixEventId: eventId } },
    create: { guestId, customMixEventId: eventId, mixName: event.name },
    update: {},
  });
  return true;
};

export const removeFavoriteMix = (guestId: string, mixId: string) =>
  prisma.guestFavorite.deleteMany({ where: { guestId, mixId } });

export const removeFavoriteCustom = (guestId: string, eventId: string) =>
  prisma.guestFavorite.deleteMany({ where: { guestId, customMixEventId: eventId } });
