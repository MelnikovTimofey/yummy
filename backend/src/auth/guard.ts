import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from './jwt';

export type AuthUser = {
  id: string;
};

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = verifyAccessToken(token);
    request.user = { id: payload.sub };
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
};
