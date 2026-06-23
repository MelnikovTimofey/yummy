import type { BotConfig } from './config';
import { NomadBackendClient } from './backend';
import { JsonStateStore } from './storage';
import { TelegramClient, type TelegramSendMessageOptions } from './telegram';
import type {
  DailyAccessCodeRecord,
  TelegramAutomationReportPayload,
  TelegramMessage,
  TelegramOperatorRecord,
  TelegramUpdate,
} from './types';
import { buildNextBroadcastDelay, formatMoscowDateTime } from './time';

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
  '/start - инструкция и привязка доступа',
  '/help - список команд',
  '/code - показать текущий daily code',
  '/whoami - показать статус привязки чата',
].join('\n');

const CONTACT_REQUEST_TEXT = [
  'Чтобы получить доступ к daily code, поделитесь своим контактом.',
  'Бот сверит номер телефона с allowlist Nomad и привяжет этот чат.',
].join('\n');

const CONTACT_MISMATCH_TEXT = 'Нужно отправить свой собственный контакт из Telegram.';
const ACCESS_DENIED_TEXT = 'Номер телефона не найден в allowlist Nomad. Обратитесь к администратору.';

const buildContactRequestMarkup = () => ({
  keyboard: [[{ text: 'Поделиться контактом', request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
});

const buildRemoveKeyboardMarkup = () => ({
  remove_keyboard: true,
});

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

const buildDailyCodeMessage = (code: DailyAccessCodeRecord, reason: string) =>
  [
    reason,
    `Код: ${code.codeValue}`,
    `Подпись: ${code.codeLabel}`,
    `Действует с: ${formatMoscowDateTime(code.startsAt)}`,
    `Действует до: ${formatMoscowDateTime(code.endsAt)}`,
  ].join('\n');

const buildLinkedStatus = (operator: TelegramOperatorRecord | null) => {
  if (!operator) {
    return 'Привязка отсутствует.';
  }

  return [
    `Оператор: ${operator.name}`,
    `Телефон: ${operator.phone}`,
    `Чат: ${operator.linkedChatId ?? 'не привязан'}`,
    `Последний запрос кода: ${operator.lastCodeRequestedAt ? formatMoscowDateTime(operator.lastCodeRequestedAt) : 'ещё не было'}`,
  ].join('\n');
};

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
    await this.runScheduledEnsure('startup');
    this.scheduleNextEnsure();
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
    if (!message) {
      return;
    }

    if (message.contact) {
      await this.handleContactShare(message);
      return;
    }

    if (!message.text) {
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
        await this.handleStart(context);
        return;
      case '/help':
        await this.handleHelp(context);
        return;
      case '/code':
        await this.handleCode(context);
        return;
      case '/whoami':
        await this.handleWhoAmI(context);
        return;
      default:
        await this.reply(message.chat.id, 'Неизвестная команда. Используйте /help.');
    }
  }

  private async handleStart({ message }: CommandContext) {
    const linked = await this.getLinkedOperator(message.chat.id);
    if (!linked) {
      await this.promptContactShare(message.chat.id);
      return;
    }

    await this.reply(
      message.chat.id,
      [HELP_TEXT, '', buildLinkedStatus(linked)].join('\n'),
      { reply_markup: buildRemoveKeyboardMarkup() },
    );
  }

  private async handleHelp({ message }: CommandContext) {
    const linked = await this.getLinkedOperator(message.chat.id);
    if (!linked) {
      await this.promptContactShare(message.chat.id, [HELP_TEXT, '', CONTACT_REQUEST_TEXT].join('\n'));
      return;
    }

    await this.reply(
      message.chat.id,
      [HELP_TEXT, '', buildLinkedStatus(linked)].join('\n'),
      { reply_markup: buildRemoveKeyboardMarkup() },
    );
  }

  private async handleWhoAmI({ message }: CommandContext) {
    const linked = await this.getLinkedOperator(message.chat.id);
    const from = message.from;
    const fullName = [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim() || 'неизвестно';
    const username = from?.username ? `@${from.username}` : 'без username';

    await this.reply(
      message.chat.id,
      [
        `Чат: ${message.chat.id}`,
        `Пользователь: ${fullName} (${username})`,
        buildLinkedStatus(linked),
      ].join('\n'),
      linked ? { reply_markup: buildRemoveKeyboardMarkup() } : undefined,
    );
  }

  private async handleCode({ message }: CommandContext) {
    const linked = await this.getLinkedOperator(message.chat.id);
    if (!linked) {
      await this.promptContactShare(message.chat.id);
      return;
    }

    const ensured = await this.deps.backend.ensureDailyCode();
    await this.safeReportState({
      event: 'request',
      chatId: String(message.chat.id),
      codeId: ensured.item.id,
      codeValue: ensured.item.codeValue,
    });

    await this.reply(
      message.chat.id,
      buildDailyCodeMessage(
        ensured.item,
        ensured.state === 'created' ? 'Daily code был создан автоматически.' : 'Текущий daily code.',
      ),
      { reply_markup: buildRemoveKeyboardMarkup() },
    );
  }

  private async handleContactShare(message: TelegramMessage) {
    const phone = message.contact?.phone_number?.trim() || '';
    if (!phone) {
      await this.promptContactShare(message.chat.id);
      return;
    }

    if (
      message.from?.id
      && message.contact?.user_id
      && message.from.id !== message.contact.user_id
    ) {
      await this.promptContactShare(message.chat.id, CONTACT_MISMATCH_TEXT);
      return;
    }

    try {
      const linked = await this.deps.backend.linkTelegramOperator({
        phone,
        chatId: String(message.chat.id),
        telegramUserId: message.from?.id ? String(message.from.id) : undefined,
        username: message.from?.username,
        firstName: message.from?.first_name ?? message.contact?.first_name,
        lastName: message.from?.last_name ?? message.contact?.last_name,
      });

      await this.reply(
        message.chat.id,
        [
          'Контакт подтверждён.',
          `Оператор: ${linked.item.name}`,
          `Телефон: ${linked.item.phone}`,
          'Теперь можно использовать /code.',
        ].join('\n'),
        { reply_markup: buildRemoveKeyboardMarkup() },
      );
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      if (messageText.includes('allowlist entry not found')) {
        await this.promptContactShare(message.chat.id, ACCESS_DENIED_TEXT);
        return;
      }

      await this.safeReportError(error);
      await this.reply(message.chat.id, 'Не удалось подтвердить контакт. Попробуйте ещё раз позже.');
    }
  }

  private async runScheduledEnsure(trigger: 'startup' | 'scheduled') {
    if (this.stopped) {
      return;
    }

    const ensured = await this.deps.backend.ensureDailyCode();
    if (trigger === 'scheduled' && ensured.state === 'created') {
      await this.safeReportState({ event: 'heartbeat' });
    }
  }

  private scheduleNextEnsure() {
    if (this.stopped) {
      return;
    }

    const delay = Math.max(
      1_000,
      buildNextBroadcastDelay(new Date(), this.deps.config.broadcastHour, this.deps.config.broadcastMinute),
    );

    this.scheduler = setTimeout(() => {
      void this.runScheduledEnsure('scheduled')
        .catch((error) => {
          console.error('[nomad-telegram-bot] scheduled ensure error', error);
          return this.safeReportError(error);
        })
        .finally(() => {
          this.scheduleNextEnsure();
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

  private async getLinkedOperator(chatId: number) {
    try {
      const response = await this.deps.backend.getTelegramOperatorByChatId(chatId);
      return response.item;
    } catch (error) {
      console.error('[nomad-telegram-bot] linked operator lookup failed', error);
      await this.safeReportError(error);
      return null;
    }
  }

  private async promptContactShare(chatId: number, text = CONTACT_REQUEST_TEXT) {
    await this.reply(chatId, text, {
      reply_markup: buildContactRequestMarkup(),
    });
  }

  private async reply(chatId: number, text: string, options: TelegramSendMessageOptions = {}) {
    await this.deps.telegram.sendMessage(chatId, text, options);
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
