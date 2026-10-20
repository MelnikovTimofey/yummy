import 'dotenv/config';
import path from 'node:path';

const env = (value: string | undefined, fallback = '') => value?.trim() || fallback;

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export type BotMode = 'staff' | 'guest-login';

// Опечатка в режиме не должна молча поднять staff-бота на токене бота входа гостей.
const parseMode = (value: string | undefined): BotMode => {
  const mode = env(value, 'staff');
  if (mode !== 'staff' && mode !== 'guest-login') {
    throw new Error('ATELIER_BOT_MODE must be staff or guest-login');
  }
  return mode;
};

export type BotConfig = {
  mode: BotMode;
  telegramBotToken: string;
  telegramApiBaseUrl: string;
  backendUrl: string;
  backendAutomationToken: string;
  statePath: string;
  updateTimeoutSeconds: number;
  broadcastHour: number;
  broadcastMinute: number;
  guestLoginReturnUrl: string;
};

export const loadConfig = (): BotConfig => ({
  mode: parseMode(process.env.ATELIER_BOT_MODE),
  telegramBotToken: env(process.env.TELEGRAM_BOT_TOKEN),
  telegramApiBaseUrl: env(process.env.ATELIER_TELEGRAM_API_BASE_URL, 'https://api.telegram.org'),
  backendUrl: env(process.env.ATELIER_BACKEND_URL, 'http://localhost:3021'),
  backendAutomationToken: env(process.env.ATELIER_BACKEND_AUTOMATION_TOKEN),
  statePath: env(
    process.env.ATELIER_BOT_STATE_PATH,
    path.join(process.cwd(), '.atelier-telegram-bot-state.json'),
  ),
  updateTimeoutSeconds: parseNumber(process.env.ATELIER_TELEGRAM_UPDATE_TIMEOUT_SECONDS, 25),
  broadcastHour: parseNumber(process.env.ATELIER_DAILY_BROADCAST_HOUR, 9),
  broadcastMinute: parseNumber(process.env.ATELIER_DAILY_BROADCAST_MINUTE, 0),
  guestLoginReturnUrl: env(process.env.ATELIER_GUEST_LOGIN_RETURN_URL),
});
