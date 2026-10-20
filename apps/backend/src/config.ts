import 'dotenv/config';

const parsePort = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const env = (value: string | undefined, fallback: string) => value?.trim() || fallback;

export const config = {
  appName: process.env.APP_NAME ?? 'atelier-backend',
  host: process.env.HOST ?? '0.0.0.0',
  port: parsePort(process.env.PORT, 3021),
  automationKey: env(process.env.ATELIER_AUTOMATION_KEY, 'atelier-local-automation-key'),
  tokenSecret: env(process.env.ATELIER_TOKEN_SECRET, 'atelier-local-secret'),
  tokenTtlHours: parsePort(process.env.ATELIER_TOKEN_TTL_HOURS, 24),
  // Бот входа гостей (#239). Без него кнопка входа в кабинет не показывается.
  guestLoginBotUsername: process.env.ATELIER_GUEST_LOGIN_BOT_USERNAME?.trim().replace(/^@/, '') || null,
  guestTokenTtlDays: parsePort(process.env.ATELIER_GUEST_TOKEN_TTL_DAYS, 90),
};
