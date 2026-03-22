import Fastify from 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import {
  createStaffToken,
  resolveStaffUser,
  verifyStaffToken,
} from './auth';
import { getOnboardingOptions, getRecommendations } from './recommendations';
import {
  getInventorySummary,
  getInventoryTobaccos,
  getSmokeCtaSummary,
  getAvailableMixCatalog,
  recordSmokeCtaEvent,
  updateTobaccoInStock,
} from './state';
import type {
  ApiError,
  GuestAccessSuccess,
  OnboardingRecommendationsResponse,
  StaffAuthResponse,
} from './types';

export const buildApp = () => {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: true,
  });

  app.get('/meta', async () => ({
    appName: config.appName,
    mode: 'phase-3',
    scope: [
      'guest-access',
      'staff-auth',
      'guest-onboarding',
      'recommendations',
      'guest-events',
      'inventory',
      'dashboard',
    ],
    endpoints: {
      guestVerify: 'POST /guest/access-code/verify',
      onboardingOptions: 'GET /guest/onboarding/options',
      onboardingRecommendations: 'POST /guest/onboarding/recommendations',
      smokeCtaEvent: 'POST /guest/events/smoke-cta',
      inventoryList: 'GET /staff/inventory/tobaccos',
      inventoryUpdate: 'PATCH /staff/inventory/tobaccos/:id',
      dashboardSummary: 'GET /staff/dashboard/summary',
      staffLogin: 'POST /staff/auth/login',
      staffMe: 'GET /staff/auth/me',
    },
  }));

  app.get('/health', async () => ({
    status: 'ok',
    service: config.appName,
  }));

  app.post('/guest/access-code/verify', async (request, reply) => {
    const body = request.body as { code?: string } | undefined;
    const code = body?.code?.trim();

    if (!code) {
      return reply.status(400).send({ error: 'Code is required' } satisfies ApiError);
    }

    if (code !== config.guestAccessCode) {
      return reply.status(401).send({ error: 'Invalid access code' } satisfies ApiError);
    }

    const response: GuestAccessSuccess = {
      ok: true,
      accessGranted: true,
      message: 'Доступ подтвержден. Можно переходить к знакомству и онбордингу.',
      issuedAt: new Date().toISOString(),
      nextStep: 'intro',
    };

    return reply.send(response);
  });

  app.get('/guest/onboarding/options', async () => {
    return getOnboardingOptions();
  });

  app.post('/guest/onboarding/recommendations', async (request, reply) => {
    const body = request.body as
      | { likedProfiles?: string[]; likedFlavors?: string[]; limit?: number }
      | undefined;

    const likedProfiles = Array.isArray(body?.likedProfiles) ? body!.likedProfiles : [];
    const likedFlavors = Array.isArray(body?.likedFlavors) ? body!.likedFlavors : [];
    const limit = body?.limit;

    if (!likedProfiles.length && !likedFlavors.length) {
      return reply.status(400).send({
        error: 'Choose at least one flavor profile or flavor',
      } satisfies ApiError);
    }

    const response: OnboardingRecommendationsResponse = {
      onboarding: {
        likedProfiles,
        likedFlavors,
      },
      items: getRecommendations({
        likedProfiles,
        likedFlavors,
        limit,
      }),
    };

    return reply.send(response);
  });

  app.post('/guest/events/smoke-cta', async (request, reply) => {
    const body = request.body as { mixId?: string } | undefined;
    const mixId = body?.mixId?.trim();

    if (!mixId) {
      return reply.status(400).send({ error: 'Mix id is required' } satisfies ApiError);
    }

    const mix = getAvailableMixCatalog().find((item) => item.id === mixId);
    if (!mix) {
      return reply.status(404).send({ error: 'Mix not found' } satisfies ApiError);
    }

    const event = recordSmokeCtaEvent(mixId);
    return reply.status(201).send({
      ok: true,
      recordedAt: event.createdAt,
      mixId,
      mixName: mix.name,
    });
  });

  app.post('/staff/auth/login', async (request, reply) => {
    const body = request.body as { login?: string; password?: string } | undefined;
    const login = body?.login?.trim();
    const password = body?.password?.trim();

    if (!login || !password) {
      return reply.status(400).send({ error: 'Login and password are required' } satisfies ApiError);
    }

    const user = resolveStaffUser(login, password);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' } satisfies ApiError);
    }

    const response: StaffAuthResponse = {
      accessToken: createStaffToken(user),
      tokenType: 'Bearer',
      user,
    };

    return reply.send(response);
  });

  app.get('/staff/inventory/tobaccos', async (request, reply) => {
    const user = authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    return reply.send({
      items: getInventoryTobaccos(),
    });
  });

  app.patch('/staff/inventory/tobaccos/:id', async (request, reply) => {
    const user = authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const tobaccoId = (request.params as { id?: string }).id?.trim();
    const body = request.body as { inStock?: boolean } | undefined;

    if (!tobaccoId) {
      return reply.status(400).send({ error: 'Tobacco id is required' } satisfies ApiError);
    }

    if (typeof body?.inStock !== 'boolean') {
      return reply.status(400).send({ error: 'inStock must be boolean' } satisfies ApiError);
    }

    const updated = updateTobaccoInStock(tobaccoId, body.inStock);
    if (!updated) {
      return reply.status(404).send({ error: 'Tobacco not found' } satisfies ApiError);
    }

    return reply.send(updated);
  });

  app.get('/staff/dashboard/summary', async (request, reply) => {
    const user = authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const inventory = getInventorySummary();
    const smoke = getSmokeCtaSummary();

    return reply.send({
      inventory,
      smokeCtaTotal: smoke.smokeCtaTotal,
      topMixes: smoke.topMixes,
    });
  });

  app.get('/staff/auth/me', async (request, reply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing bearer token' } satisfies ApiError);
    }

    const token = header.slice('Bearer '.length).trim();
    const user = verifyStaffToken(token);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid or expired token' } satisfies ApiError);
    }

    return reply.send({ user });
  });

  return app;
};

const authenticateStaffRequest = (request: FastifyRequest, reply: FastifyReply) => {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Missing bearer token' } satisfies ApiError);
    return null;
  }

  const token = header.slice('Bearer '.length).trim();
  const user = verifyStaffToken(token);
  if (!user) {
    reply.status(401).send({ error: 'Invalid or expired token' } satisfies ApiError);
    return null;
  }

  return user;
};
