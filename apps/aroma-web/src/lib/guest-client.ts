import { createGuestAccess, GUEST_ACCESS_HEADER, GUEST_ACCESS_KEY, sendWithAccess } from './guest-access';
import { createGuestSession, GUEST_TOKEN_KEY, sendWithGuestToken } from './guest-session';

// Одна сессия на приложение: и App, и Миксер шлют токен из неё и стирают его на 401.
export const guestSession = createGuestSession(localStorage);

// Доступ по коду дня (#435) — тоже один на приложение.
export const guestAccess = createGuestAccess(localStorage);

// Вход или выход в соседней вкладке (например, гость вернулся из Telegram по
// кнопке бота) — эта вкладка тоже узнаёт о нём. Так же — новый код дня.
window.addEventListener('storage', (event) => {
  if (event.key === GUEST_TOKEN_KEY || event.key === null) guestSession.notify();
  if (event.key === GUEST_ACCESS_KEY || event.key === null) guestAccess.notify();
});

// Любой гостевой запрос несёт доступ по коду дня: без него backend отвечает 403.
export const fetchWithAccess = (url: string, init: RequestInit) =>
  sendWithAccess(guestAccess, (token) => {
    const headers = new Headers(init.headers);
    if (token) headers.set(GUEST_ACCESS_HEADER, token);
    return fetch(url, { ...init, headers });
  });

// Токен кабинета нужен backend только там, где он его читает: события
// «Покурить», оценка и /guest/me*.
export const fetchAsGuest = (url: string, init: RequestInit, { anonymousRetry }: { anonymousRetry: boolean }) =>
  sendWithGuestToken(
    guestSession,
    (token) => {
      const headers = new Headers(init.headers);
      if (token) headers.set('authorization', `Bearer ${token}`);
      return fetchWithAccess(url, { ...init, headers });
    },
    { anonymousRetry },
  );
