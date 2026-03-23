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

export const formatNomadDailyCodeStamp = (referenceDate = new Date()) => {
  const moscowDate = toMoscowDate(referenceDate);
  const year = moscowDate.getUTCFullYear();
  const month = String(moscowDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(moscowDate.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
};

export const createNomadDailyCodeValue = (referenceDate = new Date()) => {
  const stamp = formatNomadDailyCodeStamp(referenceDate);
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();

  return `NOMAD-${stamp}-${suffix}`;
};
