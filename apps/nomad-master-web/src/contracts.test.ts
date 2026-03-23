import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInventorySummary,
  formatDateTimeLocalInput,
  normalizeDashboardSummary,
  normalizeDailyAccessCodeRecord,
  normalizeMixRecord,
  normalizeRailRecord,
  normalizeAuditEventRecord,
  normalizeStaffAccountRecord,
  normalizeTelegramAutomationStateRecord,
  normalizeTelegramRecipientRecord,
  parseDelimitedList,
  parseDateTimeLocalInput,
  sortDailyAccessCodes,
  sortInventoryItems,
  sortMixes,
  sortRails,
  sortStaffAccounts,
  sortTelegramRecipients,
} from './contracts';

test('buildInventorySummary counts stock states', () => {
  const summary = buildInventorySummary([
    { id: '1', name: 'A', manufacturer: 'Nomad', inStock: true },
    { id: '2', name: 'B', manufacturer: 'Nomad', inStock: false },
    { id: '3', name: 'C', manufacturer: 'Nomad', inStock: true },
  ]);

  assert.deepEqual(summary, {
    totalTobaccos: 3,
    inStockCount: 2,
    outOfStockCount: 1,
  });
});

test('sortInventoryItems places in-stock tobaccos first', () => {
  const sorted = sortInventoryItems([
    { id: '2', name: 'Zulu', manufacturer: 'Nomad', inStock: false },
    { id: '1', name: 'Alpha', manufacturer: 'Nomad', inStock: true },
    { id: '3', name: 'Beta', manufacturer: 'Nomad', inStock: false },
  ]);

  assert.deepEqual(sorted.map((item) => item.id), ['1', '3', '2']);
});

test('parseDelimitedList trims empty chunks and duplicates', () => {
  assert.deepEqual(parseDelimitedList(' fresh, citrus\nfresh; mint '), ['fresh', 'citrus', 'mint']);
});

test('normalizeMixRecord accepts inStock alias and component objects', () => {
  const mix = normalizeMixRecord({
    mixId: 'mix-1',
    name: 'Тестовый микс',
    description: 'Описание',
    componentIds: ['c-1'],
    components: [
      {
        id: 'c-2',
        name: 'Компонент',
        manufacturer: 'Nomad',
        flavors: ['мята'],
      },
    ],
    flavorProfiles: ['fresh'],
    flavors: ['мята'],
    avgRating: '4.7',
    popularity: 11,
    inStock: false,
  });

  assert.equal(mix.id, 'mix-1');
  assert.equal(mix.available, false);
  assert.deepEqual(mix.componentIds, ['c-1', 'c-2']);
  assert.deepEqual(mix.components[0], {
    id: 'c-2',
    name: 'Компонент',
    manufacturer: 'Nomad',
    flavors: ['мята'],
  });
});

test('normalizeRailRecord accepts mix refs and active alias', () => {
  const rail = normalizeRailRecord({
    id: 'rail-1',
    name: 'Тестовый рейл',
    type: 'curated',
    description: 'Описание',
    mixes: [
      {
        mixId: 'mix-1',
        mixName: 'Цитрусовый караван',
      },
    ],
    active: false,
  });

  assert.equal(rail.id, 'rail-1');
  assert.equal(rail.active, false);
  assert.deepEqual(rail.mixIds, ['mix-1']);
  assert.deepEqual(rail.mixes[0], {
    id: 'mix-1',
    name: 'Цитрусовый караван',
  });
});

test('normalizeDashboardSummary supports nested inventory payload', () => {
  const summary = normalizeDashboardSummary({
    inventory: {
      total: 6,
      inStockCount: 5,
      outOfStockCount: 1,
    },
    smokeCtaTotal: 7,
    topMixes: [
      {
        mixId: 'mix-1',
        mixName: 'Цитрусовый караван',
        count: 3,
      },
    ],
  });

  assert.deepEqual(summary, {
    totalTobaccos: 6,
    inStockCount: 5,
    outOfStockCount: 1,
    smokeCtaTotal: 7,
    topMixes: [
      {
        mixId: 'mix-1',
        name: 'Цитрусовый караван',
        smokeCtaCount: 3,
      },
    ],
  });
});

test('sortMixes keeps available items and popularity first', () => {
  const sorted = sortMixes([
    {
      id: 'mix-2',
      name: 'B',
      description: '',
      componentIds: [],
      components: [],
      flavorProfiles: [],
      flavors: [],
      avgRating: 4.5,
      popularity: 20,
      available: false,
    },
    {
      id: 'mix-1',
      name: 'A',
      description: '',
      componentIds: [],
      components: [],
      flavorProfiles: [],
      flavors: [],
      avgRating: 4.7,
      popularity: 30,
      available: true,
    },
  ]);

  assert.deepEqual(sorted.map((item) => item.id), ['mix-1', 'mix-2']);
});

test('sortRails keeps active statistical rails first', () => {
  const sorted = sortRails([
    {
      id: 'rail-2',
      name: 'B',
      type: 'curated',
      description: '',
      mixIds: [],
      mixes: [],
      active: false,
    },
    {
      id: 'rail-1',
      name: 'A',
      type: 'statistical',
      description: '',
      mixIds: [],
      mixes: [],
      active: true,
    },
  ]);

  assert.deepEqual(sorted.map((item) => item.id), ['rail-1', 'rail-2']);
});

test('normalizeDailyAccessCodeRecord preserves display code and dates', () => {
  const record = normalizeDailyAccessCodeRecord({
    codeId: 'code-1',
    codeValue: 'NOMAD-2026',
    codeLabel: 'Сегодня',
    active: false,
    startsAt: '2026-03-23T08:00:00.000Z',
    endsAt: '2026-03-23T23:59:59.000Z',
  });

  assert.deepEqual(record, {
    id: 'code-1',
    codeValue: 'NOMAD-2026',
    codeLabel: 'Сегодня',
    active: false,
    startsAt: '2026-03-23T08:00:00.000Z',
    endsAt: '2026-03-23T23:59:59.000Z',
  });
});

test('normalizeStaffAccountRecord defaults to nomad role', () => {
  const record = normalizeStaffAccountRecord({
    id: 'staff-1',
    login: 'nomad',
    name: 'Кальянный мастер',
    active: true,
  });

  assert.deepEqual(record, {
    id: 'staff-1',
    login: 'nomad',
    name: 'Кальянный мастер',
    role: 'nomad',
    active: true,
  });
});

test('sortDailyAccessCodes keeps active and newest codes first', () => {
  const sorted = sortDailyAccessCodes([
    {
      id: 'code-2',
      codeValue: 'B',
      codeLabel: 'Вчера',
      active: false,
      startsAt: '2026-03-22T08:00:00.000Z',
      endsAt: '2026-03-22T23:59:59.000Z',
    },
    {
      id: 'code-1',
      codeValue: 'A',
      codeLabel: 'Сегодня',
      active: true,
      startsAt: '2026-03-23T08:00:00.000Z',
      endsAt: '2026-03-23T23:59:59.000Z',
    },
  ]);

  assert.deepEqual(sorted.map((item) => item.id), ['code-1', 'code-2']);
});

test('sortStaffAccounts keeps active admins first', () => {
  const sorted = sortStaffAccounts([
    {
      id: 'staff-2',
      login: 'nomad',
      name: 'Nomad',
      role: 'nomad',
      active: true,
    },
    {
      id: 'staff-1',
      login: 'admin',
      name: 'Admin',
      role: 'admin',
      active: true,
    },
    {
      id: 'staff-3',
      login: 'guest',
      name: 'Guest',
      role: 'nomad',
      active: false,
    },
  ]);

  assert.deepEqual(sorted.map((item) => item.id), ['staff-1', 'staff-2', 'staff-3']);
});

test('normalizeTelegramAutomationStateRecord supports nulls and health', () => {
  const record = normalizeTelegramAutomationStateRecord({
    id: 'telegram-bot-status',
    health: 'error',
    lastHeartbeatAt: '2026-03-23T10:20:45.288Z',
    lastRotateAt: null,
    lastRotateCodeId: null,
    lastRotateCodeValue: null,
    lastBroadcastAt: '2026-03-23T09:00:00.000Z',
    lastBroadcastCodeId: 'daily-code-default',
    lastBroadcastCodeValue: 'NOMAD-2026',
    lastBroadcastDayKey: '2026-03-23',
    lastErrorAt: '2026-03-23T10:21:00.000Z',
    lastErrorMessage: 'Telegram request timeout',
    updatedAt: '2026-03-23T10:21:00.000Z',
  });

  assert.deepEqual(record, {
    id: 'telegram-bot-status',
    health: 'error',
    lastHeartbeatAt: '2026-03-23T10:20:45.288Z',
    lastRotateAt: '',
    lastRotateCodeId: '',
    lastRotateCodeValue: '',
    lastBroadcastAt: '2026-03-23T09:00:00.000Z',
    lastBroadcastCodeId: 'daily-code-default',
    lastBroadcastCodeValue: 'NOMAD-2026',
    lastBroadcastDayKey: '2026-03-23',
    lastErrorAt: '2026-03-23T10:21:00.000Z',
    lastErrorMessage: 'Telegram request timeout',
    updatedAt: '2026-03-23T10:21:00.000Z',
  });
});

test('normalizeAuditEventRecord preserves actor and details', () => {
  const record = normalizeAuditEventRecord({
    id: 'audit-1',
    actorLogin: 'admin',
    actorName: 'Admin',
    actorRole: 'admin',
    action: 'toggle',
    entityType: 'inventory',
    entityId: 'tobacco-1',
    entityLabel: 'Nomad Reserve · Peach Silk',
    details: {
      fromInStock: false,
      toInStock: true,
    },
    createdAt: '2026-03-23T10:20:45.288Z',
  });

  assert.deepEqual(record, {
    id: 'audit-1',
    actorLogin: 'admin',
    actorName: 'Admin',
    actorRole: 'admin',
    action: 'toggle',
    entityType: 'inventory',
    entityId: 'tobacco-1',
    entityLabel: 'Nomad Reserve · Peach Silk',
    details: {
      fromInStock: false,
      toInStock: true,
    },
    createdAt: '2026-03-23T10:20:45.288Z',
  });
});

test('normalizeTelegramRecipientRecord reads scope and chat id', () => {
  const record = normalizeTelegramRecipientRecord({
    recipientId: 'telegram-1',
    chatId: '362223626',
    label: 'Основной чат',
    scope: 'broadcast',
    active: false,
  });

  assert.deepEqual(record, {
    id: 'telegram-1',
    chatId: '362223626',
    label: 'Основной чат',
    scope: 'broadcast',
    active: false,
  });
});

test('sortTelegramRecipients keeps active and scope priority first', () => {
  const sorted = sortTelegramRecipients([
    {
      id: 'telegram-2',
      chatId: '2',
      label: 'Rotate',
      scope: 'rotate',
      active: true,
    },
    {
      id: 'telegram-1',
      chatId: '1',
      label: 'Allowed',
      scope: 'allowed',
      active: true,
    },
    {
      id: 'telegram-3',
      chatId: '3',
      label: 'Broadcast inactive',
      scope: 'broadcast',
      active: false,
    },
  ]);

  assert.deepEqual(sorted.map((item) => item.id), ['telegram-1', 'telegram-2', 'telegram-3']);
});

test('date helpers roundtrip local input', () => {
  const input = '2026-03-23T10:15';
  const iso = parseDateTimeLocalInput(input);

  assert.equal(typeof iso, 'string');
  assert.ok(iso.endsWith('Z'));
  assert.equal(formatDateTimeLocalInput(iso), input);
});
