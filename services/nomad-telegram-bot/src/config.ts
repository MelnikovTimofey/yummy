import 'dotenv/config';
import path from 'node:path';

const env = (value: string | undefined, fallback = '') => value?.trim() || fallback;

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseIdList = (value: string | undefined) =>
  env(value)
    .split(/[\s,;]+/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item !== 0);

export type BotConfig = {
  telegramBotToken: string;
  telegramApiBaseUrl: string;
  backendUrl: string;
  backendAutomationToken: string;
  allowedChatIds: number[];
  broadcastChatIds: number[];
  statePath: string;
  updateTimeoutSeconds: number;
  broadcastHour: number;
  broadcastMinute: number;
};

export const loadConfig = (): BotConfig => ({
  telegramBotToken: env(process.env.TELEGRAM_BOT_TOKEN),
  telegramApiBaseUrl: env(process.env.NOMAD_TELEGRAM_API_BASE_URL, 'https://api.telegram.org'),
  backendUrl: env(process.env.NOMAD_BACKEND_URL, 'http://localhost:3021'),
  backendAutomationToken: env(process.env.NOMAD_BACKEND_AUTOMATION_TOKEN),
  allowedChatIds: parseIdList(process.env.NOMAD_TELEGRAM_ALLOWED_CHAT_IDS),
  broadcastChatIds: parseIdList(process.env.NOMAD_TELEGRAM_BROADCAST_CHAT_IDS),
  statePath: env(
    process.env.NOMAD_BOT_STATE_PATH,
    path.join(process.cwd(), '.nomad-telegram-bot-state.json'),
  ),
  updateTimeoutSeconds: parseNumber(process.env.NOMAD_TELEGRAM_UPDATE_TIMEOUT_SECONDS, 25),
  broadcastHour: parseNumber(process.env.NOMAD_DAILY_BROADCAST_HOUR, 9),
  broadcastMinute: parseNumber(process.env.NOMAD_DAILY_BROADCAST_MINUTE, 0),
});
