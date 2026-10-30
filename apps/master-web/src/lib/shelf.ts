import { formatCount, type ShelfCounterKey, type ShelfCounters, type ShelfRow, type ShelfView, type ShelfWeek, type StockEntry } from '../contracts';

// Чистая логика экрана «Полка» (#211, #306): фильтры, сортировка, подписи. Полка
// небольшая (сотни строк), поэтому всё считается в браузере по загруженным строкам.
// Остаток — в граммах (design/design_handoff_inventory_grams), банок нет.

// trial — «Пробы» (#329): табак впервые пришёл за 60 дней; few — «Мало данных»:
// своего расхода ещё нет (#466). Это признаки, а не статусы backend.
export type ShelfStatusKey = ShelfCounterKey | 'trial' | 'few';

export const SHELF_STATUS_CHIPS: Array<[ShelfStatusKey, string]> = [
  ['all', 'Все'],
  ['ok', 'Есть'],
  ['ending', 'Заканчивается'],
  ['check', 'Проверьте остаток'],
  ['out', 'Закончились'],
  ['stop', 'Стоп'],
  ['plan', 'В плане'],
  ['trial', 'Пробы'],
  ['few', 'Мало данных'],
];

export type ShelfSortKey = 'until' | 'rate' | 'left' | 'name' | 'arrived';

export const SHELF_SORT_OPTIONS: Array<[ShelfSortKey, string]> = [
  ['until', 'По сроку'],
  ['rate', 'По расходу'],
  ['left', 'По остатку'],
  ['name', 'По названию'],
  ['arrived', 'По приходу'],
];

export const MARK_OPTIONS: Array<{ label: string; value: number }> = [
  { label: '¾', value: 0.75 },
  { label: '½', value: 0.5 },
  { label: '⅓', value: 1 / 3 },
  { label: '¼', value: 0.25 },
];

// Как fractionGrams в apps/backend/src/stock.ts: доля — от уровня после прихода.
export const fractionGrams = (fullGrams: number, fraction: number) => Math.round(fullGrams * fraction);

export type ShelfFilters = {
  brands: string[];
  profiles: string[];
  // '' — крепость не указана.
  strengths: string[];
  mixes: '' | 'with' | 'without';
};

export const EMPTY_SHELF_FILTERS: ShelfFilters = {
  brands: [],
  profiles: [],
  strengths: [],
  mixes: '',
};

const strengthOf = (row: ShelfRow) =>
  row.tobacco.officialStrength?.trim() || row.tobacco.communityStrength?.trim() || '';

export const matchShelfStatus = (row: ShelfRow, key: ShelfStatusKey) => {
  if (key === 'all') return true;
  if (key === 'trial') return row.trial;
  if (key === 'few') return row.rateKind === 'none';
  return row.status === key;
};

export const shelfChipCount = (view: Pick<ShelfView, 'rows' | 'counters'> | null, key: ShelfStatusKey) => {
  if (!view) return 0;
  return key === 'trial' || key === 'few' ? view.rows.filter((row) => matchShelfStatus(row, key)).length : view.counters[key];
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
    if (filters.mixes === 'with' && row.mixCount === 0) return false;
    if (filters.mixes === 'without' && row.mixCount > 0) return false;
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
});

export const countActiveShelfFilters = (filters: ShelfFilters) =>
  filters.brands.length
  + filters.profiles.length
  + filters.strengths.length
  + Number(Boolean(filters.mixes));

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

const receivedTime = (row: ShelfRow) => (row.lastReceipt ? new Date(row.lastReceipt.at).getTime() : -Infinity);

export const sortShelfRows = (rows: ShelfRow[], sort: ShelfSortKey) =>
  [...rows].sort((a, b) => {
    switch (sort) {
      case 'rate':
        return (b.rate ?? -1) - (a.rate ?? -1) || byName(a, b);
      case 'left':
        return (a.leftGrams ?? Infinity) - (b.leftGrams ?? Infinity) || byName(a, b);
      case 'name':
        return byName(a, b);
      case 'arrived':
        return receivedTime(b) - receivedTime(a) || byName(a, b);
      default:
        return untilRank(a) - untilRank(b) || byName(a, b);
    }
  });

export type ShelfTone = 'default' | 'muted' | 'faint' | 'warning' | 'danger';

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export const formatShelfDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
};

const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const relativeDay = (iso: string, now = new Date()) => {
  const days = Math.round((dayStart(now) - dayStart(new Date(iso))) / 86_400_000);
  if (days === 0) return 'сегодня';
  if (days === 1) return 'вчера';
  return formatShelfDate(iso);
};

const numberFormat = (digits: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits });
const integer = numberFormat(0);
const decimal = numberFormat(1);

export const formatNumber = (value: number) => integer.format(Math.round(value));

export const formatOneDecimal = (value: number) => decimal.format(value);

export const formatDecimal = (value: number) => (value < 10 ? decimal : integer).format(value);

export const formatGrams = (grams: number) => `${formatNumber(Math.max(0, grams))} г`;

export const fractionLabel = (fraction: number) =>
  fraction >= 0.99 ? '1' : MARK_OPTIONS.find((option) => Math.abs(option.value - fraction) < 0.01)?.label ?? decimal.format(fraction);

const countLabel = (count: { grams: number; fraction: number | null }) =>
  count.fraction !== null ? fractionLabel(count.fraction) : `${formatNumber(count.grams)} г`;

// Отметка до последнего прихода об остатке уже ничего не говорит.
const freshCount = (row: Pick<ShelfRow, 'lastCount' | 'lastReceipt'>) =>
  row.lastCount && (!row.lastReceipt || row.lastCount.at >= row.lastReceipt.at) ? row.lastCount : null;

export const shelfStatusLine = (row: ShelfRow, now = new Date()): { tone: ShelfTone; text: string } | null => {
  switch (row.status) {
    case 'stop':
      return { tone: 'faint', text: row.stopNote ? `стоп для гостей: ${row.stopNote}` : 'стоп для гостей' };
    case 'out':
      return { tone: 'danger', text: 'закончился' };
    case 'ending':
      return { tone: 'warning', text: 'заканчивается' };
    case 'check':
      return { tone: 'warning', text: 'проверьте остаток' };
    case 'plan':
      return { tone: 'faint', text: 'в плане' };
    default: {
      const count = freshCount(row);
      return count && count.grams > 0 ? { tone: 'faint', text: `отметка ${countLabel(count)} ${relativeDay(count.at, now)}` } : null;
    }
  }
};

export const shelfUntil = (row: ShelfRow, leadDays: number, now = new Date()): { text: string; days: string | null; tone: ShelfTone } => {
  if (row.status === 'out') {
    if (!row.lastReceipt) return { text: '—', days: null, tone: 'faint' };
    const count = freshCount(row);
    return { text: count?.grams === 0 ? `закончился ${relativeDay(count.at, now)}` : 'закончился', days: null, tone: 'danger' };
  }
  if (row.status === 'check') return { text: 'должен был закончиться', days: null, tone: 'warning' };
  if (row.status === 'plan' || row.daysLeft === null || !row.endsAt) return { text: '—', days: null, tone: 'faint' };
  const days = Math.round(row.daysLeft);
  return {
    text: formatShelfDate(row.endsAt),
    days: `${days} дн`,
    tone: days <= 3 ? 'danger' : days <= leadDays ? 'warning' : 'default',
  };
};

export type ShelfLevel = {
  // Доля от уровня после последнего прихода, 0…1.
  share: number;
  tone: 'normal' | 'low' | 'crit';
  // Полоса пустая: остатка нет или прихода не было.
  none: boolean;
  empty: boolean;
  value: string;
  hint: string;
};

// Что число расчётное, говорит один раз шапка колонки «Остаток по учёту» (#363):
// в строке граммы без «≈», под ними — от какого уровня. Отметка мастера видна
// строкой статуса в «Хватит до» («отметка ¾ вчера»).
export const shelfLevel = (row: ShelfRow): ShelfLevel => {
  if (row.leftGrams === null || row.fullGrams === null) {
    return { share: 0, tone: 'normal', none: true, empty: false, value: '—', hint: 'прихода не было' };
  }
  const hint = `из ${formatNumber(row.fullGrams)} г после прихода`;
  // «Проверьте остаток»: расчёт мог дойти до нуля, но это оценка, а не отметка.
  if (row.leftGrams <= 0 && row.status !== 'check') return { share: 0, tone: 'normal', none: true, empty: true, value: '0 г', hint };
  const tone = row.status === 'check' || (row.daysLeft !== null && row.daysLeft <= 3) ? 'crit' : row.status === 'ending' ? 'low' : 'normal';
  return {
    share: row.fullGrams > 0 ? Math.min(1, Math.max(0, row.leftGrams) / row.fullGrams) : 0,
    tone,
    none: false,
    empty: false,
    value: formatGrams(row.leftGrams),
    hint,
  };
};

// Подпись к остатку в карточке (#shot=card, card-exact): кто дал цифру. От какого
// уровня — уже под полосой остатка над списком.
export const remainHint = (row: ShelfRow, now = new Date()) => {
  if (row.leftGrams === null || row.fullGrams === null || !row.lastReceipt) return 'прихода не было';
  if (row.leftSource !== 'mark') return 'прогноз';
  const count = freshCount(row);
  if (count?.grams === 0) return `закончился ${formatShelfDate(count.at)}`;
  return count ? `указал мастер ${relativeDay(count.at, now)}` : 'указал мастер';
};

// «Сколько осталось?» во всплывашке строки и в шторке телефона (#363, #shot=shelf-left).
export const afterReceiptLine = (row: Pick<ShelfRow, 'fullGrams' | 'lastReceipt'>) =>
  row.fullGrams === null || !row.lastReceipt
    ? null
    : `После прихода ${formatShelfDate(row.lastReceipt.at)} было ${formatNumber(row.fullGrams)} г`;

export const leftEstimateNote = (row: Pick<ShelfRow, 'leftGrams'>) =>
  row.leftGrams === null ? null : `По расчёту сейчас ${formatGrams(row.leftGrams)}.`;

// Расход в месяц — до десятков граммов, как в мокапе; малый — до грамма.
export const formatMonthGrams = (grams: number) => formatNumber(grams < 10 ? grams : Math.round(grams / 10) * 10);

export const shelfMonthRate = (row: Pick<ShelfRow, 'monthGrams' | 'rateKind'>): { value: string; hint: string | null; faint: boolean } => {
  if (row.rateKind === 'none' || row.monthGrams === null) return { value: 'мало данных', hint: null, faint: true };
  const value = `${formatMonthGrams(row.monthGrams)} г/мес`;
  return { value, hint: row.rateKind === 'brand' ? 'по бренду' : null, faint: false };
};

// Под расходом в месяц в карточке — г/день и откуда расход; без расхода «мало данных» уже в значении.
export const cardRateHint = (row: Pick<ShelfRow, 'rate' | 'rateKind'>, marks: number) => {
  if (row.rateKind === 'none' || row.rate === null) return null;
  const perDay = `${formatOneDecimal(row.rate)} г/день`;
  if (row.rateKind === 'brand') return `${perDay} по бренду`;
  return `${perDay} ${marks ? `по ${formatCount(marks, ['отметке', 'отметкам', 'отметкам'])} за 60 дней` : 'по отметкам остатка'}`;
};

const rubles = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatGramPrice = (kop: number | null) => (kop === null ? '—' : `${rubles.format(kop / 100)} ₽`);

export const formatBowlCost = (kop: number | null, bowlGrams: number) =>
  kop === null ? null : `${formatNumber(kop / 100)} ₽ за чашу ${bowlGrams} г`;

const MAX_GRAMS = 20_000;

// Граммы из поля ввода: целое число, как требует backend.
export const parseGrams = (value: string, min = 0): number | null => {
  const text = value.replace(/\s/g, '');
  if (!/^\d+$/.test(text)) return null;
  const grams = Number(text);
  return grams >= min && grams <= MAX_GRAMS ? grams : null;
};

// «Добавить приход без счёта»: граммы и, по желанию, цена за весь приход в рублях.
export const parseReceipt = (grams: string, price: string): { grams: number; priceKop?: number } | null => {
  const parsed = parseGrams(grams, 1);
  if (parsed === null) return null;
  const text = price.replace(/\s/g, '').replace(',', '.');
  if (!text) return { grams: parsed };
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  return { grams: parsed, priceKop: Math.round(Number(text) * 100) };
};

// Зеркало defaultReceiptGrams в apps/backend/src/shelf.ts: приход «На полку» из каталога.
const BIG_PACK_BRANDS = ['DARKSIDE', 'Starline'];
export const defaultReceiptGrams = (manufacturer: string) => (BIG_PACK_BRANDS.includes(manufacturer) ? 250 : 200);

// --- Тосты -------------------------------------------------------------------

export const emptyToastText = (after: ShelfRow) => {
  const tail = [
    after.mixCount ? `скрыто миксов: ${formatNumber(after.mixCount)}` : null,
    after.keepStocked ? 'табак добавлен в заказ' : null,
  ].filter(Boolean).join(', ');
  return `Закончился, гости его не видят.${tail ? ` ${tail[0].toUpperCase()}${tail.slice(1)}.` : ''}`;
};

type Count = { grams: number; fraction: number | null };

export const countToastText = (count: Count) =>
  `Осталось ${formatNumber(count.grams)} г${count.fraction !== null ? ` (${fractionLabel(count.fraction)})` : ''}.`;

export const countOverToastText = (count: Count, expected: number) =>
  `Осталось ${formatNumber(count.grams)} г, по расчёту было ${formatNumber(expected)} г. Отметка сохранена, этот отрезок в расход не идёт.`;

export const writeOffToastText = (grams: number, reason: string, after: ShelfRow) =>
  after.status === 'out'
    ? `Списано ${formatNumber(grams)} г (${reason}). Остатка нет, гости табак не видят.`
    : `Списано ${formatNumber(grams)} г (${reason}). Осталось ${formatGrams(after.leftGrams ?? 0)}.`;

export const receiptToastText = (grams: number, after: ShelfRow) =>
  `Приход +${formatNumber(grams)} г. Сейчас ${formatGrams(after.leftGrams ?? 0)}.`;

// Зеркало подсчёта в apps/backend/src/shelf.ts (getShelf): после действия
// строка приходит с сервера, а счётчики пересчитываются здесь.
export const summarizeShelf = (rows: ShelfRow[]): { counters: ShelfCounters; totals: { kg: number } } => {
  const withStatus = (status: ShelfRow['status']) => rows.filter((row) => row.status === status).length;
  return {
    counters: {
      all: rows.length,
      ok: withStatus('ok'),
      ending: withStatus('ending'),
      check: withStatus('check'),
      out: withStatus('out'),
      stop: withStatus('stop'),
      plan: withStatus('plan'),
    },
    totals: { kg: rows.reduce((total, row) => total + Math.max(0, row.leftGrams ?? 0), 0) / 1000 },
  };
};

export type ShelfShortcut =
  | { type: 'search' }
  | { type: 'move'; delta: 1 | -1 }
  | { type: 'open' }
  | { type: 'empty' }
  | { type: 'left' }
  | { type: 'mark'; fraction: number }
  | { type: 'undo' }
  // Выбор нескольких (#333): X — строку в выделение, Esc — снять выделение.
  | { type: 'select' }
  | { type: 'clear' };

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
  if (code === 'KeyO') return { type: 'left' };
  if (code === 'KeyZ') return { type: 'undo' };
  if (code === 'KeyX') return { type: 'select' };
  if (key === 'Escape') return { type: 'clear' };
  const digit = /^Digit([1-4])$/.exec(code);
  if (digit) return { type: 'mark', fraction: MARK_OPTIONS[Number(digit[1]) - 1].value };
  return null;
};

export const describeShelfError = (cause: unknown) => {
  if (cause instanceof Error && typeof (cause as Error & { status?: number }).status === 'number') {
    return cause.message;
  }
  return 'Нет связи с сервером, изменение не сохранено. Попробуйте ещё раз.';
};

// Действия строки — одни и те же на десктопе, в карточке и на телефоне.
// Закончился или в плане — остатка нет: отмечать и списывать нечего.
export type ShelfRowMenu = {
  canEmpty: boolean;
  canMark: boolean;
  canWriteOff: boolean;
  stopLabel: string;
};

export const shelfRowMenu = (row: Pick<ShelfRow, 'status' | 'stopped'>): ShelfRowMenu => {
  const inStock = row.status !== 'out' && row.status !== 'plan';
  return {
    canEmpty: inStock,
    canMark: inStock,
    canWriteOff: inStock,
    stopLabel: row.stopped ? 'Снять стоп для гостей' : 'Стоп для гостей',
  };
};

// --- Карточка: история и расход ----------------------------------------------

export type HistoryLine = {
  date: string;
  grams: string;
  tone: 'plus' | 'count' | 'zero' | 'minus';
  title: string;
  line: string;
  // Приход из поставки удаляется только вместе с поставкой.
  deletable: boolean;
};

const receiptSource = (entry: StockEntry) => {
  if (!entry.delivery) return ['без счёта', entry.actorLogin];
  if (entry.delivery.kind === 'start') return ['Стартовый приход'];
  return [entry.delivery.supplier, entry.delivery.number ? `счёт № ${entry.delivery.number}` : null];
};

const usageText = (entry: StockEntry) => {
  if (entry.excluded) return 'в расход не пошло';
  if (!entry.usage) return null;
  return `расход с ${formatShelfDate(entry.usage.from)}: ${formatOneDecimal(entry.usage.gramsPerDay)} г/день`;
};

const join = (parts: Array<string | null | undefined>) => parts.filter(Boolean).join(', ');

// Дата — своей колонкой в истории карточки, остальное через запятую.
export const historyEntry = (entry: StockEntry): HistoryLine => {
  const date = formatShelfDate(entry.at);
  const grams = formatNumber(entry.grams);
  if (entry.kind === 'receipt') {
    const price = entry.priceKop !== null && entry.grams > 0
      ? [`${formatNumber(entry.priceKop / 100)} ₽`, `${formatGramPrice(entry.priceKop / entry.grams)}/г`]
      : [];
    return {
      date,
      grams: `+${grams} г`,
      tone: 'plus',
      title: 'Приход',
      line: join([...receiptSource(entry), ...price]),
      deletable: entry.delivery === null,
    };
  }
  if (entry.kind === 'writeoff') {
    return { date, grams: `−${grams} г`, tone: 'minus', title: 'Списание', line: join([entry.reason, entry.actorLogin]), deletable: true };
  }
  if (entry.grams === 0) {
    return { date, grams: '0 г', tone: 'zero', title: 'Закончился', line: join([entry.actorLogin, usageText(entry)]), deletable: true };
  }
  const how = entry.fraction !== null
    ? `${fractionLabel(entry.fraction)} от ${formatNumber(entry.grams / entry.fraction)} г`
    : 'точно в граммах';
  return {
    date,
    grams: `${grams} г`,
    tone: 'count',
    title: `Осталось ${entry.fraction !== null ? fractionLabel(entry.fraction) : `${grams} г`}`,
    line: join([how, entry.actorLogin, usageText(entry)]),
    deletable: true,
  };
};

const RATE_WINDOW_MS = 60 * 86_400_000;

// Сколько отметок дали расход за окно расчёта (60 дней, как в stock.ts).
export const countedMarks = (history: StockEntry[], now = new Date()) =>
  history.filter(
    (entry) => entry.kind === 'count' && entry.usage && !entry.excluded && now.getTime() - new Date(entry.at).getTime() <= RATE_WINDOW_MS,
  ).length;

// Неделя графика: полная — до следующего понедельника (не включая), текущая — до сейчас.
export const weekLabel = (week: Pick<ShelfWeek, 'from' | 'to' | 'partial'>) => {
  const from = new Date(week.from);
  const to = new Date(week.partial ? week.to : new Date(week.to).getTime() - 1);
  return from.getMonth() === to.getMonth()
    ? `${from.getDate()}–${to.getDate()} ${MONTHS[to.getMonth()]}`
    : `${from.getDate()} ${MONTHS[from.getMonth()]}–${to.getDate()} ${MONTHS[to.getMonth()]}`;
};

// Блок «Проба» в карточке (#329, #shot=card-trial): история — новые сверху, первый приход — последний в ней.
export const trialArrival = (history: StockEntry[]) => {
  const first = [...history].reverse().find((entry) => entry.kind === 'receipt');
  return first ? `пришёл впервые ${formatShelfDate(first.at)}, ${formatNumber(first.grams)} г` : null;
};
