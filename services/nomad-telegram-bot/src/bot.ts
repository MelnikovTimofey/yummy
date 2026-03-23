import type { BotConfig } from './config';
import { NomadBackendClient } from './backend';
import { JsonStateStore } from './storage';
import { TelegramClient } from './telegram';
import type { DailyAccessCodeRecord, TelegramAutomationReportPayload, TelegramMessage, TelegramUpdate } from './types';
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

type RecipientLists = {
  allowedChatIds: number[];
  broadcastChatIds: number[];
  rotateChatIds: number[];
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

const uniqueNumbers = (items: number[]) => Array.from(new Set(items.filter((item) => Number.isFinite(item) && item !== 0)));

const pickScopeRecipients = (backendItems: number[], fallbackItems: number[]) =>
  uniqueNumbers(backendItems.length ? backendItems : fallbackItems);

const isAllowedChat = (lists: RecipientLists, chatId: number) =>
  !lists.allowedChatIds.length || lists.allowedChatIds.includes(chatId);

const canRotateFromChat = (lists: RecipientLists, chatId: number) => {
  if (lists.rotateChatIds.length) {
    return lists.rotateChatIds.includes(chatId);
  }

  return isAllowedChat(lists, chatId);
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
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private poller: Promise<void> | null = null;
  private lastReportedError = {
    signature: '',
    at: 0,
  };

  constructor(private readonly deps: Dependencies) {}

  async start() {
    if (!this.deps.config.telegramBotToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    if (!this.deps.config.backendAutomationToken) {
      throw new Error('NOMAD_BACKEND_AUTOMATION_TOKEN is required');
    }

    await this.safeReportState({ event: 'heartbeat' });
    await this.runScheduledBroadcast('startup');
    this.scheduleNextBroadcast();
    this.startHeartbeatLoop();
    this.poller = this.pollUpdates();
    await this.poller;
  }

  stop() {
    this.stopped = true;
    if (this.scheduler) {
      clearTimeout(this.scheduler);
      this.scheduler = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
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
        await this.safeReportError(error);
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
    const recipients = await this.getRecipientLists();
    if (!isAllowedChat(recipients, message.chat.id)) {
      await this.reply(message.chat.id, ACCESS_DENIED_TEXT);
      return;
    }

    await this.reply(message.chat.id, HELP_TEXT);
  }

  private async handleWhoAmI({ message }: CommandContext) {
    const recipients = await this.getRecipientLists();
    const from = message.from;
    const fullName = [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim() || 'неизвестно';
    const username = from?.username ? `@${from.username}` : 'без username';

    await this.reply(
      message.chat.id,
      [
        `Чат: ${message.chat.id}`,
        `Пользователь: ${fullName} (${username})`,
        `Доступ к боту: ${isAllowedChat(recipients, message.chat.id) ? 'разрешён' : 'запрещён'}`,
        `Ротация: ${canRotateFromChat(recipients, message.chat.id) ? 'разрешена' : 'запрещена'}`,
      ].join('\n'),
    );
  }

  private async handleCode({ message }: CommandContext) {
    const recipients = await this.getRecipientLists();
    if (!isAllowedChat(recipients, message.chat.id)) {
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
    const recipients = await this.getRecipientLists();
    if (!canRotateFromChat(recipients, message.chat.id)) {
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
    await this.safeReportState({
      event: 'rotate',
      codeId: rotated.item.id,
      codeValue: rotated.item.codeValue,
    });
    await this.broadcastCodeIfNeeded(rotated.item, buildDayKey(), 'Ручная ротация daily code.', recipients, true, [message.chat.id]);
  }

  private async runScheduledBroadcast(trigger: 'startup' | 'scheduled') {
    if (this.stopped) {
      return;
    }

    const ensured = await this.deps.backend.ensureDailyCode();
    const recipients = await this.getRecipientLists();
    await this.broadcastCodeIfNeeded(
      ensured.item,
      buildMoscowWindow().dayKey,
      trigger === 'startup' ? 'Авторассылка при запуске бота.' : 'Ежедневная авторассылка daily code.',
      recipients,
    );
  }

  private async broadcastCodeIfNeeded(
    code: DailyAccessCodeRecord,
    dayKey: string,
    reason: string,
    recipients: RecipientLists,
    force = false,
    excludeChatIds: number[] = [],
  ) {
    const state = await this.deps.stateStore.read();
    if (!force && state.lastBroadcastCodeId === code.id && state.lastBroadcastDayKey === dayKey) {
      return;
    }

    const chatIds = recipients.broadcastChatIds.filter((chatId) => !excludeChatIds.includes(chatId));
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

    await this.safeReportState({
      event: 'broadcast',
      codeId: code.id,
      codeValue: code.codeValue,
      dayKey,
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
          return this.safeReportError(error);
        })
        .finally(() => {
          this.scheduleNextBroadcast();
        });
    }, delay);
  }

  private startHeartbeatLoop() {
    if (this.stopped || this.heartbeatTimer) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      void this.safeReportState({ event: 'heartbeat' });
    }, 60_000);
  }

  private async reply(chatId: number, text: string) {
    await this.deps.telegram.sendMessage(chatId, text);
  }

  private async getRecipientLists(): Promise<RecipientLists> {
    try {
      const response = await this.deps.backend.getTelegramRecipients();
      return {
        allowedChatIds: pickScopeRecipients(response.allowedChatIds, this.deps.config.allowedChatIds),
        broadcastChatIds: pickScopeRecipients(response.broadcastChatIds, this.deps.config.broadcastChatIds),
        rotateChatIds: pickScopeRecipients(response.rotateChatIds, this.deps.config.rotateChatIds),
      };
    } catch (error) {
      console.error('[nomad-telegram-bot] recipients fallback to env', error);
      return {
        allowedChatIds: uniqueNumbers(this.deps.config.allowedChatIds),
        broadcastChatIds: uniqueNumbers(this.deps.config.broadcastChatIds),
        rotateChatIds: uniqueNumbers(this.deps.config.rotateChatIds),
      };
    }
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async safeReportState(payload: TelegramAutomationReportPayload) {
    try {
      await this.deps.backend.reportTelegramAutomationState(payload);
    } catch (error) {
      console.error('[nomad-telegram-bot] automation state report failed', error);
    }
  }

  private async safeReportError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const signature = message.trim() || 'unknown error';
    const now = Date.now();

    if (this.lastReportedError.signature === signature && now - this.lastReportedError.at < 60_000) {
      return;
    }

    this.lastReportedError = {
      signature,
      at: now,
    };

    await this.safeReportState({
      event: 'error',
      message: signature,
    });
  }
}
