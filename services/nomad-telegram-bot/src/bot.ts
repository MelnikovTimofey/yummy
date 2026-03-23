import type { BotConfig } from './config';
import { NomadBackendClient } from './backend';
import { JsonStateStore } from './storage';
import { TelegramClient } from './telegram';
import type { DailyAccessCodeRecord, TelegramMessage, TelegramUpdate } from './types';
import { buildDayKey, buildMoscowWindow, buildNextBroadcastDelay, formatMoscowDateTime } from './time';

type Dependencies = {
  config: BotConfig;
  backend: NomadBackendClient;
  telegram: TelegramClient;
  stateStore: JsonStateStore;
};

type CommandContext = {
  message: TelegramMessage;
  args: string[];
};

const HELP_TEXT = [
  'Nomad Telegram Bot',
  'Команды:',
  '/start - приветствие',
  '/help - список команд',
  '/code - показать текущий daily code',
  '/rotate - выпустить новый daily code и разослать его',
  '/whoami - показать информацию о чате',
].join('\n');

const ACCESS_DENIED_TEXT = 'Доступ к боту ограничен.';

const normalizeCommandText = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) {
    return null;
  }

  const [command, ...rest] = trimmed.split(/\s+/);
  return {
    command: command.replace(/@.+$/, '').toLowerCase(),
    args: rest,
  };
};

const isAllowedChat = (config: BotConfig, chatId: number) =>
  !config.allowedChatIds.length || config.allowedChatIds.includes(chatId);

const canRotateFromChat = (config: BotConfig, chatId: number) => {
  return isAllowedChat(config, chatId);
};

const buildDailyCodeMessage = (code: DailyAccessCodeRecord, reason: string) =>
  [
    reason,
    `Код: ${code.codeValue}`,
    `Подпись: ${code.codeLabel}`,
    `Действует с: ${formatMoscowDateTime(code.startsAt)}`,
    `Действует до: ${formatMoscowDateTime(code.endsAt)}`,
  ].join('\n');

export class NomadTelegramBot {
  private stopped = false;
  private updateOffset = 0;
  private scheduler: NodeJS.Timeout | null = null;
  private poller: Promise<void> | null = null;

  constructor(private readonly deps: Dependencies) {}

  async start() {
    if (!this.deps.config.telegramBotToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    if (!this.deps.config.backendAutomationToken) {
      throw new Error('NOMAD_BACKEND_AUTOMATION_TOKEN is required');
    }

    await this.runScheduledBroadcast('startup');
    this.scheduleNextBroadcast();
    this.poller = this.pollUpdates();
    await this.poller;
  }

  stop() {
    this.stopped = true;
    if (this.scheduler) {
      clearTimeout(this.scheduler);
      this.scheduler = null;
    }
  }

  private async pollUpdates() {
    while (!this.stopped) {
      try {
        const updates = await this.deps.telegram.getUpdates(this.updateOffset, this.deps.config.updateTimeoutSeconds);
        for (const update of updates) {
          this.updateOffset = update.update_id + 1;
          await this.handleUpdate(update);
        }
      } catch (error) {
        console.error('[nomad-telegram-bot] poll error', error);
        await this.sleep(1_000);
      }
    }
  }

  private async handleUpdate(update: TelegramUpdate) {
    const message = update.message;
    if (!message?.text) {
      return;
    }

    const normalized = normalizeCommandText(message.text);
    if (!normalized) {
      return;
    }

    const context: CommandContext = {
      message,
      args: normalized.args,
    };

    switch (normalized.command) {
      case '/start':
      case '/help':
        await this.handleHelp(context);
        return;
      case '/code':
        await this.handleCode(context);
        return;
      case '/rotate':
        await this.handleRotate(context);
        return;
      case '/whoami':
        await this.handleWhoAmI(context);
        return;
      default:
        await this.reply(message.chat.id, 'Неизвестная команда. Используйте /help.');
    }
  }

  private async handleHelp({ message }: CommandContext) {
    if (!isAllowedChat(this.deps.config, message.chat.id)) {
      await this.reply(message.chat.id, ACCESS_DENIED_TEXT);
      return;
    }

    await this.reply(message.chat.id, HELP_TEXT);
  }

  private async handleWhoAmI({ message }: CommandContext) {
    const from = message.from;
    const fullName = [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim() || 'неизвестно';
    const username = from?.username ? `@${from.username}` : 'без username';

    await this.reply(
      message.chat.id,
      [
        `Чат: ${message.chat.id}`,
        `Пользователь: ${fullName} (${username})`,
        `Доступ к боту: ${isAllowedChat(this.deps.config, message.chat.id) ? 'разрешён' : 'запрещён'}`,
        `Ротация: ${canRotateFromChat(this.deps.config, message.chat.id) ? 'разрешена' : 'запрещена'}`,
      ].join('\n'),
    );
  }

  private async handleCode({ message }: CommandContext) {
    if (!isAllowedChat(this.deps.config, message.chat.id)) {
      await this.reply(message.chat.id, ACCESS_DENIED_TEXT);
      return;
    }

    const ensured = await this.deps.backend.ensureDailyCode();
    await this.reply(
      message.chat.id,
      buildDailyCodeMessage(ensured.item, ensured.state === 'created' ? 'Daily code был создан автоматически.' : 'Текущий daily code.'),
    );
  }

  private async handleRotate({ message }: CommandContext) {
    if (!canRotateFromChat(this.deps.config, message.chat.id)) {
      await this.reply(message.chat.id, 'Для этого чата ручная ротация запрещена.');
      return;
    }

    const rotated = await this.deps.backend.rotateDailyCode();
    await this.deps.stateStore.update((state) => ({
      ...state,
      lastRotationAt: new Date().toISOString(),
      lastBroadcastCodeId: null,
      lastBroadcastCodeValue: null,
      lastBroadcastDayKey: null,
      lastBroadcastAt: null,
    }));

    await this.reply(message.chat.id, buildDailyCodeMessage(rotated.item, 'Выпущен новый daily code.'));
    await this.broadcastCodeIfNeeded(rotated.item, buildDayKey(), 'Ручная ротация daily code.', true, [message.chat.id]);
  }

  private async runScheduledBroadcast(trigger: 'startup' | 'scheduled') {
    if (this.stopped) {
      return;
    }

    const ensured = await this.deps.backend.ensureDailyCode();
    await this.broadcastCodeIfNeeded(
      ensured.item,
      buildMoscowWindow().dayKey,
      trigger === 'startup' ? 'Авторассылка при запуске бота.' : 'Ежедневная авторассылка daily code.',
    );
  }

  private async broadcastCodeIfNeeded(
    code: DailyAccessCodeRecord,
    dayKey: string,
    reason: string,
    force = false,
    excludeChatIds: number[] = [],
  ) {
    const state = await this.deps.stateStore.read();
    if (!force && state.lastBroadcastCodeId === code.id && state.lastBroadcastDayKey === dayKey) {
      return;
    }

    const chatIds = this.deps.config.broadcastChatIds.filter((chatId) => !excludeChatIds.includes(chatId));
    if (chatIds.length) {
      await this.deps.telegram.sendMessages(chatIds, buildDailyCodeMessage(code, reason));
    }

    await this.deps.stateStore.write({
      ...state,
      lastBroadcastCodeId: code.id,
      lastBroadcastCodeValue: code.codeValue,
      lastBroadcastDayKey: dayKey,
      lastBroadcastAt: new Date().toISOString(),
    });
  }

  private scheduleNextBroadcast() {
    if (this.stopped) {
      return;
    }

    const delay = Math.max(
      1_000,
      buildNextBroadcastDelay(new Date(), this.deps.config.broadcastHour, this.deps.config.broadcastMinute),
    );

    this.scheduler = setTimeout(() => {
      void this.runScheduledBroadcast('scheduled')
        .catch((error) => {
          console.error('[nomad-telegram-bot] scheduled broadcast error', error);
        })
        .finally(() => {
          this.scheduleNextBroadcast();
        });
    }, delay);
  }

  private async reply(chatId: number, text: string) {
    await this.deps.telegram.sendMessage(chatId, text);
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
