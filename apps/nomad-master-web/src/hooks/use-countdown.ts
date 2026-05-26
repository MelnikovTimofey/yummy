import { useEffect, useMemo, useState } from 'react';

export type CountdownUrgency = 'fresh' | 'soon' | 'expired';

export type CountdownState = {
  remaining: string;
  expired: boolean;
  urgency: CountdownUrgency;
};

const SOON_THRESHOLD_MS = 30 * 60 * 1000;

const idleState: CountdownState = { remaining: '—', expired: false, urgency: 'fresh' };

export const computeCountdownState = (endsAtIso: string, nowMs: number): CountdownState => {
  if (!endsAtIso) return idleState;

  const end = new Date(endsAtIso).getTime();
  if (Number.isNaN(end)) return idleState;

  const diff = end - nowMs;
  if (diff <= 0) return { remaining: 'Истёк', expired: true, urgency: 'expired' };

  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1_000);

  const remaining =
    hours > 0
      ? `${hours}ч ${minutes}м`
      : minutes > 0
        ? `${minutes}м ${seconds.toString().padStart(2, '0')}с`
        : `${seconds}с`;

  const urgency: CountdownUrgency = diff <= SOON_THRESHOLD_MS ? 'soon' : 'fresh';

  return { remaining, expired: false, urgency };
};

export const useCountdown = (endsAtIso: string): CountdownState => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAtIso) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, [endsAtIso]);

  return useMemo(() => computeCountdownState(endsAtIso, nowMs), [endsAtIso, nowMs]);
};
