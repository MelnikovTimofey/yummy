import {
  flavorProfileColor,
  formatCount,
  type GuestChoices,
  type GuestChoicesBucket,
  type GuestChoicesTimelineRow,
  type GuestTopTobacco,
} from '../contracts';
import { profileDirection } from './purchase';

// Дашборд «Выборы гостей» (#520, design/design_handoff_guest_analytics): подписи
// периода, столбцы динамики, вкусы, сигналы и календарь «Даты». Дни — ключи
// «2026-11-04», считаются как местные даты, без часов.

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const MONTH_TITLES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

const parts = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month: month - 1, day };
};

export const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const toDate = (key: string) => {
  const { year, month, day } = parts(key);
  return new Date(year, month, day);
};

const addDays = (key: string, days: number) => {
  const date = toDate(key);
  date.setDate(date.getDate() + days);
  return dayKey(date);
};

// Через UTC: переход на летнее время не съедает день.
export const dayCount = (from: string, to: string) => {
  const a = parts(from);
  const b = parts(to);
  return Math.round((Date.UTC(b.year, b.month, b.day) - Date.UTC(a.year, a.month, a.day)) / 86_400_000) + 1;
};

const dayMonth = (key: string, withYear: boolean) => {
  const { year, month, day } = parts(key);
  return `${day} ${MONTHS[month]}${withYear ? ` ${year}` : ''}`;
};

// «6 октября – 4 ноября», «13 – 26 октября», «4 ноября», у всего времени «с 6 октября».
export const rangeLabel = ({ key, from, to }: { key: string; from: string; to: string }) => {
  if (!from || !to) return '';
  const a = parts(from);
  const b = parts(to);
  const withYear = a.year !== b.year;
  if (key === 'all') return `с ${dayMonth(from, withYear)}`;
  if (from === to) return dayMonth(to, false);
  if (!withYear && a.month === b.month) return `${a.day} – ${dayMonth(to, false)}`;
  return `${dayMonth(from, withYear)} – ${dayMonth(to, withYear)}`;
};

export const rangeCaption = (from: string, to: string) =>
  `${rangeLabel({ key: 'custom', from, to })}, ${formatCount(dayCount(from, to), ['день', 'дня', 'дней'])}`;

const shortDay = (key: string) => {
  const { month, day } = parts(key);
  return `${day} ${MONTHS_SHORT[month]}`;
};

export type TimelineRow = GuestChoicesTimelineRow & { tick: string; tip: string };

// По дням: на оси число, в подсказке «25 окт, вс». По неделям: понедельник и диапазон недели.
export const timelineRows = (timeline: GuestChoicesTimelineRow[], bucket: GuestChoicesBucket): TimelineRow[] =>
  timeline.map((row) => {
    if (bucket === 'day') {
      const weekday = WEEKDAYS[(toDate(row.date).getDay() + 6) % 7];
      return { ...row, tick: String(parts(row.date).day), tip: `${shortDay(row.date)}, ${weekday}` };
    }
    const end = addDays(row.date, 6);
    const tip = parts(row.date).month === parts(end).month ? `${parts(row.date).day} – ${shortDay(end)}` : `${shortDay(row.date)} – ${shortDay(end)}`;
    return { ...row, tick: shortDay(row.date), tip };
  });

// Каждая (n + 1)-я подпись оси: сколько подписей помещается на ширину графика.
export const tickInterval = (count: number, bucket: GuestChoicesBucket, phone: boolean) => {
  const fits = phone ? (bucket === 'day' ? 5 : 4) : bucket === 'day' ? 12 : 16;
  return Math.max(0, Math.ceil(count / fits) - 1);
};

export type ProfileSlice = { key: string; label: string; share: number; color: string };

const SLICES = 8;

// Подписи вкусов — в единственном числе, как в мокапе; хвост сворачивается в «Другие».
export const profileSlices = (profiles: GuestChoices['profiles']): ProfileSlice[] => {
  const sorted = [...profiles].sort((left, right) => right.share - left.share);
  const slices = sorted.map((profile) => ({
    key: profile.key,
    label: profileDirection(profile.key),
    share: profile.share,
    color: flavorProfileColor(profile.key),
  }));
  if (slices.length <= SLICES) return slices;
  const rest = slices.slice(SLICES - 1).reduce((sum, slice) => sum + slice.share, 0);
  return [...slices.slice(0, SLICES - 1), { key: 'other', label: 'Другие', share: rest, color: 'var(--profile-fallback)' }];
};

// Короткому столбцу всё равно хватает места на название.
export const barWidth = (choices: number, max: number) => Math.max(18, max > 0 ? Math.round((choices / max) * 100) : 0);

export type SignalKind = 'out' | 'hidden' | 'rail';
export type SignalRow = { kind: SignalKind; text: string; action: string };

const SHOWN_MIXES = 3;

export const signalRows = (signals: GuestChoices['signals'], topTobaccos: GuestTopTobacco[]): SignalRow[] => {
  const rows: SignalRow[] = [];
  const { outPopular, hiddenMixes, emptyRails } = signals;
  if (outPopular.length) {
    const names = outPopular.map((item) => {
      const top = topTobaccos.find((row) => row.tobaccoId === item.tobaccoId);
      return top?.manufacturer ? `${top.manufacturer} ${item.name}` : item.name;
    });
    const head = names.length === 1 ? 'Закончился популярный' : 'Закончились популярные';
    rows.push({ kind: 'out', text: `${head}: ${names.join(', ')}.`, action: 'К заказу' });
  }
  if (hiddenMixes.length) {
    const shown = hiddenMixes.slice(0, SHOWN_MIXES).map((mix) => mix.mixName).join(', ');
    const more = hiddenMixes.length - SHOWN_MIXES;
    const head = hiddenMixes.length === 1 ? 'Скрыт у гостя, нет табака' : 'Скрыты у гостя, нет табака';
    rows.push({ kind: 'hidden', text: `${head}: ${shown}${more > 0 ? ` и ещё ${more}` : ''}.`, action: 'Миксы' });
  }
  if (emptyRails.length) {
    const names = emptyRails.map((rail) => `«${rail.name}»`).join(', ');
    const text = emptyRails.length === 1 ? `Рейл ${names} пустой.` : `Рейлы ${names} пустые.`;
    rows.push({ kind: 'rail', text, action: 'Рейлы' });
  }
  return rows;
};

// --- Календарь «Даты» -----------------------------------------------------------

export type MonthRef = { year: number; month: number };
export type CalendarCell = { key: string; day: number; outside: boolean };
export type DayRange = { from: string; to: string | null };

// Полные недели с понедельника; дни соседних месяцев — для сетки, не для выбора.
export const monthGrid = (year: number, month: number): CalendarCell[] => {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - ((first.getDay() + 6) % 7));
  const cells: CalendarCell[] = [];
  for (const date = start; cells.length < 42; date.setDate(date.getDate() + 1)) {
    if (cells.length % 7 === 0 && cells.length > 0 && (date.getMonth() !== month || date.getFullYear() !== year)) break;
    cells.push({ key: dayKey(date), day: date.getDate(), outside: date.getMonth() !== month });
  }
  return cells;
};

export const shiftMonth = ({ year, month }: MonthRef, delta: number): MonthRef => {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
};

export const pickRangeDay = (range: DayRange | null, day: string): DayRange => {
  if (!range || range.to) return { from: day, to: null };
  return day < range.from ? { from: day, to: range.from } : { from: range.from, to: day };
};

// Справа — текущий месяц; диапазон из прошлого виден в левом месяце.
export const calendarRightMonth = (range: DayRange | null, today: string, months: 1 | 2): MonthRef => {
  const now = parts(today);
  if (!range) return { year: now.year, month: now.month };
  const end = parts(range.to ?? range.from);
  const right = shiftMonth({ year: end.year, month: end.month }, months - 1);
  return right.year * 12 + right.month > now.year * 12 + now.month ? { year: now.year, month: now.month } : right;
};

// Деления оси: шаг 1, 2, 5 × 10ⁿ, чтобы делений было не больше пяти.
export const axisTicks = (max: number) => {
  if (max <= 1) return [0, 1];
  const steps = [1, 2, 5].flatMap((base) => [1, 10, 100, 1000, 10000].map((power) => base * power)).sort((a, b) => a - b);
  const step = steps.find((value) => Math.ceil(max / value) <= 4) ?? steps[steps.length - 1];
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, index) => index * step);
};
