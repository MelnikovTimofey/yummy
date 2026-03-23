import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { JsonStateStore } from './storage';

test('JsonStateStore persists bot state atomically', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nomad-bot-state-'));
  const filePath = path.join(directory, 'state.json');
  const store = new JsonStateStore(filePath);

  const initial = await store.read();
  assert.equal(initial.lastBroadcastCodeId, null);

  await store.update((state) => ({
    ...state,
    lastBroadcastCodeId: 'daily-code-1',
    lastBroadcastCodeValue: 'NOMAD-20260323',
    lastBroadcastDayKey: '2026-03-23',
    lastBroadcastAt: '2026-03-23T06:00:00.000Z',
    lastRotationAt: '2026-03-23T05:00:00.000Z',
  }));

  const persisted = await store.read();
  assert.deepEqual(persisted, {
    lastBroadcastCodeId: 'daily-code-1',
    lastBroadcastCodeValue: 'NOMAD-20260323',
    lastBroadcastDayKey: '2026-03-23',
    lastBroadcastAt: '2026-03-23T06:00:00.000Z',
    lastRotationAt: '2026-03-23T05:00:00.000Z',
  });

  await fs.rm(directory, { recursive: true, force: true });
});
