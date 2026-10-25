import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import type { BackendClient } from './backend';
import type { BotConfig } from './config';
import { GUEST_LOGIN_TEXTS, GuestLoginBot } from './guest-login-bot';
import type { TelegramClient, TelegramSendMessageOptions } from './telegram';
import type { TelegramCallbackQuery, TelegramMessage, TelegramUpdate } from './types';

const RETURN_URL = 'https://atelier.example';
const CODE = 'Zq3xV9bLk2mN8pR4sT6uW1yA5cE7gH0j';

const buildConfig = (): BotConfig => ({
  mode: 'guest-login',
  telegramBotToken: 'guest-bot-token',
  telegramApiBaseUrl: 'https://api.telegram.org',
  backendUrl: 'https://backend.example',
  backendAutomationToken: 'automation-token',
  statePath: '.state.json',
  updateTimeoutSeconds: 25,
  broadcastHour: 9,
  broadcastMinute: 0,
  guestLoginReturnUrl: RETURN_URL,
});

const guestMessage = (text: string | undefined, extra: Partial<TelegramMessage> = {}): TelegramMessage => ({
  message_id: 1,
  text,
  chat: { id: 555, type: 'private', username: 'secret_guest' },
  from: { id: 4242, is_bot: false, first_name: 'Тайный', last_name: 'Гость', username: 'secret_guest' },
  ...extra,
});

type Sent = { chatId: number; text: string; options?: TelegramSendMessageOptions };
type Edited = { chatId: number; messageId: number; text: string; options?: TelegramSendMessageOptions };
type Confirm = { code: string; telegramId: string };

const QUESTION_MESSAGE_ID = 77;

// Нажатие inline-кнопки под вопросом бота; нажимает не обязательно тот, кто прислал /start.
const press = (data: string, fromId = 4242): TelegramCallbackQuery => ({
  id: `cb-${data}`,
  from: { id: fromId, is_bot: false, first_name: 'Тайный', username: 'secret_guest' },
  message: { message_id: QUESTION_MESSAGE_ID, chat: { id: 555, type: 'private' } },
  data,
});

const runBot = async (
  inputs: Array<TelegramMessage | TelegramCallbackQuery>,
  confirm: (payload: Confirm) => Promise<number> = async () => 200,
) => {
  const sent: Sent[] = [];
  const edited: Edited[] = [];
  const answered: string[] = [];
  const confirms: Confirm[] = [];
  const staffCalls: string[] = [];
  let polls = 0;
  let bot: GuestLoginBot;

  const updates: TelegramUpdate[] = inputs.map((input, index) =>
    'chat' in input ? { update_id: 100 + index, message: input } : { update_id: 100 + index, callback_query: input },
  );
  const telegram = {
    getUpdates: async () => {
      polls += 1;
      if (polls === 1) {
        return updates;
      }
      bot.stop();
      return [];
    },
    sendMessage: async (chatId: number, text: string, options?: TelegramSendMessageOptions) => {
      sent.push({ chatId, text, options });
      return {};
    },
    editMessageText: async (chatId: number, messageId: number, text: string, options?: TelegramSendMessageOptions) => {
      edited.push({ chatId, messageId, text, options });
      return {};
    },
    answerCallbackQuery: async (id: string) => {
      answered.push(id);
      return true;
    },
    setMyCommands: async () => {
      staffCalls.push('setMyCommands');
      return true;
    },
  } as unknown as TelegramClient;

  const staffMethod = (name: string) => async () => {
    staffCalls.push(name);
    throw new Error(`${name} must not be called in guest-login mode`);
  };

  const backend = {
    confirmGuestLogin: async (payload: Confirm) => {
      confirms.push(payload);
      return confirm(payload);
    },
    ensureDailyCode: staffMethod('ensureDailyCode'),
    rotateDailyCode: staffMethod('rotateDailyCode'),
    getCurrentDailyCode: staffMethod('getCurrentDailyCode'),
    getTelegramOperatorByChatId: staffMethod('getTelegramOperatorByChatId'),
    linkTelegramOperator: staffMethod('linkTelegramOperator'),
    getTelegramAutomationState: staffMethod('getTelegramAutomationState'),
    reportTelegramAutomationState: staffMethod('reportTelegramAutomationState'),
  } as unknown as BackendClient;

  bot = new GuestLoginBot({ config: buildConfig(), backend, telegram });
  await bot.start();

  return { sent, edited, answered, confirms, staffCalls };
};

const captureLogs = (t: TestContext) => {
  const lines: string[] = [];
  const record = (...args: unknown[]) => {
    lines.push(args.map((arg) => (arg instanceof Error ? `${arg.message}\n${arg.stack}` : String(arg))).join(' '));
  };
  t.mock.method(console, 'log', record);
  t.mock.method(console, 'info', record);
  t.mock.method(console, 'warn', record);
  t.mock.method(console, 'error', record);
  return lines;
};

test('/start <code> asks the guest to confirm the login and does not confirm by itself', async (t) => {
  captureLogs(t);
  const { sent, confirms } = await runBot([guestMessage(`/start ${CODE}`)]);

  assert.deepEqual(confirms, []);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].chatId, 555);
  assert.equal(sent[0].text, GUEST_LOGIN_TEXTS.question);
  assert.match(sent[0].text, /Telegram id, историю выборов и избранное/);
  assert.deepEqual(sent[0].options?.reply_markup, {
    inline_keyboard: [[
      { text: 'Войти', callback_data: `login:${CODE}` },
      { text: 'Отмена', callback_data: 'cancel' },
    ]],
  });
});

test('/start@bot <code> is treated as the same deep link', async (t) => {
  captureLogs(t);
  const { sent } = await runBot([guestMessage(`/start@aroma_atelier_client_bot ${CODE}`)]);

  assert.equal(sent[0].text, GUEST_LOGIN_TEXTS.question);
});

test('«Войти» confirms the code with the telegram id of who pressed it and turns the question into a way back', async (t) => {
  captureLogs(t);
  const { confirms, edited, answered, sent } = await runBot([press(`login:${CODE}`, 4243)]);

  assert.deepEqual(confirms, [{ code: CODE, telegramId: '4243' }]);
  assert.deepEqual(answered, [`cb-login:${CODE}`]);
  assert.deepEqual(sent, []);
  assert.deepEqual(edited, [{
    chatId: 555,
    messageId: QUESTION_MESSAGE_ID,
    text: 'Готово — вернитесь в Ателье.',
    options: { reply_markup: { inline_keyboard: [[{ text: 'Вернуться в Ателье', url: RETURN_URL }]] } },
  }]);
});

test('«Отмена» does not confirm and removes the buttons', async (t) => {
  captureLogs(t);
  const { confirms, edited, answered } = await runBot([press('cancel')]);

  assert.deepEqual(confirms, []);
  assert.deepEqual(answered, ['cb-cancel']);
  assert.deepEqual(edited.map(({ text, options }) => [text, options?.reply_markup]), [['Вход отменён.', undefined]]);
});

test('an unknown button is only acknowledged', async (t) => {
  captureLogs(t);
  const { confirms, edited, answered } = await runBot([press('something-else')]);

  assert.deepEqual(confirms, []);
  assert.deepEqual(edited, []);
  assert.deepEqual(answered, ['cb-something-else']);
});

for (const status of [404, 410]) {
  test(`«Войти» answers «ссылка устарела» when backend returns ${status}`, async (t) => {
    captureLogs(t);
    const { edited } = await runBot([press(`login:${CODE}`)], async () => status);

    assert.equal(edited.length, 1);
    assert.equal(edited[0].text, 'Ссылка устарела. Нажмите «Войти через Telegram» на сайте ещё раз.');
    assert.equal(edited[0].options?.reply_markup, undefined);
  });
}

test('«Войти» asks to retry later on network error', async (t) => {
  captureLogs(t);
  const { edited } = await runBot([press(`login:${CODE}`)], async () => {
    throw new TypeError('fetch failed');
  });

  assert.equal(edited.length, 1);
  assert.equal(edited[0].text, 'Не получилось подтвердить вход. Попробуйте ещё раз через минуту.');
});

for (const status of [500, 502, 401]) {
  test(`«Войти» asks to retry later when backend returns ${status}`, async (t) => {
    captureLogs(t);
    const { edited } = await runBot([press(`login:${CODE}`)], async () => status);

    assert.equal(edited.length, 1);
    assert.equal(edited[0].text, GUEST_LOGIN_TEXTS.failed);
  });
}

test('/start without a code and any other message get one help message without backend calls', async (t) => {
  captureLogs(t);
  const { sent, confirms } = await runBot([
    guestMessage('/start'),
    guestMessage('привет'),
    guestMessage(undefined),
  ]);

  assert.deepEqual(confirms, []);
  assert.deepEqual(
    sent.map(({ text }) => text),
    Array(3).fill('Это бот входа в кабинет Арома Ателье. Войти можно кнопкой «Войти через Telegram» на сайте заведения.'),
  );
});

test('staff commands, contact sharing and automation reports are unavailable in guest-login mode', async (t) => {
  captureLogs(t);
  const { sent, confirms, staffCalls } = await runBot([
    guestMessage('/code'),
    guestMessage('/whoami'),
    guestMessage('/help'),
    guestMessage(undefined, { contact: { phone_number: '+79990001122', user_id: 4242 } }),
  ]);

  assert.deepEqual(staffCalls, []);
  assert.deepEqual(confirms, []);
  assert.deepEqual(
    sent.map(({ text }) => text),
    Array(4).fill(GUEST_LOGIN_TEXTS.help),
  );
});

test('a failed reply does not stop the bot from answering the next guest', async (t) => {
  captureLogs(t);
  const sent: string[] = [];
  let polls = 0;
  let bot: GuestLoginBot;
  const telegram = {
    getUpdates: async () => {
      polls += 1;
      if (polls === 1) {
        return [
          { update_id: 1, message: guestMessage('первый') },
          { update_id: 2, message: guestMessage('второй') },
        ];
      }
      bot.stop();
      return [];
    },
    sendMessage: async (_chatId: number, text: string) => {
      if (sent.length === 0) {
        sent.push('failed');
        throw new Error('Forbidden: bot was blocked by the user');
      }
      sent.push(text);
      return {};
    },
  } as unknown as TelegramClient;

  bot = new GuestLoginBot({ config: buildConfig(), backend: {} as BackendClient, telegram });
  await bot.start();

  assert.deepEqual(sent, ['failed', GUEST_LOGIN_TEXTS.help]);
});

test('logs carry only the fact of confirmation and backend HTTP status, no guest data or full code', async (t) => {
  const logs = captureLogs(t);
  const statuses = [200, 410, 500];
  await runBot(
    [
      guestMessage(`/start ${CODE}`),
      press(`login:${CODE}`),
      press(`login:${CODE}`),
      press(`login:${CODE}`),
      guestMessage('Меня зовут Тайный Гость, мой телефон +79990001122'),
    ],
    async () => statuses.shift() ?? 200,
  );
  await runBot([press(`login:${CODE}`)], async () => {
    throw new TypeError('fetch failed');
  });

  const joined = logs.join('\n');
  assert.match(joined, /200/);
  assert.match(joined, /410/);
  assert.match(joined, /500/);
  for (const secret of [CODE, 'Тайный', 'Гость', 'secret_guest', '4242', '555', '+79990001122', 'Меня зовут']) {
    assert.ok(!joined.includes(secret), `logs must not contain «${secret}»:\n${joined}`);
  }
});

test('start requires the return URL in guest-login mode', async () => {
  const bot = new GuestLoginBot({
    config: { ...buildConfig(), guestLoginReturnUrl: '' },
    backend: {} as BackendClient,
    telegram: {} as TelegramClient,
  });

  await assert.rejects(bot.start(), /ATELIER_GUEST_LOGIN_RETURN_URL is required/);
});
