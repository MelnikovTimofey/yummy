# Nomad

Репозиторий продукта Nomad — каталог кальянных табаков и миксов.

## Поверхности

- `apps/nomad-aroma-web` — гостевой `Арома Ателье` (без авторизации);
- `apps/nomad-master-web` — backoffice `Мастер`;
- `apps/nomad-backend` — Node/TypeScript + Prisma + Postgres;
- `services/nomad-telegram-bot` — Telegram-бот;
- `tests/nomad-smoke` — smoke-тесты.

## Legacy Yummy

Исходный продукт Yummy вынесен в отдельный архивный репозиторий
[MelnikovTimofey/yummy](https://github.com/MelnikovTimofey/yummy) с сохранением
истории. В этом репозитории legacy-код больше не поддерживается. Состояние
монорепо до split зафиксировано tag-ом `pre-legacy-split`.

## Запуск

### Через Docker Compose (рекомендуется)

Полный контур (Postgres + backend + оба веба) — одной командой из корня:

```bash
cp .env.example .env       # отредактировать секреты при необходимости
docker compose up --build
```

После старта:

- `Арома Ателье` — http://localhost:4174
- `Мастер` — http://localhost:4175
- Backend API — http://localhost:3021
- Postgres — `localhost:5433` (логин/пароль `nomad/nomad`, db `nomad`)

Telegram-бот вынесен в profile `bot`, т.к. требует `TELEGRAM_BOT_TOKEN`:

```bash
docker compose --profile bot up --build telegram-bot
```

Полезные команды:

```bash
docker compose up backend aroma-web       # частичный стек
docker compose logs -f backend            # логи сервиса
docker compose down                       # стоп
docker compose down -v                    # стоп + сброс данных (volume nomad_db)
```

### Наполнение продуктовыми данными

Свежий `docker compose up` поднимает БД с **пустыми** контентными таблицами
(`NomadTobacco`, `NomadMix`, `NomadRail`). Продуктовое наполнение — это два
шага: сначала каталог табаков из `htreviews.org`, затем миксы и prepared-рейлы
из [`docs/data/`](docs/data/).

**TL;DR — быстро налить весь продуктовый контент:**

```bash
docker compose up -d db backend
docker compose --profile seed run --rm seeder            # 1) каталог табаков htreviews
cd apps/nomad-backend && npm run build:catalog -- --yes  # 2) миксы + prepared-рейлы
```

Подробнее по шагам — ниже; полный справочник наполнения и бэкап/restore —
в [`docs/data/README.md`](docs/data/README.md).

#### Шаг 1. Каталог табаков

Чтобы налить production-каталог из `htreviews.org` — одноразовый прогон
seeder-профиля:

```bash
# Поднять минимум — db + backend
docker compose up -d db backend

# Налить полный live-каталог htreviews (~сотни брендов × десятки SKU)
docker compose --profile seed run --rm seeder
```

Прогон идемпотентен: повторный запуск делает upsert и не теряет `inStock`.

Темп и охват — через переменные в `.env` (см. [`.env.example`](.env.example)):

| Переменная | Назначение |
| --- | --- |
| `HTREVIEWS_DELAY_MS` | задержка между HTTP-запросами (по умолчанию 250 мс) |
| `HTREVIEWS_REQUEST_TIMEOUT_MS` | таймаут на запрос |
| `HTREVIEWS_BRAND_LIMIT` | top-N брендов (для smoke-прогона) |
| `HTREVIEWS_TOBACCO_LIMIT` | top-N табаков на бренд |
| `HTREVIEWS_FETCH_DETAILS` | `0`/`1`, подгружать страницу табака |
| `HTREVIEWS_BRAND_URLS` | список URL'ов брендов через запятую (точечный seed) |

Быстрый smoke (1 бренд × 10 SKU, ~минута):

```bash
HTREVIEWS_BRAND_LIMIT=1 HTREVIEWS_TOBACCO_LIMIT=10 \
  docker compose --profile seed run --rm seeder
```

Проверить наполнение:

```bash
docker compose exec db psql -U nomad -d nomad \
  -c "SELECT COUNT(*) FROM \"NomadTobacco\" WHERE \"sourceKind\" = 'htreviews';"
```

#### Шаг 2. Миксы и prepared-рейлы

Каталог залит — теперь поверх него собираются 20 миксов и 5 prepared-рейлов
из [`docs/data/`](docs/data/). Скрипт читает источники из рабочего дерева репо,
поэтому запускается **нативно** против поднятой БД (порт 5433):

```bash
cd apps/nomad-backend
npm run build:catalog            # превью: отчёт по матчингу, БД не меняется
npm run build:catalog -- --yes   # запись: миксы + prepared-рейлы
```

Прогон идемпотентен; матчит компоненты на реальные `NomadTobacco`, помечает
каталог `inStock=true` (иначе миксы не видны гостю) и пропускает миксы с
несопоставленным компонентом (текущий итог — 15/20, пропуски в логе).
Statistical-рейлы backend синтезирует на лету — их грузить не нужно. Детали и
проверка наполнения — в [`docs/data/README.md`](docs/data/README.md).

`VITE_API_BASE_URL` зашивается в bundle на этапе сборки (build-arg); по
умолчанию указывает на `http://localhost:3021`. Меняется через
`AROMA_VITE_API_BASE_URL` / `MASTER_VITE_API_BASE_URL` в `.env` — после
изменения нужен `docker compose build aroma-web master-web`.

### Без Docker (нативно)

Требования: Node.js 20+, npm 10+, локально доступный Postgres 16 (или
поднять только БД через docker: `cd apps/nomad-backend && npm run db:start`).

```bash
# 1. БД (если нет своей)
cd apps/nomad-backend
npm run db:start             # docker compose up -d db (порт 5433)

# 2. Backend (отдельный терминал)
cd apps/nomad-backend
npm install
export DATABASE_URL='postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public'
npx prisma db push
npm run dev                  # http://localhost:3021

# 3. Aroma web (отдельный терминал)
cd apps/nomad-aroma-web
npm install
npm run dev                  # http://localhost:5174

# 4. Master web (отдельный терминал)
cd apps/nomad-master-web
npm install
npm run dev                  # http://localhost:5176

# 5. Telegram-бот (опционально, отдельный терминал)
cd services/nomad-telegram-bot
npm install
export TELEGRAM_BOT_TOKEN=...
export NOMAD_BACKEND_URL=http://localhost:3021
export NOMAD_BACKEND_AUTOMATION_TOKEN=nomad-local-automation-key
npm run dev
```

Полный список переменных окружения — в [`.env.example`](.env.example).

## Документация

- [`CLAUDE.md`](CLAUDE.md) — правила разработки, процесс, роли агентов (читать первым).
- [`PRD.md`](PRD.md) — продуктовое видение Nomad.
- [`HANDOFF.md`](HANDOFF.md) — журнал последних значимых изменений.
- [`docs/nomad/`](docs/nomad/) — план реализации, roadmap, env-matrix, чек-листы.
- [`.github/`](.github/) — issue-шаблоны, PR-шаблон, CI и review-policy.

## Разработка

Production-ветка — `main`. Рабочие ветки именуются `feature/<slug>` (новый
функционал, рефакторинг, документация) или `bug/<slug>` (исправление). Процесс
описан в [`CLAUDE.md`](CLAUDE.md): задача начинается с GitHub issue, ведётся
вертикальными срезами по KISS и TDD, завершается PR в `main`. Кастомные
субагенты и скиллы — в [`.claude/`](.claude/).
