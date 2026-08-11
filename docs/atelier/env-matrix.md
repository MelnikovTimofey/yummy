# Арома Ателье — Env Matrix

## 1. Назначение

Этот документ фиксирует production и development matrix для всех сервисов Арома Ателье.

Правило:

1. `.env.example` в приложениях описывает локальный минимальный запуск;
2. этот документ описывает полный operating набор переменных;
3. production secrets не должны коммититься в репозиторий.

## 2. apps/backend

### Required in all environments

| Переменная | Назначение | Пример |
|---|---|---|
| `DATABASE_URL` | подключение к Postgres Арома Ателье | `postgresql://...` |
| `PORT` | порт backend | `3021` |
| `HOST` | bind host | `0.0.0.0` |
| `APP_NAME` | service name | `atelier-backend` |
| `ATELIER_AUTOMATION_KEY` | M2M auth для бота | secret |
| `ATELIER_TOKEN_SECRET` | подпись staff token | secret |
| `ATELIER_TOKEN_TTL_HOURS` | TTL staff token | `24` |

### Bootstrap-only

| Переменная | Назначение |
|---|---|
| `ATELIER_BOOTSTRAP_ADMIN_LOGIN` | логин первого admin |
| `ATELIER_BOOTSTRAP_ADMIN_NAME` | display name первого admin |
| `ATELIER_BOOTSTRAP_ADMIN_PASSWORD` | пароль первого admin |

### Dev-only defaults допустимы

1. локальный `DATABASE_URL` на `127.0.0.1:5433`;
2. `ATELIER_AUTOMATION_KEY=atelier-local-automation-key`;
3. dev `ATELIER_TOKEN_SECRET=change-me`.

### Production notes

1. не использовать `prisma seed` как путь создания production admin;
2. использовать `npm run bootstrap:admin`;
3. `ATELIER_AUTOMATION_KEY` и `ATELIER_TOKEN_SECRET` должны быть независимыми secret values.

## 3. apps/aroma-web

### Required

| Переменная | Назначение | Пример |
|---|---|---|
| `VITE_API_BASE_URL` | base URL backend | `https://api.nomad.example` |

### Production notes

1. должен указывать на production backend Арома Ателье;
2. не должен указывать на legacy `backend`.

## 4. apps/master-web

### Required

| Переменная | Назначение | Пример |
|---|---|---|
| `VITE_API_BASE_URL` | base URL backend | `https://api.nomad.example` |

### Production notes

1. должен указывать на тот же backend, что и `Арома Ателье`;
2. CORS и origin policy проверяются на стороне backend.

## 5. services/telegram-bot

### Required in production

| Переменная | Назначение |
|---|---|
| `TELEGRAM_BOT_TOKEN` | токен Telegram-бота |
| `ATELIER_TELEGRAM_API_BASE_URL` | Telegram API base URL |
| `ATELIER_BACKEND_URL` | base URL backend Арома Ателье |
| `ATELIER_BACKEND_AUTOMATION_TOKEN` | должен совпадать с backend `ATELIER_AUTOMATION_KEY` |
| `ATELIER_BOT_STATE_PATH` | локальный state-файл бота |
| `ATELIER_DAILY_BROADCAST_HOUR` | час ежедневного `ensure` current code |
| `ATELIER_DAILY_BROADCAST_MINUTE` | минута ежедневного `ensure` current code |
| `ATELIER_TELEGRAM_UPDATE_TIMEOUT_SECONDS` | long-poll timeout |

### Production notes

1. source of truth по Telegram access должен жить в backend allowlist по телефонам;
2. first-link идёт через `share contact`, после чего backend привязывает `chatId` к allowlist-номеру;
3. `ATELIER_DAILY_BROADCAST_*` сохраняют старое имя только ради совместимости env, но управляют уже не рассылкой, а ежедневным `ensure` current code;
4. `ATELIER_BACKEND_AUTOMATION_TOKEN` должен ротироваться отдельно от staff credentials.

## 6. Secret ownership

### Backend

1. `ATELIER_AUTOMATION_KEY`
2. `ATELIER_TOKEN_SECRET`
3. `DATABASE_URL`

### Telegram bot

1. `TELEGRAM_BOT_TOKEN`
2. `ATELIER_BACKEND_AUTOMATION_TOKEN`

### Bootstrap operation

1. `ATELIER_BOOTSTRAP_ADMIN_PASSWORD`

## 7. Минимальный production комплект

Для первого production/pilot запуска должны быть заданы:

1. backend:
   - `DATABASE_URL`
   - `ATELIER_AUTOMATION_KEY`
   - `ATELIER_TOKEN_SECRET`
2. web:
   - `VITE_API_BASE_URL` в обоих фронтах
3. bot:
   - `TELEGRAM_BOT_TOKEN`
   - `ATELIER_BACKEND_URL`
   - `ATELIER_BACKEND_AUTOMATION_TOKEN`
   - `ATELIER_BOT_STATE_PATH`
