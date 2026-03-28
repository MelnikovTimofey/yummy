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
  createTelegramOperator,
  createTelegramRecipient,
  deleteDailyAccessCode,
  deleteStaffAccount,
  deleteTelegramOperator,
  deleteTelegramRecipient,
  ensureCurrentDailyAccessCode,
  getDailyAccessCodeById,
  getCurrentDailyAccessCode,
  getLinkedTelegramOperatorByChatId,
  getStaffAccountById,
  getTelegramAutomationState,
  getTelegramOperatorById,
  getTelegramRecipientById,
  listActiveTelegramRecipients,
  listDailyAccessCodes,
  listStaffAccounts,
  listTelegramOperators,
  listTelegramRecipients,
  linkTelegramOperator,
  reportTelegramAutomationState,
  rotateCurrentDailyAccessCode,
  updateDailyAccessCode,
  updateStaffAccount,
  updateTelegramOperator,
  updateTelegramRecipient,
} from './access';
import { getOnboardingOptions, getRecommendations } from './recommendations';
import { listAuditEvents, recordAuditEvent } from './audit';
import {
  batchUpdateTobaccoInStock,
  createMix,
  createRail,
  ensureNomadState,
  getDashboardSummary,
  getInventorySummary,
  getInventoryTobaccos,
  getTobaccoById,
  getGuestCatalogMixes,
  getGuestHomeRails,
  getGuestIntroCards,
  getStaffMixes,
  getStaffRails,
  getAvailableMixCatalog,
  type InventoryBatchAction,
  type MixRailFilter,
  type MixSortDirection,
  type MixSortField,
  type MixStatusFilter,
  type InventorySortDirection,
  type InventorySortField,
  type InventoryStockFilter,
  normalizeDashboardWindowKey,
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
  AutomationTelegramOperatorLinkResponse,
  AutomationTelegramOperatorResponse,
  AutomationTelegramRecipientsResponse,
  AutomationTelegramStateResponse,
  GuestAccessSuccess,
  GuestCatalogMixesResponse,
  GuestHomeRailsResponse,
  GuestIntroCardsResponse,
  GuestMixRatingResponse,
  OnboardingRecommendationsResponse,
  StaffAccountMutationResponse,
  StaffAccountsResponse,
  StaffAuthResponse,
  StaffInventoryBatchMutationResponse,
  StaffInventoryMutationResponse,
  StaffInventoryResponse,
  StaffDailyAccessCodeMutationResponse,
  StaffDailyAccessCodesResponse,
  StaffMixMutationResponse,
  StaffMixesResponse,
  StaffTelegramOperatorMutationResponse,
  StaffTelegramOperatorsResponse,
  StaffTelegramRecipientMutationResponse,
  StaffTelegramRecipientsResponse,
  StaffTelegramAutomationStateResponse,
  StaffAuditEventsResponse,
  StaffDashboardSummaryResponse,
  StaffRailMutationResponse,
  StaffRailsResponse,
} from './types';
import type { StaffRole } from './auth';
import type { MixView, RailView, StaffRailView } from './state';

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
    mode: 'phase-5',
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
      automationTelegramOperatorByChat: 'GET /automation/telegram/operators/by-chat/:chatId',
      automationTelegramOperatorLink: 'POST /automation/telegram/operators/link',
      automationTelegramRecipients: 'GET /automation/telegram/recipients',
      automationTelegramState: 'GET /automation/telegram/state',
      automationTelegramStateReport: 'POST /automation/telegram/state/report',
      inventoryList: 'GET /staff/inventory/tobaccos',
      inventoryBatch: 'POST /staff/inventory/tobaccos/batch',
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
      telegramRecipientsList: 'GET /staff/access/telegram-recipients',
      telegramRecipientsCreate: 'POST /staff/access/telegram-recipients',
      telegramRecipientsUpdate: 'PATCH /staff/access/telegram-recipients/:id',
      telegramRecipientsDelete: 'DELETE /staff/access/telegram-recipients/:id',
      telegramOperatorsList: 'GET /staff/access/telegram-operators',
      telegramOperatorsCreate: 'POST /staff/access/telegram-operators',
      telegramOperatorsUpdate: 'PATCH /staff/access/telegram-operators/:id',
      telegramOperatorsDelete: 'DELETE /staff/access/telegram-operators/:id',
      telegramAutomationState: 'GET /staff/access/telegram-automation-state',
      staffAuditEvents: 'GET /staff/audit/events',
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

  app.get('/automation/telegram/recipients', async (request, reply) => {
    if (!authenticateAutomationRequest(request, reply)) {
      return;
    }

    const items = await listActiveTelegramRecipients();
    const pickChatIds = (scope: 'allowed' | 'broadcast' | 'rotate') =>
      items
        .filter((item: { scope: string; chatId: string }) => item.scope === scope)
        .map((item: { scope: string; chatId: string }) => Number(item.chatId))
        .filter((item: number) => Number.isSafeInteger(item));

    const response: AutomationTelegramRecipientsResponse = {
      items,
      allowedChatIds: pickChatIds('allowed'),
      broadcastChatIds: pickChatIds('broadcast'),
      rotateChatIds: pickChatIds('rotate'),
    };

    return reply.send(response);
  });

  app.get('/automation/telegram/operators/by-chat/:chatId', async (request, reply) => {
    if (!authenticateAutomationRequest(request, reply)) {
      return;
    }

    const chatId = (request.params as { chatId?: string }).chatId?.trim();
    const response: AutomationTelegramOperatorResponse = {
      item: chatId ? await getLinkedTelegramOperatorByChatId(chatId) : null,
    };

    return reply.send(response);
  });

  app.post('/automation/telegram/operators/link', async (request, reply) => {
    if (!authenticateAutomationRequest(request, reply)) {
      return;
    }

    const payload = request.body as
      | {
          phone?: string;
          chatId?: string;
          telegramUserId?: string;
          username?: string;
          firstName?: string;
          lastName?: string;
        }
      | undefined;

    const linked = await linkTelegramOperator({
      phone: payload?.phone ?? '',
      chatId: payload?.chatId ?? '',
      telegramUserId: payload?.telegramUserId,
      username: payload?.username,
      firstName: payload?.firstName,
      lastName: payload?.lastName,
    });

    if (!linked) {
      return reply.status(404).send({ error: 'Telegram operator allowlist entry not found' } satisfies ApiError);
    }

    if (isApiError(linked)) {
      return reply.status(400).send(linked);
    }

    const response: AutomationTelegramOperatorLinkResponse = {
      item: linked,
    };

    return reply.send(response);
  });

  app.get('/automation/telegram/state', async (request, reply) => {
    if (!authenticateAutomationRequest(request, reply)) {
      return;
    }

    const response: AutomationTelegramStateResponse = {
      item: await getTelegramAutomationState(),
    };

    return reply.send(response);
  });

  app.post('/automation/telegram/state/report', async (request, reply) => {
    if (!authenticateAutomationRequest(request, reply)) {
      return;
    }

    const payload = request.body as
        | {
          event?: string;
          codeId?: string;
          codeValue?: string;
          dayKey?: string;
          chatId?: string;
          message?: string;
        }
      | undefined;

    const reported = await reportTelegramAutomationState({
      event: payload?.event as 'heartbeat' | 'broadcast' | 'rotate' | 'request' | 'error' | undefined,
      codeId: payload?.codeId,
      codeValue: payload?.codeValue,
      dayKey: payload?.dayKey,
      chatId: payload?.chatId,
      message: payload?.message,
    });

    if (isApiError(reported)) {
      return reply.status(400).send(reported);
    }

    const response: AutomationTelegramStateResponse = {
      item: reported,
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

    await recordAuditEvent({
      actor: user,
      action: 'create',
      entityType: 'daily-code',
      entityId: response.item.id,
      entityLabel: response.item.codeLabel || response.item.codeValue,
      details: {
        codeValue: response.item.codeValue,
        active: response.item.active,
        startsAt: response.item.startsAt,
        endsAt: response.item.endsAt,
      },
    });

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

    await recordAuditEvent({
      actor: user,
      action: 'update',
      entityType: 'daily-code',
      entityId: response.item.id,
      entityLabel: response.item.codeLabel || response.item.codeValue,
      details: {
        codeValue: response.item.codeValue,
        active: response.item.active,
        startsAt: response.item.startsAt,
        endsAt: response.item.endsAt,
      },
    });

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

    const current = await getDailyAccessCodeById(codeId);
    const deleted = await deleteDailyAccessCode(codeId);
    if (!deleted) {
      return reply.status(404).send({ error: 'Daily code not found' } satisfies ApiError);
    }

    await recordAuditEvent({
      actor: user,
      action: 'delete',
      entityType: 'daily-code',
      entityId: codeId,
      entityLabel: current?.codeLabel || current?.codeValue || codeId,
      details: {
        codeValue: current?.codeValue ?? '',
      },
    });

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

    await recordAuditEvent({
      actor: user,
      action: 'create',
      entityType: 'staff-account',
      entityId: response.item.id,
      entityLabel: response.item.login,
      details: {
        login: response.item.login,
        role: response.item.role,
        active: response.item.active,
      },
    });

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

    await recordAuditEvent({
      actor: user,
      action: 'update',
      entityType: 'staff-account',
      entityId: response.item.id,
      entityLabel: response.item.login,
      details: {
        login: response.item.login,
        role: response.item.role,
        active: response.item.active,
      },
    });

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

    const current = await getStaffAccountById(accountId);
    const deleted = await deleteStaffAccount(accountId);
    if (!deleted) {
      return reply.status(404).send({ error: 'Staff account not found' } satisfies ApiError);
    }

    await recordAuditEvent({
      actor: user,
      action: 'delete',
      entityType: 'staff-account',
      entityId: accountId,
      entityLabel: current?.login || accountId,
      details: {
        login: current?.login ?? '',
        role: current?.role ?? '',
      },
    });

    return reply.status(204).send();
  });

  app.get('/staff/access/telegram-recipients', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply, ['admin']);
    if (!user) {
      return;
    }

    const response: StaffTelegramRecipientsResponse = {
      items: await listTelegramRecipients(),
    };

    return reply.send(response);
  });

  app.post('/staff/access/telegram-recipients', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply, ['admin']);
    if (!user) {
      return;
    }

    const payload = request.body as
      | {
          chatId?: string;
          label?: string;
          scope?: string;
          active?: boolean;
        }
      | undefined;

    const created = await createTelegramRecipient({
      chatId: payload?.chatId ?? '',
      label: payload?.label,
      scope: payload?.scope ?? '',
      active: payload?.active,
    });

    if (isApiError(created)) {
      return reply.status(400).send(created);
    }

    const response: StaffTelegramRecipientMutationResponse = {
      item: created,
    };

    await recordAuditEvent({
      actor: user,
      action: 'create',
      entityType: 'telegram-recipient',
      entityId: response.item.id,
      entityLabel: response.item.label || response.item.chatId,
      details: {
        chatId: response.item.chatId,
        scope: response.item.scope,
        active: response.item.active,
      },
    });

    return reply.status(201).send(response);
  });

  app.patch('/staff/access/telegram-recipients/:id', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply, ['admin']);
    if (!user) {
      return;
    }

    const recipientId = (request.params as { id?: string }).id?.trim();
    const payload = request.body as
      | {
          chatId?: string;
          label?: string;
          scope?: string;
          active?: boolean;
        }
      | undefined;

    if (!recipientId) {
      return reply.status(400).send({ error: 'Telegram recipient id is required' } satisfies ApiError);
    }

    const updated = await updateTelegramRecipient(recipientId, {
      chatId: payload?.chatId,
      label: payload?.label,
      scope: payload?.scope,
      active: payload?.active,
    });

    if (!updated) {
      return reply.status(404).send({ error: 'Telegram recipient not found' } satisfies ApiError);
    }

    if (isApiError(updated)) {
      return reply.status(400).send(updated);
    }

    const response: StaffTelegramRecipientMutationResponse = {
      item: updated,
    };

    await recordAuditEvent({
      actor: user,
      action: 'update',
      entityType: 'telegram-recipient',
      entityId: response.item.id,
      entityLabel: response.item.label || response.item.chatId,
      details: {
        chatId: response.item.chatId,
        scope: response.item.scope,
        active: response.item.active,
      },
    });

    return reply.send(response);
  });

  app.delete('/staff/access/telegram-recipients/:id', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply, ['admin']);
    if (!user) {
      return;
    }

    const recipientId = (request.params as { id?: string }).id?.trim();
    if (!recipientId) {
      return reply.status(400).send({ error: 'Telegram recipient id is required' } satisfies ApiError);
    }

    const current = await getTelegramRecipientById(recipientId);
    const deleted = await deleteTelegramRecipient(recipientId);
    if (!deleted) {
      return reply.status(404).send({ error: 'Telegram recipient not found' } satisfies ApiError);
    }

    await recordAuditEvent({
      actor: user,
      action: 'delete',
      entityType: 'telegram-recipient',
      entityId: recipientId,
      entityLabel: current?.label || current?.chatId || recipientId,
      details: {
        chatId: current?.chatId ?? '',
        scope: current?.scope ?? '',
      },
    });

    return reply.status(204).send();
  });

  app.get('/staff/access/telegram-operators', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply, ['admin']);
    if (!user) {
      return;
    }

    const response: StaffTelegramOperatorsResponse = {
      items: await listTelegramOperators(),
    };

    return reply.send(response);
  });

  app.post('/staff/access/telegram-operators', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply, ['admin']);
    if (!user) {
      return;
    }

    const payload = request.body as
      | {
          name?: string;
          phone?: string;
          active?: boolean;
        }
      | undefined;

    const created = await createTelegramOperator({
      name: payload?.name ?? '',
      phone: payload?.phone ?? '',
      active: payload?.active,
    });

    if (isApiError(created)) {
      return reply.status(400).send(created);
    }

    const response: StaffTelegramOperatorMutationResponse = {
      item: created,
    };

    await recordAuditEvent({
      actor: user,
      action: 'create',
      entityType: 'telegram-operator',
      entityId: response.item.id,
      entityLabel: response.item.name || response.item.phone,
      details: {
        phone: response.item.phone,
        active: response.item.active,
      },
    });

    return reply.status(201).send(response);
  });

  app.patch('/staff/access/telegram-operators/:id', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply, ['admin']);
    if (!user) {
      return;
    }

    const operatorId = (request.params as { id?: string }).id?.trim();
    const payload = request.body as
      | {
          name?: string;
          phone?: string;
          active?: boolean;
          clearLink?: boolean;
        }
      | undefined;

    if (!operatorId) {
      return reply.status(400).send({ error: 'Telegram operator id is required' } satisfies ApiError);
    }

    const updated = await updateTelegramOperator(operatorId, {
      name: payload?.name,
      phone: payload?.phone,
      active: payload?.active,
      clearLink: payload?.clearLink,
    });

    if (!updated) {
      return reply.status(404).send({ error: 'Telegram operator not found' } satisfies ApiError);
    }

    if (isApiError(updated)) {
      return reply.status(400).send(updated);
    }

    const response: StaffTelegramOperatorMutationResponse = {
      item: updated,
    };

    await recordAuditEvent({
      actor: user,
      action: 'update',
      entityType: 'telegram-operator',
      entityId: response.item.id,
      entityLabel: response.item.name || response.item.phone,
      details: {
        phone: response.item.phone,
        active: response.item.active,
        linkedChatId: response.item.linkedChatId,
      },
    });

    return reply.send(response);
  });

  app.delete('/staff/access/telegram-operators/:id', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply, ['admin']);
    if (!user) {
      return;
    }

    const operatorId = (request.params as { id?: string }).id?.trim();
    if (!operatorId) {
      return reply.status(400).send({ error: 'Telegram operator id is required' } satisfies ApiError);
    }

    const current = await getTelegramOperatorById(operatorId);
    const deleted = await deleteTelegramOperator(operatorId);
    if (!deleted) {
      return reply.status(404).send({ error: 'Telegram operator not found' } satisfies ApiError);
    }

    await recordAuditEvent({
      actor: user,
      action: 'delete',
      entityType: 'telegram-operator',
      entityId: operatorId,
      entityLabel: current?.name || current?.phone || operatorId,
      details: {
        phone: current?.phone ?? '',
      },
    });

    return reply.status(204).send();
  });

  app.get('/staff/access/telegram-automation-state', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply, ['admin']);
    if (!user) {
      return;
    }

    const response: StaffTelegramAutomationStateResponse = {
      item: await getTelegramAutomationState(),
    };

    return reply.send(response);
  });

  app.get('/staff/audit/events', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply, ['admin']);
    if (!user) {
      return;
    }

    const limit = Math.max(
      1,
      Math.min(200, Number((request.query as { limit?: unknown } | undefined)?.limit ?? 40) || 40),
    );

    const response: StaffAuditEventsResponse = {
      items: await listAuditEvents(limit),
    };

    return reply.send(response);
  });

  app.get('/staff/mixes', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const query = request.query as
      | {
          search?: unknown;
          status?: unknown;
          railState?: unknown;
          manufacturers?: unknown;
          flavorProfiles?: unknown;
          flavors?: unknown;
          flavorTags?: unknown;
          sort?: unknown;
          direction?: unknown;
        }
      | undefined;

    const response: StaffMixesResponse = await getStaffMixes({
      search: typeof query?.search === 'string' ? query.search : undefined,
      status: (typeof query?.status === 'string' ? query.status : undefined) as MixStatusFilter | undefined,
      railState: (typeof query?.railState === 'string' ? query.railState : undefined) as MixRailFilter | undefined,
      manufacturers: Array.isArray(query?.manufacturers)
        ? query.manufacturers.filter((value): value is string => typeof value === 'string')
        : typeof query?.manufacturers === 'string'
          ? [query.manufacturers]
          : undefined,
      flavorProfiles: Array.isArray(query?.flavorProfiles)
        ? query.flavorProfiles.filter((value): value is string => typeof value === 'string')
        : typeof query?.flavorProfiles === 'string'
          ? [query.flavorProfiles]
          : undefined,
      flavors: Array.isArray(query?.flavors)
        ? query.flavors.filter((value): value is string => typeof value === 'string')
        : typeof query?.flavors === 'string'
          ? [query.flavors]
          : undefined,
      flavorTags: Array.isArray(query?.flavorTags)
        ? query.flavorTags.filter((value): value is string => typeof value === 'string')
        : typeof query?.flavorTags === 'string'
          ? [query.flavorTags]
          : undefined,
      sort: (typeof query?.sort === 'string' ? query.sort : undefined) as MixSortField | undefined,
      direction: (typeof query?.direction === 'string' ? query.direction : undefined) as MixSortDirection | undefined,
    });

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
          components?: Array<{
            tobaccoId?: string;
            proportion?: number;
            sortOrder?: number;
          }>;
          available?: boolean;
          popularity?: number;
          baseAvgRating?: number;
        }
      | undefined;

    const created = await createMix({
      name: payload?.name ?? '',
      description: payload?.description ?? '',
      componentIds: Array.isArray(payload?.componentIds) ? payload!.componentIds : [],
      components: Array.isArray(payload?.components) ? payload.components : undefined,
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

    await recordAuditEvent({
      actor: user,
      action: 'create',
      entityType: 'mix',
      entityId: response.item.id,
      entityLabel: response.item.name,
      details: {
        available: response.item.available,
        componentIds: response.item.componentIds,
      },
    });

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
          components?: Array<{
            tobaccoId?: string;
            proportion?: number;
            sortOrder?: number;
          }>;
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
      components: Array.isArray(payload?.components) ? payload.components : undefined,
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

    await recordAuditEvent({
      actor: user,
      action: 'update',
      entityType: 'mix',
      entityId: response.item.id,
      entityLabel: response.item.name,
      details: {
        available: response.item.available,
        componentIds: response.item.componentIds,
      },
    });

    return reply.send(response);
  });

  app.get('/staff/inventory/tobaccos', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const query = request.query as
      | {
          search?: unknown;
          stock?: unknown;
          manufacturers?: unknown;
          flavorProfiles?: unknown;
          flavors?: unknown;
          flavorTags?: unknown;
          sort?: unknown;
          direction?: unknown;
        }
      | undefined;

    const response: StaffInventoryResponse = await getInventoryTobaccos({
      search: typeof query?.search === 'string' ? query.search : '',
      stock: (typeof query?.stock === 'string' ? query.stock : undefined) as InventoryStockFilter | undefined,
      manufacturers: readStringList(query?.manufacturers),
      flavorProfiles: readStringList(query?.flavorProfiles),
      flavors: readStringList(query?.flavors),
      flavorTags: readStringList(query?.flavorTags),
      sort: (typeof query?.sort === 'string' ? query.sort : undefined) as InventorySortField | undefined,
      direction: (typeof query?.direction === 'string' ? query.direction : undefined) as InventorySortDirection | undefined,
    });

    return reply.send(response);
  });

  app.post('/staff/inventory/tobaccos/batch', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const body = request.body as { ids?: unknown; action?: unknown } | undefined;
    const ids = Array.isArray(body?.ids)
      ? body.ids.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
      : [];
    const action = typeof body?.action === 'string' ? body.action : '';

    if (!ids.length) {
      return reply.status(400).send({ error: 'At least one tobacco id is required' } satisfies ApiError);
    }

    if (action === 'archive') {
      return reply.status(409).send({
        error: 'Archive/delete for inventory needs a separate product-approved contract',
      } satisfies ApiError);
    }

    if (action !== 'set-in-stock' && action !== 'set-out-of-stock') {
      return reply.status(400).send({ error: 'Unsupported batch action' } satisfies ApiError);
    }

    const currentItems = await Promise.all(ids.map(async (id) => [id, await getTobaccoById(id)] as const));
    const currentMap = new Map(currentItems);
    const result = await batchUpdateTobaccoInStock(ids, action as Exclude<InventoryBatchAction, 'archive'>);
    const response: StaffInventoryBatchMutationResponse = result;

    await Promise.all(
      response.items.map((item) =>
        recordAuditEvent({
          actor: user,
          action: 'toggle',
          entityType: 'inventory',
          entityId: item.id,
          entityLabel: `${item.manufacturer} · ${item.name}`,
          details: {
            batchAction: response.action,
            batchSize: response.ids.length,
            fromInStock: currentMap.get(item.id)?.inStock ?? null,
            toInStock: item.inStock,
          },
        }),
      ),
    );

    return reply.send(response);
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
          mixIds?: string[];
          active?: boolean;
        }
      | undefined;

    const created = await createRail({
      name: payload?.name ?? '',
      description: payload?.description ?? '',
      mixIds: Array.isArray(payload?.mixIds) ? payload!.mixIds : [],
      active: payload?.active,
    });

    if (isApiError(created)) {
      return reply.status(400).send(created);
    }

    const response: StaffRailMutationResponse = {
      item: created as StaffRailView,
    };

    await recordAuditEvent({
      actor: user,
      action: 'create',
      entityType: 'rail',
      entityId: response.item.id,
      entityLabel: response.item.name,
      details: {
        type: response.item.type,
        active: response.item.active,
        mixIds: response.item.mixIds,
      },
    });

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
      item: updated as StaffRailView,
    };

    await recordAuditEvent({
      actor: user,
      action: 'update',
      entityType: 'rail',
      entityId: response.item.id,
      entityLabel: response.item.name,
      details: {
        type: response.item.type,
        active: response.item.active,
        mixIds: response.item.mixIds,
      },
    });

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

    const current = await getTobaccoById(tobaccoId);
    const updated = await updateTobaccoInStock(tobaccoId, body.inStock);
    if (!updated) {
      return reply.status(404).send({ error: 'Tobacco not found' } satisfies ApiError);
    }

    await recordAuditEvent({
      actor: user,
      action: 'toggle',
      entityType: 'inventory',
      entityId: updated.id,
      entityLabel: `${updated.manufacturer} · ${updated.name}`,
      details: {
        fromInStock: current?.inStock ?? null,
        toInStock: updated.inStock,
      },
    });

    const response: StaffInventoryMutationResponse = {
      item: updated,
    };

    return reply.send(response);
  });

  app.get('/staff/dashboard/summary', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const query = request.query as { window?: unknown } | undefined;
    const response: StaffDashboardSummaryResponse = await getDashboardSummary(normalizeDashboardWindowKey(query?.window));

    return reply.send(response);
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
