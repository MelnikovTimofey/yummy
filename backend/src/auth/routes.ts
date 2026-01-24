import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { config } from '../config';
import { generateToken, hashToken } from './token';
import { sendMail } from './mailer';
import { signAccessToken } from './jwt';

const magicLinkRequestSchema = z.object({
  email: z.string().email(),
});

const magicLinkVerifySchema = z.object({
  token: z.string().min(10),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const buildMagicLink = (token: string) => {
  return `${config.appDeepLinkScheme}?token=${encodeURIComponent(token)}`;
};

export const registerAuthRoutes = async (app: FastifyInstance) => {
  app.post(
    '/auth/magic-link',
    {
      config: {
        rateLimit: {
          max: config.rateLimitMax,
          timeWindow: config.rateLimitWindowMs,
          keyGenerator: (request: { body?: { email?: string }; ip: string }) => {
            const email = request.body?.email?.toLowerCase();
            return email ? `${request.ip}:${email}` : request.ip;
          },
        },
      },
    },
    async (request, reply) => {
    const parseResult = magicLinkRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid email' });
    }

    const { email } = parseResult.data;

    const user = await prisma.user.upsert({
      where: { email },
      create: { email },
      update: {},
    });

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(
      Date.now() + config.magicLinkTtlMinutes * 60 * 1000,
    );

    await prisma.magicLinkToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const link = buildMagicLink(token);
    const subject = 'Your Yummy sign-in link';
    const text = [
      'Use this link to sign in to Yummy:',
      link,
      '',
      `This link expires in ${config.magicLinkTtlMinutes} minutes.`,
    ].join('\n');

    await sendMail({
      to: email,
      subject,
      text,
    });

    return reply.send({ ok: true });
    },
  );

  app.post('/auth/verify', async (request, reply) => {
    const parseResult = magicLinkVerifySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid token' });
    }

    const { token } = parseResult.data;
    const tokenHash = hashToken(token);

    const record = await prisma.magicLinkToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!record) {
      return reply.status(400).send({ error: 'Token expired or invalid' });
    }

    await prisma.magicLinkToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    const accessToken = signAccessToken({ sub: record.userId });
    const refreshToken = generateToken();
    const refreshTokenHash = hashToken(refreshToken);
    const refreshExpiresAt = new Date(
      Date.now() + config.refreshSessionTtlDays * 24 * 60 * 60 * 1000,
    );

    await prisma.refreshSession.create({
      data: {
        userId: record.userId,
        tokenHash: refreshTokenHash,
        expiresAt: refreshExpiresAt,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
      },
    });

    return reply.send({
      accessToken,
      refreshToken,
      user: {
        id: record.user.id,
        email: record.user.email,
      },
    });
  });

  app.post('/auth/refresh', async (request, reply) => {
    const parseResult = refreshSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid refresh token' });
    }

    const tokenHash = hashToken(parseResult.data.refreshToken);
    const session = await prisma.refreshSession.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      return reply.status(401).send({ error: 'Refresh token expired or invalid' });
    }

    await prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const newRefreshToken = generateToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const newRefreshExpiresAt = new Date(
      Date.now() + config.refreshSessionTtlDays * 24 * 60 * 60 * 1000,
    );

    await prisma.refreshSession.create({
      data: {
        userId: session.userId,
        tokenHash: newRefreshTokenHash,
        expiresAt: newRefreshExpiresAt,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
      },
    });

    const accessToken = signAccessToken({ sub: session.userId });

    return reply.send({
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    });
  });
};
