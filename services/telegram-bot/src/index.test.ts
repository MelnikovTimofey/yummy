import assert from 'node:assert/strict';
import test from 'node:test';
import { TelegramBot } from './bot';
import { GuestLoginBot } from './guest-login-bot';
import { createBot } from './index';

const withMode = <T>(mode: string | undefined, run: () => T) => {
  const previous = process.env.ATELIER_BOT_MODE;
  if (mode === undefined) {
    delete process.env.ATELIER_BOT_MODE;
  } else {
    process.env.ATELIER_BOT_MODE = mode;
  }
  try {
    return run();
  } finally {
    if (previous === undefined) {
      delete process.env.ATELIER_BOT_MODE;
    } else {
      process.env.ATELIER_BOT_MODE = previous;
    }
  }
};

test('createBot starts the staff bot by default', () => {
  assert.ok(withMode(undefined, createBot) instanceof TelegramBot);
  assert.ok(withMode('staff', createBot) instanceof TelegramBot);
});

test('createBot starts only the guest login bot in guest-login mode', () => {
  assert.ok(withMode('guest-login', createBot) instanceof GuestLoginBot);
});
