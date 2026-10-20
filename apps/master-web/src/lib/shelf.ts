import type { ShelfCard, ShelfCounterKey, ShelfCounters, ShelfPack, ShelfRow } from '../contracts';

// Чистая логика экрана «Полка» (#211): фильтры, сортировка, подписи. Полка
// небольшая (сотни строк), поэтому всё считается в браузере по загруженным строкам.

export type ShelfStatusKey = ShelfCounterKey;

export const SHELF_STATUS_CHIPS: Array<[ShelfStatusKey, string]> = [
  ['all', 'Все'],
  ['ok', 'Есть'],
  ['last', 'Последняя банка'],
  ['ending', 'Заканчивается'],
  ['out', 'Закончились'],
  ['stop', 'Стоп'],
  ['plan', 'В плане'],
];

export type ShelfSortKey = 'until' | 'rate' | 'name' | 'arrived';

export const SHELF_SORT_OPTIONS: Array<[ShelfSortKey, string]> = [
  ['until', 'Хватит до'],
  ['rate', 'По расходу'],
  ['name', 'По названию'],
  ['arrived', 'По приходу'],
];

export const MARK_OPTIONS: Array<{ label: string; value: number }> = [
  { label: '¾', value: 0.75 },
  { label: '½', value: 0.5 },
  { label: '⅓', value: 1 / 3 },
  { label: '¼', value: 0.25 },
];

export type ShelfFilters = {
  brands: string[];
  profiles: string[];
  // '' — крепость не указана.
  strengths: string[];
  withMixes: boolean;
  withoutMixes: boolean;
  fewData: boolean;
};

export const EMPTY_SHELF_FILTERS: ShelfFilters = {
  brands: [],
  profiles: [],
  strengths: [],
  withMixes: false,
  withoutMixes: false,
  fewData: false,
};

const strengthOf = (row: ShelfRow) =>
  row.tobacco.officialStrength?.trim() || row.tobacco.communityStrength?.trim() || '';

export const matchShelfStatus = (row: ShelfRow, key: ShelfStatusKey) => {
  if (key === 'all') return true;
  if (key === 'last') return row.last;
  if (key === 'ok') return row.status === 'ok' || row.status === 'check';
  return row.status === key;
};

const lower = (value: string) => value.toLocaleLowerCase('ru-RU');

export const filterShelfRows = (
  rows: ShelfRow[],
  { query, status, filters }: { query: string; status: ShelfStatusKey; filters: ShelfFilters },
) => {
  const words = lower(query).split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    if (!matchShelfStatus(row, status)) return false;
    if (words.length) {
      const haystack = lower(`${row.tobacco.manufacturer} ${row.tobacco.lineName} ${row.tobacco.name}`);
      if (!words.every((word) => haystack.includes(word))) return false;
    }
    if (filters.brands.length && !filters.brands.includes(row.tobacco.manufacturer)) return false;
    if (filters.profiles.length && !row.tobacco.flavorProfiles.some((profile) => filters.profiles.includes(profile))) return false;
    if (filters.strengths.length && !filters.strengths.includes(strengthOf(row))) return false;
    if (filters.withMixes !== filters.withoutMixes) {
      if (filters.withMixes && row.mixCount === 0) return false;
      if (filters.withoutMixes && row.mixCount > 0) return false;
    }
    if (filters.fewData && row.rateKind !== 'none') return false;
    return true;
  });
};

type Option = { value: string; count: number };

const countOptions = (values: string[]): Option[] => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts, ([value, count]) => ({ value, count })).sort(
    (a, b) => b.count - a.count || (a.value === '' ? 1 : b.value === '' ? -1 : a.value.localeCompare(b.value, 'ru')),
  );
};

export const buildShelfFilterOptions = (rows: ShelfRow[]) => ({
  brands: countOptions(rows.map((row) => row.tobacco.manufacturer)),
  profiles: countOptions(rows.flatMap((row) => row.tobacco.flavorProfiles)),
  strengths: countOptions(rows.map(strengthOf)),
  extra: {
    withMixes: rows.filter((row) => row.mixCount > 0).length,
    withoutMixes: rows.filter((row) => row.mixCount === 0).length,
    fewData: rows.filter((row) => row.rateKind === 'none').length,
  },
});

export const countActiveShelfFilters = (filters: ShelfFilters) =>
  filters.brands.length
  + filters.profiles.length
  + filters.strengths.length
  + Number(filters.withMixes)
  + Number(filters.withoutMixes)
  + Number(filters.fewData);

const byName = (a: ShelfRow, b: ShelfRow) =>
  a.tobacco.manufacturer.localeCompare(b.tobacco.manufacturer, 'ru')
  || a.tobacco.name.localeCompare(b.tobacco.name, 'ru');

// «Хватит до»: сначала то, что требует внимания сейчас.
const untilRank = (row: ShelfRow) => {
  if (row.status === 'out') return -2;
  if (row.status === 'check') return -1;
  if (row.status === 'plan') return Number.MAX_VALUE;
  return row.daysLeft ?? Number.MAX_SAFE_INTEGER;
};

const receivedTime = (row: ShelfRow) => (row.lastReceipt ? new Date(row.lastReceipt.receivedAt).getTime() : -Infinity);

export const sortShelfRows = (rows: ShelfRow[], sort: ShelfSortKey) =>
  [...rows].sort((a, b) => {
    switch (sort) {
      case 'rate':
        return (b.rate ?? -1) - (a.rate ?? -1) || byName(a, b);
      case 'name':
        return byName(a, b);
      case 'arrived':
        return receivedTime(b) - receivedTime(a) || byName(a, b);
      default:
        return untilRank(a) - untilRank(b) || byName(a, b);
    }
  });

export type ShelfTone = 'default' | 'muted' | 'faint' | 'warning' | 'danger';

export const shelfStatusLine = (row: ShelfRow): { tone: ShelfTone; text: string } | null => {
  switch (row.status) {
    case 'stop':
      return { tone: 'faint', text: row.stopNote ? `стоп для гостей · ${row.stopNote}` : 'стоп для гостей' };
    case 'out':
      return { tone: 'danger', text: 'закончился' };
    case 'ending':
      return { tone: 'warning', text: row.last ? 'заканчивается · последняя банка' : 'заканчивается' };
    case 'check':
      return { tone: 'warning', text: 'проверьте остаток' };
    case 'plan':
      return { tone: 'faint', text: 'в плане' };
    default:
      return row.last ? { tone: 'muted', text: 'последняя банка' } : null;
  }
};

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export const formatShelfDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
};

export const shelfUntil = (row: ShelfRow, leadDays: number): { text: string; days: string | null; tone: ShelfTone } => {
  if (row.status === 'out') return { text: 'нет банок', days: null, tone: 'danger' };
  if (row.status === 'check') return { text: 'должна была закончиться', days: null, tone: 'warning' };
  if (row.status === 'plan' || row.daysLeft === null || !row.endsAt) return { text: '—', days: null, tone: 'faint' };
  const days = Math.round(row.daysLeft);
  return {
    text: `${row.rateKind === 'brand' ? '~' : ''}${formatShelfDate(row.endsAt)}`,
    days: `${days} дн`,
    tone: days <= 3 ? 'danger' : days <= leadDays ? 'warning' : 'default',
  };
};

export type ShelfPip = { id: string; fill: number; tone: 'normal' | 'low' | 'crit' };

export const shelfPips = (row: ShelfRow) => {
  const crit = row.status === 'ending' && row.daysLeft !== null && row.daysLeft <= 3;
  const open: ShelfPip[] = row.openPacks.map((pack) => ({
    id: pack.id,
    fill: pack.fraction,
    tone: crit ? 'crit' : pack.fraction < 0.34 ? 'low' : 'normal',
  }));
  const label = !open.length && !row.sealedCount ? 'нет' : `${open.length} + ${row.sealedCount}`;
  return { open, sealed: row.sealedCount, label };
};

const numberFormat = (digits: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits });
const integer = numberFormat(0);
const decimal = numberFormat(1);

export const formatNumber = (value: number) => integer.format(Math.round(value));

export const formatOneDecimal = (value: number) => decimal.format(value);

export const formatDecimal = (value: number) => (value < 10 ? decimal : integer).format(value);

export const formatGrams = (grams: number) => (grams > 0 ? `≈ ${formatNumber(grams)} г` : '—');

export const formatRate = (row: Pick<ShelfRow, 'rate' | 'rateKind'>) => {
  if (row.rateKind === 'none' || row.rate === null) return 'мало данных';
  if (row.rateKind === 'brand') return `≈ ${formatDecimal(row.rate)} г/день · бренд`;
  return `${formatDecimal(row.rate)} г/день`;
};

const rubles = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatGramPrice = (kop: number | null) => (kop === null ? '—' : `${rubles.format(kop / 100)} ₽`);

export const formatBowlCost = (kop: number | null, bowlGrams: number) =>
  kop === null ? null : `≈ ${formatNumber(kop / 100)} ₽ на чашу ${bowlGrams} г`;

export const formatPackPrice = (kop: number) => `${formatNumber(kop / 100)} ₽`;

export const emptyToastText = (before: ShelfRow, after: ShelfRow) => {
  if (after.openPacks.length || after.sealedCount) {
    return before.openPacks.length > 1
      ? `банка пустая. В работе: ${after.openPacks.length}, в запасе: ${after.sealedCount}.`
      : `банка пустая, следующая вскрыта. В запасе: ${after.sealedCount}.`;
  }
  const hidden = after.mixCount ? ` Миксов скрыто: ${after.mixCount}.` : '';
  return `табак закончился, гости его больше не видят.${hidden}`;
};

// Зеркало подсчёта в apps/backend/src/shelf.ts (getShelf): после действия
// строка приходит с сервера, а счётчики пересчитываются здесь.
export const summarizeShelf = (rows: ShelfRow[]): { counters: ShelfCounters; totals: { packs: number; kg: number } } => {
  const withStatus = (...statuses: ShelfRow['status'][]) => rows.filter((row) => statuses.includes(row.status)).length;
  return {
    counters: {
      all: rows.length,
      ok: withStatus('ok', 'check'),
      last: rows.filter((row) => row.last).length,
      ending: withStatus('ending'),
      out: withStatus('out'),
      stop: withStatus('stop'),
      plan: withStatus('plan'),
    },
    totals: {
      packs: rows.reduce((total, row) => total + row.openPacks.length + row.sealedCount, 0),
      kg: rows.reduce((total, row) => total + row.remainingGrams, 0) / 1000,
    },
  };
};

export type ShelfShortcut =
  | { type: 'search' }
  | { type: 'move'; delta: 1 | -1 }
  | { type: 'open' }
  | { type: 'empty' }
  | { type: 'mark'; fraction: number }
  | { type: 'undo' };

// По коду клавиши, а не по символу: на русской раскладке E — это «у», Z — «я».
export const resolveShelfShortcut = ({
  key,
  code,
  inField = false,
  modifier = false,
}: {
  key: string;
  code: string;
  inField?: boolean;
  modifier?: boolean;
}): ShelfShortcut | null => {
  if (inField || modifier) return null;
  if (key === '/' || code === 'Slash') return { type: 'search' };
  if (key === 'ArrowDown') return { type: 'move', delta: 1 };
  if (key === 'ArrowUp') return { type: 'move', delta: -1 };
  if (key === 'Enter') return { type: 'open' };
  if (code === 'KeyE') return { type: 'empty' };
  if (code === 'KeyZ') return { type: 'undo' };
  const digit = /^Digit([1-4])$/.exec(code);
  if (digit) return { type: 'mark', fraction: MARK_OPTIONS[Number(digit[1]) - 1].value };
  return null;
};

export const describeShelfError = (cause: unknown) => {
  if (cause instanceof Error && typeof (cause as Error & { status?: number }).status === 'number') {
    return cause.message;
  }
  return 'Нет связи с сервером — изменение не сохранено. Повторить позже.';
};

// Списывается открытая банка, а если её нет — самая старая из запаса
// (банки в карточке отсортированы по приходу).
export const pickWriteOffPack = (card: Pick<ShelfCard, 'packs'>): ShelfPack | null =>
  card.packs.find((pack) => pack.state === 'open') ?? card.packs.find((pack) => pack.state === 'sealed') ?? null;

const PACK_STATE_TITLE: Record<ShelfPack['state'], string> = {
  sealed: 'В запасе',
  open: 'В работе',
  empty: 'Пустая',
  written_off: 'Списана',
};

export const packTitle = (pack: ShelfPack, index: number) => `${PACK_STATE_TITLE[pack.state]} · банка ${index}`;

export const fractionLabel = (fraction: number) =>
  fraction >= 0.99 ? '1' : MARK_OPTIONS.find((option) => Math.abs(option.value - fraction) < 0.01)?.label ?? decimal.format(fraction);

const packSource = (pack: ShelfPack) => {
  if (!pack.delivery) return null;
  if (pack.delivery.kind === 'start') return 'Стартовый приход';
  return [pack.delivery.supplier, pack.delivery.number ? `счёт № ${pack.delivery.number}` : null].filter(Boolean).join(' · ') || null;
};

export const packLine = (pack: ShelfPack) => {
  const parts: Array<string | null> = [];
  if (pack.state === 'empty') {
    parts.push(packSource(pack), `${formatShelfDate(pack.openedAt)} → ${formatShelfDate(pack.emptiedAt)}`);
    if (pack.usage) parts.push(`${formatNumber(pack.usage.days)} дн`, `${decimal.format(pack.usage.gramsPerDay)} г/день`);
    return parts.filter(Boolean).join(' · ');
  }
  parts.push(`пришла ${formatShelfDate(pack.receivedAt)}`);
  if (pack.state === 'written_off') {
    parts.push(`списана ${formatShelfDate(pack.writtenOffAt)}`, pack.writeOffReason);
    return parts.filter(Boolean).join(' · ');
  }
  if (pack.state === 'open') {
    parts.push(`вскрыта ${formatShelfDate(pack.openedAt)}`);
    const mark = pack.marks[pack.marks.length - 1];
    if (mark) parts.push(`отметка ${fractionLabel(mark.fraction)} ${formatShelfDate(mark.at)}`);
    return parts.join(' · ');
  }
  parts.push(packSource(pack), pack.priceKop !== null ? formatPackPrice(pack.priceKop) : null);
  return parts.filter(Boolean).join(' · ');
};

// Пункты меню «⋯» строки — одни и те же на десктопе и в карточке на телефоне (#228).
// Недоступное не прячем, а гасим: так видно, чего табаку не хватает.
export type ShelfRowMenu = {
  canMark: boolean;
  canOpenAnother: boolean;
  canWriteOff: boolean;
  stopLabel: string;
  writeOffHint: string;
};

export const shelfRowMenu = (row: Pick<ShelfRow, 'openPacks' | 'sealedCount' | 'stopped'>): ShelfRowMenu => {
  const hasOpen = row.openPacks.length > 0;
  return {
    canMark: hasOpen,
    canOpenAnother: row.sealedCount > 0,
    canWriteOff: hasOpen || row.sealedCount > 0,
    stopLabel: row.stopped ? 'Снять стоп для гостей' : 'Стоп для гостей',
    writeOffHint: `${hasOpen ? 'Спишется открытая банка.' : 'Спишется самая старая банка из запаса.'} В расход не пойдёт.`,
  };
};

// «Добавить банку вручную»: вес — целые граммы, цена в рублях — по желанию.
export const parseManualPack = (weight: string, price: string): { weight: number; priceKop?: number } | null => {
  const grams = Number(weight);
  if (!weight.trim() || !Number.isInteger(grams) || grams < 1) return null;
  const rubles = Number(price.replace(',', '.'));
  return { weight: grams, ...(price.trim() && rubles >= 0 ? { priceKop: Math.round(rubles * 100) } : {}) };
};
