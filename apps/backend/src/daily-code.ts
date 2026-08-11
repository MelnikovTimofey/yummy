import crypto from 'node:crypto';

export type DailyCodeWindow = {
  startsAt: Date;
  endsAt: Date;
};

const MOSCOW_OFFSET_MINUTES = 180;

const toMoscowDate = (date: Date) => new Date(date.getTime() + MOSCOW_OFFSET_MINUTES * 60_000);

const fromMoscowDate = (date: Date) => new Date(date.getTime() - MOSCOW_OFFSET_MINUTES * 60_000);

export const getDailyCodeWindow = (referenceDate = new Date()): DailyCodeWindow => {
  const moscowDate = toMoscowDate(referenceDate);
  const startMoscow = new Date(Date.UTC(moscowDate.getUTCFullYear(), moscowDate.getUTCMonth(), moscowDate.getUTCDate()));
  const endMoscow = new Date(startMoscow);
  endMoscow.setUTCDate(endMoscow.getUTCDate() + 1);

  return {
    startsAt: fromMoscowDate(startMoscow),
    endsAt: fromMoscowDate(endMoscow),
  };
};

export const createDailyCodeValue = (
  _referenceDate: Date = new Date(),
  exclude: Iterable<string> = [],
) => {
  const taken = new Set(exclude);
  let value = crypto.randomInt(0, 10000).toString().padStart(4, '0');
  while (taken.has(value)) {
    value = crypto.randomInt(0, 10000).toString().padStart(4, '0');
  }
  return value;
};
