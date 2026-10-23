import { verdictForScore } from './mixer/bowl';
import { verdictLabel } from './mixer/copy';

// История и избранное гостя (#244). Типы повторяют контракт backend
// (apps/backend/src/types.ts, раздел кабинета гостя).

export type GuestMixStatus =
  | { kind: 'available' }
  | { kind: 'unavailable'; missing: string }
  | { kind: 'deleted' };

export type GuestMixRef = { kind: 'catalog'; mixId: string | null } | { kind: 'custom'; eventId: string };

export type GuestCabinetComponent = {
  tobaccoId: string;
  manufacturer: string;
  name: string;
  proportion: number;
};

export type GuestCabinetCard = {
  description: string;
  flavors: string[];
  components: GuestCabinetComponent[];
  harmony: number | null;
  madeAt: string | null;
};

export type GuestCabinetItem = {
  ref: GuestMixRef;
  name: string;
  flavorProfiles: string[];
  status: GuestMixStatus;
  ownRating: number | null;
  card: GuestCabinetCard | null;
};

export type GuestHistoryItem = GuestCabinetItem & { id: string; at: string };
export type GuestHistoryResponse = { items: GuestHistoryItem[]; nextBefore: string | null };
export type GuestFavoriteItem = GuestCabinetItem & { id: string; addedAt: string };
export type GuestFavoritesResponse = { items: GuestFavoriteItem[] };

const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

// «11 октября»; год — только если не текущий.
const formatDay = (date: Date, now: Date) =>
  `${date.getDate()} ${MONTHS[date.getMonth()]}${date.getFullYear() === now.getFullYear() ? '' : ` ${date.getFullYear()}`}`;

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

// Дни — по часам устройства гостя. Backend отдаёт историю по убыванию даты.
export const groupHistory = <T extends { at: string }>(items: T[], now: Date) => {
  const today = dayKey(now);
  const groups: Array<{ key: string; label: string; items: T[] }> = [];
  for (const item of items) {
    const at = new Date(item.at);
    const key = dayKey(at);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, label: key === today ? 'Сегодня' : formatDay(at, now), items: [item] });
    }
  }
  return groups;
};

export const rowMark = (item: GuestCabinetItem) => (item.ref.kind === 'custom' ? 'Собран вами' : null);

export const rowNote = (item: GuestCabinetItem) =>
  item.status.kind === 'deleted'
    ? 'Больше не готовим'
    : item.status.kind === 'unavailable'
      ? `Сейчас нет: ${item.status.missing}`
      : null;

// Удалённый или скрытый мастером микс приглушён и не открывается.
export const rowOpens = (item: GuestCabinetItem) => item.status.kind !== 'deleted' && item.card !== null;

export const smokeBlockReason = (status: GuestMixStatus) =>
  status.kind === 'unavailable' ? `Сейчас нет: ${status.missing}.` : null;

export const customDescription = (card: GuestCabinetCard, now: Date) => {
  const made = card.madeAt ? ` ${formatDay(new Date(card.madeAt), now)}` : '';
  const verdict =
    card.harmony === null ? '' : ` Гармония: ${verdictLabel(verdictForScore(card.harmony)).toLowerCase()}.`;
  return `Собран вами${made}.${verdict}`;
};

// 409 «табак закончился» на собранном миксе приходит с tobaccoId.
export const missingTobacco = (card: GuestCabinetCard, tobaccoId: string | null) => {
  const component = tobaccoId ? card.components.find((item) => item.tobaccoId === tobaccoId) : undefined;
  return component ? `${component.manufacturer} ${component.name}` : null;
};

export const favoriteKey = (ref: GuestMixRef) =>
  ref.kind === 'custom' ? `custom:${ref.eventId}` : ref.mixId ? `mix:${ref.mixId}` : null;

export const isFavorite = (favorites: GuestFavoriteItem[] | null, ref: GuestMixRef) => {
  const key = favoriteKey(ref);
  return Boolean(key && favorites?.some((item) => favoriteKey(item.ref) === key));
};

export const heartLabel = (on: boolean) => (on ? 'Убрать из избранного' : 'В избранное');

// Избранное грузится один раз на старте, дальше живёт локально: на нажатие
// сердечка — только PUT или DELETE, без повторного GET.
export const withFavorite = (favorites: GuestFavoriteItem[], item: GuestCabinetItem, now: Date) => {
  if (isFavorite(favorites, item.ref)) {
    return favorites;
  }
  const { ref, name, flavorProfiles, status, ownRating, card } = item;
  return [
    { ref, name, flavorProfiles, status, ownRating, card, id: favoriteKey(ref) ?? name, addedAt: now.toISOString() },
    ...favorites,
  ];
};

export const withoutFavorite = (favorites: GuestFavoriteItem[], ref: GuestMixRef) => {
  const key = favoriteKey(ref);
  return favorites.filter((item) => favoriteKey(item.ref) !== key);
};

export const withOwnRating = <T extends GuestCabinetItem>(items: T[], mixId: string, value: number) =>
  items.map((item) => (item.ref.kind === 'catalog' && item.ref.mixId === mixId ? { ...item, ownRating: value } : item));
