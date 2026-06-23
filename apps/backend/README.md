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
   - daily code `1234`.

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

На этапе Telegram allowlist дополнительно есть:

1. allowlist операторов через `/staff/access/telegram-operators`;
2. эти записи хранятся в Postgres как `NomadTelegramOperator`;
3. allowlist ведётся по `имя + телефон`, а не по `chatId`;
4. automation endpoints:
   - `GET /automation/telegram/operators/by-chat/:chatId`
   - `POST /automation/telegram/operators/link`
5. bot request flow теперь выглядит так:
   - оператор пишет боту;
   - делится контактом;
   - backend сверяет номер с allowlist и привязывает `chatId`;
   - бот отдаёт актуальный daily code по `/code`.

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
   - last request;
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

На этапе подготовки интеграции HTReviews дополнительно есть:

1. изолированный HTML adapter для `https://htreviews.org` внутри `src/integrations/htreviews`;
2. CLI dry-run import без записи в runtime-каталог Nomad;
3. preview snapshot, который можно использовать как staging-вход для будущей актуализации табаков;
4. rule-based candidate mapping в Nomad taxonomy:
   - `flavorProfiles`
   - `flavors`
   - `flavorTags`
5. отдельный sync path для наполнения текущей Nomad БД с безопасным default `inStock=false`.

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
- `GET /staff/access/telegram-operators`
- `POST /staff/access/telegram-operators`
- `PATCH /staff/access/telegram-operators/:id`
- `DELETE /staff/access/telegram-operators/:id`
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
- `GET /automation/telegram/operators/by-chat/:chatId`
- `POST /automation/telegram/operators/link`
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

## HTReviews preview import

Подготовительный import работает отдельно от runtime backend и не меняет текущий seed автоматически.

Базовый запуск:

```bash
cd apps/nomad-backend
npm run import:htreviews:preview
```

По умолчанию preview сохраняется в:

```text
apps/nomad-backend/data/imports/htreviews/preview.json
```

Поддерживаемые env-параметры:

1. `HTREVIEWS_BRAND_LIMIT` - ограничить число брендов для dry-run.
2. `HTREVIEWS_TOBACCO_LIMIT` - ограничить общее число вкусов.
3. `HTREVIEWS_FETCH_DETAILS` - `true/false`, тянуть ли detail pages.
4. `HTREVIEWS_DELAY_MS` - пауза между запросами.
5. `HTREVIEWS_BRAND_URLS` - CSV со списком brand URLs, если нужно обойти только выбранные бренды.
6. `HTREVIEWS_OUTPUT_PATH` - путь для snapshot файла.

Техническое замечание по источнику:

- HTReviews не всегда отдает полный список брендов и вкусов в initial HTML.
- Discovery брендов догружается через `getData?action=brands`.
- Для brand/line pages integration дополнительно ходит в `POST /postData` с `objectByBrand` / `objectByLine`, чтобы забрать вкусы за пределом первого `20`-элементного батча.
- В источнике встречаются разные HTReviews-карточки с одинаковыми `manufacturer + line + name`, поэтому source identity опирается на `sourceNumericId`, а не только на display name.

Пример минимального smoke-run:

```bash
cd apps/nomad-backend
HTREVIEWS_BRAND_URLS='https://htreviews.org/tobaccos/musthave' \
HTREVIEWS_TOBACCO_LIMIT=3 \
HTREVIEWS_DELAY_MS=100 \
npm run import:htreviews:preview
```

Ограничения текущего foundation-среза:

1. используется только публичный HTML, без `/api/*`;
2. import не апдейтит `NomadTobacco` автоматически;
3. результат нужно просматривать как staging snapshot перед будущим sync-контуром;
4. taxonomy mapping пока кандидатный и должен проходить product/data review.

Особенность текущего discovery:

1. initial brand list читается из HTML `/tobaccos/brands`;
2. если HTReviews держит часть брендов только в infinite-scroll выдаче, import дополнительно догружает их через публичный `getData?action=brands`;
3. это нужно для брендов, которые не попадают в первый server-rendered slice страницы.

## HTReviews DB sync

Если нужно не только preview, а реальное наполнение текущей Nomad БД:

```bash
cd apps/nomad-backend
DATABASE_URL='postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public' \
HTREVIEWS_BRAND_URLS='https://htreviews.org/tobaccos/musthave' \
HTREVIEWS_TOBACCO_LIMIT=20 \
npm run sync:htreviews
```

Поведение sync:

1. импорт идемпотентный: повторный прогон делает upsert по source IDs и fallback `brand + line + name`;
2. новые позиции по умолчанию попадают в каталог как `out-of-stock`, чтобы не ломать guest recommendations;
3. если позиция уже есть в Nomad БД, её текущий `inStock` сохраняется;
4. global discovery брендов не ограничен первым HTML-срезом `/tobaccos/brands` и добирает paginated brand pages через публичный `getData`;
5. для imported tobacco теперь хранятся:
   - `lineName`
   - `sourceKind`
   - `sourceUrl`
   - `sourceExternalId`
   - `country`
   - strength/status metadata
   - raw HTReviews tags

Дополнительный env:

1. `HTREVIEWS_DEFAULT_IN_STOCK=true|false` - default stock flag для новых импортированных записей.

## HTReviews detail backfill

Если каталог уже импортирован в `NomadTobacco`, но большая часть записей осталась summary-only без вкусов и крепости, используйте detail backfill:

```bash
cd apps/nomad-backend
DATABASE_URL='postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public' \
HTREVIEWS_DELAY_MS=10 \
HTREVIEWS_CONCURRENCY=8 \
HTREVIEWS_REQUEST_TIMEOUT_MS=20000 \
npm run backfill:htreviews:details
```

Что делает backfill:

1. проходит по уже импортированным `sourceKind='htreviews'` строкам;
2. тянет detail page каждого табака;
3. обновляет:
   - `description`
   - `country`
   - `officialStrength`
   - `communityStrength`
   - `productionStatus`
   - `rawSourceTags`
   - `flavorProfiles`
   - `flavors`
   - `flavorTags`
4. не меняет `inStock`;
5. после обновления табаков пересчитывает taxonomy у существующих `NomadMix` по их компонентам.

Дополнительный env:

1. `HTREVIEWS_TOBACCO_LIMIT` - ограничить число detail updates для smoke-run.
2. `HTREVIEWS_CONCURRENCY` - число параллельных worker'ов.
3. `HTREVIEWS_ONLY_MISSING_DESCRIPTION=1` - пройти только по строкам с пустым `description`.
4. `HTREVIEWS_ONLY_INCOMPLETE=1` - пройти только по строкам, где пуст хотя бы один core-атрибут (`country`, `officialStrength`, `communityStrength`, `productionStatus`, `description`).

## Live catalog seed (этап 1)

Production-БД при первом запуске не содержит seed-каталога. `ensureNomadState`
ставит только staff/коды/recipients/operators/intro; `NomadTobacco`,
`NomadMix`, `NomadMixComponent`, `NomadRail`, `NomadRailMix` стартуют пустыми
и наполняются отдельно из htreviews.org.

Чтобы налить каталог табаков в локальный продуктивный контур:

```bash
docker compose up -d db backend
docker compose --profile seed run --rm seeder
```

Сервис `seeder` использует тот же образ, что и `backend`, и под капотом
вызывает `npm run sync:htreviews`. Полный прогон сканирует все бренды
htreviews.org с подгрузкой деталей; контролируйте темп через env:

| Переменная | Назначение |
| --- | --- |
| `HTREVIEWS_DELAY_MS` | задержка между HTTP-запросами (по умолчанию 250 мс) |
| `HTREVIEWS_REQUEST_TIMEOUT_MS` | таймаут на запрос |
| `HTREVIEWS_BRAND_LIMIT` | top-N брендов (для smoke-прогона) |
| `HTREVIEWS_TOBACCO_LIMIT` | top-N табаков на бренд |
| `HTREVIEWS_FETCH_DETAILS` | `0`/`1`, подгружать страницу табака |
| `HTREVIEWS_BRAND_URLS` | список URL'ов брендов через запятую (точечный seed) |

После прогона `prisma.nomadTobacco.count()` > 0; вторичные вызовы
`sync:htreviews` идут upsert'ом, не теряя `inStock`. Миксы (`NomadMix`) и
rails (`NomadRail`) на этом этапе остаются пустыми — они будут наполнены на
этапах 2-3.

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

Для backend tests по умолчанию используется отдельная Prisma schema:

```bash
DATABASE_URL="postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=nomad_test"
```

`npm test` сам подготавливает `nomad_test` через `prisma db push` и не должен затрагивать рабочую `public` schema.

Отдельные bootstrap-only переменные для `npm run bootstrap:admin`:

```bash
NOMAD_BOOTSTRAP_ADMIN_LOGIN=nomad-admin
NOMAD_BOOTSTRAP_ADMIN_NAME="Nomad Admin"
NOMAD_BOOTSTRAP_ADMIN_PASSWORD=change-me-now
```

## Стадия

Текущая стадия: storage-backed MVP + Telegram automation + access management + audit trail + quality smoke baseline.

Текущая стадия: Phase 4 content rails backend + persisted access management + daily code automation + Telegram provisioning + Telegram automation state на отдельном Postgres.
