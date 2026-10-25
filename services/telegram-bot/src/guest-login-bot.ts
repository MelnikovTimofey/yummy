import type { BackendClient } from './backend';
import { normalizeCommandText } from './bot';
import type { BotConfig } from './config';
import type { TelegramClient, TelegramSendMessageOptions } from './telegram';
import type { TelegramCallbackQuery, TelegramMessage } from './types';

type Dependencies = {
  config: BotConfig;
  backend: BackendClient;
  telegram: TelegramClient;
};

export const GUEST_LOGIN_TEXTS = {
  question: [
    'Войти в кабинет Арома Ателье?',
    'Сохраним ваш Telegram id, историю выборов и избранное. Удалить кабинет можно в любой момент.',
    'Не нажимали «Войти через Telegram» на сайте — нажмите «Отмена».',
  ].join('\n\n'),
  loginButton: 'Войти',
  cancelButton: 'Отмена',
  cancelled: 'Вход отменён.',
  confirmed: 'Готово — вернитесь в Ателье.',
  returnButton: 'Вернуться в Ателье',
  expired: 'Ссылка устарела. Нажмите «Войти через Telegram» на сайте ещё раз.',
  failed: 'Не получилось подтвердить вход. Попробуйте ещё раз через минуту.',
  help: 'Это бот входа в кабинет Арома Ателье. Войти можно кнопкой «Войти через Telegram» на сайте заведения.',
};

const LOGIN_PREFIX = 'login:';
const CANCEL = 'cancel';

const LOG_PREFIX = '[guest-login-bot]';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Бот входа гостей (PRD §3.3): на `/start <код>` спрашивает, входить ли, и
// подтверждает код на backend только по кнопке «Войти» — ссылку входа может
// прислать кто угодно, а вход и согласие даёт владелец Telegram. Staff-команд,
// рассылок и отчётов состояния нет. В логах — только факт подтверждения и
// HTTP-код: ни имени, ни username, ни текста сообщений, ни кода входа.
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
          if (update.callback_query) {
            await this.handleButton(update.callback_query);
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
        await this.deps.telegram.sendMessage(message.chat.id, GUEST_LOGIN_TEXTS.help);
        return;
      }

      // callback_data — до 64 байт: «login:» + 32 символа кода укладываются.
      await this.deps.telegram.sendMessage(message.chat.id, GUEST_LOGIN_TEXTS.question, {
        reply_markup: {
          inline_keyboard: [[
            { text: GUEST_LOGIN_TEXTS.loginButton, callback_data: `${LOGIN_PREFIX}${code}` },
            { text: GUEST_LOGIN_TEXTS.cancelButton, callback_data: CANCEL },
          ]],
        },
      });
    } catch (error) {
      console.error(`${LOG_PREFIX} reply failed: ${errorMessage(error)}`);
    }
  }

  private async handleButton(query: TelegramCallbackQuery) {
    try {
      await this.deps.telegram.answerCallbackQuery(query.id);
      const data = query.data ?? '';
      if (!query.message || !(data === CANCEL || data.startsWith(LOGIN_PREFIX))) {
        return;
      }

      const edit = (text: string, options?: TelegramSendMessageOptions) =>
        this.deps.telegram.editMessageText(query.message!.chat.id, query.message!.message_id, text, options);
      if (data === CANCEL) {
        await edit(GUEST_LOGIN_TEXTS.cancelled);
        return;
      }

      const [text, options] = await this.confirm(data.slice(LOGIN_PREFIX.length), String(query.from.id));
      await edit(text, options);
    } catch (error) {
      console.error(`${LOG_PREFIX} reply failed: ${errorMessage(error)}`);
    }
  }

  private async confirm(code: string, telegramId: string): Promise<[string, TelegramSendMessageOptions?]> {
    let status: number;
    try {
      status = await this.deps.backend.confirmGuestLogin({ code, telegramId });
    } catch (error) {
      console.error(`${LOG_PREFIX} guest login confirm failed: network error (${errorMessage(error)})`);
      return [GUEST_LOGIN_TEXTS.failed];
    }

    if (status === 200) {
      console.log(`${LOG_PREFIX} guest login confirmed: HTTP 200`);
      return [
        GUEST_LOGIN_TEXTS.confirmed,
        {
          reply_markup: {
            inline_keyboard: [[{ text: GUEST_LOGIN_TEXTS.returnButton, url: this.deps.config.guestLoginReturnUrl }]],
          },
        },
      ];
    }

    if (status === 404 || status === 410) {
      console.log(`${LOG_PREFIX} guest login not confirmed: HTTP ${status}`);
      return [GUEST_LOGIN_TEXTS.expired];
    }

    console.error(`${LOG_PREFIX} guest login confirm failed: HTTP ${status}`);
    return [GUEST_LOGIN_TEXTS.failed];
  }
}
