# Nomad Backend

Отдельный backend для продуктов `Арома Ателье`, `Мастер` и `Telegram-бот`.

## Назначение

Пакет не переиспользует напрямую legacy `backend/` как runtime-контур.

На Phase 1 в нем есть:

1. guest access code verification;
2. staff auth для `admin` и `nomad`;
3. stateless bearer token для `GET /staff/auth/me`;
4. health/meta endpoints для фронтенда.

На Phase 2 дополнительно есть:

1. onboarding options на основе текущего in-stock каталога;
2. rule-based recommendations для гостя;
3. in-memory demo catalog без Prisma.

На Phase 3 дополнительно есть:

1. in-memory inventory management для staff;
2. smoke CTA event tracking;
3. staff dashboard summary.

## Эндпоинты

### Guest access

- `POST /guest/access-code/verify`

### Guest onboarding / recommendations

- `GET /guest/onboarding/options`
- `POST /guest/onboarding/recommendations`
- `POST /guest/events/smoke-cta`

### Staff auth

- `POST /staff/auth/login`
- `GET /staff/auth/me`

### Staff inventory / dashboard

- `GET /staff/inventory/tobaccos`
- `PATCH /staff/inventory/tobaccos/:id`
- `GET /staff/dashboard/summary`

## Локальный запуск

```bash
cd apps/nomad-backend
npm install
npm run dev
```

По умолчанию backend слушает `3021`.

## Переменные окружения

```bash
PORT=3021
HOST=0.0.0.0
APP_NAME=nomad-backend
NOMAD_GUEST_ACCESS_CODE=NOMAD-2026
NOMAD_TOKEN_SECRET=change-me
NOMAD_TOKEN_TTL_HOURS=24
NOMAD_ADMIN_LOGIN=admin
NOMAD_ADMIN_PASSWORD=admin
NOMAD_NOMAD_LOGIN=nomad
NOMAD_NOMAD_PASSWORD=nomad
NOMAD_STAFF_DISPLAY_NAME=Nomad Staff
```

## Стадия

Текущая стадия: Phase 3 inventory + analytics backend.
