import crypto from 'node:crypto';
import { config } from './config';
import { prisma } from './db';

export type StaffRole = 'admin' | 'master';

export type StaffUser = {
  login: string;
  name: string;
  role: StaffRole;
};

type TokenPayload = {
  login: string;
  name: string;
  role: StaffRole;
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

const verifySecret = (secret: string, hash: string, salt: string) => {
  const expected = Buffer.from(hash, 'hex');
  const received = Buffer.from(hashSecret(secret, salt), 'hex');
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

export const createSecretHash = (secret: string, salt: string) => hashSecret(secret, salt);

export const createStaffToken = (user: StaffUser) => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + config.tokenTtlHours * 60 * 60;
  const payload: TokenPayload = {
    login: user.login,
    name: user.name,
    role: user.role,
    issuedAt,
    expiresAt,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

export const verifyStaffToken = (token: string): StaffUser | null => {
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
    if (!payload.login || !payload.role || payload.expiresAt <= now) {
      return null;
    }

    return {
      login: payload.login,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
};

export const resolveStaffUser = async (login: string, password: string): Promise<StaffUser | null> => {
  const account = await prisma.staffAccount.findUnique({
    where: { login },
    select: {
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

  if (!verifySecret(password, account.passwordHash, account.passwordSalt)) {
    return null;
  }

  return {
    login: account.login,
    name: account.name,
    role: account.role,
  };
};

export const resolveStaffSession = async (token: string): Promise<StaffUser | null> => {
  const claims = verifyStaffToken(token);
  if (!claims) {
    return null;
  }

  const account = await prisma.staffAccount.findUnique({
    where: { login: claims.login },
    select: {
      login: true,
      name: true,
      role: true,
      active: true,
    },
  });

  if (!account || !account.active || !isStaffRole(account.role) || account.role !== claims.role) {
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

  const matched = codes.find((item) => verifySecret(code, item.codeHash, item.codeSalt));
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
