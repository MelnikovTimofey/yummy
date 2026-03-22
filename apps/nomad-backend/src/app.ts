import Fastify from 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import {
  createStaffToken,
  resolveStaffUser,
  verifyGuestAccessCode,
  verifyStaffToken,
} from './auth';
import { getOnboardingOptions, getRecommendations } from './recommendations';
import {
  createMix,
  createRail,
  ensureNomadState,
  getInventorySummary,
  getInventoryTobaccos,
  getGuestCatalogMixes,
  getGuestHomeRails,
  getGuestIntroCards,
  getStaffMixes,
  getStaffRails,
  getSmokeCtaSummary,
  getAvailableMixCatalog,
  recordSmokeCtaEvent,
  rateMix,
  updateMix,
  updateTobaccoInStock,
  updateRail,
} from './state';
import type {
  ApiError,
  GuestAccessSuccess,
  GuestCatalogMixesResponse,
  GuestHomeRailsResponse,
  GuestIntroCardsResponse,
  GuestMixRatingResponse,
  OnboardingRecommendationsResponse,
  StaffAuthResponse,
  StaffMixMutationResponse,
  StaffMixesResponse,
  StaffRailMutationResponse,
  StaffRailsResponse,
} from './types';
import type { MixView, RailView } from './state';

export const buildApp = () => {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: true,
  });

  app.addHook('onReady', async () => {
    await ensureNomadState();
  });

  app.get('/meta', async () => ({
    appName: config.appName,
    mode: 'phase-4',
    scope: [
      'guest-access',
      'staff-auth',
      'guest-onboarding',
      'guest-intro',
      'guest-catalog',
      'guest-home',
      'recommendations',
      'guest-events',
      'guest-ratings',
      'inventory',
      'staff-mixes',
      'staff-rails',
      'dashboard',
    ],
    endpoints: {
      guestVerify: 'POST /guest/access-code/verify',
      onboardingOptions: 'GET /guest/onboarding/options',
      onboardingRecommendations: 'POST /guest/onboarding/recommendations',
      guestIntroCards: 'GET /guest/intro/cards',
      guestCatalogMixes: 'GET /guest/catalog/mixes',
      guestHomeRails: 'GET /guest/home/rails',
      guestMixRating: 'POST /guest/mixes/:id/rating',
      smokeCtaEvent: 'POST /guest/events/smoke-cta',
      inventoryList: 'GET /staff/inventory/tobaccos',
      inventoryUpdate: 'PATCH /staff/inventory/tobaccos/:id',
      dashboardSummary: 'GET /staff/dashboard/summary',
      staffMixesList: 'GET /staff/mixes',
      staffMixesCreate: 'POST /staff/mixes',
      staffMixesUpdate: 'PATCH /staff/mixes/:id',
      staffRailsList: 'GET /staff/rails',
      staffRailsCreate: 'POST /staff/rails',
      staffRailsUpdate: 'PATCH /staff/rails/:id',
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

    const dailyCode = await verifyGuestAccessCode(code);
    if (!dailyCode) {
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

  app.get('/guest/intro/cards', async () => {
    const response: GuestIntroCardsResponse = {
      items: await getGuestIntroCards(),
    };

    return response;
  });

  app.get('/guest/onboarding/options', async () => {
    return getOnboardingOptions();
  });

  app.get('/guest/catalog/mixes', async (request) => {
    const query = request.query as { profiles?: unknown; flavors?: unknown } | undefined;
    const profiles = readStringList(query?.profiles);
    const flavors = readStringList(query?.flavors);

    const response: GuestCatalogMixesResponse = {
      filters: {
        profiles,
        flavors,
      },
      items: await getGuestCatalogMixes({ profiles, flavors }),
    };

    return response;
  });

  app.get('/guest/home/rails', async () => {
    const response: GuestHomeRailsResponse = {
      items: await getGuestHomeRails(),
    };

    return response;
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
      items: await getRecommendations({
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

    const mix = (await getAvailableMixCatalog()).find((item) => item.id === mixId);
    if (!mix) {
      return reply.status(404).send({ error: 'Mix not found' } satisfies ApiError);
    }

    const event = await recordSmokeCtaEvent(mixId);
    return reply.status(201).send({
      ok: true,
      recordedAt: event.createdAt,
      mixId,
      mixName: mix.name,
    });
  });

  app.post('/guest/mixes/:id/rating', async (request, reply) => {
    const mixId = (request.params as { id?: string }).id?.trim();
    const body = request.body as { value?: unknown } | undefined;
    const value = typeof body?.value === 'number' ? body.value : Number.NaN;

    if (!mixId) {
      return reply.status(400).send({ error: 'Mix id is required' } satisfies ApiError);
    }

    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return reply.status(400).send({ error: 'Rating value must be between 1 and 5' } satisfies ApiError);
    }

    const rated = await rateMix(mixId, value);
    if (!rated) {
      return reply.status(404).send({ error: 'Mix not found' } satisfies ApiError);
    }

    if (isApiError(rated)) {
      return reply.status(400).send(rated);
    }

    const response: GuestMixRatingResponse = {
      item: rated,
      rating: {
        value,
        avgRating: rated.avgRating,
        ratingsCount: rated.ratingsCount,
      },
    };

    return reply.send(response);
  });

  app.post('/staff/auth/login', async (request, reply) => {
    const body = request.body as { login?: string; password?: string } | undefined;
    const login = body?.login?.trim();
    const password = body?.password?.trim();

    if (!login || !password) {
      return reply.status(400).send({ error: 'Login and password are required' } satisfies ApiError);
    }

    const user = await resolveStaffUser(login, password);
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

  app.get('/staff/mixes', async (request, reply) => {
    const user = authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const response: StaffMixesResponse = {
      items: await getStaffMixes(),
    };

    return reply.send(response);
  });

  app.post('/staff/mixes', async (request, reply) => {
    const user = authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const payload = request.body as
      | {
          name?: string;
          description?: string;
          componentIds?: string[];
          available?: boolean;
          popularity?: number;
          baseAvgRating?: number;
        }
      | undefined;

    const created = await createMix({
      name: payload?.name ?? '',
      description: payload?.description ?? '',
      componentIds: Array.isArray(payload?.componentIds) ? payload!.componentIds : [],
      available: payload?.available,
      popularity: payload?.popularity,
      baseAvgRating: payload?.baseAvgRating,
    });

    if (isApiError(created)) {
      return reply.status(400).send(created);
    }

    const response: StaffMixMutationResponse = {
      item: created as MixView,
    };

    return reply.status(201).send(response);
  });

  app.patch('/staff/mixes/:id', async (request, reply) => {
    const user = authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const mixId = (request.params as { id?: string }).id?.trim();
    const payload = request.body as
      | {
          name?: string;
          description?: string;
          componentIds?: string[];
          available?: boolean;
          popularity?: number;
          baseAvgRating?: number;
        }
      | undefined;

    if (!mixId) {
      return reply.status(400).send({ error: 'Mix id is required' } satisfies ApiError);
    }

    const updated = await updateMix(mixId, {
      name: payload?.name,
      description: payload?.description,
      componentIds: Array.isArray(payload?.componentIds) ? payload!.componentIds : undefined,
      available: payload?.available,
      popularity: payload?.popularity,
      baseAvgRating: payload?.baseAvgRating,
    });

    if (!updated) {
      return reply.status(404).send({ error: 'Mix not found' } satisfies ApiError);
    }

    if (isApiError(updated)) {
      return reply.status(400).send(updated);
    }

    const response: StaffMixMutationResponse = {
      item: updated as MixView,
    };

    return reply.send(response);
  });

  app.get('/staff/inventory/tobaccos', async (request, reply) => {
    const user = authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    return reply.send({
      items: await getInventoryTobaccos(),
    });
  });

  app.get('/staff/rails', async (request, reply) => {
    const user = authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const response: StaffRailsResponse = {
      items: await getStaffRails(),
    };

    return reply.send(response);
  });

  app.post('/staff/rails', async (request, reply) => {
    const user = authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const payload = request.body as
      | {
          name?: string;
          description?: string;
          type?: 'prepared' | 'curated' | 'statistical';
          mixIds?: string[];
          active?: boolean;
        }
      | undefined;

    const created = await createRail({
      name: payload?.name ?? '',
      description: payload?.description ?? '',
      type: payload?.type,
      mixIds: Array.isArray(payload?.mixIds) ? payload!.mixIds : [],
      active: payload?.active,
    });

    if (isApiError(created)) {
      return reply.status(400).send(created);
    }

    const response: StaffRailMutationResponse = {
      item: created as RailView,
    };

    return reply.status(201).send(response);
  });

  app.patch('/staff/rails/:id', async (request, reply) => {
    const user = authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const railId = (request.params as { id?: string }).id?.trim();
    const payload = request.body as
      | {
          name?: string;
          description?: string;
          type?: 'prepared' | 'curated' | 'statistical';
          mixIds?: string[];
          active?: boolean;
        }
      | undefined;

    if (!railId) {
      return reply.status(400).send({ error: 'Rail id is required' } satisfies ApiError);
    }

    const updated = await updateRail(railId, {
      name: payload?.name,
      description: payload?.description,
      type: payload?.type,
      mixIds: Array.isArray(payload?.mixIds) ? payload!.mixIds : undefined,
      active: payload?.active,
    });

    if (!updated) {
      return reply.status(404).send({ error: 'Rail not found' } satisfies ApiError);
    }

    if (isApiError(updated)) {
      return reply.status(400).send(updated);
    }

    const response: StaffRailMutationResponse = {
      item: updated as RailView,
    };

    return reply.send(response);
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

    const updated = await updateTobaccoInStock(tobaccoId, body.inStock);
    if (!updated) {
      return reply.status(404).send({ error: 'Tobacco not found' } satisfies ApiError);
    }

    return reply.send({ item: updated });
  });

  app.get('/staff/dashboard/summary', async (request, reply) => {
    const user = authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const inventory = await getInventorySummary();
    const smoke = await getSmokeCtaSummary();

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

const isApiError = (value: unknown): value is ApiError =>
  Boolean(value && typeof value === 'object' && 'error' in value && typeof (value as { error?: unknown }).error === 'string');

const readStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => readStringList(item));
  }

  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
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
