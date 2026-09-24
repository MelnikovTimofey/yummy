import { normalizeEvaluation, normalizePalette } from './normalize';
import type { BowlComponent, SwipeRecord } from './types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021';
const requestTimeoutMs = 8000;

// Отдельно от requestJson в App.tsx: экрану нужен статус и tobaccoId из
// ответа 409 «табак закончился», а общий хелпер отдаёт только текст.
export class MixerApiError extends Error {
  status: number;
  tobaccoId: string | null;

  constructor(message: string, status: number, tobaccoId: string | null = null) {
    super(message);
    this.status = status;
    this.tobaccoId = tobaccoId;
  }
}

const request = async (path: string, body?: unknown): Promise<unknown> => {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (cause) {
    const timedOut = cause instanceof DOMException && cause.name === 'TimeoutError';
    throw new MixerApiError(
      timedOut ? 'Ателье не ответило вовремя. Попробуйте ещё раз.' : 'Нет связи с Ателье. Попробуйте ещё раз.',
      0,
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const record = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
    // Тексты ошибок backend — служебные и на английском; гостю — свои.
    throw new MixerApiError(
      response.status === 409 ? 'Этот табак только что закончился.' : 'Не получилось. Попробуйте ещё раз.',
      response.status,
      typeof record.tobaccoId === 'string' ? record.tobaccoId : null,
    );
  }
  return payload;
};

const MAX_SWIPES = 500;

export const fetchMixerPalette = async () => normalizePalette(await request('/guest/mixer/palette'));

export const evaluateBowl = async (components: BowlComponent[]) =>
  normalizeEvaluation(await request('/guest/mixer/evaluate', { components }));

export const sendCustomMixSmoke = async (payload: {
  components: BowlComponent[];
  name: string;
  swipes: SwipeRecord[];
}) => {
  // Backend принимает не больше 500 свайпов, а колода бесконечная: шлём последние.
  const response = await request('/guest/events/custom-mix-smoke', { ...payload, swipes: payload.swipes.slice(-MAX_SWIPES) });
  const record = typeof response === 'object' && response !== null ? (response as Record<string, unknown>) : {};
  return { harmony: typeof record.harmony === 'number' ? Math.round(record.harmony) : null };
};
