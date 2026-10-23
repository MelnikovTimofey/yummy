import { formatCount, type DeliveryCard, type DeliveryLine, type DeliveryListItem } from '../contracts';

// Чистая логика экрана «Поставки» (#212): подписи разбора, сверка суммы,
// деньги и даты. Решения о сопоставлении принимает backend, здесь — только
// как их показать.

// Зеркало порога apps/backend/src/invoices/match.ts: с этой уверенности
// backend сам выбирает табак, и проверять такую строку не обязательно.
export const CONFIDENT_MATCH = 80;

// memory — по памяти поставщика; catalog — уверенное совпадение с каталогом;
// suggest — табак выбран по каталогу, но совпадение слабое; weak — табак не
// выбран, но в каталоге есть похожий; manual — выбрал мастер; none — в каталоге
// ничего похожего; skip — не табак.
export type LineMatch = 'memory' | 'catalog' | 'suggest' | 'weak' | 'manual' | 'none' | 'skip';

export type TagTone = 'success' | 'warning' | 'danger' | 'info' | 'ghost';

export const LINE_MATCH_TAG: Record<LineMatch, { tone: TagTone; label: string }> = {
  memory: { tone: 'success', label: 'по памяти' },
  catalog: { tone: 'success', label: 'по каталогу' },
  suggest: { tone: 'warning', label: 'проверьте' },
  weak: { tone: 'warning', label: 'проверьте' },
  manual: { tone: 'info', label: 'выбрано' },
  none: { tone: 'danger', label: 'нет в каталоге' },
  skip: { tone: 'ghost', label: 'не табак' },
};

const topCandidate = (line: DeliveryLine) => line.candidates[0] ?? null;

export const lineMatch = (line: DeliveryLine): LineMatch => {
  if (line.kind === 'skip') return 'skip';
  if (!line.tobacco) {
    const top = topCandidate(line);
    return top && top.reason !== 'no-brand' ? 'weak' : 'none';
  }
  if (line.matchReason === 'memory') return 'memory';
  if (line.matchReason === 'catalog') return (line.confidence ?? 0) >= CONFIDENT_MATCH ? 'catalog' : 'suggest';
  return 'manual';
};

// Подсказка под селектом — только то, чего не видно в нём и в метке строки (#365).
export const lineMatchHint = (line: DeliveryLine) => {
  const match = lineMatch(line);
  const isNew = Boolean(line.tobacco && line.newOnShelf);
  const withNew = (text: string) => [text, isNew ? 'новый на полке' : ''].filter(Boolean).join(', ');
  switch (match) {
    case 'skip':
      return 'не табак';
    case 'suggest':
      return withNew(line.confidence === null ? 'предложено по каталогу' : `похоже на ${line.confidence} %`);
    case 'weak': {
      const top = topCandidate(line)!;
      return `похоже на ${top.manufacturer} ${top.name}, ${top.confidence} %`;
    }
    case 'none':
      return line.candidates.length ? 'бренда нет в каталоге' : '';
    default:
      return withNew('');
  }
};

export const summarizeLines = (lines: DeliveryLine[]) => {
  const summary = { memory: 0, catalog: 0, suggest: 0, none: 0, skip: 0, manual: 0 };
  for (const item of lines) {
    const match = lineMatch(item);
    summary[match === 'weak' ? 'suggest' : match] += 1;
  }
  return summary;
};

type Segment = { text: string; strong?: boolean };

// Итог разбора одной фразой (#365): «Найдено 5 из 8 табаков. Проверьте 2 строки,
// ещё 1 табака нет в каталоге. Одна строка не табак, она пропущена.»
export const parseSummary = (lines: DeliveryLine[]): Segment[] => {
  const summary = summarizeLines(lines);
  const found = summary.memory + summary.catalog + summary.manual;
  const total = found + summary.suggest + summary.none;
  const segments: Segment[] = [];
  if (total) {
    segments.push({ text: 'Найдено ' }, { text: `${found} из ${formatCount(total, ['табака', 'табаков', 'табаков'])}`, strong: true }, { text: '.' });
  }
  const missing = summary.none ? `${formatCount(summary.none, ['табака', 'табаков', 'табаков'])} нет в каталоге` : '';
  if (summary.suggest) {
    const check = `Проверьте ${formatCount(summary.suggest, ['строку', 'строки', 'строк'])}`;
    segments.push({ text: ` ${missing ? `${check}, ещё ${missing}` : check}.` });
  } else if (missing) {
    segments.push({ text: ` Ещё ${missing}.` });
  }
  if (summary.skip) {
    segments.push({
      text: ` ${summary.skip === 1 ? 'Одна строка не табак, она пропущена' : `${formatCount(summary.skip, ['строка', 'строки', 'строк'])} не табак, они пропущены`}.`,
    });
  }
  if (segments.length) segments[0] = { ...segments[0], text: segments[0].text.trimStart() };
  return segments;
};

// --- деньги и даты -------------------------------------------------------------

const rubles = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const kopecks = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatMoney = (kop: number | null) => {
  if (kop === null) return '—';
  return `${(kop % 100 === 0 ? rubles : kopecks).format(kop / 100)} ₽`;
};

export const formatPrice = (kop: number | null) => (kop === null ? '—' : kopecks.format(kop / 100));

// «1 550,00», «1550.5», «990» → копейки; пусто — null; мусор — undefined.
export const parseRubles = (value: string): number | null | undefined => {
  const text = value.replace(/[\s ₽]/g, '').replace(',', '.');
  if (!text) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return undefined;
  return Math.round(Number(text) * 100);
};

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_OF = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

// Дата счёта («2026-11-18») — календарный день без часового пояса; момент
// (receivedAt, createdAt) показываем в местном времени.
const toDate = (value: string | null | undefined) => {
  if (!value) return null;
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDay = (value: string | null | undefined) => {
  const date = toDate(value);
  return date ? `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}` : '—';
};

const pad = (value: number) => String(value).padStart(2, '0');

export const formatFullDate = (value: string | null | undefined) => {
  const date = toDate(value);
  return date ? `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}` : '—';
};

export const localDateInput = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Приход сегодня — текущий момент; другой день — его полдень, чтобы дата не
// съехала на соседний день ни в одном часовом поясе.
export const receivedAtFromInput = (value: string, now: Date = new Date()) => {
  const date = toDate(value);
  if (!date || value === localDateInput(now)) return now.toISOString();
  date.setHours(12);
  return date.toISOString();
};

const inMonth = (value: string | null, now: Date) => {
  const date = toDate(value);
  return Boolean(date) && date!.getFullYear() === now.getFullYear() && date!.getMonth() === now.getMonth();
};

// Итог месяца в мете шапки вместо ряда KPI (#365): «Октябрь: 3 счёта, 43 400 ₽».
// Считаем как «Траты» на Дашборде: только принятые счета, месяц — по дате прихода.
export const monthMeta = (items: DeliveryListItem[], now: Date) => {
  const invoices = items.filter((item) => item.kind !== 'start' && item.status === 'received' && inMonth(item.receivedAt, now));
  const sumKop = invoices.reduce((total, item) => total + (item.totalKop ?? 0), 0);
  const month = MONTHS[now.getMonth()];
  const count = formatCount(invoices.length, ['счёт', 'счёта', 'счетов']);
  return `${month[0].toUpperCase()}${month.slice(1)}: ${count}${sumKop ? `, ${formatMoney(sumKop)}` : ''}`;
};

// --- шапка и статусы ----------------------------------------------------------

// «Каспий Опт, счёт № 03944»: дата счёта уходит в подзаголовок (#365).
export const deliveryTitle = (card: Pick<DeliveryCard, 'kind' | 'number' | 'supplier'>) => {
  if (card.kind === 'start') return 'Стартовый приход';
  const what = card.number ? `Счёт № ${card.number}` : 'Поставка без номера';
  return card.supplier?.name ? `${card.supplier.name}, ${what[0].toLowerCase()}${what.slice(1)}` : what;
};

// «18 ноября», в другом году — «30 декабря 2025».
const formatLongDay = (value: string | null | undefined, now: Date) => {
  const date = toDate(value);
  if (!date) return '';
  const day = `${date.getDate()} ${MONTHS_OF[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? day : `${day} ${date.getFullYear()}`;
};

export const deliveryHeadline = (card: DeliveryCard, now: Date = new Date()) => {
  const parts: string[] = [];
  if (card.invoiceDate) parts.push(`Счёт от ${formatLongDay(card.invoiceDate, now)}`);
  else if (card.kind === 'invoice') parts.push(`Загружен ${formatLongDay(card.createdAt, now)}`);
  else if (card.kind === 'manual') parts.push(`Заполнена вручную ${formatLongDay(card.createdAt, now)}`);
  if (card.status === 'received' && card.receivedAt) {
    parts.push(`${card.kind === 'start' ? 'Принят' : 'принята'} ${formatLongDay(card.receivedAt, now)}`);
  }
  const head = parts.length ? `${parts.join(', ')}.` : '';
  return card.status === 'draft' ? `${head} Принимайте поставку, когда товар придёт.`.trim() : head;
};

export const deliveryStatusTag = (item: Pick<DeliveryListItem, 'kind' | 'status'>): { tone: TagTone; text: string } => {
  if (item.kind === 'start') return { tone: 'ghost', text: 'стартовый приход' };
  return item.status === 'draft'
    ? { tone: 'warning', text: 'ждёт прихода' }
    : { tone: 'success', text: 'принята' };
};

export const sumCheck = (card: Pick<DeliveryCard, 'linesSumKop' | 'totalKop' | 'sumMatches'>) => {
  const lines = formatMoney(card.linesSumKop);
  if (card.sumMatches === null || card.totalKop === null) {
    return { tone: null, short: `Сумма строк ${lines}`, alert: null };
  }
  const total = formatMoney(card.totalKop);
  if (card.sumMatches) return { tone: 'ok' as const, short: 'Сумма строк совпадает с итогом счёта', alert: null };
  const diff = card.totalKop - card.linesSumKop;
  return {
    tone: 'warn' as const,
    short: 'Сумма строк не совпадает с итогом счёта',
    alert: `Сумма строк ${lines} не сходится с итогом счёта ${total} (${diff > 0 ? 'не хватает' : 'лишние'} ${formatMoney(Math.abs(diff))})`,
  };
};

// «в 1 строке», «в 4 строках»: предложный падеж.
const linesPrepositional = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  return `${count} ${mod10 === 1 && mod100 !== 11 ? 'строке' : 'строках'}`;
};

// Строка без табака или без граммов не даёт принять поставку (pendingLines backend).
export const acceptLabel = (pending: number) =>
  pending ? `Выберите табак или граммы в ${linesPrepositional(pending)}` : 'Принять поставку';

export const acceptedToastTitle = (grams: number) => `Принято: ${formatWeight(grams)} на полке`;

// --- граммы прихода --------------------------------------------------------------

const kilograms = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

export const formatWeight = (grams: number) =>
  grams < 1000 ? `${Math.round(grams)} г` : `${kilograms.format(Math.round(grams / 100) / 10)} кг`;

// Подсказка под полем «Приход»: что написано в счёте.
export const lineGramsHint = (line: Pick<DeliveryLine, 'qty' | 'grams' | 'receivedGrams'>) => {
  if (line.grams === null) return line.receivedGrams === null ? 'укажите граммы' : 'указано вручную';
  return line.qty > 1 ? `${line.qty} × ${line.grams} г по счёту` : `${line.grams} г по счёту`;
};

// Границы — как в apps/backend/src/deliveries.ts (MAX_QTY × MAX_GRAMS).
const MAX_RECEIVED_GRAMS = 50 * 5000;

// Пусто — null (сброс к «кол-во × граммы по счёту»); мусор — undefined.
export const parseReceivedGrams = (value: string): number | null | undefined => {
  const text = value.replace(/[\s\u00a0\u202f]/g, '');
  if (!text) return null;
  if (!/^\d+$/.test(text)) return undefined;
  const grams = Number(text);
  return grams >= 1 && grams <= MAX_RECEIVED_GRAMS ? grams : undefined;
};

// --- ошибки загрузки -----------------------------------------------------------

export type UploadError =
  | { kind: 'unreadable'; message: string }
  | { kind: 'duplicate'; message: string; deliveryId: string; deliveryStatus: 'draft' | 'received' }
  | { kind: 'other'; message: string };

type ApiFailure = Error & { status?: number; payload?: unknown };

export const readUploadError = (cause: unknown): UploadError => {
  const failure = cause instanceof Error ? (cause as ApiFailure) : null;
  if (!failure || typeof failure.status !== 'number') {
    return { kind: 'other', message: 'Нет связи с сервером, счёт не загружен. Попробуйте ещё раз.' };
  }
  const payload = (failure.payload && typeof failure.payload === 'object' ? failure.payload : {}) as Record<string, unknown>;
  if (failure.status === 422) return { kind: 'unreadable', message: failure.message };
  if (failure.status === 409 && payload.code === 'duplicate' && typeof payload.deliveryId === 'string') {
    return {
      kind: 'duplicate',
      message: failure.message,
      deliveryId: payload.deliveryId,
      deliveryStatus: payload.status === 'draft' ? 'draft' : 'received',
    };
  }
  return { kind: 'other', message: failure.message };
};

// --- новая карточка каталога из строки счёта ----------------------------------

const WEIGHT = /,?\s*\d+\s*(?:гр|г|g)\.?(?=[\s,)]|$)/i;
const clean = (value: string) => value.replace(/\s+/g, ' ').replace(/^[\s,.-]+|[\s,.-]+$/g, '');
// «BLANSH» в счёте — «Blansh» в каталоге; кириллицу не трогаем.
const brandCase = (value: string) => (/^[A-Z]{4,}$/.test(value) ? value[0] + value.slice(1).toLowerCase() : value);

// Черновик бренда и названия для «Создать карточку»: мастер поправит руками.
export const guessTobaccoFromLine = (rawName: string) => {
  const text = clean(rawName.replace(/^табак\s+для\s+кальяна\s+/i, ''));
  const quoted = /^["«“]([^"»”]+)["»”]\s*(.*)$/.exec(text);
  let manufacturer: string;
  let name: string;
  if (quoted) {
    manufacturer = quoted[1];
    name = quoted[2].replace(WEIGHT, '');
  } else {
    const weight = WEIGHT.exec(text);
    if (weight && weight.index > 0) {
      manufacturer = text.slice(0, weight.index);
      name = text.slice(weight.index + weight[0].length);
    } else {
      const [first = '', ...rest] = text.split(' ');
      manufacturer = first;
      name = rest.join(' ');
    }
  }
  return { manufacturer: brandCase(clean(manufacturer)), name: clean(name) };
};
