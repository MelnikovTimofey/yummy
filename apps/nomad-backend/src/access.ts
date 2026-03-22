import { createSecretHash, type StaffRole } from './auth';
import { prisma } from './db';
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

const createCurrentCodeWindow = () => {
  const now = new Date();
  const startsAt = new Date(now);
  startsAt.setHours(0, 0, 0, 0);

  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + 1);

  return {
    startsAt,
    endsAt,
  };
};

const normalizeDateRange = (startsAt?: Date, endsAt?: Date) => {
  const currentWindow = createCurrentCodeWindow();
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
  if (value === 'admin' || value === 'nomad') {
    return value;
  }

  return null;
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
  role: normalizeRole(record.role) ?? 'nomad',
  active: record.active,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const isUniqueConstraintError = (error: unknown) =>
  Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002');

export const listDailyAccessCodes = async () => {
  await ensureNomadState();

  const records = await prisma.nomadDailyAccessCode.findMany({
    orderBy: [
      { startsAt: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return records.map(mapDailyAccessCode);
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
    prisma.nomadDailyAccessCode.count({
      where: {
        id: {
          startsWith: prefix,
        },
      },
    }),
  );

  try {
    const created = await prisma.nomadDailyAccessCode.create({
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

  const current = await prisma.nomadDailyAccessCode.findUnique({
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
    const updated = await prisma.nomadDailyAccessCode.update({
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

  const current = await prisma.nomadDailyAccessCode.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!current) {
    return false;
  }

  await prisma.nomadDailyAccessCode.delete({
    where: { id },
  });

  return true;
};

export const listStaffAccounts = async () => {
  await ensureNomadState();

  const records = await prisma.nomadStaffAccount.findMany({
    orderBy: [
      { active: 'desc' },
      { role: 'asc' },
      { login: 'asc' },
    ],
  });

  return records.map(mapStaffAccount);
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
    prisma.nomadStaffAccount.count({
      where: {
        id: {
          startsWith: prefix,
        },
      },
    }),
  );

  try {
    const created = await prisma.nomadStaffAccount.create({
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

  const current = await prisma.nomadStaffAccount.findUnique({
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
    const updated = await prisma.nomadStaffAccount.update({
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

  const current = await prisma.nomadStaffAccount.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!current) {
    return false;
  }

  await prisma.nomadStaffAccount.delete({
    where: { id },
  });

  return true;
};
