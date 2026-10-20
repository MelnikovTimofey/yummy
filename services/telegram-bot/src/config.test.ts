import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from './config';

const withEnv = <T>(values: Record<string, string | undefined>, run: () => T) => {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    return run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

test('bot mode defaults to staff', () => {
  const config = withEnv({ ATELIER_BOT_MODE: undefined, ATELIER_GUEST_LOGIN_RETURN_URL: undefined }, loadConfig);

  assert.equal(config.mode, 'staff');
  assert.equal(config.guestLoginReturnUrl, '');
});

test('guest-login mode reads the return URL', () => {
  const config = withEnv(
    { ATELIER_BOT_MODE: ' guest-login ', ATELIER_GUEST_LOGIN_RETURN_URL: 'https://atelier.example' },
    loadConfig,
  );

  assert.equal(config.mode, 'guest-login');
  assert.equal(config.guestLoginReturnUrl, 'https://atelier.example');
});

test('unknown bot mode fails fast instead of starting the staff bot', () => {
  assert.throws(
    () => withEnv({ ATELIER_BOT_MODE: 'guest' }, loadConfig),
    /ATELIER_BOT_MODE must be staff or guest-login/,
  );
});
