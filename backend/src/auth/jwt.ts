import jwt from 'jsonwebtoken';
import { config } from '../config';

export type AuthTokenPayload = {
  sub: string;
};

export const signAccessToken = (payload: AuthTokenPayload) => {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

export const verifyAccessToken = (token: string) => {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
};
