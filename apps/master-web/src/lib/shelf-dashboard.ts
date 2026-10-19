import { formatCount, type ShelfDashboard, type ShelfDashboardWeek } from '../contracts';
import { formatNumber } from './shelf';

// Чистая логика блока «Полка» на дашборде (#213): подписи прогноза, траты,
// деньги и столбики расхода по неделям.

const WEEKDAYS = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export const formatApproxRub = (kop: number) => `≈ ${formatNumber(kop / 100)} ₽`;

const weekdayNote = (factor: number | null, weekday: number) => {
  if (factor === null) return 'без поправки на день недели — мало данных';
  const name = WEEKDAYS[weekday - 1] ?? 'сегодня';
  const percent = Math.round((factor - 1) * 100);
  if (percent === 0) return `${name}: как средний день по «Покурить»`;
  return `${name}: ${percent > 0 ? '+' : '−'}${Math.abs(percent)} % к среднему дню по «Покурить»`;
};

export const forecastCaption = (today: ShelfDashboard['today'], bowlGrams: number) =>
  `≈ ${formatCount(Math.round(today.bowls), ['чаша', 'чаши', 'чаш'])} по ${bowlGrams} г · ${weekdayNote(today.weekdayFactor, today.weekday)}`;

export const spendTitle = (month: string) => {
  const index = Number(month.slice(5, 7)) - 1;
  return `Траты за ${MONTHS[index] ?? 'месяц'}`;
};

export const spendRows = (spend: ShelfDashboard['spend']) =>
  spend.bySupplier.map((entry) => ({
    key: entry.supplier?.id ?? 'none',
    name: entry.supplier?.name ?? 'Без поставщика',
    sum: `${formatNumber(entry.sumKop / 100)} ₽`,
    share: spend.totalKop > 0 ? entry.sumKop / spend.totalKop : 0,
  }));

export const bowlCostTile = (kop: number | null, bowlGrams: number) =>
  kop === null
    ? { value: '—', hint: 'нет цен прихода у табаков в работе' }
    : { value: formatApproxRub(kop), hint: `${bowlGrams} г по средней цене табаков в работе` };

export const stockValueTile = (kop: number) =>
  kop > 0 ? { value: formatApproxRub(kop), hint: 'по ценам прихода' } : { value: '—', hint: 'нет цен прихода' };

// Дни недели — календарные «2026-11-16», без часового пояса.
const dayParts = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? { day: Number(match[3]), month: MONTHS_SHORT[Number(match[2]) - 1] } : null;
};

export const weekLabel = (week: ShelfDashboardWeek) => {
  const from = dayParts(week.from);
  const to = dayParts(week.to);
  let range = '—';
  if (from && to) {
    if (week.from === week.to) range = `${from.day} ${from.month}`;
    else if (from.month === to.month) range = `${from.day}–${to.day} ${to.month}`;
    else range = `${from.day} ${from.month}–${to.day} ${to.month}`;
  }
  return week.partial ? `${range} · идёт` : range;
};

export const weekBars = (weekly: ShelfDashboardWeek[]) => {
  const max = Math.max(0, ...weekly.map((week) => week.grams));
  if (max <= 0) return null;
  return weekly.map((week) => ({
    key: week.from,
    label: weekLabel(week),
    value: formatNumber(week.grams),
    height: week.grams / max,
    partial: week.partial,
  }));
};
