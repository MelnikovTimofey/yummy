import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { config } from './config';
import { prisma } from './db';

export type StaffRole = 'admin' | 'master';

export type StaffUser = {
  login: string;
  name: string;
  role: StaffRole;
};

// Какую учётку и какую её версию токен представляет: по id, а не по логину —
// пересозданная учётка с тем же логином чужие токены не принимает (#407).
export type StaffSession = {
  accountId: string;
  tokenVersion: number;
};

type TokenPayload = {
  login: string;
  name: string;
  role: StaffRole;
  sub: string;
  ver: number;
  issuedAt: number;
  expiresAt: number;
};

const base64UrlEncode = (value: string) =>
  Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const base64UrlDecode = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8');
};

const sign = (value: string) => crypto.createHmac('sha256', config.tokenSecret).update(value).digest('base64url');

const hashSecret = (secret: string, salt: string) => crypto.scryptSync(secret, salt, 64).toString('hex');

const isStaffRole = (value: string): value is StaffRole => value === 'admin' || value === 'master';

const scrypt = promisify(crypto.scrypt) as (secret: string, salt: string, keylen: number) => Promise<Buffer>;

// Проверка идёт на публичных входах: синхронный scrypt блокировал бы весь API на время перебора.
const verifySecret = async (secret: string, hash: string, salt: string) => {
  const expected = Buffer.from(hash, 'hex');
  const received = await scrypt(secret, salt, 64);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

export const secretsEqual = (received: string | undefined, expected: string) => {
  const digest = (value: string) => crypto.createHash('sha256').update(value).digest();
  return received !== undefined && crypto.timingSafeEqual(digest(received), digest(expected));
};

export const createSecretHash = (secret: string, salt: string) => hashSecret(secret, salt);

export const createStaffToken = (user: StaffUser, session: StaffSession) => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + config.tokenTtlHours * 60 * 60;
  const payload: TokenPayload = {
    login: user.login,
    name: user.name,
    role: user.role,
    sub: session.accountId,
    ver: session.tokenVersion,
    issuedAt,
    expiresAt,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

const verifyStaffToken = (token: string): (StaffUser & StaffSession) | null => {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.login || !payload.role || !payload.sub || !Number.isInteger(payload.ver) || payload.expiresAt <= now) {
      return null;
    }

    return {
      login: payload.login,
      name: payload.name,
      role: payload.role,
      accountId: payload.sub,
      tokenVersion: payload.ver,
    };
  } catch {
    return null;
  }
};

// Токен гостя кабинета (#239): та же подпись, что у staff, но свой kind —
// staff-токен без kind гостевым не считается, гостевой без login/role — staff.
type GuestTokenPayload = {
  kind: 'guest';
  guestId: string;
  expiresAt: number;
};

export const createGuestToken = (guestId: string, ttlDays = config.guestTokenTtlDays) => {
  const payload: GuestTokenPayload = {
    kind: 'guest',
    guestId,
    expiresAt: Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return { token: `${encodedPayload}.${sign(encodedPayload)}`, expiresAt: new Date(payload.expiresAt * 1000) };
};

export const verifyGuestToken = (token: string): string | null => {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = Buffer.from(sign(encodedPayload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<GuestTokenPayload>;
    if (payload.kind !== 'guest' || !payload.guestId || !payload.expiresAt || payload.expiresAt <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload.guestId;
  } catch {
    return null;
  }
};

// Доступ по коду дня (#435): анонимный, без учётки — только срок. Свой kind,
// чтобы токен кабинета или staff доступом не считался.
type GuestAccessTokenPayload = {
  kind: 'access';
  expiresAt: number;
};

export const GUEST_ACCESS_HEADER = 'x-atelier-access';

export const createGuestAccessToken = (ttlHours = config.guestAccessTtlHours) => {
  const payload: GuestAccessTokenPayload = {
    kind: 'access',
    expiresAt: Math.floor(Date.now() / 1000) + ttlHours * 60 * 60,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return { token: `${encodedPayload}.${sign(encodedPayload)}`, expiresAt: new Date(payload.expiresAt * 1000) };
};

export const verifyGuestAccessToken = (token: string) => {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return false;
  }

  const expected = Buffer.from(sign(encodedPayload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<GuestAccessTokenPayload>;
    return payload.kind === 'access' && typeof payload.expiresAt === 'number' && payload.expiresAt > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
};

export const resolveStaffUser = async (
  login: string,
  password: string,
): Promise<{ user: StaffUser; session: StaffSession } | null> => {
  const account = await prisma.staffAccount.findUnique({
    where: { login },
    select: {
      id: true,
      tokenVersion: true,
      login: true,
      passwordHash: true,
      passwordSalt: true,
      name: true,
      role: true,
      active: true,
    },
  });

  if (!account || !account.active || !isStaffRole(account.role)) {
    return null;
  }

  if (!(await verifySecret(password, account.passwordHash, account.passwordSalt))) {
    return null;
  }

  return {
    user: { login: account.login, name: account.name, role: account.role },
    session: { accountId: account.id, tokenVersion: account.tokenVersion },
  };
};

export const resolveStaffSession = async (token: string): Promise<StaffUser | null> => {
  const claims = verifyStaffToken(token);
  if (!claims) {
    return null;
  }

  const account = await prisma.staffAccount.findUnique({
    where: { id: claims.accountId },
    select: {
      login: true,
      name: true,
      role: true,
      active: true,
      tokenVersion: true,
    },
  });

  if (
    !account ||
    !account.active ||
    !isStaffRole(account.role) ||
    account.role !== claims.role ||
    account.tokenVersion !== claims.tokenVersion
  ) {
    return null;
  }

  return {
    login: account.login,
    name: account.name,
    role: account.role,
  };
};

export const verifyGuestAccessCode = async (code: string) => {
  const now = new Date();
  const codes = await prisma.dailyAccessCode.findMany({
    where: {
      active: true,
      startsAt: {
        lte: now,
      },
      endsAt: {
        gt: now,
      },
    },
    orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      codeHash: true,
      codeSalt: true,
      codeLabel: true,
      startsAt: true,
      endsAt: true,
    },
  });

  let matched: (typeof codes)[number] | undefined;
  for (const item of codes) {
    if (await verifySecret(code, item.codeHash, item.codeSalt)) {
      matched = item;
      break;
    }
  }
  if (!matched) {
    return null;
  }

  return {
    id: matched.id,
    codeLabel: matched.codeLabel,
    startsAt: matched.startsAt,
    endsAt: matched.endsAt,
  };
};
