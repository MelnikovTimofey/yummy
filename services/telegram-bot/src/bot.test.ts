import assert from 'node:assert/strict';
import test from 'node:test';
import type { BotConfig } from './config';
import { BOT_COMMANDS, TelegramBot } from './bot';
import type { BackendClient } from './backend';
import type { JsonStateStore } from './storage';
import type { TelegramClient } from './telegram';

const buildConfig = (): BotConfig => ({
  mode: 'staff',
  telegramBotToken: 'bot-token',
  telegramApiBaseUrl: 'https://api.telegram.org',
  backendUrl: 'https://backend.example',
  backendAutomationToken: 'automation-token',
  statePath: '.state.json',
  updateTimeoutSeconds: 25,
  broadcastHour: 9,
  broadcastMinute: 0,
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
