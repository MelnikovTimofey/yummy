import crypto from 'crypto';

const TOKEN_BYTES = 32;

export const generateToken = () => {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
};

export const hashToken = (token: string) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
