import Fastify from 'fastify';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import { getDailyCodeWindow } from './daily-code';
import {
  confirmGuestLogin,
  deleteGuestAccount,
  getGuestLoginStatus,
  getGuestMe,
  parseTaste,
  resolveGuestSession,
  startGuestLogin,
  updateGuestTaste,
} from './guest-account';
import {
  addFavoriteCustom,
  addFavoriteMix,
  getGuestFavorites,
  getGuestForYou,
  getGuestHistory,
  parseHistoryQuery,
  removeFavoriteCustom,
  removeFavoriteMix,
} from './guest-cabinet';
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
import { evaluateBowl, getMixerPalette, parseBowlInput, parseCustomMixSmokeInput, recordCustomMixSmoke } from './mixer';
import { listAuditEvents, recordAuditEvent } from './audit';
import { getCatalogIdeas } from './catalog-ideas';
import { registerShelfInsightsRoutes } from './shelf-insights';
import {
  addMark,
  addPack,
  addToShelf,
  getSettings,
  getShelf,
  getShelfItem,
  markEmpty,
  openAnother,
  removeFromShelf,
  setStop,
  ShelfConflictError,
  ShelfNotFoundError,
  ShelfValidationError,
  undoEmpty,
  updateSettings,
  updateShelfItem,
  writeOff,
} from './shelf';
import {
  acceptDelivery,
  addLine,
  createDraftFromPdf,
  createManualDraft,
  deleteDelivery,
  deleteLine,
  DeliveryConflictError,
  DeliveryNotFoundError,
  DeliveryValidationError,
  getDelivery,
  getDeliveryFile,
  InvoiceUnreadableError,
  listDeliveries,
  updateDelivery,
  updateLine,
  type LineKind,
} from './deliveries';
import {
  batchUpdateTobacco,
  createTobacco,
  createMix,
  deleteMix,
  createRail,
  deleteRail,
  ensureAppState,
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
  type InventoryArchivedFilter,
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
  updateTobacco,
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
  GuestCustomMixSmokeResponse,
  GuestTelegramConfigResponse,
  AutomationGuestLoginConfirmRequest,
  GuestMixerEvaluateResponse,
  GuestMixerPaletteResponse,
  OnboardingRecommendationsResponse,
  StaffAccountMutationResponse,
  StaffAccountsResponse,
  StaffAuthResponse,
  StaffCatalogIdeasResponse,
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
    await ensureAppState();
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
      guestLoginConfig: 'GET /guest/auth/telegram/config',
      guestLoginStart: 'POST /guest/auth/telegram/start',
      guestLoginStatus: 'GET /guest/auth/telegram/status',
      guestMe: 'GET|DELETE /guest/me',
      guestMeOnboarding: 'PUT /guest/me/onboarding',
      guestMeHistory: 'GET /guest/me/history',
      guestMeForYou: 'GET /guest/me/for-you',
      guestMeFavorites: 'GET /guest/me/favorites',
      guestMeFavoriteMix: 'PUT|DELETE /guest/me/favorites/mixes/:mixId',
      guestMeFavoriteCustom: 'PUT|DELETE /guest/me/favorites/custom/:eventId',
      automationGuestLoginConfirm: 'POST /automation/guest-login/confirm',
      automationCurrentDailyCode: 'GET /automation/daily-code/current',
      automationEnsureDailyCode: 'POST /automation/daily-code/ensure',
      automationRotateDailyCode: 'POST /automation/daily-code/rotate',
      automationTelegramOperatorByChat: 'GET /automation/telegram/operators/by-chat/:chatId',
      automationTelegramOperatorLink: 'POST /automation/telegram/operators/link',
      automationTelegramRecipients: 'GET /automation/telegram/recipients',
      automationTelegramState: 'GET /automation/telegram/state',
      automationTelegramStateReport: 'POST /automation/telegram/state/report',
      inventoryList: 'GET /staff/inventory/tobaccos',
      inventoryCreate: 'POST /staff/inventory/tobaccos',
      inventoryBatch: 'POST /staff/inventory/tobaccos/batch',
      inventoryUpdate: 'PATCH /staff/inventory/tobaccos/:id',
      catalogIdeas: 'GET /staff/catalog/ideas',
      shelf: 'GET /staff/shelf',
      shelfItem: 'GET /staff/shelf/:tobaccoId',
      shelfAdd: 'POST /staff/shelf',
      shelfUpdate: 'PATCH /staff/shelf/:tobaccoId',
      shelfRemove: 'DELETE /staff/shelf/:tobaccoId',
      shelfEmpty: 'POST /staff/shelf/:tobaccoId/empty',
      shelfMark: 'POST /staff/shelf/:tobaccoId/marks',
      shelfOpen: 'POST /staff/shelf/:tobaccoId/open',
      shelfAddPack: 'POST /staff/shelf/:tobaccoId/packs',
      shelfUndoEmpty: 'POST /staff/shelf/packs/:packId/undo-empty',
      shelfWriteOff: 'POST /staff/shelf/packs/:packId/write-off',
      shelfSettings: 'GET /staff/shelf/settings',
      shelfSettingsUpdate: 'PATCH /staff/shelf/settings',
      deliveriesList: 'GET /staff/deliveries',
      deliveriesUpload: 'POST /staff/deliveries',
      deliveriesManual: 'POST /staff/deliveries/manual',
      deliveriesRead: 'GET /staff/deliveries/:id',
      deliveriesFile: 'GET /staff/deliveries/:id/file',
      deliveriesUpdate: 'PATCH /staff/deliveries/:id',
      deliveriesDelete: 'DELETE /staff/deliveries/:id',
      deliveriesAccept: 'POST /staff/deliveries/:id/accept',
      deliveryLinesCreate: 'POST /staff/deliveries/:id/lines',
      deliveryLinesUpdate: 'PATCH /staff/deliveries/:id/lines/:lineId',
      deliveryLinesDelete: 'DELETE /staff/deliveries/:id/lines/:lineId',
      shelfReorder: 'GET /staff/shelf/reorder',
      shelfDashboard: 'GET /staff/shelf/dashboard',
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

  app.get('/guest/mixer/palette', async () => {
    const response: GuestMixerPaletteResponse = await getMixerPalette();
    return response;
  });

  app.post('/guest/mixer/evaluate', async (request, reply) => {
    const input = parseBowlInput(request.body);
    if ('error' in input) {
      return reply.status(400).send(input satisfies ApiError);
    }

    const response = await evaluateBowl(input);
    if ('unavailableTobaccoId' in response) {
      return reply.status(409).send({ error: 'Tobacco is not in stock' } satisfies ApiError);
    }

    return reply.send(response satisfies GuestMixerEvaluateResponse);
  });

  app.post('/guest/events/custom-mix-smoke', async (request, reply) => {
    const input = parseCustomMixSmokeInput(request.body);
    if ('error' in input) {
      return reply.status(400).send(input satisfies ApiError);
    }

    const guest = await optionalGuest(request, reply);
    if (guest === undefined) {
      return;
    }

    const response = await recordCustomMixSmoke(input, guest?.id ?? null);
    if ('unavailableTobaccoId' in response) {
      return reply.status(409).send({
        error: 'Tobacco is not in stock',
        tobaccoId: response.unavailableTobaccoId,
      } satisfies ApiError & { tobaccoId: string });
    }

    return reply.status(201).send(response satisfies GuestCustomMixSmokeResponse);
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

    const guest = await optionalGuest(request, reply);
    if (guest === undefined) {
      return;
    }

    const event = await recordSmokeCtaEvent(mix, guest?.id ?? null);
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

    const window = getDailyCodeWindow();
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

  app.get('/guest/auth/telegram/config', async () => ({ botUsername: config.guestLoginBotUsername }) satisfies GuestTelegramConfigResponse);

  app.post('/guest/auth/telegram/start', async (request, reply) => {
    const taste = parseTaste(request.body, { required: false });
    if ('error' in taste) {
      return reply.status(400).send(taste satisfies ApiError);
    }

    const consent = (request.body as { consent?: unknown } | undefined)?.consent === true;
    const started = await startGuestLogin({ consent, ...taste });
    if (!started) {
      return reply.status(503).send({ error: 'Guest login bot is not configured' } satisfies ApiError);
    }

    return reply.status(201).send(started);
  });

  app.get('/guest/auth/telegram/status', async (request, reply) => {
    const code = (request.query as { code?: unknown }).code;
    const result = typeof code === 'string' && code ? await getGuestLoginStatus(code) : null;
    if (!result) {
      return reply.status(404).send({ error: 'Login code not found' } satisfies ApiError);
    }

    return reply.send(result);
  });

  app.post('/automation/guest-login/confirm', async (request, reply) => {
    if (!authenticateAutomationRequest(request, reply)) {
      return;
    }

    const body = request.body as Partial<AutomationGuestLoginConfirmRequest> | undefined;
    const code = typeof body?.code === 'string' ? body.code : '';
    const telegramId = typeof body?.telegramId === 'string' || typeof body?.telegramId === 'number' ? String(body.telegramId) : '';
    if (!code || !/^\d{1,20}$/.test(telegramId)) {
      return reply.status(400).send({ error: 'code and numeric telegramId are required' } satisfies ApiError);
    }

    const result = await confirmGuestLogin(code, telegramId);
    if (result === 'not-found') {
      return reply.status(404).send({ error: 'Login code not found' } satisfies ApiError);
    }
    if (result === 'gone') {
      return reply.status(410).send({ error: 'Login code expired or already used' } satisfies ApiError);
    }

    return reply.send({ ok: true });
  });

  app.get('/guest/me', async (request, reply) => {
    const guest = await authenticateGuestRequest(request, reply);
    if (!guest) {
      return;
    }

    return reply.send(await getGuestMe(guest));
  });

  app.put('/guest/me/onboarding', async (request, reply) => {
    const guest = await authenticateGuestRequest(request, reply);
    if (!guest) {
      return;
    }

    const taste = parseTaste(request.body, { required: true });
    if ('error' in taste) {
      return reply.status(400).send(taste satisfies ApiError);
    }

    return reply.send(await updateGuestTaste(guest.id, taste));
  });

  app.get('/guest/me/history', async (request, reply) => {
    const guest = await authenticateGuestRequest(request, reply);
    if (!guest) {
      return;
    }

    const query = parseHistoryQuery(request.query);
    if ('error' in query) {
      return reply.status(400).send(query satisfies ApiError);
    }

    return reply.send(await getGuestHistory(guest.id, query.before, query.limit));
  });

  app.get('/guest/me/for-you', async (request, reply) => {
    const guest = await authenticateGuestRequest(request, reply);
    if (!guest) {
      return;
    }

    return reply.send(await getGuestForYou(guest));
  });

  app.get('/guest/me/favorites', async (request, reply) => {
    const guest = await authenticateGuestRequest(request, reply);
    if (!guest) {
      return;
    }

    return reply.send(await getGuestFavorites(guest.id));
  });

  const favoriteRoute = (
    method: 'PUT' | 'DELETE',
    kind: 'mixes' | 'custom',
    act: (guestId: string, id: string) => Promise<unknown>,
  ) =>
    app.route({
      method,
      url: `/guest/me/favorites/${kind}/:id`,
      handler: async (request, reply) => {
        const guest = await authenticateGuestRequest(request, reply);
        if (!guest) {
          return;
        }

        const found = await act(guest.id, (request.params as { id: string }).id);
        if (found === false) {
          return reply.status(404).send({ error: kind === 'mixes' ? 'Mix not found' : 'Custom mix not found' } satisfies ApiError);
        }

        return reply.status(204).send();
      },
    });
  favoriteRoute('PUT', 'mixes', addFavoriteMix);
  favoriteRoute('DELETE', 'mixes', removeFavoriteMix);
  favoriteRoute('PUT', 'custom', addFavoriteCustom);
  favoriteRoute('DELETE', 'custom', removeFavoriteCustom);

  app.delete('/guest/me', async (request, reply) => {
    const guest = await authenticateGuestRequest(request, reply);
    if (!guest) {
      return;
    }

    await deleteGuestAccount(guest.id);
    return reply.status(204).send();
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

    const guest = await optionalGuest(request, reply);
    if (guest === undefined) {
      return;
    }

    const rated = await rateMix(mixId, value, guest?.id ?? null);
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
          page?: unknown;
          pageSize?: unknown;
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
      page: query?.page === undefined ? undefined : Number(query.page),
      pageSize: query?.pageSize === undefined ? undefined : Number(query.pageSize),
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
          baseAvgRating?: number;
        }
      | undefined;

    const created = await createMix({
      name: payload?.name ?? '',
      description: payload?.description ?? '',
      componentIds: Array.isArray(payload?.componentIds) ? payload!.componentIds : [],
      components: Array.isArray(payload?.components) ? payload.components : undefined,
      available: payload?.available,
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

  app.delete('/staff/mixes/:id', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const mixId = (request.params as { id?: string }).id?.trim();
    if (!mixId) {
      return reply.status(400).send({ error: 'Mix id is required' } satisfies ApiError);
    }

    const deleted = await deleteMix(mixId);
    if (!deleted) {
      return reply.status(404).send({ error: 'Mix not found' } satisfies ApiError);
    }

    await recordAuditEvent({
      actor: user,
      action: 'delete',
      entityType: 'mix',
      entityId: deleted.id,
      entityLabel: deleted.name,
    });

    return reply.send({ item: deleted });
  });

  app.get('/staff/inventory/tobaccos', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const query = request.query as
      | {
          search?: unknown;
          ids?: unknown;
          stock?: unknown;
          archived?: unknown;
          manufacturers?: unknown;
          flavorProfiles?: unknown;
          flavors?: unknown;
          flavorTags?: unknown;
          sort?: unknown;
          direction?: unknown;
          page?: unknown;
          pageSize?: unknown;
        }
      | undefined;

    const response: StaffInventoryResponse = await getInventoryTobaccos({
      search: typeof query?.search === 'string' ? query.search : '',
      ids: readStringList(query?.ids),
      stock: (typeof query?.stock === 'string' ? query.stock : undefined) as InventoryStockFilter | undefined,
      archived: (typeof query?.archived === 'string' ? query.archived : undefined) as InventoryArchivedFilter | undefined,
      manufacturers: readStringList(query?.manufacturers),
      flavorProfiles: readStringList(query?.flavorProfiles),
      flavors: readStringList(query?.flavors),
      flavorTags: readStringList(query?.flavorTags),
      sort: (typeof query?.sort === 'string' ? query.sort : undefined) as InventorySortField | undefined,
      direction: (typeof query?.direction === 'string' ? query.direction : undefined) as InventorySortDirection | undefined,
      page: query?.page === undefined ? undefined : Number(query.page),
      pageSize: query?.pageSize === undefined ? undefined : Number(query.pageSize),
    });

    return reply.send(response);
  });

  app.get('/staff/catalog/ideas', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const response: StaffCatalogIdeasResponse = await getCatalogIdeas();
    return reply.send(response);
  });

  app.post('/staff/inventory/tobaccos', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const payload = request.body as
      | {
          manufacturer?: string;
          lineName?: string;
          name?: string;
          description?: string;
          country?: string;
          officialStrength?: string;
          communityStrength?: string;
          productionStatus?: string;
          flavorProfiles?: string[];
          flavors?: string[];
          flavorTags?: string[];
          inStock?: boolean;
        }
      | undefined;

    const created = await createTobacco({
      manufacturer: payload?.manufacturer ?? '',
      lineName: payload?.lineName,
      name: payload?.name ?? '',
      description: payload?.description,
      country: payload?.country,
      officialStrength: payload?.officialStrength,
      communityStrength: payload?.communityStrength,
      productionStatus: payload?.productionStatus,
      flavorProfiles: Array.isArray(payload?.flavorProfiles) ? payload.flavorProfiles : undefined,
      flavors: Array.isArray(payload?.flavors) ? payload.flavors : undefined,
      flavorTags: Array.isArray(payload?.flavorTags) ? payload.flavorTags : undefined,
      inStock: payload?.inStock,
    });

    if (!created) {
      return reply.status(500).send({ error: 'Inventory tobacco was created but not returned by backend' } satisfies ApiError);
    }

    if (isApiError(created)) {
      return reply.status(400).send(created);
    }

    const response: StaffInventoryMutationResponse = {
      item: created,
    };

    await recordAuditEvent({
      actor: user,
      action: 'create',
      entityType: 'inventory',
      entityId: response.item.id,
      entityLabel: `${response.item.manufacturer} · ${response.item.name}`,
      details: {
        lineName: response.item.lineName,
        inStock: response.item.inStock,
        flavorProfiles: response.item.flavorProfiles,
        flavors: response.item.flavors,
        flavorTags: response.item.flavorTags,
      },
    });

    return reply.status(201).send(response);
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

    if (
      action !== 'set-in-stock'
      && action !== 'set-out-of-stock'
      && action !== 'archive'
      && action !== 'unarchive'
    ) {
      return reply.status(400).send({ error: 'Unsupported batch action' } satisfies ApiError);
    }

    const isArchiveAction = action === 'archive' || action === 'unarchive';
    const currentItems = await Promise.all(ids.map(async (id) => [id, await getTobaccoById(id)] as const));
    const currentMap = new Map(currentItems);
    const result = await batchUpdateTobacco(ids, action);
    const response: StaffInventoryBatchMutationResponse = result;

    await Promise.all(
      response.items.map((item) =>
        recordAuditEvent({
          actor: user,
          action: isArchiveAction ? 'archive' : 'toggle',
          entityType: 'inventory',
          entityId: item.id,
          entityLabel: `${item.manufacturer} · ${item.name}`,
          details: {
            batchAction: response.action,
            batchSize: response.ids.length,
            fromInStock: currentMap.get(item.id)?.inStock ?? null,
            toInStock: item.inStock,
            fromArchived: currentMap.get(item.id)?.archived ?? null,
            toArchived: item.archived,
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

  app.delete('/staff/rails/:id', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const railId = (request.params as { id?: string }).id?.trim();
    if (!railId) {
      return reply.status(400).send({ error: 'Rail id is required' } satisfies ApiError);
    }

    const deleted = await deleteRail(railId);
    if (isApiError(deleted)) {
      return reply.status(400).send(deleted);
    }

    if (!deleted) {
      return reply.status(404).send({ error: 'Rail not found' } satisfies ApiError);
    }

    await recordAuditEvent({
      actor: user,
      action: 'delete',
      entityType: 'rail',
      entityId: deleted.id,
      entityLabel: deleted.name,
    });

    return reply.send({ item: deleted });
  });

  app.patch('/staff/inventory/tobaccos/:id', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) {
      return;
    }

    const tobaccoId = (request.params as { id?: string }).id?.trim();
    const body = request.body as
      | {
          manufacturer?: string;
          lineName?: string;
          name?: string;
          description?: string;
          country?: string;
          officialStrength?: string;
          communityStrength?: string;
          productionStatus?: string;
          flavorProfiles?: string[];
          flavors?: string[];
          flavorTags?: string[];
          inStock?: boolean;
          archived?: boolean;
        }
      | undefined;

    if (!tobaccoId) {
      return reply.status(400).send({ error: 'Tobacco id is required' } satisfies ApiError);
    }

    if (!body || Object.keys(body).length === 0) {
      return reply.status(400).send({ error: 'At least one tobacco field is required' } satisfies ApiError);
    }

    const current = await getTobaccoById(tobaccoId);
    const updated = (
      body
      && typeof body.inStock === 'boolean'
      && Object.keys(body).length === 1
    )
      ? await updateTobaccoInStock(tobaccoId, body.inStock)
      : await updateTobacco(tobaccoId, {
          manufacturer: body.manufacturer,
          lineName: body.lineName,
          name: body.name,
          description: body.description,
          country: body.country,
          officialStrength: body.officialStrength,
          communityStrength: body.communityStrength,
          productionStatus: body.productionStatus,
          flavorProfiles: Array.isArray(body.flavorProfiles) ? body.flavorProfiles : undefined,
          flavors: Array.isArray(body.flavors) ? body.flavors : undefined,
          flavorTags: Array.isArray(body.flavorTags) ? body.flavorTags : undefined,
          inStock: body.inStock,
          archived: body.archived,
        });
    if (!updated) {
      return reply.status(404).send({ error: 'Tobacco not found' } satisfies ApiError);
    }

    if (isApiError(updated)) {
      return reply.status(400).send(updated);
    }

    const isStockToggle = typeof body.inStock === 'boolean' && Object.keys(body).length === 1;
    const isArchiveToggle = typeof body.archived === 'boolean' && Object.keys(body).length === 1;

    await recordAuditEvent({
      actor: user,
      action: isArchiveToggle ? 'archive' : isStockToggle ? 'toggle' : 'update',
      entityType: 'inventory',
      entityId: updated.id,
      entityLabel: `${updated.manufacturer} · ${updated.name}`,
      details: {
        fromInStock: current?.inStock ?? null,
        toInStock: updated.inStock,
        fromArchived: current?.archived ?? null,
        toArchived: updated.archived,
        fromManufacturer: current?.manufacturer ?? null,
        toManufacturer: updated.manufacturer,
        fromLineName: current?.lineName ?? null,
        toLineName: updated.lineName,
        fromName: current?.name ?? null,
        toName: updated.name,
      },
    });

    const response: StaffInventoryMutationResponse = {
      item: updated,
    };

    return reply.send(response);
  });

  // Ошибки домена полки → HTTP: не найдено 404, конфликт состояния банок 409, неверный ввод 400.
  const sendShelf = async <T>(reply: FastifyReply, run: () => Promise<T>) => {
    try {
      return reply.send(await run());
    } catch (error) {
      if (error instanceof ShelfNotFoundError) {
        return reply.status(404).send({ error: error.message } satisfies ApiError);
      }
      if (error instanceof ShelfConflictError) {
        return reply.status(409).send({ error: error.message, code: error.code });
      }
      if (error instanceof ShelfValidationError) {
        return reply.status(400).send({ error: error.message } satisfies ApiError);
      }
      throw error;
    }
  };
  const tobaccoParam = (request: FastifyRequest) => (request.params as { tobaccoId?: string }).tobaccoId?.trim() ?? '';
  const packParam = (request: FastifyRequest) => (request.params as { packId?: string }).packId?.trim() ?? '';

  app.get('/staff/shelf', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    return sendShelf(reply, () => getShelf());
  });

  app.get('/staff/shelf/settings', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    return sendShelf(reply, () => getSettings());
  });

  app.patch('/staff/shelf/settings', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    const body = (request.body ?? {}) as { bowlGrams?: unknown; leadDays?: unknown };
    return sendShelf(reply, () => updateSettings(user, {
      bowlGrams: typeof body.bowlGrams === 'number' ? body.bowlGrams : undefined,
      leadDays: typeof body.leadDays === 'number' ? body.leadDays : undefined,
    }));
  });

  app.post('/staff/shelf', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    const body = (request.body ?? {}) as { tobaccoId?: unknown; status?: unknown };
    if (typeof body.tobaccoId !== 'string' || !body.tobaccoId.trim()) {
      return reply.status(400).send({ error: 'tobaccoId is required' } satisfies ApiError);
    }
    const status = body.status === 'plan' ? 'plan' : 'active';
    return sendShelf(reply, async () => ({ item: await addToShelf(user, body.tobaccoId as string, status) }));
  });

  app.get('/staff/shelf/:tobaccoId', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    return sendShelf(reply, async () => ({ item: await getShelfItem(tobaccoParam(request)) }));
  });

  app.patch('/staff/shelf/:tobaccoId', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    const body = (request.body ?? {}) as {
      stopped?: unknown;
      stopNote?: unknown;
      keepStocked?: unknown;
      packWeight?: unknown;
      note?: unknown;
    };
    const tobaccoId = tobaccoParam(request);
    return sendShelf(reply, async () => {
      let item = null;
      if (typeof body.stopped === 'boolean') {
        item = await setStop(user, tobaccoId, body.stopped, typeof body.stopNote === 'string' ? body.stopNote : undefined);
      }
      const patch = {
        keepStocked: typeof body.keepStocked === 'boolean' ? body.keepStocked : undefined,
        packWeight: typeof body.packWeight === 'number' ? body.packWeight : undefined,
        note: typeof body.note === 'string' ? body.note : undefined,
      };
      if (Object.values(patch).some((value) => value !== undefined)) {
        item = await updateShelfItem(user, tobaccoId, patch);
      }
      if (!item) {
        throw new ShelfValidationError('Nothing to update');
      }
      return { item };
    });
  });

  app.delete('/staff/shelf/:tobaccoId', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    return sendShelf(reply, async () => ({ item: await removeFromShelf(user, tobaccoParam(request)) }));
  });

  app.post('/staff/shelf/:tobaccoId/empty', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    return sendShelf(reply, () => markEmpty(user, tobaccoParam(request)));
  });

  app.post('/staff/shelf/:tobaccoId/marks', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    const body = (request.body ?? {}) as { fraction?: unknown };
    if (typeof body.fraction !== 'number') {
      return reply.status(400).send({ error: 'fraction is required' } satisfies ApiError);
    }
    return sendShelf(reply, async () => ({ item: await addMark(user, tobaccoParam(request), body.fraction as number) }));
  });

  app.post('/staff/shelf/:tobaccoId/open', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    return sendShelf(reply, async () => ({ item: await openAnother(user, tobaccoParam(request)) }));
  });

  app.post('/staff/shelf/:tobaccoId/packs', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    const body = (request.body ?? {}) as { weight?: unknown; priceKop?: unknown };
    return sendShelf(reply, async () => ({
      item: await addPack(user, tobaccoParam(request), {
        weight: typeof body.weight === 'number' ? body.weight : undefined,
        priceKop: typeof body.priceKop === 'number' ? body.priceKop : undefined,
      }),
    }));
  });

  app.post('/staff/shelf/packs/:packId/undo-empty', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    return sendShelf(reply, async () => ({ item: await undoEmpty(user, packParam(request)) }));
  });

  app.post('/staff/shelf/packs/:packId/write-off', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    const body = (request.body ?? {}) as { reason?: unknown };
    if (typeof body.reason !== 'string' || !body.reason.trim()) {
      return reply.status(400).send({ error: 'reason is required' } satisfies ApiError);
    }
    return sendShelf(reply, async () => ({ item: await writeOff(user, packParam(request), (body.reason as string).trim()) }));
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

  registerDeliveryRoutes(app);
  registerShelfInsightsRoutes(app, authenticateStaffRequest);

  return app;
};

// --- поставки (#152, срез 3) -------------------------------------------------

const MAX_INVOICE_BYTES = 5 * 1024 * 1024;
// base64 раздувает файл на треть, плюс JSON вокруг.
const UPLOAD_BODY_LIMIT = 8 * 1024 * 1024;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const sendDeliveryError = (reply: FastifyReply, error: unknown) => {
  if (error instanceof DeliveryNotFoundError) return reply.status(404).send({ error: error.message });
  if (error instanceof DeliveryValidationError) return reply.status(400).send({ error: error.message });
  if (error instanceof DeliveryConflictError) {
    return reply.status(409).send({ error: error.message, code: error.code, ...error.extra });
  }
  if (error instanceof InvoiceUnreadableError) return reply.status(422).send({ error: error.message, code: error.code });
  throw error;
};

const invalid = (message: string): never => {
  throw new DeliveryValidationError(message);
};

const readNumber = (value: unknown, field: string, nullable = false): number | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null && nullable) return null;
  return typeof value === 'number' ? value : invalid(`${field}: нужно число`);
};

const readText = (value: unknown, field: string): string | null | undefined => {
  if (value === undefined || value === null) return value;
  return typeof value === 'string' ? value : invalid(`${field}: нужна строка`);
};

const readDate = (value: unknown, field: string): Date | null | undefined => {
  if (value === undefined || value === null) return value;
  const date = typeof value === 'string' ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : invalid(`${field}: нужна дата в формате ISO`);
};

const readBoolean = (value: unknown, field: string) =>
  value === undefined || typeof value === 'boolean' ? value : invalid(`${field}: нужно да или нет`);

const readKind = (value: unknown): LineKind | undefined =>
  value === undefined || value === 'tobacco' || value === 'skip' ? value : invalid('Тип строки: tobacco или skip');

const readPdf = (value: unknown) => {
  const content = (typeof value === 'string' ? value : '').replace(/^data:[^,]*;base64,/, '').replace(/\s+/g, '');
  if (!content || content.length % 4 !== 0 || !BASE64.test(content)) {
    return invalid('Файл не передан или повреждён при загрузке');
  }
  const file = Buffer.from(content, 'base64');
  return file.length > MAX_INVOICE_BYTES ? invalid('Файл больше 5 МБ') : file;
};

const registerDeliveryRoutes = (app: FastifyInstance) => {
  type Params = { id: string; lineId: string };
  type Body = Record<string, unknown> | undefined;

  app.get('/staff/deliveries', async (request, reply) => {
    if (!(await authenticateStaffRequest(request, reply))) return;
    return reply.send(await listDeliveries());
  });

  app.post('/staff/deliveries', { bodyLimit: UPLOAD_BODY_LIMIT }, async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    try {
      const body = request.body as Body;
      const fileName = readText(body?.fileName, 'Имя файла')?.trim().slice(0, 200) || 'invoice.pdf';
      const file = readPdf(body?.contentBase64);
      const allowDuplicate = readBoolean(body?.allowDuplicate, 'Загрузить повторно') ?? false;
      return reply.status(201).send(await createDraftFromPdf(user, fileName, file, { allowDuplicate }));
    } catch (error) {
      return sendDeliveryError(reply, error);
    }
  });

  app.post('/staff/deliveries/manual', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    try {
      const body = request.body as Body;
      const card = await createManualDraft(user, {
        supplierName: readText(body?.supplierName, 'Поставщик'),
        number: readText(body?.number, 'Номер счёта'),
        invoiceDate: readDate(body?.invoiceDate, 'Дата счёта'),
      });
      return reply.status(201).send(card);
    } catch (error) {
      return sendDeliveryError(reply, error);
    }
  });

  app.get('/staff/deliveries/:id', async (request, reply) => {
    if (!(await authenticateStaffRequest(request, reply))) return;
    try {
      return reply.send(await getDelivery((request.params as Params).id));
    } catch (error) {
      return sendDeliveryError(reply, error);
    }
  });

  app.get('/staff/deliveries/:id/file', async (request, reply) => {
    if (!(await authenticateStaffRequest(request, reply))) return;
    try {
      const { fileName, file } = await getDeliveryFile((request.params as Params).id);
      return reply
        .header('content-type', 'application/pdf')
        .header('content-disposition', `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`)
        .send(file);
    } catch (error) {
      return sendDeliveryError(reply, error);
    }
  });

  app.patch('/staff/deliveries/:id', async (request, reply) => {
    if (!(await authenticateStaffRequest(request, reply))) return;
    try {
      const body = request.body as Body;
      const card = await updateDelivery((request.params as Params).id, {
        receivedAt: readDate(body?.receivedAt, 'Дата прихода'),
        number: readText(body?.number, 'Номер счёта'),
        invoiceDate: readDate(body?.invoiceDate, 'Дата счёта'),
      });
      return reply.send(card);
    } catch (error) {
      return sendDeliveryError(reply, error);
    }
  });

  app.delete('/staff/deliveries/:id', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    try {
      await deleteDelivery(user, (request.params as Params).id);
      return reply.status(204).send();
    } catch (error) {
      return sendDeliveryError(reply, error);
    }
  });

  app.post('/staff/deliveries/:id/accept', async (request, reply) => {
    const user = await authenticateStaffRequest(request, reply);
    if (!user) return;
    try {
      const receivedAt = readDate((request.body as Body)?.receivedAt, 'Дата прихода') ?? undefined;
      return reply.send(await acceptDelivery(user, (request.params as Params).id, { receivedAt }));
    } catch (error) {
      return sendDeliveryError(reply, error);
    }
  });

  app.post('/staff/deliveries/:id/lines', async (request, reply) => {
    if (!(await authenticateStaffRequest(request, reply))) return;
    try {
      const body = request.body as Body;
      const card = await addLine((request.params as Params).id, {
        rawName: readText(body?.rawName, 'Название') ?? '',
        qty: readNumber(body?.qty, 'Количество') ?? invalid('Укажите количество банок'),
        priceKop: readNumber(body?.priceKop, 'Цена', true),
        grams: readNumber(body?.grams, 'Фасовка', true),
        tobaccoId: readText(body?.tobaccoId, 'Табак'),
        kind: readKind(body?.kind),
      });
      return reply.status(201).send(card);
    } catch (error) {
      return sendDeliveryError(reply, error);
    }
  });

  app.patch('/staff/deliveries/:id/lines/:lineId', async (request, reply) => {
    if (!(await authenticateStaffRequest(request, reply))) return;
    try {
      const body = request.body as Body;
      const { id, lineId } = request.params as Params;
      const card = await updateLine(id, lineId, {
        tobaccoId: readText(body?.tobaccoId, 'Табак'),
        qty: readNumber(body?.qty, 'Количество') ?? undefined,
        grams: readNumber(body?.grams, 'Фасовка', true),
        priceKop: readNumber(body?.priceKop, 'Цена', true),
        arrived: readBoolean(body?.arrived, 'Пришло'),
        kind: readKind(body?.kind),
      });
      return reply.send(card);
    } catch (error) {
      return sendDeliveryError(reply, error);
    }
  });

  app.delete('/staff/deliveries/:id/lines/:lineId', async (request, reply) => {
    if (!(await authenticateStaffRequest(request, reply))) return;
    try {
      const { id, lineId } = request.params as Params;
      return reply.send(await deleteLine(id, lineId));
    } catch (error) {
      return sendDeliveryError(reply, error);
    }
  });
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

// Токен гостя кабинета (#239). Удалённая учётка — тоже 401: клиент стирает токен.
const authenticateGuestRequest = async (request: FastifyRequest, reply: FastifyReply) => {
  const header = request.headers.authorization;
  const guest = header?.startsWith('Bearer ') ? await resolveGuestSession(header.slice('Bearer '.length).trim()) : null;
  if (!guest) {
    reply.status(401).send({ error: 'Invalid or expired guest token' } satisfies ApiError);
    return null;
  }

  return guest;
};

// Токен на гостевых событиях и оценке необязателен (#240): без заголовка — аноним,
// как раньше (null). Невалидный — 401 и undefined: молча писать анонимно нельзя,
// гость потеряет запись в истории; клиент стирает токен и повторяет запрос.
const optionalGuest = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.headers.authorization) {
    return null;
  }
  return (await authenticateGuestRequest(request, reply)) ?? undefined;
};

const AUTOMATION_HEADER = 'x-atelier-automation-key';

const authenticateAutomationRequest = (request: FastifyRequest, reply: FastifyReply) => {
  const header = request.headers[AUTOMATION_HEADER];
  const key = Array.isArray(header) ? header[0] : header;

  if (key !== config.automationKey) {
    reply.status(401).send({ error: 'Invalid automation key' } satisfies ApiError);
    return false;
  }

  return true;
};
