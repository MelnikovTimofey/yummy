import type { MoscowWindow } from './types';

const MOSCOW_OFFSET_MINUTES = 180;

const shiftMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);

const toMoscowClock = (date: Date) => shiftMinutes(date, MOSCOW_OFFSET_MINUTES);

const fromMoscowClock = (date: Date) => shiftMinutes(date, -MOSCOW_OFFSET_MINUTES);

const pad = (value: number) => String(value).padStart(2, '0');

export const buildDayKey = (date = new Date()) => {
  const moscow = toMoscowClock(date);
  return `${moscow.getUTCFullYear()}-${pad(moscow.getUTCMonth() + 1)}-${pad(moscow.getUTCDate())}`;
};

export const buildMoscowWindow = (date = new Date()): MoscowWindow => {
  const moscow = toMoscowClock(date);
  const startsAt = new Date(Date.UTC(moscow.getUTCFullYear(), moscow.getUTCMonth(), moscow.getUTCDate(), 0, 0, 0, 0));
  const endsAt = new Date(Date.UTC(moscow.getUTCFullYear(), moscow.getUTCMonth(), moscow.getUTCDate() + 1, 0, 0, 0, 0));

  return {
    dayKey: buildDayKey(date),
    startsAt: fromMoscowClock(startsAt),
    endsAt: fromMoscowClock(endsAt),
  };
};

export const formatMoscowDateTime = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Moscow',
  }).format(date);
};

export const buildDailyCodeValue = (prefix: string, dayKey: string, sequence = 1) => {
  const compactKey = dayKey.replace(/-/g, '');
  return sequence > 1 ? `${prefix}-${compactKey}-${sequence}` : `${prefix}-${compactKey}`;
};

export const buildDailyCodeLabel = (dayKey: string, sequence = 1) => {
  const [year, month, day] = dayKey.split('-');
  const readable = `${day}.${month}.${year}`;
  return sequence > 1 ? `Код на ${readable} #${sequence}` : `Код на ${readable}`;
};

const ENSURE_RETRY_MS = 60_000;
// Запас на расхождение часов бота и backend: к этому моменту код точно истёк.
const ENSURE_MARGIN_MS = 5_000;

// Новый код выпускается сразу после истечения текущего, без своего расписания (#456).
export const buildNextEnsureDelay = (endsAt: string | undefined, now = new Date()) => {
  const delay = endsAt ? Date.parse(endsAt) - now.getTime() : Number.NaN;
  return delay > 0 ? delay + ENSURE_MARGIN_MS : ENSURE_RETRY_MS;
};

export const isWithinWindow = (value: Date | string, window: MoscowWindow) => {
  const date = value instanceof Date ? value : new Date(value);
  return date >= window.startsAt && date < window.endsAt;
};

export const pickSequenceFromCodeValue = (codeValue: string, prefix: string, dayKey: string) => {
  const base = buildDailyCodeValue(prefix, dayKey, 1);
  if (codeValue === base) {
    return 1;
  }

  const match = codeValue.match(new RegExp(`^${prefix}-${dayKey.replace(/-/g, '')}-(\\d+)$`));
  if (!match) {
    return 0;
  }

  return Number(match[1] ?? 0) || 0;
};

export const nextDailyCodeSequence = (codes: Array<{ codeValue: string }>, prefix: string, dayKey: string) => {
  const sequences = codes
    .map((code) => pickSequenceFromCodeValue(code.codeValue, prefix, dayKey))
    .filter((sequence) => sequence > 0);

  return sequences.length ? Math.max(...sequences) + 1 : 1;
};

export const dedupeById = <T extends { id: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
};
