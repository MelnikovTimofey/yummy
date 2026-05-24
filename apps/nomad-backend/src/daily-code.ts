import crypto from 'node:crypto';

export type NomadDailyCodeWindow = {
  startsAt: Date;
  endsAt: Date;
};

const MOSCOW_OFFSET_MINUTES = 180;

const toMoscowDate = (date: Date) => new Date(date.getTime() + MOSCOW_OFFSET_MINUTES * 60_000);

const fromMoscowDate = (date: Date) => new Date(date.getTime() - MOSCOW_OFFSET_MINUTES * 60_000);

export const getNomadDailyCodeWindow = (referenceDate = new Date()): NomadDailyCodeWindow => {
  const moscowDate = toMoscowDate(referenceDate);
  const startMoscow = new Date(Date.UTC(moscowDate.getUTCFullYear(), moscowDate.getUTCMonth(), moscowDate.getUTCDate()));
  const endMoscow = new Date(startMoscow);
  endMoscow.setUTCDate(endMoscow.getUTCDate() + 1);

  return {
    startsAt: fromMoscowDate(startMoscow),
    endsAt: fromMoscowDate(endMoscow),
  };
};

export const createNomadDailyCodeValue = (_referenceDate: Date = new Date()) =>
  crypto.randomBytes(3).toString('hex').toUpperCase();
