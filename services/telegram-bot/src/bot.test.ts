import assert from 'node:assert/strict';
import test from 'node:test';
import type { BotConfig } from './config';
import { BOT_COMMANDS, TelegramBot } from './bot';
import type { BackendClient } from './backend';
import type { JsonStateStore } from './storage';
import type { TelegramClient } from './telegram';
import type { TelegramMessage } from './types';

const buildConfig = (): BotConfig => ({
  mode: 'staff',
  telegramBotToken: 'bot-token',
  telegramApiBaseUrl: 'https://api.telegram.org',
  backendUrl: 'https://backend.example',
  backendAutomationToken: 'automation-token',
  statePath: '.state.json',
  updateTimeoutSeconds: 25,
  guestLoginReturnUrl: '',
});

const buildBot = (setMyCommands: (commands: typeof BOT_COMMANDS) => Promise<unknown>) => {
  const events: string[] = [];
  let bot: TelegramBot;

  const telegram = {
    setMyCommands: async (commands: typeof BOT_COMMANDS) => {
      events.push('setMyCommands');
      return setMyCommands(commands);
    },
    getUpdates: async () => {
      events.push('getUpdates');
      bot.stop();
      return [];
    },
  } as unknown as TelegramClient;

  const backend = {
    reportTelegramAutomationState: async () => ({}),
    ensureDailyCode: async () => ({ state: 'existing', item: {} }),
  } as unknown as BackendClient;

  bot = new TelegramBot({
    config: buildConfig(),
    backend,
    telegram,
    stateStore: {} as JsonStateStore,
  });

  return { bot, events };
};

test('start registers command menu before polling updates', async () => {
  let registered: typeof BOT_COMMANDS = [];
  const { bot, events } = buildBot(async (commands) => {
    registered = commands;
    return true;
  });

  await bot.start();

  assert.deepEqual(events, ['setMyCommands', 'getUpdates']);
  assert.deepEqual(
    registered.map(({ command }) => command),
    ['start', 'help', 'code', 'whoami'],
  );
});

test('start keeps polling when command menu registration fails', async () => {
  const { bot, events } = buildBot(async () => {
    throw new Error('Too Many Requests');
  });

  await bot.start();

  assert.deepEqual(events, ['setMyCommands', 'getUpdates']);
});

const shareContact = async (message: TelegramMessage) => {
  const linked: unknown[] = [];
  const replies: string[] = [];
  let bot: TelegramBot;
  let delivered = false;

  const telegram = {
    setMyCommands: async () => true,
    getUpdates: async () => {
      if (delivered) {
        bot.stop();
        return [];
      }
      delivered = true;
      return [{ update_id: 1, message }];
    },
    sendMessage: async (_chatId: number, text: string) => {
      replies.push(text);
      return {};
    },
  } as unknown as TelegramClient;

  const backend = {
    reportTelegramAutomationState: async () => ({}),
    ensureDailyCode: async () => ({ state: 'existing', item: {} }),
    linkTelegramOperator: async (input: unknown) => {
      linked.push(input);
      return { item: { name: 'Оператор', phone: '+79990000000' } };
    },
  } as unknown as BackendClient;

  bot = new TelegramBot({ config: buildConfig(), backend, telegram, stateStore: {} as JsonStateStore });
  await bot.start();
  return { linked, replies };
};

const contactMessage = (contact: TelegramMessage['contact'], chatType = 'private'): TelegramMessage => ({
  message_id: 1,
  chat: { id: 500, type: chatType },
  from: { id: 42, is_bot: false, first_name: 'Мастер' },
  contact,
});

test('own contact in a private chat links the operator', async () => {
  const { linked } = await shareContact(contactMessage({ phone_number: '+79990000000', user_id: 42 }));

  assert.equal(linked.length, 1);
});

test('contact without user_id is rejected: it may be someone else\'s phone book card', async () => {
  const { linked, replies } = await shareContact(contactMessage({ phone_number: '+79990000000' }));

  assert.equal(linked.length, 0);
  assert.match(replies.at(-1) ?? '', /свой собственный контакт/);
});

test('contact of another Telegram user is rejected', async () => {
  const { linked } = await shareContact(contactMessage({ phone_number: '+79990000000', user_id: 7 }));

  assert.equal(linked.length, 0);
});

test('contact shared in a group chat does not link the group', async () => {
  const { linked } = await shareContact(contactMessage({ phone_number: '+79990000000', user_id: 42 }, 'group'));

  assert.equal(linked.length, 0);
});
