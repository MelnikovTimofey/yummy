import type { BackendClient } from './backend';
import { normalizeCommandText } from './bot';
import type { BotConfig } from './config';
import type { TelegramClient, TelegramSendMessageOptions } from './telegram';
import type { TelegramMessage } from './types';

type Dependencies = {
  config: BotConfig;
  backend: BackendClient;
  telegram: TelegramClient;
};

export const GUEST_LOGIN_TEXTS = {
  confirmed: 'Готово — вернитесь в Ателье.',
  returnButton: 'Вернуться в Ателье',
  expired: 'Ссылка устарела. Нажмите «Войти через Telegram» на сайте ещё раз.',
  failed: 'Не получилось подтвердить вход. Попробуйте ещё раз через минуту.',
  help: 'Это бот входа в кабинет Арома Ателье. Войти можно кнопкой «Войти через Telegram» на сайте заведения.',
};

const LOG_PREFIX = '[guest-login-bot]';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Бот входа гостей (PRD §3.3): на `/start <код>` подтверждает код на backend
// и отвечает одним сообщением. Staff-команд, рассылок и отчётов состояния нет.
// В логах — только факт подтверждения и HTTP-код: ни имени, ни username, ни
// текста сообщений, ни кода входа.
export class GuestLoginBot {
  private stopped = false;
  private updateOffset = 0;

  constructor(private readonly deps: Dependencies) {}

  async start() {
    const { config } = this.deps;
    if (!config.telegramBotToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }
    if (!config.backendAutomationToken) {
      throw new Error('ATELIER_BACKEND_AUTOMATION_TOKEN is required');
    }
    if (!config.guestLoginReturnUrl) {
      throw new Error('ATELIER_GUEST_LOGIN_RETURN_URL is required');
    }

    console.log(`${LOG_PREFIX} started`);
    while (!this.stopped) {
      try {
        const updates = await this.deps.telegram.getUpdates(this.updateOffset, config.updateTimeoutSeconds);
        for (const update of updates) {
          this.updateOffset = update.update_id + 1;
          if (update.message) {
            await this.handleMessage(update.message);
          }
        }
      } catch (error) {
        console.error(`${LOG_PREFIX} poll error: ${errorMessage(error)}`);
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
  }

  stop() {
    this.stopped = true;
  }

  private async handleMessage(message: TelegramMessage) {
    try {
      const command = message.text ? normalizeCommandText(message.text) : null;
      const code = command?.command === '/start' ? command.args[0] : undefined;
      if (!code || !message.from) {
        await this.reply(message.chat.id, GUEST_LOGIN_TEXTS.help);
        return;
      }

      await this.confirm(message.chat.id, code, String(message.from.id));
    } catch (error) {
      console.error(`${LOG_PREFIX} reply failed: ${errorMessage(error)}`);
    }
  }

  private async confirm(chatId: number, code: string, telegramId: string) {
    let status: number;
    try {
      status = await this.deps.backend.confirmGuestLogin({ code, telegramId });
    } catch (error) {
      console.error(`${LOG_PREFIX} guest login confirm failed: network error (${errorMessage(error)})`);
      await this.reply(chatId, GUEST_LOGIN_TEXTS.failed);
      return;
    }

    if (status === 200) {
      console.log(`${LOG_PREFIX} guest login confirmed: HTTP 200`);
      await this.reply(chatId, GUEST_LOGIN_TEXTS.confirmed, {
        reply_markup: {
          inline_keyboard: [[{ text: GUEST_LOGIN_TEXTS.returnButton, url: this.deps.config.guestLoginReturnUrl }]],
        },
      });
      return;
    }

    if (status === 404 || status === 410) {
      console.log(`${LOG_PREFIX} guest login not confirmed: HTTP ${status}`);
      await this.reply(chatId, GUEST_LOGIN_TEXTS.expired);
      return;
    }

    console.error(`${LOG_PREFIX} guest login confirm failed: HTTP ${status}`);
    await this.reply(chatId, GUEST_LOGIN_TEXTS.failed);
  }

  private async reply(chatId: number, text: string, options: TelegramSendMessageOptions = {}) {
    await this.deps.telegram.sendMessage(chatId, text, options);
  }
}
