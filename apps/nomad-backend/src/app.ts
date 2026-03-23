import Fastify from 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import { getNomadDailyCodeWindow } from './daily-code';
import {
  createStaffToken,
  resolveStaffSession,
  resolveStaffUser,
  verifyGuestAccessCode,
} from './auth';
import {
  createDailyAccessCode,
  createStaffAccount,
  deleteDailyAccessCode,
  deleteStaffAccount,
  ensureCurrentDailyAccessCode,
  getCurrentDailyAccessCode,
  listDailyAccessCodes,
  listStaffAccounts,
  rotateCurrentDailyAccessCode,
  updateDailyAccessCode,
  updateStaffAccount,
} from './access';
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
  AutomationDailyCodeCurrentResponse,
  AutomationDailyCodeEnsureResponse,
  AutomationDailyCodeRotateResponse,
  GuestAccessSuccess,
  GuestCatalogMixesResponse,
  GuestHomeRailsResponse,
  GuestIntroCardsResponse,
  GuestMixRatingResponse,
  OnboardingRecommendationsResponse,
  StaffAccountMutationResponse,
  StaffAccountsResponse,
  StaffAuthResponse,
  StaffDailyAccessCodeMutationResponse,
  StaffDailyAccessCodesResponse,
  StaffMixMutationResponse,
  StaffMixesResponse,
  StaffRailMutationResponse,
  StaffRailsResponse,
} from './types';
import type { StaffRole } from './auth';
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
      'automation',
      'staff-access',
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
      automationCurrentDailyCode: 'GET /automation/daily-code/current',
      automationEnsureDailyCode: 'POST /automation/daily-code/ensure',
      automationRotateDailyCode: 'POST /automation/daily-code/rotate',
      inventoryList: 'GET /staff/inventory/tobaccos',
      inventoryUpdate: 'PATCH /staff/inventory/tobaccos/:id',
      dashboardSummary: 'GET /staff/dashboard/summary',
      dailyCodesList: 'GET /staff/access/daily-codes',
      dailyCodesCreate: 'POST /staff/access/daily-codes',
      dailyCodesUpdate: 'PATCH /staff/access/daily-codes/:id',
      dailyCodesDelete: 'DELETE /staff/access/daily-codes/:id',
      staffAccountsList: 'GET /staff/access/accounts',
      staffAccountsCreate: 'POST /staff/access/accounts',
      staffAccountsUpdate: 'PATCH /staff/access/accounts/:id',
      staffAccountsDelete: 'DELETE /staff/access/accounts/:id',
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

  app.get('/automation/daily-code/current', async (request, reply) => {
    if (!authenticateAutomationRequest(request, reply)) {
      return;
    }

    const window = getNomadDailyCodeWindow();
    const response: AutomationDailyCodeCurrentResponse = {
      item: await getCurrentDailyAccessCode(),
      window: {
        startsAt: window.startsAt.toISOString(),
        endsAt: window.endsAt.toISOString(),
      },
    };

    return reply.send(response);
  });

  app.post('/automation/daily-code/ensure', async (request, reply) => {
    if (!authenticateAutomationRequest(request, reply)) {
      return;
    }

    const result = await ensureCurrentDailyAccessCode();
    const response: AutomationDailyCodeEnsureResponse = {
      item: result.dailyCode,
      state: result.state,
      window: {
        startsAt: result.window.startsAt.toISOString(),
        endsAt: result.window.endsAt.toISOString(),
      },
    };

    return reply.send(response);
  });

  app.post('/automation/daily-code/rotate', async (request, reply) => {
    if (!authenticateAutomationRequest(request, reply)) {
      return;
    }

    const result = await rotateCurrentDailyAccessCode();
    const response: AutomationDailyCodeRotateResponse = {
      item: result.dailyCode,
      state: result.state,
      window: {
        startsAt: result.window.startsAt.toISOString(),
        endsAt: result.window.endsAt.toISOString(),
      },
    };

    return reply.send(response);
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

  app.get('/staff/access/daily-codes', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const response: StaffDailyAccessCodesResponse = {
      items: await listDailyAccessCodes(),
    };

    return reply.send(response);
  });

  app.post('/staff/access/daily-codes', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const payload = request.body as
      | {
          codeValue?: string;
          codeLabel?: string;
          active?: boolean;
          startsAt?: unknown;
          endsAt?: unknown;
        }
      | undefined;

    const startsAt = parseDateField(payload?.startsAt, 'startsAt');
    if (startsAt && 'error' in startsAt) {
      return reply.status(400).send(startsAt);
    }

    const endsAt = parseDateField(payload?.endsAt, 'endsAt');
    if (endsAt && 'error' in endsAt) {
      return reply.status(400).send(endsAt);
    }

    const created = await createDailyAccessCode({
      codeValue: payload?.codeValue ?? '',
      codeLabel: payload?.codeLabel,
      active: payload?.active,
      startsAt: startsAt && startsAt instanceof Date ? startsAt : undefined,
      endsAt: endsAt && endsAt instanceof Date ? endsAt : undefined,
    });

    if (isApiError(created)) {
      return reply.status(400).send(created);
    }

    const response: StaffDailyAccessCodeMutationResponse = {
      item: created as StaffDailyAccessCodeMutationResponse['item'],
    };

    return reply.status(201).send(response);
  });

  app.patch('/staff/access/daily-codes/:id', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const codeId = (request.params as { id?: string }).id?.trim();
    const payload = request.body as
      | {
          codeValue?: string;
          codeLabel?: string;
          active?: boolean;
          startsAt?: unknown;
          endsAt?: unknown;
        }
      | undefined;

    if (!codeId) {
      return reply.status(400).send({ error: 'Daily code id is required' } satisfies ApiError);
    }

    const startsAt = parseDateField(payload?.startsAt, 'startsAt');
    if (startsAt && 'error' in startsAt) {
      return reply.status(400).send(startsAt);
    }

    const endsAt = parseDateField(payload?.endsAt, 'endsAt');
    if (endsAt && 'error' in endsAt) {
      return reply.status(400).send(endsAt);
    }

    const updated = await updateDailyAccessCode(codeId, {
      codeValue: payload?.codeValue,
      codeLabel: payload?.codeLabel,
      active: payload?.active,
      startsAt: startsAt && startsAt instanceof Date ? startsAt : undefined,
      endsAt: endsAt && endsAt instanceof Date ? endsAt : undefined,
    });

    if (!updated) {
      return reply.status(404).send({ error: 'Daily code not found' } satisfies ApiError);
    }

    if (isApiError(updated)) {
      return reply.status(400).send(updated);
    }

    const response: StaffDailyAccessCodeMutationResponse = {
      item: updated as StaffDailyAccessCodeMutationResponse['item'],
    };

    return reply.send(response);
  });

  app.delete('/staff/access/daily-codes/:id', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const codeId = (request.params as { id?: string }).id?.trim();
    if (!codeId) {
      return reply.status(400).send({ error: 'Daily code id is required' } satisfies ApiError);
    }

    const deleted = await deleteDailyAccessCode(codeId);
    if (!deleted) {
      return reply.status(404).send({ error: 'Daily code not found' } satisfies ApiError);
    }

    return reply.status(204).send();
  });

  app.get('/staff/access/accounts', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply, ['admin']);
    if (!user) {
      return;
    }

    const response: StaffAccountsResponse = {
      items: await listStaffAccounts(),
    };

    return reply.send(response);
  });

  app.post('/staff/access/accounts', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply, ['admin']);
    if (!user) {
      return;
    }

    const payload = request.body as
      | {
          login?: string;
          name?: string;
          role?: string;
          password?: string;
          active?: boolean;
        }
      | undefined;

    const created = await createStaffAccount({
      login: payload?.login ?? '',
      name: payload?.name ?? '',
      role: payload?.role ?? '',
      password: payload?.password ?? '',
      active: payload?.active,
    });

    if (isApiError(created)) {
      return reply.status(400).send(created);
    }

    const response: StaffAccountMutationResponse = {
      item: created,
    };

    return reply.status(201).send(response);
  });

  app.patch('/staff/access/accounts/:id', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply, ['admin']);
    if (!user) {
      return;
    }

    const accountId = (request.params as { id?: string }).id?.trim();
    const payload = request.body as
      | {
          login?: string;
          name?: string;
          role?: string;
          password?: string;
          active?: boolean;
        }
      | undefined;

    if (!accountId) {
      return reply.status(400).send({ error: 'Staff account id is required' } satisfies ApiError);
    }

    const updated = await updateStaffAccount(accountId, {
      login: payload?.login,
      name: payload?.name,
      role: payload?.role,
      password: payload?.password,
      active: payload?.active,
    });

    if (!updated) {
      return reply.status(404).send({ error: 'Staff account not found' } satisfies ApiError);
    }

    if (isApiError(updated)) {
      return reply.status(400).send(updated);
    }

    const response: StaffAccountMutationResponse = {
      item: updated,
    };

    return reply.send(response);
  });

  app.delete('/staff/access/accounts/:id', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply, ['admin']);
    if (!user) {
      return;
    }

    const accountId = (request.params as { id?: string }).id?.trim();
    if (!accountId) {
      return reply.status(400).send({ error: 'Staff account id is required' } satisfies ApiError);
    }

    const deleted = await deleteStaffAccount(accountId);
    if (!deleted) {
      return reply.status(404).send({ error: 'Staff account not found' } satisfies ApiError);
    }

    return reply.status(204).send();
  });

  app.get('/staff/mixes', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const response: StaffMixesResponse = {
      items: await getStaffMixes(),
    };

    return reply.send(response);
  });

  app.post('/staff/mixes', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
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
    const user = await authenticateStaffRequest(request, reply);
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
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    return reply.send({
      items: await getInventoryTobaccos(),
    });
  });

  app.get('/staff/rails', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const response: StaffRailsResponse = {
      items: await getStaffRails(),
    };

    return reply.send(response);
  });

  app.post('/staff/rails', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
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
    const user = await authenticateStaffRequest(request, reply);
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
    const user = await authenticateStaffRequest(request, reply);
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
    const user = await authenticateStaffRequest(request, reply);
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
    const user = await resolveStaffSession(token);
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

const parseDateField = (value: unknown, fieldName: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return { error: `${fieldName} must be a valid ISO date` } satisfies ApiError;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { error: `${fieldName} must be a valid ISO date` } satisfies ApiError;
  }

  return parsed;
};

const authenticateStaffRequest = async (request: FastifyRequest, reply: FastifyReply, roles?: StaffRole[]) => {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Missing bearer token' } satisfies ApiError);
    return null;
  }

  const token = header.slice('Bearer '.length).trim();
  const user = await resolveStaffSession(token);
  if (!user) {
    reply.status(401).send({ error: 'Invalid or expired token' } satisfies ApiError);
    return null;
  }

  if (roles && roles.length && !roles.includes(user.role)) {
    reply.status(403).send({ error: 'Insufficient permissions' } satisfies ApiError);
    return null;
  }

  return user;
};

const AUTOMATION_HEADER = 'x-nomad-automation-key';

const authenticateAutomationRequest = (request: FastifyRequest, reply: FastifyReply) => {
  const header = request.headers[AUTOMATION_HEADER];
  const key = Array.isArray(header) ? header[0] : header;

  if (key !== config.automationKey) {
    reply.status(401).send({ error: 'Invalid automation key' } satisfies ApiError);
    return false;
  }

  return true;
};
