import crypto from 'node:crypto';
import { config } from './config';

export type StaffRole = 'admin' | 'nomad';

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

const sign = (value: string) =>
  crypto.createHmac('sha256', config.tokenSecret).update(value).digest('base64url');

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

export const resolveStaffUser = (login: string, password: string): StaffUser | null => {
  if (login === config.adminLogin && password === config.adminPassword) {
    return {
      login: config.adminLogin,
      name: 'Admin',
      role: 'admin',
    };
  }

  if (login === config.nomadLogin && password === config.nomadPassword) {
    return {
      login: config.nomadLogin,
      name: config.staffDisplayName,
      role: 'nomad',
    };
  }

  return null;
};
