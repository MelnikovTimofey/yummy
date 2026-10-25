import 'dotenv/config';

const parsePort = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Локальный дефолт известен из репозитория: с ним в проде подделывается admin-токен.
export const requiredSecret = (name: string, localFallback: string, source: NodeJS.ProcessEnv = process.env) => {
  const value = source[name]?.trim();
  if (value) {
    return value;
  }
  if (source.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return localFallback;
};

// Адреса фронтов через запятую; пусто — любой Origin (локальный запуск и CI).
export const parseOrigins = (value: string | undefined) => {
  const origins = (value ?? '').split(',').map((item) => item.trim().replace(/\/+$/, '')).filter(Boolean);
  return origins.length ? origins : null;
};

export const config = {
  appName: process.env.APP_NAME ?? 'atelier-backend',
  host: process.env.HOST ?? '0.0.0.0',
  port: parsePort(process.env.PORT, 3021),
  automationKey: requiredSecret('ATELIER_AUTOMATION_KEY', 'atelier-local-automation-key'),
  tokenSecret: requiredSecret('ATELIER_TOKEN_SECRET', 'atelier-local-secret'),
  tokenTtlHours: parsePort(process.env.ATELIER_TOKEN_TTL_HOURS, 24),
  // Бот входа гостей (#239). Без него кнопка входа в кабинет не показывается.
  guestLoginBotUsername: process.env.ATELIER_GUEST_LOGIN_BOT_USERNAME?.trim().replace(/^@/, '') || null,
  guestTokenTtlDays: parsePort(process.env.ATELIER_GUEST_TOKEN_TTL_DAYS, 90),
  // Гостевая запись (оценки, «Покурить») с одного IP за 5 минут; на нагрузочный прогон — поднять.
  guestWriteLimit: parsePort(process.env.ATELIER_GUEST_WRITE_LIMIT, 60),
  corsOrigins: parseOrigins(process.env.ATELIER_CORS_ORIGINS),
};
