import dotenv from 'dotenv';

dotenv.config();

const toInt = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: toInt(process.env.PORT, 3001),
  databaseUrl: process.env.DATABASE_URL ?? '',
  appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3001',
  appDeepLinkScheme: process.env.APP_DEEPLINK_SCHEME ?? 'yummy://auth',
  magicLinkTtlMinutes: toInt(process.env.MAGIC_LINK_TTL_MINUTES, 15),
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  refreshSessionTtlDays: toInt(process.env.REFRESH_SESSION_TTL_DAYS, 30),
  rateLimitMax: toInt(process.env.RATE_LIMIT_MAX, 5),
  rateLimitWindowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
  smtp: {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: toInt(process.env.SMTP_PORT, 1025),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'Yummy <no-reply@yummy.local>',
  },
};
