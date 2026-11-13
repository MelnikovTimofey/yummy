import type { MixStatus, MixSubstitution, ShelfArrival, ShelfRow, ShelfTrialVerdict } from '../contracts';
import { rankBySearch } from './search-match';

// Чистая логика экрана «Полка» (#211, #518): фильтры, сортировка, подписи. Полка
// небольшая (сотни строк), поэтому всё считается в браузере по загруженным строкам.
// Граммов нет (design/design_handoff_shelf_status): табак есть или закончился.

export type ShelfState = 'in' | 'out' | 'stop' | 'plan';

// В плане табака ещё нет; закончившийся не на полке совсем, поэтому важнее стопа.
export const shelfState = (row: Pick<ShelfRow, 'shelfStatus' | 'outAt' | 'stopped'>): ShelfState => {
  if (row.shelfStatus === 'plan') return 'plan';
  if (row.outAt) return 'out';
  return row.stopped ? 'stop' : 'in';
};

// trial — «Проба» (#329): табак впервые пришёл за 60 дней. Это признак, а не статус.
export type ShelfStatusKey = 'all' | ShelfState | 'trial';

export const SHELF_STATUS_CHIPS: Array<[ShelfStatusKey, string]> = [
  ['all', 'Все'],
  ['in', 'Есть'],
  ['out', 'Закончились'],
  ['stop', 'Стоп'],
  ['plan', 'В плане'],
  ['trial', 'Проба'],
];

export const matchShelfStatus = (row: ShelfRow, key: ShelfStatusKey) => {
  if (key === 'all') return true;
  if (key === 'trial') return row.trial;
  return shelfState(row) === key;
};

export const shelfCounts = (rows: ShelfRow[]) =>
  Object.fromEntries(SHELF_STATUS_CHIPS.map(([key]) => [key, rows.filter((row) => matchShelfStatus(row, key)).length])) as Record<
    ShelfStatusKey,
    number
  >;

export type ShelfSortKey = 'status' | 'name' | 'arrived';

export const SHELF_SORT_OPTIONS: Array<[ShelfSortKey, string]> = [
  ['status', 'По наличию'],
  ['name', 'По названию'],
  ['arrived', 'По приходу'],
];

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

// Поиск — по неточному совпадению (#522): точные выше похожих, внутри групп —
// порядок rows, поэтому сортировать строки нужно до отбора.
export const filterShelfRows = (
  rows: ShelfRow[],
  { query, status, filters }: { query: string; status: ShelfStatusKey; filters: ShelfFilters },
) => {
  const narrowed = rows.filter((row) => {
    if (!matchShelfStatus(row, status)) return false;
    if (filters.brands.length && !filters.brands.includes(row.tobacco.manufacturer)) return false;
    if (filters.profiles.length && !row.tobacco.flavorProfiles.some((profile) => filters.profiles.includes(profile))) return false;
    if (filters.strengths.length && !filters.strengths.includes(strengthOf(row))) return false;
    if (filters.mixes === 'with' && row.mixCount === 0) return false;
    if (filters.mixes === 'without' && row.mixCount > 0) return false;
    return true;
  });
  return rankBySearch(narrowed, query, (row) => [row.tobacco.manufacturer, row.tobacco.lineName, row.tobacco.name]);
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

const STATE_RANK: Record<ShelfState, number> = { out: 0, in: 1, stop: 2, plan: 3 };

const time = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : -Infinity);

export const sortShelfRows = (rows: ShelfRow[], sort: ShelfSortKey) =>
  [...rows].sort((a, b) => {
    switch (sort) {
      case 'name':
        return byName(a, b);
      case 'arrived':
        return time(b.lastArrival?.at) - time(a.lastArrival?.at) || byName(a, b);
      default:
        // Закончившиеся сверху, свежие первыми: с ними сейчас и работа.
        return STATE_RANK[shelfState(a)] - STATE_RANK[shelfState(b)] || time(b.outAt) - time(a.outAt) || byName(a, b);
    }
  });

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export const formatShelfDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
};

const integer = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

export const formatNumber = (value: number) => integer.format(Math.round(value));

// Колонка «Наличие»: статус точкой и строка ниже (#shot=shelf).
export const shelfStatusCell = (row: ShelfRow): { tone: ShelfState; label: string; note: string | null } => {
  const state = shelfState(row);
  switch (state) {
    case 'out':
      return { tone: state, label: `Закончился ${formatShelfDate(row.outAt)}`, note: row.keepStocked ? 'в заявке' : 'не держим' };
    case 'stop':
      return { tone: state, label: 'Стоп для гостей', note: row.stopNote || null };
    case 'plan':
      return { tone: state, label: 'В плане', note: 'ждёт прихода' };
    default:
      return { tone: state, label: 'Есть', note: null };
  }
};

const arrivalSource = (arrival: ShelfArrival) => {
  if (arrival.kind === 'start') return 'Стартовый приход';
  return arrival.supplier ?? 'без счёта';
};

// Колонка «Приход»: дата последнего прихода и откуда он.
export const arrivalCell = (arrival: ShelfArrival | null) =>
  arrival ? { date: formatShelfDate(arrival.at), source: arrivalSource(arrival) } : null;

// «Приходы» в карточке (#shot=card): штуки — только у строки счёта.
export const arrivalLine = (arrival: ShelfArrival) => {
  const doc = arrival.kind !== 'invoice' ? 'вручную' : arrival.number ? `счёт ${arrival.number}` : 'по счёту';
  return {
    title: `${formatShelfDate(arrival.at)}, ${arrivalSource(arrival)}`,
    detail: [arrival.qty !== null ? `${formatNumber(arrival.qty)} шт.` : null, doc].filter(Boolean).join(', '),
  };
};

// Блок «Проба» в карточке (#329): приходы новые первыми, первый — последний в списке.
export const trialArrival = (arrivals: ShelfArrival[]) => {
  const first = arrivals[arrivals.length - 1];
  return first ? `пришёл впервые ${formatShelfDate(first.at)}` : null;
};

// «Зашло / Не зашло» пробы (#329): повторный клик по выбранному снимает отметку.
export const nextTrialVerdict = (current: ShelfTrialVerdict | null, clicked: ShelfTrialVerdict) =>
  current === clicked ? null : clicked;

// Одна кнопка строки: «Закончился», «Вернуть в наличие» (у плана — «В наличие», #558) или «Снять стоп».
export type ShelfRowAction = 'empty' | 'restock' | 'unstop' | null;

export const shelfRowAction = (row: ShelfRow): ShelfRowAction => {
  switch (shelfState(row)) {
    case 'in':
      return 'empty';
    case 'out':
    case 'plan':
      return 'restock';
    case 'stop':
      return 'unstop';
    default:
      return null;
  }
};

export const restockLabel = (row: Pick<ShelfRow, 'shelfStatus'>) => (row.shelfStatus === 'plan' ? 'В наличие' : 'Вернуть в наличие');

// Действия строки — одни и те же на десктопе, в карточке и на телефоне.
export type ShelfRowMenu = { canEmpty: boolean; canRestock: boolean; stopLabel: string };

export const shelfRowMenu = (row: ShelfRow): ShelfRowMenu => {
  const state = shelfState(row);
  return {
    canEmpty: state === 'in' || state === 'stop',
    canRestock: state === 'out' || state === 'plan',
    stopLabel: row.stopped ? 'Снять стоп для гостей' : 'Стоп для гостей',
  };
};

// --- Тосты: название жирной строкой, ниже отдельное предложение ---------------

export const emptyToast = (row: ShelfRow) => ({
  title: `${row.tobacco.name} закончился`,
  text: !row.keepStocked
    ? 'В заявку не попадёт: не держим постоянно.'
    : row.mixCount
      ? 'Снят с витрины. Добавлен в заявку.'
      : 'Добавлен в заявку.',
});

// fromPlan — табак был в плане: «снова» к нему не подходит.
export const restockToast = (row: ShelfRow, fromPlan = false) => ({
  title: fromPlan ? `${row.tobacco.name} есть` : `${row.tobacco.name} снова есть`,
  text: row.stopped ? 'Стоп для гостей остался.' : fromPlan ? 'Появился на витрине.' : 'Вернулся на витрину.',
});

export const keepToast = (row: ShelfRow) => ({
  title: row.tobacco.name,
  text: row.outAt ? 'Держим постоянно. Добавлен в заявку.' : 'Держим постоянно. Закончится, попадёт в заявку.',
});

// «В миксах» карточки (#shot=card): чем закрыт микс, пока табака нет.
export const cardMixState = (mix: { status: MixStatus | null; substitution: MixSubstitution | null }) => {
  switch (mix.status) {
    case 'substituted':
      return { text: mix.substitution ? `аналог ${mix.substitution.to.manufacturer} ${mix.substitution.to.name}` : 'с заменой', danger: false };
    case 'blocked':
    case 'hidden':
      return { text: 'скрыт', danger: true };
    case 'visible':
      return { text: 'на витрине', danger: false };
    default:
      return null;
  }
};

export type ShelfShortcut =
  | { type: 'search' }
  | { type: 'move'; delta: 1 | -1 }
  | { type: 'open' }
  | { type: 'empty' }
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
  if (code === 'KeyZ') return { type: 'undo' };
  if (code === 'KeyX') return { type: 'select' };
  if (key === 'Escape') return { type: 'clear' };
  return null;
};

export const describeShelfError = (cause: unknown) => {
  if (cause instanceof Error && typeof (cause as Error & { status?: number }).status === 'number') {
    return cause.message;
  }
  return 'Нет связи с сервером, изменение не сохранено. Попробуйте ещё раз.';
};
