import { createGuestSession, GUEST_TOKEN_KEY, sendWithGuestToken } from './guest-session';

// Одна сессия на приложение: и App, и Миксер шлют токен из неё и стирают его на 401.
export const guestSession = createGuestSession(localStorage);

// Вход или выход в соседней вкладке (например, гость вернулся из Telegram по
// кнопке бота) — эта вкладка тоже узнаёт о нём.
window.addEventListener('storage', (event) => {
  if (event.key === GUEST_TOKEN_KEY || event.key === null) guestSession.notify();
});

// Токен нужен backend только там, где он его читает: события «Покурить»,
// оценка и /guest/me*. На GET каталога заголовок Authorization лишь добавил
// бы CORS-preflight к каждому запросу вошедшего гостя.
export const fetchAsGuest = (url: string, init: RequestInit, { anonymousRetry }: { anonymousRetry: boolean }) =>
  sendWithGuestToken(
    guestSession,
    (token) => {
      const headers = new Headers(init.headers);
      if (token) headers.set('authorization', `Bearer ${token}`);
      return fetch(url, { ...init, headers });
    },
    { anonymousRetry },
  );
