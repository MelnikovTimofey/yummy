import { formatCount, type ShelfOrder, type ShelfOrderGroup, type ShelfOrderMixes, type ShelfOrderNotKept } from '../contracts';
import { formatNumber, formatShelfDate } from './shelf';

// «К заказу» (#518, design/design_handoff_shelf_status, #shot=order, order-copied,
// mobile-order): закончились и держим постоянно. Сколько заказать, пишет мастер.

export const orderCount = (order: ShelfOrder | null) =>
  order ? order.groups.reduce((total, group) => total + group.lines.length, 0) : 0;

export const groupTitle = (group: ShelfOrderGroup) => group.supplier?.name ?? 'Без счёта';

export const groupMeta = (group: ShelfOrderGroup) =>
  group.lastDeliveryAt ? `последний счёт ${formatShelfDate(group.lastDeliveryAt)}` : null;

const tobaccoName = (tobacco: { manufacturer: string; name: string }) => `${tobacco.manufacturer} ${tobacco.name}`;

// Заявка поставщику — только названия, объём мастер допишет сам.
export const orderCopyText = (group: ShelfOrderGroup) => group.lines.map((line) => tobaccoName(line.tobacco)).join('\n');

const hiddenWord = (count: number) => (count % 10 === 1 && count % 100 !== 11 ? 'скрыт' : 'скрыты');

// Колонка «Миксы»: пока табака нет, сколько миксов гость не видит.
export const orderMixes = (mixes: ShelfOrderMixes): { text: string; tone: 'default' | 'muted' | 'faint' } => {
  if (!mixes.total) return { text: 'нет в миксах', tone: 'faint' };
  if (!mixes.hidden) return { text: 'закрыт аналогом', tone: 'muted' };
  const count = mixes.hidden === mixes.total
    ? formatCount(mixes.hidden, ['микс', 'микса', 'миксов'])
    : `${formatNumber(mixes.hidden)} из ${formatNumber(mixes.total)}`;
  return { text: `${count} ${hiddenWord(mixes.hidden)} у гостя`, tone: 'default' };
};

const NOT_KEPT_NAMES = 5;

// Закончились, но не держим постоянно: в заявку не идут, одной строкой под группами.
export const notKeptText = (notKept: ShelfOrderNotKept[]) => {
  const one = notKept.length % 10 === 1 && notKept.length % 100 !== 11;
  const names = notKept.slice(0, NOT_KEPT_NAMES).map(tobaccoName).join(', ');
  const rest = notKept.length > NOT_KEPT_NAMES ? ` и ещё ${formatNumber(notKept.length - NOT_KEPT_NAMES)}` : '';
  return `Ещё ${formatNumber(notKept.length)} ${one ? 'закончился, его' : 'закончились, их'} не держим постоянно: ${names}${rest}.`;
};
