import {
  formatCount,
  formatFlavorProfileLabel,
  type PurchaseBaseRow,
  type PurchaseFastRow,
  type PurchaseIdleRow,
  type PurchaseProfileRow,
  type PurchaseTrialRow,
  type PurchaseView,
  type ShelfStatus,
  type ShelfTrialVerdict,
} from '../contracts';
import { formatMonthGrams, formatNumber, formatOneDecimal, formatShelfDate, type ShelfTone } from './shelf';

// Чистая логика вида «Закупка» на «Полке» (#327–#331,
// design/design_handoff_purchase_analytics, #shot=purchase-*). Подсказки — только
// по расходу точки; «В приложении» — справочно, часть заказов.

export type PurchaseSection = 'base' | 'fast' | 'trials' | 'idle' | 'profiles';

export const PURCHASE_SECTIONS: Array<[PurchaseSection, string]> = [
  ['base', 'База'],
  ['fast', 'Закончились быстро'],
  ['trials', 'Пробы'],
  ['idle', 'Лежит'],
  ['profiles', 'Вкусы'],
];

// Число на чипе раздела — сколько в нём требует внимания; данных мало — без числа.
export const sectionCount = (view: PurchaseView, section: PurchaseSection): number | null => {
  const data = view[section];
  if (!data.enough) return null;
  switch (section) {
    case 'base':
      return view.base.counts.notBase + view.base.counts.idleBase;
    case 'profiles':
      return view.profiles.rows.filter((row) => row.flag !== null).length;
    default:
      return view[section].rows.length;
  }
};

const today = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

export const purchaseDate = (now = new Date()) => `за 30–60 дней · ${today.format(now)}`;

const rub = (kop: number) => `${formatNumber(kop / 100)} ₽`;
const approxRub = (kop: number) => `≈ ${rub(kop)}`;

const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_IN = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];

export type TextSegment = { text: string; strong?: boolean };
export type BudgetTile = { label: string; value: string; hint: string; tone: 'default' | 'success' | 'danger' };
type UnknownNote = { warn: string; text: string } | null;

export type BudgetStrip =
  | { kind: 'none'; segments: TextSegment[]; unknown: UnknownNote }
  | { kind: 'budget'; tiles: BudgetTile[]; unknown: UnknownNote };

// Полоса бюджета над разделами (#326, #shot=purchase-base, edge-no-budget).
export const budgetStrip = ({ budget, spend }: Pick<PurchaseView, 'budget' | 'spend'>): BudgetStrip => {
  const unknown: UnknownNote = budget.unknownCount
    ? {
        warn: `У ${formatCount(budget.unknownCount, ['табака', 'табаков', 'табаков'])} базы нет цены`,
        text: ' — стартовый остаток заводился без счёта. Сумма базы станет точной после их первого прихода по счёту.',
      }
    : null;
  const invite = 'Укажите бюджет на табак — покажем, сколько остаётся на то, чего нет, и на пробы.';
  if (budget.budgetKop === null) {
    return {
      kind: 'none',
      segments: budget.baseKop > 0
        ? [{ text: 'База в месяц стоит ' }, { text: approxRub(budget.baseKop), strong: true }, { text: `. ${invite}` }]
        : [{ text: invite }],
      unknown,
    };
  }
  const monthIndex = Number(spend.month.slice(5, 7)) - 1;
  const left = budget.leftKop ?? budget.budgetKop - budget.baseKop;
  const spentShare = budget.budgetKop > 0 ? Math.round((spend.totalKop / budget.budgetKop) * 100) : 0;
  return {
    kind: 'budget',
    tiles: [
      { label: `Бюджет · ${MONTHS[monthIndex] ?? 'месяц'}`, value: rub(budget.budgetKop), hint: 'настройка полки', tone: 'default' },
      {
        label: 'База в месяц',
        value: approxRub(budget.baseKop),
        hint: `${formatCount(budget.baseCount, ['табак', 'табака', 'табаков'])} «держим постоянно»`,
        tone: 'default',
      },
      left >= 0
        ? { label: 'Остаётся на пробы', value: approxRub(left), hint: 'и на то, чего нет', tone: 'success' }
        : { label: 'База больше бюджета на', value: approxRub(-left), hint: 'на пробы не остаётся', tone: 'danger' },
      {
        label: MONTHS_IN[monthIndex] ? `Потрачено в ${MONTHS_IN[monthIndex]}` : 'Потрачено за месяц',
        value: rub(spend.totalKop),
        hint: `по принятым счетам · ${spentShare} % бюджета`,
        tone: 'default',
      },
    ],
    unknown,
  };
};

const percent = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const rating = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatShare = (share: number) => (share === 0 ? '0 %' : `${percent.format(share * 100)} %`);

export type PurchaseFlag = { text: string; tone: ShelfTone; up: boolean };

// «База» (#327): свой расход — граммы, доля и рубли; «бренд» — ориентир без доли и подсказок.
export const baseRowView = (row: PurchaseBaseRow) => {
  const few = row.rateKind === 'none' || row.monthGrams === null;
  const brand = !few && row.rateKind === 'brand';
  const flag: PurchaseFlag | null =
    row.flag === 'notBase'
      ? { text: 'берут часто, не в базе', tone: 'warning', up: true }
      : row.flag === 'idleBase'
        ? { text: 'почти не берут', tone: 'faint', up: false }
        : null;
  return {
    month: few ? 'мало данных' : `${brand ? '≈ ' : ''}${formatMonthGrams(row.monthGrams!)} г`,
    brand,
    few,
    share: row.share === null || row.rateKind !== 'own' ? '—' : formatShare(row.share),
    rub: row.rubKop === null || few ? '—' : `${brand ? '≈ ' : ''}${rub(row.rubKop)}`,
    app: row.app.smokes ? formatNumber(row.app.smokes) : '—',
    flag: row.rateKind === 'own' ? flag : null,
  };
};

const daysText = (days: number) => {
  const value = Math.round(days);
  return value < 1 ? 'меньше дня' : formatCount(value, ['день', 'дня', 'дней']);
};

const NOW_STATUS: Record<ShelfStatus, { text: string; tone: ShelfTone }> = {
  out: { text: 'нет на полке', tone: 'danger' },
  ending: { text: 'заканчивается', tone: 'warning' },
  check: { text: 'проверьте остаток', tone: 'warning' },
  stop: { text: 'стоп для гостей', tone: 'faint' },
  plan: { text: 'в плане', tone: 'faint' },
  ok: { text: 'есть', tone: 'default' },
};

// «Закончились быстро» (#328): приход ушёл за 3 дня и быстрее — что было дальше.
export const fastRowView = (row: PurchaseFastRow) => ({
  receipt: `+${formatNumber(row.receiptGrams)} г`,
  receivedAt: formatShelfDate(row.receivedAt),
  gone: daysText(row.goneDays),
  times: row.times > 1 ? `×${row.times} за 60 дней` : null,
  empty: `${Math.round(row.emptyDays)} дн`,
  ongoing: row.ongoing,
  next: row.next ? `+${formatNumber(row.next.grams)} г ${formatShelfDate(row.next.at)}` : null,
  now: NOW_STATUS[row.status],
});

// «Пробы» (#329): скорость к полке; приложение — справочно, «нет в миксах» — гости приложения пробу не увидят.
export const trialRowView = (row: PurchaseTrialRow) => ({
  receipt: `${formatNumber(row.receiptGrams)} г`,
  receivedAt: formatShelfDate(row.receivedAt),
  speed: row.speed === null ? null : { text: `×${formatOneDecimal(row.speed)} к полке`, fast: row.speed > 1 },
  gone: row.goneDays === null ? null : `ушла за ${daysText(row.goneDays)}`,
  app: row.mixCount === 0
    ? { kind: 'noMixes' as const, text: 'нет в миксах' }
    : { kind: 'stats' as const, text: `${formatNumber(row.app.smokes)} · ★ ${row.app.rating === null ? '—' : rating.format(row.app.rating)}` },
});

// Итог пробы словами — как trialVerdict() в мокапе.
export const trialVerdictText = (speed: number | null, verdict: ShelfTrialVerdict | null): { text: string; tone: ShelfTone } => {
  if (speed === null) return { text: 'мало данных: отметок остатка ещё не было', tone: 'faint' };
  const pace = speed > 1 ? 'расходится быстрее полки' : 'расходится медленнее полки';
  const mark = verdict === 'yes' ? 'гостям зашло' : verdict === 'no' ? 'гостям не зашло' : 'ждёт вашей отметки';
  return { text: `${pace} · ${mark}`, tone: verdict === 'no' || (speed < 1 && !verdict) ? 'muted' : 'default' };
};

// «Зашло / Не зашло»: повторный клик по выбранному снимает отметку.
export const nextTrialVerdict = (current: ShelfTrialVerdict | null, clicked: ShelfTrialVerdict) =>
  current === clicked ? null : clicked;

// «Лежит» (#330): остаток, расход за 21 день и деньги в нём.
export const idleRowView = (row: PurchaseIdleRow) => ({
  left: `≈ ${formatNumber(row.leftGrams)} г`,
  rate: row.rate21 > 0 ? `${formatOneDecimal(row.rate21)} г/день` : '0 г',
  rub: row.rubKop === null ? '—' : rub(row.rubKop),
  receivedAt: formatShelfDate(row.receivedAt),
  days: `${Math.round(row.days)} дн`,
});

export const idleNotes = (idle: PurchaseView['idle']) => ({
  total: approxRub(idle.totalKop),
  unmarked: idle.unmarkedCount
    ? `Ещё ${formatCount(idle.unmarkedCount, ['табак', 'табака', 'табаков'])} без отметок остатка за 21 день — их расход неизвестен.`
    : null,
  unknownPrice: idle.unknownPriceCount
    ? `У ${formatCount(idle.unknownPriceCount, ['табака', 'табаков', 'табаков'])} нет цены прихода — в «заморожено» не ${idle.unknownPriceCount === 1 ? 'вошёл' : 'вошли'}.`
    : null,
});

// Направление вкуса — в единственном числе, как в мокапе («Идеи: ягодный»).
const DIRECTIONS: Record<string, string> = {
  berry: 'Ягодный',
  citrus: 'Цитрусовый',
  dessert: 'Десертный',
  floral_herbal: 'Травяной',
  fresh: 'Свежий',
  fruity: 'Фруктовый',
  minty: 'Мятный',
  perfume: 'Парфюмный',
  sour: 'Кислый',
  spicy: 'Пряный',
  sweet: 'Сладкий',
  tobacco: 'Табачный',
};

export const profileDirection = (key: string) => DIRECTIONS[key] ?? formatFlavorProfileLabel(key);

const bar = (share: number, max: number) => ({ text: `${Math.round(share * 100)} %`, width: max > 0 ? share / max : 0 });

// «Вкусы» (#331): доля в расходе точки против доли на полке; приложение — справочно.
export const profileBars = (rows: PurchaseProfileRow[]) => {
  const max = Math.max(0, ...rows.flatMap((row) => [row.spend, row.shelf, row.app]));
  return rows.map((row) => ({
    key: row.key,
    label: profileDirection(row.key),
    spend: bar(row.spend, max),
    shelf: bar(row.shelf, max),
    app: bar(row.app, max),
    flag:
      row.flag === 'more'
        ? { text: 'расходится больше, чем есть', tone: 'warning' as ShelfTone }
        : row.flag === 'less'
          ? { text: 'на полке больше, чем расходится', tone: 'faint' as ShelfTone }
          : null,
    ideas: row.flag === 'more' ? `Идеи: ${profileDirection(row.key).toLocaleLowerCase('ru-RU')}` : null,
  }));
};

const DAY_MS = 86_400_000;
// Расход и всё, что из него следует, появляется через 2–4 недели: ориентир — 4 недели.
const SETTLE_DAYS = 28;
const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

// Пустое состояние раздела (#shot=edge-few): когда появятся цифры.
export const fewDataText = (since: string | null, now = new Date()) => {
  const hint = 'заносите счета в «Поставки» и жмите «Закончился», когда табак кончился';
  if (!since) {
    return `Учёт в граммах ещё не начался. Расход и всё, что из него следует, появится через 2–4 недели после первого счёта: ${hint}.`;
  }
  const start = new Date(since);
  const days = Math.round((dayStart(now) - dayStart(start)) / DAY_MS);
  if (days > SETTLE_DAYS) {
    return `Учёт в граммах идёт ${formatCount(days, ['день', 'дня', 'дней'])}, но отметок пока мало. Заносите счета в «Поставки» и жмите «Закончился», когда табак кончился, — цифры появятся по мере отметок.`;
  }
  const settle = new Date(dayStart(start) + SETTLE_DAYS * DAY_MS + DAY_MS / 2);
  const running = days === 0 ? 'с сегодняшнего дня' : formatCount(days, ['день', 'дня', 'дней']);
  return `Учёт в граммах идёт ${running}. Расход и всё, что из него следует, появится через 2–4 недели: ${hint}. Ориентир — ${dayMonth.format(settle)}; раньше цифры случайные.`;
};

export type PurchasePatch = { keepStocked?: boolean; trialVerdict?: ShelfTrialVerdict | null };

// Отметка «Держим» или пробы — сразу во всех разделах, не дожидаясь перечитывания.
export const patchPurchase = (view: PurchaseView, tobaccoId: string, patch: PurchasePatch): PurchaseView => {
  const mine = (row: { tobacco: { id: string } }) => row.tobacco.id === tobaccoId;
  const keep = <T extends { tobacco: { id: string }; keepStocked: boolean }>(rows: T[]) =>
    patch.keepStocked === undefined ? rows : rows.map((row) => (mine(row) ? { ...row, keepStocked: patch.keepStocked! } : row));
  const verdict = patch.trialVerdict;
  return {
    ...view,
    base: { ...view.base, rows: keep(view.base.rows) },
    idle: { ...view.idle, rows: keep(view.idle.rows) },
    trials: {
      ...view.trials,
      rows: verdict === undefined ? view.trials.rows : view.trials.rows.map((row) => (mine(row) ? { ...row, trialVerdict: verdict } : row)),
    },
  };
};
