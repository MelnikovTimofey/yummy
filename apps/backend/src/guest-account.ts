import crypto from 'node:crypto';
import { createGuestToken, secretsEqual, verifyGuestToken } from './auth';
import { config } from './config';
import { prisma } from './db';
import type { GuestAuthResponse, GuestLoginStartResponse, GuestLoginStatusResponse, GuestMe, GuestTaste } from './types';

// Кабинет гостя (#239, PRD §8.9): вход через бота по ссылке, учётка, вкусы.

const LOGIN_CODE_TTL_MS = 10 * 60 * 1000;
const MAX_TASTE_ITEMS = 50;
const MAX_TASTE_LENGTH = 64;

const asStringList = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

// Вкусы — граница системы: принимаем только массивы коротких строк.
export const parseTaste = (body: unknown, { required }: { required: boolean }): GuestTaste | { error: string } => {
  const source = (body ?? {}) as Record<string, unknown>;
  const read = (key: 'likedProfiles' | 'likedFlavors') => {
    const value = source[key];
    if (value === undefined && !required) return [];
    if (!Array.isArray(value) || value.length > MAX_TASTE_ITEMS) return null;
    const items = value.map((item) => (typeof item === 'string' ? item.trim() : ''));
    return items.every((item) => item && item.length <= MAX_TASTE_LENGTH) ? Array.from(new Set(items)) : null;
  };
  const likedProfiles = read('likedProfiles');
  const likedFlavors = read('likedFlavors');
  if (!likedProfiles || !likedFlavors) {
    return { error: 'likedProfiles and likedFlavors must be arrays of short strings' };
  }
  return { likedProfiles, likedFlavors };
};

const toMe = async (account: { id: string; consentAt: Date; likedProfiles: unknown; likedFlavors: unknown }): Promise<GuestMe> => {
  const [smokes, customSmokes, favorites] = await Promise.all([
    prisma.smokeCtaEvent.count({ where: { guestId: account.id } }),
    prisma.customMixSmokeEvent.count({ where: { guestId: account.id } }),
    prisma.guestFavorite.count({ where: { guestId: account.id } }),
  ]);
  return {
    id: account.id,
    consentAt: account.consentAt.toISOString(),
    likedProfiles: asStringList(account.likedProfiles),
    likedFlavors: asStringList(account.likedFlavors),
    historyCount: smokes + customSmokes,
    favoritesCount: favorites,
  };
};

export const startGuestLogin = async (input: { consent: boolean } & GuestTaste): Promise<GuestLoginStartResponse | null> => {
  const bot = config.guestLoginBotUsername;
  if (!bot) {
    return null;
  }

  const now = new Date();
  await prisma.guestLoginCode.deleteMany({ where: { expiresAt: { lt: now } } });
  // 24 байта → 32 символа base64url: укладывается в параметр start у Telegram (до 64 символов [A-Za-z0-9_-]).
  const code = crypto.randomBytes(24).toString('base64url');
  const expiresAt = new Date(now.getTime() + LOGIN_CODE_TTL_MS);
  await prisma.guestLoginCode.create({
    data: { code, consent: input.consent, likedProfiles: input.likedProfiles, likedFlavors: input.likedFlavors, expiresAt },
  });
  return { code, botUrl: `https://t.me/${bot}?start=${code}`, expiresAt: expiresAt.toISOString(), pollSecret: pollSecretFor(code) };
};

// Код уходит в ссылку на бота и может утечь (пересланная ссылка, логи), а токен по нему
// получает только браузер, начавший вход. Секрет выводится из кода — хранить его не нужно.
const pollSecretFor = (code: string) =>
  crypto.createHmac('sha256', config.tokenSecret).update(`guest-login-poll:${code}`).digest('base64url');

export type GuestLoginConfirmResult = 'ok' | 'not-found' | 'gone';

export const confirmGuestLogin = async (code: string, telegramId: string): Promise<GuestLoginConfirmResult> => {
  const login = await prisma.guestLoginCode.findUnique({ where: { code } });
  if (!login) {
    return 'not-found';
  }
  if (login.consumedAt || login.expiresAt <= new Date() || (login.telegramId && login.telegramId !== telegramId)) {
    return 'gone';
  }
  if (!login.telegramId) {
    await prisma.guestLoginCode.update({ where: { code }, data: { telegramId, confirmedAt: new Date() } });
  }
  return 'ok';
};

export const getGuestLoginStatus = async (code: string, pollSecret: string): Promise<GuestLoginStatusResponse | null> => {
  if (!secretsEqual(pollSecret, pollSecretFor(code))) {
    return null;
  }
  const login = await prisma.guestLoginCode.findUnique({ where: { code } });
  if (!login) {
    return null;
  }
  if (login.consumedAt || (!login.telegramId && login.expiresAt <= new Date())) {
    return { status: 'expired' };
  }
  if (!login.telegramId) {
    return { status: 'pending' };
  }

  const existing = await prisma.guestAccount.findUnique({ where: { telegramId: login.telegramId } });
  if (!existing && !login.consent) {
    return { status: 'consent-required' };
  }

  // Код гасится атомарно до выдачи токена: два параллельных опроса не получат его дважды.
  const consumed = await prisma.guestLoginCode.updateMany({ where: { code, consumedAt: null }, data: { consumedAt: new Date() } });
  if (!consumed.count) {
    return { status: 'expired' };
  }

  const likedProfiles = asStringList(login.likedProfiles);
  const likedFlavors = asStringList(login.likedFlavors);
  // Пустые вкусы (вернувшийся гость пропустил онбординг) не затирают сохранённые.
  const taste = likedProfiles.length || likedFlavors.length ? { likedProfiles, likedFlavors } : {};
  const account = existing
    ? await prisma.guestAccount.update({ where: { id: existing.id }, data: taste })
    : await prisma.guestAccount.create({ data: { telegramId: login.telegramId, consentAt: new Date(), likedProfiles, likedFlavors } });

  const { token, expiresAt } = createGuestToken(account.id);
  const response: GuestAuthResponse = { token, expiresAt: expiresAt.toISOString(), created: !existing, me: await toMe(account) };
  return { status: 'ok', ...response };
};

// Удалённая учётка отзывает токен: проверка по PK на каждый запрос с токеном.
export const resolveGuestSession = async (token: string) => {
  const guestId = verifyGuestToken(token);
  return guestId ? prisma.guestAccount.findUnique({ where: { id: guestId } }) : null;
};

export const getGuestMe = (account: { id: string; consentAt: Date; likedProfiles: unknown; likedFlavors: unknown }) => toMe(account);

export const updateGuestTaste = async (guestId: string, taste: GuestTaste) =>
  toMe(await prisma.guestAccount.update({ where: { id: guestId }, data: taste }));

// События и оценки отвязываются (onDelete: SetNull), избранное удаляется каскадом.
export const deleteGuestAccount = async (guestId: string) => {
  await prisma.guestAccount.delete({ where: { id: guestId } });
};
