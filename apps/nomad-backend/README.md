# Nomad Backend

Отдельный backend для продуктов `Арома Ателье`, `Мастер` и `Telegram-бот`.

## Назначение

Пакет не переиспользует напрямую legacy `backend/` как runtime-контур.

На Phase 1 в нем есть:

1. guest access code verification;
2. staff auth для `admin` и `nomad`;
3. stateless bearer token для `GET /staff/auth/me`;
4. health/meta endpoints для фронтенда.

На текущем storage-backed этапе:

1. daily code хранится в Postgres как `NomadDailyAccessCode`;
2. staff accounts хранятся в Postgres как `NomadStaffAccount`;
3. `.env` больше не является источником истины для guest access code и staff credentials;
4. seed создаёт стартовые записи:
   - login `admin` / password `admin`,
   - login `nomad` / password `nomad`,
   - daily code `NOMAD-2026`.

На Phase 2 дополнительно есть:

1. onboarding options на основе текущего in-stock каталога;
2. rule-based recommendations для гостя;
3. in-memory demo catalog без Prisma.

На Phase 3 дополнительно есть:

1. in-memory inventory management для staff;
2. smoke CTA event tracking;
3. staff dashboard summary.

На Phase 4 дополнительно есть:

1. guest intro cards;
2. guest home rails и guest catalog mixes;
3. guest rating endpoint для миксов;
4. staff CRUD для миксов и рейлов;
5. статистический rail на базе CTA и оценок.

На текущем этапе runtime больше не хранит состояние в памяти:

1. `Prisma + PostgreSQL` используются как локальное persistence-хранилище для Nomad;
2. схема живёт в `apps/nomad-backend/prisma/schema.prisma`;
3. сиды живут в `apps/nomad-backend/prisma/seed.ts`;
4. локальный Postgres поднимается отдельным `docker-compose.yml` внутри `apps/nomad-backend`.

На access-management этапе дополнительно есть:

1. CRUD для daily codes через `/staff/access/daily-codes`;
2. CRUD для staff accounts через `/staff/access/accounts`;
3. role-guard: daily codes доступны `admin` и `nomad`, staff accounts только `admin`;
4. `GET /staff/auth/me` проверяет не только bearer token, но и актуальное состояние account в БД.

На automation этапе дополнительно есть:

1. отдельный machine-to-machine контур для Telegram-бота;
2. automation auth через header `x-nomad-automation-key`;
3. endpoints:
   - `GET /automation/daily-code/current`
   - `POST /automation/daily-code/ensure`
   - `POST /automation/daily-code/rotate`
4. единая Moscow-based логика окна daily code для seed, CRUD и automation.

На этапе Telegram provisioning дополнительно есть:

1. CRUD для чатов Telegram через `/staff/access/telegram-recipients`;
2. эти записи хранятся в Postgres как `NomadTelegramRecipient`;
3. управление чатами Telegram доступно только роли `admin`;
4. automation endpoint `GET /automation/telegram/recipients` отдаёт активные chat lists для worker;
5. bot может использовать backend как source of truth, а `.env` оставляет только fallback.

На этапе Telegram automation state дополнительно есть:

1. persisted singleton `NomadTelegramAutomationState` в Postgres;
2. automation endpoints:
   - `GET /automation/telegram/state`
   - `POST /automation/telegram/state/report`
3. admin-only endpoint:
   - `GET /staff/access/telegram-automation-state`
4. backend хранит:
   - heartbeat бота;
   - last rotate;
   - last broadcast;
   - last error;
5. health вычисляется как `unknown / healthy / stale / error`.

На этапе Quality And Hardening дополнительно есть:

1. persisted audit trail `NomadAuditEvent`;
2. audit покрывает staff-sensitive изменения:
   - daily codes;
   - staff accounts;
   - Telegram recipients;
   - inventory toggle;
   - mixes;
   - rails;
3. admin-only endpoint:
   - `GET /staff/audit/events`;
4. аудит предназначен для операционного контроля и проверки изменений в `Мастере`.

На release-foundation этапе дополнительно есть:

1. отдельный bootstrap path для первого production admin;
2. managed runtime templates для Telegram-бота;
3. env matrix и deployment smoke checklist на уровне Nomad-контура.

Параметры локального Postgres-контура:

1. порт `5433`;
2. database `nomad`;
3. user `nomad`;
4. password `nomad`.

## Эндпоинты

### Guest access

- `POST /guest/access-code/verify`

### Guest onboarding / recommendations

- `GET /guest/onboarding/options`
- `POST /guest/onboarding/recommendations`
- `GET /guest/intro/cards`
- `GET /guest/catalog/mixes`
- `GET /guest/home/rails`
- `POST /guest/events/smoke-cta`
- `POST /guest/mixes/:id/rating`

### Staff auth

- `POST /staff/auth/login`
- `GET /staff/auth/me`

### Staff inventory / dashboard

- `GET /staff/access/daily-codes`
- `POST /staff/access/daily-codes`
- `PATCH /staff/access/daily-codes/:id`
- `DELETE /staff/access/daily-codes/:id`
- `GET /staff/access/accounts`
- `POST /staff/access/accounts`
- `PATCH /staff/access/accounts/:id`
- `DELETE /staff/access/accounts/:id`
- `GET /staff/access/telegram-recipients`
- `POST /staff/access/telegram-recipients`
- `PATCH /staff/access/telegram-recipients/:id`
- `DELETE /staff/access/telegram-recipients/:id`
- `GET /staff/inventory/tobaccos`
- `PATCH /staff/inventory/tobaccos/:id`
- `GET /staff/dashboard/summary`
- `GET /staff/mixes`
- `POST /staff/mixes`
- `PATCH /staff/mixes/:id`
- `GET /staff/rails`
- `POST /staff/rails`
- `PATCH /staff/rails/:id`
- `GET /staff/audit/events`

### Automation

- `GET /automation/daily-code/current`
- `POST /automation/daily-code/ensure`
- `POST /automation/daily-code/rotate`
- `GET /automation/telegram/recipients`
- `GET /automation/telegram/state`
- `POST /automation/telegram/state/report`

### Staff admin

- `GET /staff/access/telegram-automation-state`
- `GET /staff/audit/events`

## Локальный запуск

```bash
cd apps/nomad-backend
npm install
npm run db:start
npm run prisma:generate
npm run prisma:dbpush -- --force-reset
npm run prisma:seed
npm run dev
```

По умолчанию backend слушает `3021`.

## Bootstrap admin

Для production не нужно опираться на dev seed `admin/admin`.

Используйте отдельный bootstrap path:

```bash
cd apps/nomad-backend
NOMAD_BOOTSTRAP_ADMIN_LOGIN=nomad-admin \
NOMAD_BOOTSTRAP_ADMIN_NAME="Nomad Admin" \
NOMAD_BOOTSTRAP_ADMIN_PASSWORD="change-me-now" \
DATABASE_URL="postgresql://..." \
npm run bootstrap:admin
```

Скрипт:

1. создаёт admin, если такого логина ещё нет;
2. обновляет пароль и активирует account, если логин уже существует;
3. не требует запуска `prisma seed`.

## Переменные окружения

```bash
PORT=3021
HOST=0.0.0.0
APP_NAME=nomad-backend
DATABASE_URL="postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public"
NOMAD_AUTOMATION_KEY=nomad-local-automation-key
NOMAD_TOKEN_SECRET=change-me
NOMAD_TOKEN_TTL_HOURS=24
```

Отдельные bootstrap-only переменные для `npm run bootstrap:admin`:

```bash
NOMAD_BOOTSTRAP_ADMIN_LOGIN=nomad-admin
NOMAD_BOOTSTRAP_ADMIN_NAME="Nomad Admin"
NOMAD_BOOTSTRAP_ADMIN_PASSWORD=change-me-now
```

## Стадия

Текущая стадия: storage-backed MVP + Telegram automation + access management + audit trail + quality smoke baseline.

Текущая стадия: Phase 4 content rails backend + persisted access management + daily code automation + Telegram provisioning + Telegram automation state на отдельном Postgres.
