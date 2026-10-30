import crypto from 'node:crypto';

export type DailyCodeWindow = {
  startsAt: Date;
  endsAt: Date;
};

const MOSCOW_OFFSET_MINUTES = 180;

// Смена кода в 06:00, а не в полночь: бар работает до 02:00–03:00, и смена,
// переходящая через полночь, живёт с одним кодом (#456).
const SHIFT_START_HOUR = 6;

const HOUR_MS = 60 * 60_000;

export const getDailyCodeWindow = (referenceDate = new Date()): DailyCodeWindow => {
  const shiftDate = new Date(referenceDate.getTime() + MOSCOW_OFFSET_MINUTES * 60_000 - SHIFT_START_HOUR * HOUR_MS);
  const startsAt = new Date(
    Date.UTC(shiftDate.getUTCFullYear(), shiftDate.getUTCMonth(), shiftDate.getUTCDate()) +
      SHIFT_START_HOUR * HOUR_MS -
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
