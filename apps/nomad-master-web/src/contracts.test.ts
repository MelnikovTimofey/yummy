import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMixRequestQuery,
  buildInventoryRequestQuery,
  buildInventorySummary,
  defaultInventoryListResponse,
  defaultMixListResponse,
  dashboardWindowOptions,
  formatInventoryBatchAction,
  formatDateTimeLocalInput,
  normalizeDashboardSummary,
  normalizeInventoryBatchResponse,
  normalizeInventoryListResponse,
  normalizeMixListResponse,
  normalizeDailyAccessCodeRecord,
  normalizeMixRecord,
  normalizeRailRecord,
  normalizeAuditEventRecord,
  normalizeStaffAccountRecord,
  normalizeTelegramAutomationStateRecord,
  normalizeTelegramOperatorRecord,
  normalizeTelegramRecipientRecord,
  parseDelimitedList,
  parseDateTimeLocalInput,
  sortDailyAccessCodes,
  sortInventoryItems,
  sortMixes,
  sortRails,
  sortStaffAccounts,
  sortTelegramOperators,
  sortTelegramRecipients,
  toggleInventoryFilterValue,
  toggleMixFilterValue,
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

test('normalizeInventoryListResponse supports filter meta and dependent mixes', () => {
  const response = normalizeInventoryListResponse({
    items: [
      {
        id: 'tobacco-peach-silk',
        name: 'Peach Silk',
        manufacturer: 'Nomad Reserve',
        lineName: 'Основная',
        country: 'Россия',
        officialStrength: 'Лёгкая',
        communityStrength: 'Средняя',
        productionStatus: 'Выпускается',
        description: 'Сладкий персиковый профиль.',
        inStock: false,
        flavorProfiles: ['Сладкие'],
        flavors: ['персик'],
        flavorTags: ['fruity'],
        updatedAt: '2026-03-28T10:00:00.000Z',
        dependentMixCount: 1,
        blockedDependentMixCount: 1,
        dependentMixes: [
          {
            id: 'mix-peach-mirage',
            name: 'Персиковый мираж',
            available: true,
            guestVisible: false,
            avgRating: 4.7,
            popularity: 12,
          },
        ],
      },
    ],
    filters: {
      search: 'персик',
      stock: 'out-of-stock',
      manufacturers: ['Nomad Reserve'],
      flavors: ['персик'],
      options: {
        manufacturers: ['Nomad Reserve', 'Darkside'],
        flavorTags: ['fruity'],
      },
    },
    sort: {
      field: 'dependentMixes',
      direction: 'desc',
    },
    meta: {
      totalItems: 14,
      filteredItems: 1,
      inStockCount: 0,
      outOfStockCount: 1,
      page: 2,
      pageSize: 20,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    },
  });

  assert.equal(response.items[0]?.dependentMixes?.[0]?.id, 'mix-peach-mirage');
  assert.equal(response.items[0]?.blockedDependentMixCount, 1);
  assert.equal(response.items[0]?.lineName, 'Основная');
  assert.equal(response.items[0]?.country, 'Россия');
  assert.equal(response.items[0]?.officialStrength, 'Лёгкая');
  assert.equal(response.items[0]?.communityStrength, 'Средняя');
  assert.equal(response.items[0]?.productionStatus, 'Выпускается');
  assert.equal(response.items[0]?.description, 'Сладкий персиковый профиль.');
  assert.equal(response.filters.stock, 'out-of-stock');
  assert.deepEqual(response.filters.options.flavorTags, ['fruity']);
  assert.equal(response.sort.field, 'dependentMixes');
  assert.equal(response.meta.filteredItems, 1);
  assert.equal(response.meta.page, 2);
  assert.equal(response.meta.pageSize, 20);
  assert.equal(response.meta.totalPages, 3);
});

test('normalizeInventoryListResponse falls back to defaults', () => {
  const response = normalizeInventoryListResponse({});

  assert.deepEqual(response, defaultInventoryListResponse);
});

test('normalizeInventoryBatchResponse parses batch mutation payload', () => {
  const response = normalizeInventoryBatchResponse({
    action: 'set-out-of-stock',
    ids: ['tobacco-1', 'tobacco-2'],
    skippedIds: ['missing-id'],
    processedCount: 2,
    items: [
      {
        id: 'tobacco-1',
        name: 'Mint Veil',
        manufacturer: 'Nomad Reserve',
        inStock: false,
      },
    ],
  });

  assert.equal(response.action, 'set-out-of-stock');
  assert.deepEqual(response.ids, ['tobacco-1', 'tobacco-2']);
  assert.deepEqual(response.skippedIds, ['missing-id']);
  assert.equal(response.items[0]?.inStock, false);
  assert.equal(formatInventoryBatchAction(response.action), 'Убрать из наличия');
});

test('buildInventoryRequestQuery serializes selected filters and sort', () => {
  const query = buildInventoryRequestQuery(
    {
      ...defaultInventoryListResponse.filters,
      search: 'персик',
      stock: 'out-of-stock',
      manufacturers: ['Nomad Reserve'],
      flavors: ['персик'],
    },
    {
      field: 'dependentMixes',
      direction: 'desc',
    },
    3,
    25,
  );

  assert.equal(
    query,
    'search=%D0%BF%D0%B5%D1%80%D1%81%D0%B8%D0%BA&stock=out-of-stock&manufacturers=Nomad+Reserve&flavors=%D0%BF%D0%B5%D1%80%D1%81%D0%B8%D0%BA&sort=dependentMixes&direction=desc&page=3&pageSize=25',
  );
});

test('toggleInventoryFilterValue adds and removes option without duplicates', () => {
  assert.deepEqual(toggleInventoryFilterValue(['Nomad Reserve'], 'Darkside'), ['Nomad Reserve', 'Darkside']);
  assert.deepEqual(toggleInventoryFilterValue(['Nomad Reserve'], 'Nomad Reserve'), []);
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
    tobaccoId: 'c-2',
    name: 'Компонент',
    manufacturer: 'Nomad',
    flavors: ['мята'],
    proportion: 0,
    sortOrder: 0,
  });
});

test('normalizeMixListResponse supports filters, meta and rail memberships', () => {
  const response = normalizeMixListResponse({
    items: [
      {
        id: 'mix-1',
        name: 'Ягодный караван',
        description: 'Описание',
        components: [
          {
            tobaccoId: 't-1',
            name: 'Berry Oasis',
            manufacturer: 'Nomad Reserve',
            flavors: ['малина'],
            proportion: 60,
            sortOrder: 0,
          },
        ],
        flavorProfiles: ['berry'],
        flavors: ['малина'],
        flavorTags: ['berry'],
        available: true,
        guestVisible: true,
        railMemberships: [
          {
            id: 'rail-1',
            name: 'Ягодный рейл',
            type: 'curated',
            active: true,
          },
        ],
      },
    ],
    filters: {
      search: 'ягода',
      status: 'guest-visible',
      railState: 'in-rails',
      manufacturers: ['Nomad Reserve'],
      options: {
        manufacturers: ['Nomad Reserve'],
        flavorProfiles: ['berry'],
        flavors: ['малина'],
        flavorTags: ['berry'],
      },
    },
    sort: {
      field: 'rails',
      direction: 'desc',
    },
    meta: {
      totalItems: 7,
      filteredItems: 1,
      guestVisibleCount: 1,
      hiddenCount: 0,
      blockedCount: 0,
      inRailsCount: 1,
      withoutRailsCount: 0,
      page: 1,
      pageSize: 25,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });

  assert.equal(response.items[0]?.railMemberships[0]?.name, 'Ягодный рейл');
  assert.equal(response.filters.status, 'guest-visible');
  assert.equal(response.filters.railState, 'in-rails');
  assert.equal(response.sort.field, 'rails');
  assert.equal(response.meta.inRailsCount, 1);
  assert.equal(response.meta.pageSize, 25);
});

test('buildMixRequestQuery serializes mix filters and sort', () => {
  const query = buildMixRequestQuery(
    {
      ...defaultMixListResponse.filters,
      search: 'ягода',
      status: 'guest-visible',
      railState: 'in-rails',
      manufacturers: ['Nomad Reserve'],
      flavors: ['малина'],
    },
    {
      field: 'rails',
      direction: 'desc',
    },
    2,
    50,
  );

  assert.equal(
    query,
    'search=%D1%8F%D0%B3%D0%BE%D0%B4%D0%B0&status=guest-visible&railState=in-rails&manufacturers=Nomad+Reserve&flavors=%D0%BC%D0%B0%D0%BB%D0%B8%D0%BD%D0%B0&sort=rails&direction=desc&page=2&pageSize=50',
  );
});

test('toggleMixFilterValue adds and removes option without duplicates', () => {
  assert.deepEqual(toggleMixFilterValue(['berry'], 'fresh'), ['berry', 'fresh']);
  assert.deepEqual(toggleMixFilterValue(['berry'], 'berry'), []);
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
    editable: true,
    readOnlyReason: '',
  });

  assert.equal(rail.id, 'rail-1');
  assert.equal(rail.active, false);
  assert.equal(rail.editable, true);
  assert.equal(rail.readOnlyReason, '');
  assert.deepEqual(rail.mixIds, ['mix-1']);
  assert.deepEqual(rail.mixes[0], {
    id: 'mix-1',
    name: 'Цитрусовый караван',
  });
});

test('normalizeRailRecord falls back to read-only semantics for statistical rails', () => {
  const rail = normalizeRailRecord({
    id: 'rail-statistical-top',
    name: 'Больше всего выбирают',
    type: 'statistical',
    description: 'Автоматическая витрина',
    active: true,
  });

  assert.equal(rail.editable, false);
  assert.equal(rail.readOnlyReason, 'Статистический рейл формируется автоматически и доступен только для просмотра.');
});

test('normalizeDashboardSummary supports nested inventory payload', () => {
  const summary = normalizeDashboardSummary({
    window: {
      key: '7d',
      label: '7 дней',
      days: 7,
      startsAt: '2026-03-22T00:00:00.000Z',
      endsAt: '2026-03-28T23:59:59.000Z',
    },
    inventory: {
      total: 6,
      inStockCount: 5,
      outOfStockCount: 1,
      manufacturers: [
        {
          key: 'Nomad Reserve',
          label: 'Nomad Reserve',
          total: 4,
          inStockCount: 3,
          outOfStockCount: 1,
        },
      ],
    },
    product: {
      smokeCtaTotal: 7,
      ratingsTotal: 2,
      avgGuestRating: 4,
      topMixes: [
        {
          mixId: 'mix-1',
          mixName: 'Цитрусовый караван',
          count: 3,
          avgRating: 4.8,
          ratingsCount: 2,
          popularity: 12,
        },
      ],
      topRatedMixes: [
        {
          mixId: 'mix-2',
          mixName: 'Ягодный рассвет',
          avgRating: 5,
          ratingsCount: 1,
          smokeCtaCount: 1,
          popularity: 10,
        },
      ],
      ratingDistribution: [
        { value: 5, count: 1 },
        { value: 4, count: 1 },
      ],
      activity: [
        { date: '2026-03-28T00:00:00.000Z', smokeCtaCount: 7, ratingsCount: 2 },
      ],
    },
    ops: {
      guestVisibleMixesCount: 8,
      hiddenMixesCount: 1,
      blockedByInventoryCount: 1,
      activeRailsCount: 4,
      emptyActiveRailsCount: 0,
      blockedMixes: [
        {
          mixId: 'mix-3',
          mixName: 'Персиковый мираж',
          missingComponents: ['Peach Silk'],
          railNames: ['Фруктовые открытия'],
          smokeCtaCount: 2,
        },
      ],
      railHealth: [
        {
          railId: 'rail-1',
          name: 'Больше всего выбирают',
          type: 'statistical',
          active: true,
          totalMixCount: 3,
          visibleMixCount: 3,
          hiddenMixCount: 0,
        },
      ],
    },
  });

  assert.deepEqual(summary, {
    window: {
      key: '7d',
      label: '7 дней',
      days: 7,
      startsAt: '2026-03-22T00:00:00.000Z',
      endsAt: '2026-03-28T23:59:59.000Z',
    },
    totalTobaccos: 6,
    inStockCount: 5,
    outOfStockCount: 1,
    smokeCtaTotal: 7,
    ratingsTotal: 2,
    avgGuestRating: 4,
    topMixes: [
      {
        mixId: 'mix-1',
        name: 'Цитрусовый караван',
        smokeCtaCount: 3,
        avgRating: 4.8,
        ratingsCount: 2,
        popularity: 12,
      },
    ],
    topRatedMixes: [
      {
        mixId: 'mix-2',
        name: 'Ягодный рассвет',
        smokeCtaCount: 1,
        avgRating: 5,
        ratingsCount: 1,
        popularity: 10,
      },
    ],
    ratingDistribution: [
      { value: 5, count: 1 },
      { value: 4, count: 1 },
    ],
    activity: [
      { date: '2026-03-28T00:00:00.000Z', smokeCtaCount: 7, ratingsCount: 2 },
    ],
    inventory: {
      totalTobaccos: 6,
      inStockCount: 5,
      outOfStockCount: 1,
      manufacturers: [
        {
          key: 'Nomad Reserve',
          label: 'Nomad Reserve',
          total: 4,
          inStockCount: 3,
          outOfStockCount: 1,
        },
      ],
      flavorProfiles: [],
      topFlavors: [],
    },
    ops: {
      guestVisibleMixesCount: 8,
      hiddenMixesCount: 1,
      blockedByInventoryCount: 1,
      activeRailsCount: 4,
      emptyActiveRailsCount: 0,
      blockedMixes: [
        {
          mixId: 'mix-3',
          name: 'Персиковый мираж',
          missingComponents: ['Peach Silk'],
          railNames: ['Фруктовые открытия'],
          smokeCtaCount: 2,
        },
      ],
      railHealth: [
        {
          railId: 'rail-1',
          name: 'Больше всего выбирают',
          type: 'statistical',
          active: true,
          totalMixCount: 3,
          visibleMixCount: 3,
          hiddenMixCount: 0,
        },
      ],
    },
  });
});

test('dashboardWindowOptions keep supported dashboard windows in order', () => {
  assert.deepEqual(dashboardWindowOptions.map((item) => item.key), ['7d', '14d', '30d']);
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
    lastRequestAt: '2026-03-23T12:00:00.000Z',
    lastRequestChatId: '362223626',
    lastRequestOperatorId: 'telegram-operator-anna',
    lastRequestOperatorName: 'Анна',
    lastRequestPhone: '+79991234567',
    lastRequestCodeId: 'daily-code-default',
    lastRequestCodeValue: 'NOMAD-2026',
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
    lastRequestAt: '2026-03-23T12:00:00.000Z',
    lastRequestChatId: '362223626',
    lastRequestOperatorId: 'telegram-operator-anna',
    lastRequestOperatorName: 'Анна',
    lastRequestPhone: '+79991234567',
    lastRequestCodeId: 'daily-code-default',
    lastRequestCodeValue: 'NOMAD-2026',
    lastErrorAt: '2026-03-23T10:21:00.000Z',
    lastErrorMessage: 'Telegram request timeout',
    updatedAt: '2026-03-23T10:21:00.000Z',
  });
});

test('normalizeTelegramOperatorRecord reads linked chat and request status', () => {
  const record = normalizeTelegramOperatorRecord({
    id: 'telegram-operator-anna',
    name: 'Анна',
    phone: '+79991234567',
    active: true,
    linkedChatId: '362223626',
    linkedTelegramUserId: '998877',
    linkedUsername: 'anna_nomad',
    linkedDisplayName: 'Анна Nomad',
    linkedAt: '2026-03-23T11:00:00.000Z',
    lastCodeRequestedAt: '2026-03-23T12:00:00.000Z',
  });

  assert.deepEqual(record, {
    id: 'telegram-operator-anna',
    name: 'Анна',
    phone: '+79991234567',
    active: true,
    linkedChatId: '362223626',
    linkedTelegramUserId: '998877',
    linkedUsername: 'anna_nomad',
    linkedDisplayName: 'Анна Nomad',
    linkedAt: '2026-03-23T11:00:00.000Z',
    lastCodeRequestedAt: '2026-03-23T12:00:00.000Z',
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

test('sortTelegramOperators keeps linked active operators first', () => {
  const sorted = sortTelegramOperators([
    {
      id: 'telegram-operator-2',
      name: 'Илья',
      phone: '+79997654321',
      active: true,
      linkedChatId: '',
      linkedTelegramUserId: '',
      linkedUsername: '',
      linkedDisplayName: '',
      linkedAt: '',
      lastCodeRequestedAt: '',
    },
    {
      id: 'telegram-operator-1',
      name: 'Анна',
      phone: '+79991234567',
      active: true,
      linkedChatId: '362223626',
      linkedTelegramUserId: '998877',
      linkedUsername: 'anna_nomad',
      linkedDisplayName: 'Анна Nomad',
      linkedAt: '2026-03-23T11:00:00.000Z',
      lastCodeRequestedAt: '2026-03-23T12:00:00.000Z',
    },
    {
      id: 'telegram-operator-3',
      name: 'Олег',
      phone: '+79990001122',
      active: false,
      linkedChatId: '',
      linkedTelegramUserId: '',
      linkedUsername: '',
      linkedDisplayName: '',
      linkedAt: '',
      lastCodeRequestedAt: '',
    },
  ]);

  assert.deepEqual(sorted.map((item) => item.id), ['telegram-operator-1', 'telegram-operator-2', 'telegram-operator-3']);
});

test('date helpers roundtrip local input', () => {
  const input = '2026-03-23T10:15';
  const iso = parseDateTimeLocalInput(input);

  assert.equal(typeof iso, 'string');
  assert.ok(iso.endsWith('Z'));
  assert.equal(formatDateTimeLocalInput(iso), input);
});
