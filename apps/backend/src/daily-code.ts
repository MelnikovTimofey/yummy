import crypto from 'node:crypto';

export type DailyCodeWindow = {
  startsAt: Date;
  endsAt: Date;
};

const MOSCOW_OFFSET_MINUTES = 180;

const HOUR_MS = 60 * 60_000;

// Код действует до конца суток по Москве (#381): новый выпускается в полночь.
export const getDailyCodeWindow = (referenceDate = new Date()): DailyCodeWindow => {
  const moscowDate = new Date(referenceDate.getTime() + MOSCOW_OFFSET_MINUTES * 60_000);
  const startsAt = new Date(
    Date.UTC(moscowDate.getUTCFullYear(), moscowDate.getUTCMonth(), moscowDate.getUTCDate()) -
      MOSCOW_OFFSET_MINUTES * 60_000,
  );

  return {
    startsAt,
    endsAt: new Date(startsAt.getTime() + 24 * HOUR_MS),
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
