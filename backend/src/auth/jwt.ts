import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export type AuthTokenPayload = {
  sub: string;
};

export const signAccessToken = (payload: AuthTokenPayload) => {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const expiresIn = config.jwtExpiresIn as SignOptions['expiresIn'];

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn,
  });
};

export const verifyAccessToken = (token: string) => {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
};
