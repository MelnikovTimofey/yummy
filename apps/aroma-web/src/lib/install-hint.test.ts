import test from 'node:test';
import assert from 'node:assert/strict';
import { claimInstallPlate, INSTALL_HINT_KEY, installWay, markInstallHintDone, type InstallEnv } from './install-hint';
import type { StorageLike } from './guest-session';

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  iphoneFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  iphoneTelegram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  iphoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 357.0.0.25.101',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

const env = (userAgent: string, rest: Partial<InstallEnv> = {}): InstallEnv => ({
  standalone: false,
  userAgent,
  maxTouchPoints: 5,
  hasPrompt: false,
  ...rest,
});

test('открыто с экрана «Домой» — подсказок нет', () => {
  assert.equal(installWay(env(UA.iphoneSafari, { standalone: true })), null);
  assert.equal(installWay(env(UA.android, { standalone: true, hasPrompt: true })), null);
});

test('десктоп — подсказок нет, даже если браузер предлагает установку', () => {
  assert.equal(installWay(env(UA.mac, { maxTouchPoints: 0 })), null);
  assert.equal(installWay(env(UA.windows, { maxTouchPoints: 0, hasPrompt: true })), null);
});

test('пойманное событие установки — системное окно', () => {
  assert.equal(installWay(env(UA.android, { hasPrompt: true })), 'prompt');
});

test('iPhone в Safari, Chrome, Firefox и iPad — шаги для Safari', () => {
  for (const ua of [UA.iphoneSafari, UA.iphoneChrome, UA.iphoneFirefox, UA.ipad]) {
    assert.equal(installWay(env(ua)), 'ios', ua);
  }
});

test('встроенный браузер на iPhone — открыть в Safari', () => {
  assert.equal(installWay(env(UA.iphoneTelegram)), 'inapp');
  assert.equal(installWay(env(UA.iphoneInstagram)), 'inapp');
});

test('Android без события — шаги через меню браузера', () => {
  assert.equal(installWay(env(UA.android)), 'android');
});

const memoryStorage = (initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
};

test('плашка показывается один раз за всё время', () => {
  const storage = memoryStorage();
  assert.equal(claimInstallPlate(storage), true);
  assert.equal(storage.data.get(INSTALL_HINT_KEY), 'done');
  assert.equal(claimInstallPlate(storage), false);
});

test('после установки плашки нет', () => {
  const storage = memoryStorage();
  markInstallHintDone(storage);
  assert.equal(claimInstallPlate(storage), false);
});

test('хранилище недоступно — плашки нет, падения нет', () => {
  const broken = (failOn: 'get' | 'set'): StorageLike => ({
    getItem: () => {
      if (failOn === 'get') throw new Error('SecurityError');
      return null;
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
    removeItem: () => undefined,
  });
  assert.equal(claimInstallPlate(broken('get')), false);
  assert.equal(claimInstallPlate(broken('set')), false);
  assert.doesNotThrow(() => markInstallHintDone(broken('set')));
});
