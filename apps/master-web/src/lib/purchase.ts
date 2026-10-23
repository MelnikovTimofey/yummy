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
import type { TextSegment } from './reorder';
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

const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

const rub = (kop: number) => `${formatNumber(kop / 100)} ₽`;

const MONTHS_ON = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

type UnknownNote = { warn: string; text: string } | null;

// Полоса бюджета над разделами (#326): одна строка вместо ряда плиток. Без бюджета —
// стоимость базы, рядом кнопка «Указать бюджет».
export type BudgetStrip = { kind: 'none' | 'budget'; segments: TextSegment[]; unknown: UnknownNote };

export const budgetStrip = ({ budget, spend }: Pick<PurchaseView, 'budget' | 'spend'>): BudgetStrip => {
  const unknown: UnknownNote = budget.unknownCount
    ? {
        warn: `У ${formatCount(budget.unknownCount, ['табака', 'табаков', 'табаков'])} базы нет цены.`,
        text: ' Стартовый остаток заводился без счёта, сумма базы уточнится с их первым приходом по счёту.',
      }
    : null;
  const base: TextSegment[] = [
    { text: `База из ${formatCount(budget.baseCount, ['табака', 'табаков', 'табаков'])} стоит ` },
    { text: rub(budget.baseKop), strong: true },
    { text: ' в месяц' },
  ];
  if (budget.budgetKop === null) {
    const missing = { text: 'Бюджет на табак не указан.' };
    return { kind: 'none', segments: budget.baseKop > 0 ? [...base, { text: '. ' }, missing] : [missing], unknown };
  }
  const month = MONTHS_ON[Number(spend.month.slice(5, 7)) - 1];
  const left = budget.leftKop ?? budget.budgetKop - budget.baseKop;
  const spentShare = budget.budgetKop > 0 ? Math.round((spend.totalKop / budget.budgetKop) * 100) : 0;
  return {
    kind: 'budget',
    segments: [
      { text: month ? `Бюджет на ${month} ` : 'Бюджет на месяц ' },
      { text: rub(budget.budgetKop), strong: true },
      { text: '. ' },
      ...base,
      ...(left >= 0
        ? [{ text: ', на пробы остаётся ' }, { text: rub(left), strong: true, tone: 'success' as const }]
        : [{ text: ', это больше бюджета на ' }, { text: rub(-left), strong: true, tone: 'danger' as const }]),
      { text: '. По принятым счетам потрачено ' },
      { text: rub(spend.totalKop), strong: true },
      { text: `, ${spentShare} % бюджета.` },
    ],
    unknown,
  };
};

const percent = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const rating = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatShare = (share: number) => (share === 0 ? '0 %' : `${percent.format(share * 100)} %`);

export type PurchaseFlag = { text: string; tone: ShelfTone };

// «База» (#327): свой расход — граммы, доля и рубли; по бренду — ориентир без доли и подсказок.
export const baseRowView = (row: PurchaseBaseRow) => {
  const few = row.rateKind === 'none' || row.monthGrams === null;
  const brand = !few && row.rateKind === 'brand';
  const flag: PurchaseFlag | null =
    row.flag === 'notBase'
      ? { text: 'берут часто, не в базе', tone: 'warning' }
      : row.flag === 'idleBase'
        ? { text: 'почти не берут', tone: 'faint' }
        : null;
  return {
    month: few ? 'мало данных' : `${formatMonthGrams(row.monthGrams!)} г`,
    brand,
    few,
    share: row.share === null || row.rateKind !== 'own' ? '—' : formatShare(row.share),
    rub: row.rubKop === null || few ? '—' : rub(row.rubKop),
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
  next: row.next ? `${formatShelfDate(row.next.at)}, +${formatNumber(row.next.grams)} г` : null,
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
    : {
        kind: 'stats' as const,
        text: [formatCount(row.app.smokes, ['выбор', 'выбора', 'выборов']), row.app.rating === null ? null : `★ ${rating.format(row.app.rating)}`]
          .filter(Boolean)
          .join(', '),
      },
});

// Итог пробы словами — как trialVerdict() в мокапе.
export const trialVerdictText = (speed: number | null, verdict: ShelfTrialVerdict | null): { text: string; tone: ShelfTone } => {
  if (speed === null) return { text: 'мало данных', tone: 'faint' };
  const pace = speed > 1 ? 'расходится быстрее полки' : 'расходится медленнее полки';
  const mark = verdict === 'yes' ? 'гостям зашло' : verdict === 'no' ? 'гостям не зашло' : 'ждёт отметки';
  return { text: `${pace}, ${mark}`, tone: verdict === 'no' || (speed < 1 && !verdict) ? 'muted' : 'default' };
};

// «Зашло / Не зашло»: повторный клик по выбранному снимает отметку.
export const nextTrialVerdict = (current: ShelfTrialVerdict | null, clicked: ShelfTrialVerdict) =>
  current === clicked ? null : clicked;

// «Лежит» (#330): остаток, расход за 21 день и деньги в нём.
export const idleRowView = (row: PurchaseIdleRow) => ({
  left: `${formatNumber(row.leftGrams)} г`,
  rate: row.rate21 > 0 ? `${formatOneDecimal(row.rate21)} г/день` : '0 г',
  rub: row.rubKop === null ? '—' : rub(row.rubKop),
  receivedAt: formatShelfDate(row.receivedAt),
  days: `${Math.round(row.days)} дн`,
});

export const idleNotes = (idle: PurchaseView['idle']) => ({
  total: rub(idle.totalKop),
  unmarked: idle.unmarkedCount
    ? `Ещё у ${formatCount(idle.unmarkedCount, ['табака', 'табаков', 'табаков'])} нет отметок остатка за 21 день, их расход неизвестен.`
    : null,
  unknownPrice: idle.unknownPriceCount
    ? `У ${formatCount(idle.unknownPriceCount, ['табака', 'табаков', 'табаков'])} нет цены прихода, в сумму ${idle.unknownPriceCount === 1 ? 'он не вошёл' : 'они не вошли'}.`
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

// Пустое состояние раздела (#shot=edge-few): когда появятся цифры и что для них нужно.
export const fewDataText = (since: string | null, now = new Date()) => {
  const need = 'Для них нужны счета в поставках и отметки, когда табак закончился.';
  if (!since) return `Учёт в граммах ещё не начался. Цифры появятся через 2–4 недели после первого счёта. ${need}`;
  const start = new Date(since);
  const days = Math.round((dayStart(now) - dayStart(start)) / DAY_MS);
  if (days > SETTLE_DAYS) return `Учёт в граммах идёт ${formatCount(days, ['день', 'дня', 'дней'])}, но отметок пока мало. ${need}`;
  const settle = new Date(dayStart(start) + SETTLE_DAYS * DAY_MS + DAY_MS / 2);
  const running = days === 0 ? 'с сегодняшнего дня' : formatCount(days, ['день', 'дня', 'дней']);
  return `Учёт в граммах идёт ${running}. Цифры появятся через 2–4 недели, ориентировочно ${dayMonth.format(settle)}. ${need}`;
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
