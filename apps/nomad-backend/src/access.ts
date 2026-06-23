import crypto from 'node:crypto';
import { createSecretHash, type StaffRole } from './auth';
import { prisma } from './db';
import { createNomadDailyCodeValue, getNomadDailyCodeWindow } from './daily-code';
import { ensureNomadState } from './state';

export type DailyAccessCodeView = {
  id: string;
  codeValue: string;
  codeLabel: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffAccountView = {
  id: string;
  login: string;
  name: string;
  role: StaffRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TelegramRecipientScope = 'allowed' | 'broadcast' | 'rotate';

export type TelegramRecipientView = {
  id: string;
  chatId: string;
  label: string;
  scope: TelegramRecipientScope;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TelegramOperatorView = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  linkedChatId: string | null;
  linkedTelegramUserId: string | null;
  linkedUsername: string | null;
  linkedDisplayName: string | null;
  linkedAt: string | null;
  lastCodeRequestedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TelegramAutomationHealth = 'unknown' | 'healthy' | 'stale' | 'error';

export type TelegramAutomationStateView = {
  id: string;
  health: TelegramAutomationHealth;
  lastHeartbeatAt: string | null;
  lastRotateAt: string | null;
  lastRotateCodeId: string | null;
  lastRotateCodeValue: string | null;
  lastBroadcastAt: string | null;
  lastBroadcastCodeId: string | null;
  lastBroadcastCodeValue: string | null;
  lastBroadcastDayKey: string | null;
  lastRequestAt: string | null;
  lastRequestChatId: string | null;
  lastRequestOperatorId: string | null;
  lastRequestOperatorName: string | null;
  lastRequestPhone: string | null;
  lastRequestCodeId: string | null;
  lastRequestCodeValue: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  updatedAt: string | null;
};

export type TelegramAutomationReportEvent = 'heartbeat' | 'broadcast' | 'rotate' | 'request' | 'error';

type TelegramAutomationReportInput = {
  event: TelegramAutomationReportEvent;
  codeId?: string;
  codeValue?: string;
  dayKey?: string;
  chatId?: string;
  message?: string;
};

type DailyAccessCodeInput = {
  codeValue: string;
  codeLabel?: string;
  active?: boolean;
  startsAt?: Date;
  endsAt?: Date;
};

type DailyAccessCodePatch = Partial<DailyAccessCodeInput>;

type StaffAccountInput = {
  login: string;
  name: string;
  role: string;
  password: string;
  active?: boolean;
};

type StaffAccountPatch = Partial<StaffAccountInput>;

type TelegramRecipientInput = {
  chatId: string;
  label?: string;
  scope: string;
  active?: boolean;
};

type TelegramRecipientPatch = Partial<TelegramRecipientInput>;

type TelegramOperatorInput = {
  name: string;
  phone: string;
  active?: boolean;
};

type TelegramOperatorPatch = Partial<TelegramOperatorInput> & {
  clearLink?: boolean;
};

type TelegramOperatorLinkInput = {
  phone: string;
  chatId: string;
  telegramUserId?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
};

const normalizeDateRange = (startsAt?: Date, endsAt?: Date) => {
  const currentWindow = getNomadDailyCodeWindow();
  const nextStartsAt = startsAt ?? currentWindow.startsAt;
  const nextEndsAt = endsAt ?? currentWindow.endsAt;

  if (!(nextStartsAt instanceof Date) || Number.isNaN(nextStartsAt.getTime())) {
    return { error: 'startsAt must be a valid ISO date' };
  }

  if (!(nextEndsAt instanceof Date) || Number.isNaN(nextEndsAt.getTime())) {
    return { error: 'endsAt must be a valid ISO date' };
  }

  if (nextEndsAt <= nextStartsAt) {
    return { error: 'endsAt must be later than startsAt' };
  }

  return {
    startsAt: nextStartsAt,
    endsAt: nextEndsAt,
  };
};

const normalizeRole = (value: string | undefined): StaffRole | null => {
  if (value === 'admin' || value === 'master') {
    return value;
  }

  return null;
};

const normalizeTelegramRecipientScope = (value: string | undefined): TelegramRecipientScope | null => {
  if (value === 'allowed' || value === 'broadcast' || value === 'rotate') {
    return value;
  }

  return null;
};

const normalizeChatId = (value: string | undefined) => {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    return '';
  }

  return /^-?\d+$/.test(normalized) ? normalized : '';
};

const normalizePhone = (value: string | undefined) => {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    return '';
  }

  const digits = normalized.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (digits.length === 10) {
    return `+7${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('8')) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.length === 11 && digits.startsWith('7')) {
    return `+${digits}`;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }

  return '';
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'item';

const nextPrefixedId = async (prefix: string, countQuery: () => Promise<number>) => {
  const total = await countQuery();
  return `${prefix}-${total + 1}`;
};

const mapDailyAccessCode = (record: {
  id: string;
  codeValue: string;
  codeLabel: string;
  active: boolean;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): DailyAccessCodeView => ({
  id: record.id,
  codeValue: record.codeValue,
  codeLabel: record.codeLabel,
  active: record.active,
  startsAt: record.startsAt.toISOString(),
  endsAt: record.endsAt.toISOString(),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const mapStaffAccount = (record: {
  id: string;
  login: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): StaffAccountView => ({
  id: record.id,
  login: record.login,
  name: record.name,
  role: normalizeRole(record.role) ?? 'master',
  active: record.active,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const mapTelegramRecipient = (record: {
  id: string;
  chatId: string;
  label: string;
  scope: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TelegramRecipientView => ({
  id: record.id,
  chatId: record.chatId,
  label: record.label,
  scope: normalizeTelegramRecipientScope(record.scope) ?? 'allowed',
  active: record.active,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const mapTelegramOperator = (record: {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  linkedChatId: string | null;
  linkedTelegramUserId: string | null;
  linkedUsername: string | null;
  linkedDisplayName: string | null;
  linkedAt: Date | null;
  lastCodeRequestedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): TelegramOperatorView => ({
  id: record.id,
  name: record.name,
  phone: record.phone,
  active: record.active,
  linkedChatId: record.linkedChatId,
  linkedTelegramUserId: record.linkedTelegramUserId,
  linkedUsername: record.linkedUsername,
  linkedDisplayName: record.linkedDisplayName,
  linkedAt: toIsoOrNull(record.linkedAt),
  lastCodeRequestedAt: toIsoOrNull(record.lastCodeRequestedAt),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const isUniqueConstraintError = (error: unknown) =>
  Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002');

const dailyCodeWindowFilter = (window = getNomadDailyCodeWindow()) => ({
  active: true,
  startsAt: {
    lt: window.endsAt,
  },
  endsAt: {
    gt: window.startsAt,
  },
});

const createAutomationSecret = (value: string) => {
  const salt = crypto.randomUUID();
  return {
    salt,
    hash: createSecretHash(value, salt),
  };
};

const TELEGRAM_AUTOMATION_STATE_ID = 'telegram-bot-status';
const HEARTBEAT_STALE_MS = 5 * 60_000;

const toIsoOrNull = (value?: Date | null) => (value instanceof Date ? value.toISOString() : null);

const resolveTelegramAutomationHealth = (
  record: {
    lastHeartbeatAt?: Date | null;
    lastErrorAt?: Date | null;
  } | null,
  now = new Date(),
): TelegramAutomationHealth => {
  const lastHeartbeatAt = record?.lastHeartbeatAt ?? null;
  const lastErrorAt = record?.lastErrorAt ?? null;

  if (lastErrorAt && (!lastHeartbeatAt || lastErrorAt.getTime() >= lastHeartbeatAt.getTime())) {
    return 'error';
  }

  if (!lastHeartbeatAt) {
    return 'unknown';
  }

  return now.getTime() - lastHeartbeatAt.getTime() > HEARTBEAT_STALE_MS ? 'stale' : 'healthy';
};

const mapTelegramAutomationState = (
  record: {
    id: string;
    lastHeartbeatAt: Date | null;
    lastRotateAt: Date | null;
    lastRotateCodeId: string | null;
    lastRotateCodeValue: string | null;
    lastBroadcastAt: Date | null;
    lastBroadcastCodeId: string | null;
    lastBroadcastCodeValue: string | null;
    lastBroadcastDayKey: string | null;
    lastRequestAt: Date | null;
    lastRequestChatId: string | null;
    lastRequestOperatorId: string | null;
    lastRequestOperatorName: string | null;
    lastRequestPhone: string | null;
    lastRequestCodeId: string | null;
    lastRequestCodeValue: string | null;
    lastErrorAt: Date | null;
    lastErrorMessage: string | null;
    updatedAt: Date;
  } | null,
  now = new Date(),
): TelegramAutomationStateView => {
  if (!record) {
    return {
      id: TELEGRAM_AUTOMATION_STATE_ID,
      health: 'unknown',
      lastHeartbeatAt: null,
      lastRotateAt: null,
      lastRotateCodeId: null,
      lastRotateCodeValue: null,
      lastBroadcastAt: null,
      lastBroadcastCodeId: null,
      lastBroadcastCodeValue: null,
      lastBroadcastDayKey: null,
      lastRequestAt: null,
      lastRequestChatId: null,
      lastRequestOperatorId: null,
      lastRequestOperatorName: null,
      lastRequestPhone: null,
      lastRequestCodeId: null,
      lastRequestCodeValue: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      updatedAt: null,
    };
  }

  return {
    id: record.id,
    health: resolveTelegramAutomationHealth(record, now),
    lastHeartbeatAt: toIsoOrNull(record.lastHeartbeatAt),
    lastRotateAt: toIsoOrNull(record.lastRotateAt),
    lastRotateCodeId: record.lastRotateCodeId,
    lastRotateCodeValue: record.lastRotateCodeValue,
    lastBroadcastAt: toIsoOrNull(record.lastBroadcastAt),
    lastBroadcastCodeId: record.lastBroadcastCodeId,
    lastBroadcastCodeValue: record.lastBroadcastCodeValue,
    lastBroadcastDayKey: record.lastBroadcastDayKey,
    lastRequestAt: toIsoOrNull(record.lastRequestAt),
    lastRequestChatId: record.lastRequestChatId,
    lastRequestOperatorId: record.lastRequestOperatorId,
    lastRequestOperatorName: record.lastRequestOperatorName,
    lastRequestPhone: record.lastRequestPhone,
    lastRequestCodeId: record.lastRequestCodeId,
    lastRequestCodeValue: record.lastRequestCodeValue,
    lastErrorAt: toIsoOrNull(record.lastErrorAt),
    lastErrorMessage: record.lastErrorMessage,
    updatedAt: record.updatedAt.toISOString(),
  };
};

export const listDailyAccessCodes = async () => {
  await ensureNomadState();

  const records = await prisma.dailyAccessCode.findMany({
    orderBy: [
      { startsAt: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return records.map(mapDailyAccessCode);
};

export const getDailyAccessCodeById = async (id: string) => {
  await ensureNomadState();

  const record = await prisma.dailyAccessCode.findUnique({
    where: { id },
  });

  return record ? mapDailyAccessCode(record) : null;
};

export const createDailyAccessCode = async (payload: Partial<DailyAccessCodeInput>) => {
  await ensureNomadState();

  const codeValue = payload.codeValue?.trim();
  const codeLabel = payload.codeLabel?.trim() || codeValue;
  const active = typeof payload.active === 'boolean' ? payload.active : true;

  if (!codeValue) {
    return { error: 'codeValue is required' };
  }

  if (!codeLabel) {
    return { error: 'codeLabel is required' };
  }

  const dateRange = normalizeDateRange(payload.startsAt, payload.endsAt);
  if ('error' in dateRange) {
    return { error: dateRange.error };
  }

  const prefix = `daily-code-${slugify(codeLabel)}`;
  const id = await nextPrefixedId(prefix, () =>
    prisma.dailyAccessCode.count({
      where: {
        id: {
          startsWith: prefix,
        },
      },
    }),
  );

  try {
    const created = await prisma.dailyAccessCode.create({
      data: {
        id,
        codeValue,
        codeHash: createSecretHash(codeValue, `seed:${id}`),
        codeSalt: `seed:${id}`,
        codeLabel,
        active,
        startsAt: dateRange.startsAt,
        endsAt: dateRange.endsAt,
      },
    });

    return mapDailyAccessCode(created);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: 'Daily code already exists' };
    }

    throw error;
  }
};

export const updateDailyAccessCode = async (id: string, payload: DailyAccessCodePatch) => {
  await ensureNomadState();

  const current = await prisma.dailyAccessCode.findUnique({
    where: { id },
  });

  if (!current) {
    return null;
  }

  const codeValue = typeof payload.codeValue === 'string' ? payload.codeValue.trim() : current.codeValue;
  const codeLabel = typeof payload.codeLabel === 'string' ? payload.codeLabel.trim() : current.codeLabel;
  const dateRange = normalizeDateRange(payload.startsAt ?? current.startsAt, payload.endsAt ?? current.endsAt);

  if ('error' in dateRange) {
    return { error: dateRange.error };
  }

  if (!codeValue || !codeLabel) {
    return { error: 'codeValue and codeLabel are required' };
  }

  try {
    const updated = await prisma.dailyAccessCode.update({
      where: { id },
      data: {
        codeValue,
        codeHash: createSecretHash(codeValue, current.codeSalt),
        codeLabel,
        active: typeof payload.active === 'boolean' ? payload.active : current.active,
        startsAt: dateRange.startsAt,
        endsAt: dateRange.endsAt,
      },
    });

    return mapDailyAccessCode(updated);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: 'Daily code already exists' };
    }

    throw error;
  }
};

export const deleteDailyAccessCode = async (id: string) => {
  await ensureNomadState();

  const current = await prisma.dailyAccessCode.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!current) {
    return false;
  }

  await prisma.dailyAccessCode.delete({
    where: { id },
  });

  return true;
};

export const getCurrentDailyAccessCode = async () => {
  await ensureNomadState();

  const window = getNomadDailyCodeWindow();
  const records = await prisma.dailyAccessCode.findMany({
    where: dailyCodeWindowFilter(window),
    orderBy: [{ createdAt: 'desc' }, { updatedAt: 'desc' }],
  });

  return records[0] ? mapDailyAccessCode(records[0]) : null;
};

export const ensureCurrentDailyAccessCode = async () => {
  await ensureNomadState();

  const window = getNomadDailyCodeWindow();
  const records = await prisma.dailyAccessCode.findMany({
    where: dailyCodeWindowFilter(window),
    orderBy: [{ createdAt: 'desc' }, { updatedAt: 'desc' }],
  });

  if (records[0]) {
    if (records.length > 1) {
      await prisma.dailyAccessCode.updateMany({
        where: {
          id: {
            in: records.slice(1).map((record) => record.id),
          },
        },
        data: {
          active: false,
        },
      });
    }

    return {
      dailyCode: mapDailyAccessCode(records[0]),
      state: 'existing' as const,
      window,
    };
  }

  const codeValue = createNomadDailyCodeValue(window.startsAt);
  const secret = createAutomationSecret(codeValue);
  const created = await prisma.dailyAccessCode.create({
    data: {
      id: `daily-code-${codeValue.toLowerCase()}`,
      codeValue,
      codeLabel: 'Автоматический daily code',
      codeHash: secret.hash,
      codeSalt: secret.salt,
      active: true,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
    },
  });

  return {
    dailyCode: mapDailyAccessCode(created),
    state: 'created' as const,
    window,
  };
};

export const rotateCurrentDailyAccessCode = async () => {
  await ensureNomadState();

  const window = getNomadDailyCodeWindow();

  return prisma.$transaction(async (tx) => {
    const records = await tx.dailyAccessCode.findMany({
      where: dailyCodeWindowFilter(window),
      orderBy: [{ createdAt: 'desc' }, { updatedAt: 'desc' }],
    });

    if (records.length) {
      await tx.dailyAccessCode.updateMany({
        where: {
          id: {
            in: records.map((record) => record.id),
          },
        },
        data: {
          active: false,
        },
      });
    }

    const codeValue = createNomadDailyCodeValue(window.startsAt);
    const secret = createAutomationSecret(codeValue);
    const created = await tx.dailyAccessCode.create({
      data: {
        id: `daily-code-${codeValue.toLowerCase()}`,
        codeValue,
        codeHash: secret.hash,
        codeSalt: secret.salt,
        codeLabel: 'Автоматический daily code',
        active: true,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
      },
    });

    return {
      dailyCode: mapDailyAccessCode(created),
      state: 'rotated' as const,
      window,
    };
  });
};

export const listStaffAccounts = async () => {
  await ensureNomadState();

  const records = await prisma.staffAccount.findMany({
    orderBy: [
      { active: 'desc' },
      { role: 'asc' },
      { login: 'asc' },
    ],
  });

  return records.map(mapStaffAccount);
};

export const getStaffAccountById = async (id: string) => {
  await ensureNomadState();

  const record = await prisma.staffAccount.findUnique({
    where: { id },
  });

  return record ? mapStaffAccount(record) : null;
};

export const createStaffAccount = async (payload: Partial<StaffAccountInput>) => {
  await ensureNomadState();

  const login = payload.login?.trim();
  const name = payload.name?.trim();
  const role = normalizeRole(payload.role);
  const password = payload.password?.trim();
  const active = typeof payload.active === 'boolean' ? payload.active : true;

  if (!login || !name || !role || !password) {
    return { error: 'login, name, role and password are required' };
  }

  const prefix = `staff-${slugify(login)}`;
  const id = await nextPrefixedId(prefix, () =>
    prisma.staffAccount.count({
      where: {
        id: {
          startsWith: prefix,
        },
      },
    }),
  );

  try {
    const created = await prisma.staffAccount.create({
      data: {
        id,
        login,
        name,
        role,
        active,
        passwordSalt: `seed:${id}`,
        passwordHash: createSecretHash(password, `seed:${id}`),
      },
    });

    return mapStaffAccount(created);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: 'Login already exists' };
    }

    throw error;
  }
};

export const updateStaffAccount = async (id: string, payload: StaffAccountPatch) => {
  await ensureNomadState();

  const current = await prisma.staffAccount.findUnique({
    where: { id },
  });

  if (!current) {
    return null;
  }

  const login = typeof payload.login === 'string' ? payload.login.trim() : current.login;
  const name = typeof payload.name === 'string' ? payload.name.trim() : current.name;
  const requestedRole = typeof payload.role === 'string' ? normalizeRole(payload.role) : null;
  const role = typeof payload.role === 'string' && !requestedRole ? null : requestedRole ?? normalizeRole(current.role);
  const password = typeof payload.password === 'string' ? payload.password.trim() : '';

  if (!login || !name) {
    return { error: 'login and name are required' };
  }

  if (!role) {
    return { error: 'role must be admin or nomad' };
  }

  const passwordSalt = password ? `seed:${id}:password:${Date.now()}` : current.passwordSalt;

  try {
    const updated = await prisma.staffAccount.update({
      where: { id },
      data: {
        login,
        name,
        role,
        active: typeof payload.active === 'boolean' ? payload.active : current.active,
        ...(password
          ? {
              passwordSalt,
              passwordHash: createSecretHash(password, passwordSalt),
            }
          : {}),
      },
    });

    return mapStaffAccount(updated);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: 'Login already exists' };
    }

    throw error;
  }
};

export const deleteStaffAccount = async (id: string) => {
  await ensureNomadState();

  const current = await prisma.staffAccount.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!current) {
    return false;
  }

  await prisma.staffAccount.delete({
    where: { id },
  });

  return true;
};

export const listTelegramRecipients = async () => {
  await ensureNomadState();

  const records = await prisma.telegramRecipient.findMany({
    orderBy: [{ scope: 'asc' }, { active: 'desc' }, { chatId: 'asc' }],
  });

  return records.map(mapTelegramRecipient);
};

export const getTelegramRecipientById = async (id: string) => {
  await ensureNomadState();

  const record = await prisma.telegramRecipient.findUnique({
    where: { id },
  });

  return record ? mapTelegramRecipient(record) : null;
};

export const listActiveTelegramRecipients = async () => {
  await ensureNomadState();

  const records = await prisma.telegramRecipient.findMany({
    where: {
      active: true,
    },
    orderBy: [{ scope: 'asc' }, { chatId: 'asc' }],
  });

  return records.map(mapTelegramRecipient);
};

export const createTelegramRecipient = async (payload: Partial<TelegramRecipientInput>) => {
  await ensureNomadState();

  const chatId = normalizeChatId(payload.chatId);
  const scope = normalizeTelegramRecipientScope(payload.scope);
  const label = payload.label?.trim() || (chatId ? `Чат ${chatId}` : '');
  const active = typeof payload.active === 'boolean' ? payload.active : true;

  if (!chatId || !scope) {
    return { error: 'chatId and scope are required' };
  }

  const prefix = `telegram-${scope}-${slugify(chatId)}`;
  const id = await nextPrefixedId(prefix, () =>
    prisma.telegramRecipient.count({
      where: {
        id: {
          startsWith: prefix,
        },
      },
    }),
  );

  try {
    const created = await prisma.telegramRecipient.create({
      data: {
        id,
        chatId,
        label,
        scope,
        active,
      },
    });

    return mapTelegramRecipient(created);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: 'Telegram recipient already exists for this scope' };
    }

    throw error;
  }
};

export const updateTelegramRecipient = async (id: string, payload: TelegramRecipientPatch) => {
  await ensureNomadState();

  const current = await prisma.telegramRecipient.findUnique({
    where: { id },
  });

  if (!current) {
    return null;
  }

  const chatId = typeof payload.chatId === 'string' ? normalizeChatId(payload.chatId) : current.chatId;
  const requestedScope = typeof payload.scope === 'string' ? normalizeTelegramRecipientScope(payload.scope) : null;
  const scope = typeof payload.scope === 'string' && !requestedScope
    ? null
    : requestedScope ?? normalizeTelegramRecipientScope(current.scope);
  const label = typeof payload.label === 'string' ? payload.label.trim() || `Чат ${chatId}` : current.label;

  if (!chatId || !scope) {
    return { error: 'chatId and scope are required' };
  }

  try {
    const updated = await prisma.telegramRecipient.update({
      where: { id },
      data: {
        chatId,
        label,
        scope,
        active: typeof payload.active === 'boolean' ? payload.active : current.active,
      },
    });

    return mapTelegramRecipient(updated);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: 'Telegram recipient already exists for this scope' };
    }

    throw error;
  }
};

export const deleteTelegramRecipient = async (id: string) => {
  await ensureNomadState();

  const current = await prisma.telegramRecipient.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!current) {
    return false;
  }

  await prisma.telegramRecipient.delete({
    where: { id },
  });

  return true;
};

export const listTelegramOperators = async () => {
  await ensureNomadState();

  const records = await prisma.telegramOperator.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }, { phone: 'asc' }],
  });

  return records.map(mapTelegramOperator);
};

export const getTelegramOperatorById = async (id: string) => {
  await ensureNomadState();

  const record = await prisma.telegramOperator.findUnique({
    where: { id },
  });

  return record ? mapTelegramOperator(record) : null;
};

export const getLinkedTelegramOperatorByChatId = async (chatIdValue: string) => {
  await ensureNomadState();

  const chatId = normalizeChatId(chatIdValue);
  if (!chatId) {
    return null;
  }

  const record = await prisma.telegramOperator.findFirst({
    where: {
      linkedChatId: chatId,
      active: true,
    },
  });

  return record ? mapTelegramOperator(record) : null;
};

export const createTelegramOperator = async (payload: Partial<TelegramOperatorInput>) => {
  await ensureNomadState();

  const name = payload.name?.trim();
  const phone = normalizePhone(payload.phone);
  const active = typeof payload.active === 'boolean' ? payload.active : true;

  if (!name || !phone) {
    return { error: 'name and phone are required' };
  }

  const prefix = `telegram-operator-${slugify(name)}`;
  const id = await nextPrefixedId(prefix, () =>
    prisma.telegramOperator.count({
      where: {
        id: {
          startsWith: prefix,
        },
      },
    }),
  );

  try {
    const created = await prisma.telegramOperator.create({
      data: {
        id,
        name,
        phone,
        active,
      },
    });

    return mapTelegramOperator(created);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: 'Telegram operator already exists' };
    }

    throw error;
  }
};

export const updateTelegramOperator = async (id: string, payload: TelegramOperatorPatch) => {
  await ensureNomadState();

  const current = await prisma.telegramOperator.findUnique({
    where: { id },
  });

  if (!current) {
    return null;
  }

  const name = typeof payload.name === 'string' ? payload.name.trim() : current.name;
  const nextPhone = typeof payload.phone === 'string' ? normalizePhone(payload.phone) : current.phone;
  const active = typeof payload.active === 'boolean' ? payload.active : current.active;
  const clearLink = payload.clearLink === true || nextPhone !== current.phone;

  if (!name || !nextPhone) {
    return { error: 'name and phone are required' };
  }

  try {
    const updated = await prisma.telegramOperator.update({
      where: { id },
      data: {
        name,
        phone: nextPhone,
        active,
        ...(clearLink
          ? {
              linkedChatId: null,
              linkedTelegramUserId: null,
              linkedUsername: null,
              linkedDisplayName: null,
              linkedAt: null,
            }
          : {}),
      },
    });

    return mapTelegramOperator(updated);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: 'Telegram operator already exists' };
    }

    throw error;
  }
};

export const deleteTelegramOperator = async (id: string) => {
  await ensureNomadState();

  const current = await prisma.telegramOperator.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!current) {
    return false;
  }

  await prisma.telegramOperator.delete({
    where: { id },
  });

  return true;
};

export const linkTelegramOperator = async (payload: Partial<TelegramOperatorLinkInput>) => {
  await ensureNomadState();

  const phone = normalizePhone(payload.phone);
  const chatId = normalizeChatId(payload.chatId);
  const telegramUserId = normalizeChatId(payload.telegramUserId);
  const username = payload.username?.trim() || null;
  const displayName =
    [payload.firstName?.trim(), payload.lastName?.trim()]
      .filter(Boolean)
      .join(' ')
      .trim() || username;

  if (!phone || !chatId) {
    return { error: 'phone and chatId are required' };
  }

  const operator = await prisma.telegramOperator.findUnique({
    where: {
      phone,
    },
  });

  if (!operator || !operator.active) {
    return null;
  }

  const linked = await prisma.$transaction(async (tx) => {
    await tx.telegramOperator.updateMany({
      where: {
        linkedChatId: chatId,
        NOT: {
          id: operator.id,
        },
      },
      data: {
        linkedChatId: null,
        linkedTelegramUserId: null,
        linkedUsername: null,
        linkedDisplayName: null,
        linkedAt: null,
      },
    });

    return tx.telegramOperator.update({
      where: {
        id: operator.id,
      },
      data: {
        linkedChatId: chatId,
        linkedTelegramUserId: telegramUserId || null,
        linkedUsername: username,
        linkedDisplayName: displayName || operator.name,
        linkedAt: new Date(),
      },
    });
  });

  return mapTelegramOperator(linked);
};

export const getTelegramAutomationState = async () => {
  await ensureNomadState();

  const record = await prisma.telegramAutomationState.findUnique({
    where: {
      id: TELEGRAM_AUTOMATION_STATE_ID,
    },
  });

  return mapTelegramAutomationState(record);
};

export const reportTelegramAutomationState = async (payload: Partial<TelegramAutomationReportInput>) => {
  await ensureNomadState();

  const event = payload.event;
  if (event !== 'heartbeat' && event !== 'broadcast' && event !== 'rotate' && event !== 'request' && event !== 'error') {
    return { error: 'event must be heartbeat, broadcast, rotate, request or error' };
  }

  const now = new Date();
  const data: Record<string, Date | string | null> = {};
  let requestOperator:
    | {
        id: string;
        name: string;
        phone: string;
      }
    | null = null;

  if (event === 'heartbeat' || event === 'broadcast' || event === 'rotate' || event === 'request') {
    data.lastHeartbeatAt = now;
  }

  if (event === 'broadcast') {
    data.lastBroadcastAt = now;
    data.lastBroadcastCodeId = payload.codeId?.trim() || null;
    data.lastBroadcastCodeValue = payload.codeValue?.trim() || null;
    data.lastBroadcastDayKey = payload.dayKey?.trim() || null;
  }

  if (event === 'rotate') {
    data.lastRotateAt = now;
    data.lastRotateCodeId = payload.codeId?.trim() || null;
    data.lastRotateCodeValue = payload.codeValue?.trim() || null;
  }

  if (event === 'request') {
    const chatId = normalizeChatId(payload.chatId);
    if (!chatId) {
      return { error: 'chatId is required for request event' };
    }

    const operator = await prisma.telegramOperator.findFirst({
      where: {
        linkedChatId: chatId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    if (!operator) {
      return { error: 'Linked telegram operator not found' };
    }

    requestOperator = operator;
    data.lastRequestAt = now;
    data.lastRequestChatId = chatId;
    data.lastRequestOperatorId = operator.id;
    data.lastRequestOperatorName = operator.name;
    data.lastRequestPhone = operator.phone;
    data.lastRequestCodeId = payload.codeId?.trim() || null;
    data.lastRequestCodeValue = payload.codeValue?.trim() || null;
  }

  if (event === 'error') {
    const message = payload.message?.trim();
    if (!message) {
      return { error: 'message is required for error event' };
    }

    data.lastErrorAt = now;
    data.lastErrorMessage = message;
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (event === 'request' && requestOperator) {
      await tx.telegramOperator.update({
        where: {
          id: requestOperator.id,
        },
        data: {
          lastCodeRequestedAt: now,
        },
      });
    }

    return tx.telegramAutomationState.upsert({
      where: {
        id: TELEGRAM_AUTOMATION_STATE_ID,
      },
      update: data,
      create: {
        id: TELEGRAM_AUTOMATION_STATE_ID,
        lastHeartbeatAt: event === 'heartbeat' || event === 'broadcast' || event === 'rotate' || event === 'request' ? now : null,
        lastRotateAt: event === 'rotate' ? now : null,
        lastRotateCodeId: event === 'rotate' ? payload.codeId?.trim() || null : null,
        lastRotateCodeValue: event === 'rotate' ? payload.codeValue?.trim() || null : null,
        lastBroadcastAt: event === 'broadcast' ? now : null,
        lastBroadcastCodeId: event === 'broadcast' ? payload.codeId?.trim() || null : null,
        lastBroadcastCodeValue: event === 'broadcast' ? payload.codeValue?.trim() || null : null,
        lastBroadcastDayKey: event === 'broadcast' ? payload.dayKey?.trim() || null : null,
        lastRequestAt: event === 'request' ? now : null,
        lastRequestChatId: event === 'request' ? payload.chatId?.trim() || null : null,
        lastRequestOperatorId: event === 'request' ? requestOperator?.id ?? null : null,
        lastRequestOperatorName: event === 'request' ? requestOperator?.name ?? null : null,
        lastRequestPhone: event === 'request' ? requestOperator?.phone ?? null : null,
        lastRequestCodeId: event === 'request' ? payload.codeId?.trim() || null : null,
        lastRequestCodeValue: event === 'request' ? payload.codeValue?.trim() || null : null,
        lastErrorAt: event === 'error' ? now : null,
        lastErrorMessage: event === 'error' ? payload.message?.trim() || null : null,
      },
    });
  });

  return mapTelegramAutomationState(updated, now);
};
