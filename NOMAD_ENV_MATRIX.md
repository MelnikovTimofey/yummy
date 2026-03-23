# Nomad Env Matrix

## 1. Назначение

Этот документ фиксирует production и development matrix для всех Nomad-сервисов.

Правило:

1. `.env.example` в приложениях описывает локальный минимальный запуск;
2. этот документ описывает полный operating набор переменных;
3. production secrets не должны коммититься в репозиторий.

## 2. apps/nomad-backend

### Required in all environments

| Переменная | Назначение | Пример |
|---|---|---|
| `DATABASE_URL` | подключение к Nomad Postgres | `postgresql://...` |
| `PORT` | порт backend | `3021` |
| `HOST` | bind host | `0.0.0.0` |
| `APP_NAME` | service name | `nomad-backend` |
| `NOMAD_AUTOMATION_KEY` | M2M auth для бота | secret |
| `NOMAD_TOKEN_SECRET` | подпись staff token | secret |
| `NOMAD_TOKEN_TTL_HOURS` | TTL staff token | `24` |

### Bootstrap-only

| Переменная | Назначение |
|---|---|
| `NOMAD_BOOTSTRAP_ADMIN_LOGIN` | логин первого admin |
| `NOMAD_BOOTSTRAP_ADMIN_NAME` | display name первого admin |
| `NOMAD_BOOTSTRAP_ADMIN_PASSWORD` | пароль первого admin |

### Dev-only defaults допустимы

1. локальный `DATABASE_URL` на `127.0.0.1:5433`;
2. `NOMAD_AUTOMATION_KEY=nomad-local-automation-key`;
3. dev `NOMAD_TOKEN_SECRET=change-me`.

### Production notes

1. не использовать `prisma seed` как путь создания production admin;
2. использовать `npm run bootstrap:admin`;
3. `NOMAD_AUTOMATION_KEY` и `NOMAD_TOKEN_SECRET` должны быть независимыми secret values.

## 3. apps/nomad-aroma-web

### Required

| Переменная | Назначение | Пример |
|---|---|---|
| `VITE_API_BASE_URL` | base URL backend | `https://api.nomad.example` |

### Production notes

1. должен указывать на production Nomad backend;
2. не должен указывать на legacy `backend`.

## 4. apps/nomad-master-web

### Required

| Переменная | Назначение | Пример |
|---|---|---|
| `VITE_API_BASE_URL` | base URL backend | `https://api.nomad.example` |

### Production notes

1. должен указывать на тот же Nomad backend, что и `Арома Ателье`;
2. CORS и origin policy проверяются на стороне backend.

## 5. services/nomad-telegram-bot

### Required in production

| Переменная | Назначение |
|---|---|
| `TELEGRAM_BOT_TOKEN` | токен Telegram-бота |
| `NOMAD_TELEGRAM_API_BASE_URL` | Telegram API base URL |
| `NOMAD_BACKEND_URL` | base URL Nomad backend |
| `NOMAD_BACKEND_AUTOMATION_TOKEN` | должен совпадать с backend `NOMAD_AUTOMATION_KEY` |
| `NOMAD_BOT_STATE_PATH` | локальный state-файл бота |
| `NOMAD_DAILY_BROADCAST_HOUR` | час авторассылки |
| `NOMAD_DAILY_BROADCAST_MINUTE` | минута авторассылки |
| `NOMAD_TELEGRAM_UPDATE_TIMEOUT_SECONDS` | long-poll timeout |

### Fallback-only

Эти переменные можно оставить пустыми, если recipient lists ведутся через backend:

| Переменная | Назначение |
|---|---|
| `NOMAD_TELEGRAM_ALLOWED_CHAT_IDS` | fallback allowlist |
| `NOMAD_TELEGRAM_BROADCAST_CHAT_IDS` | fallback broadcast list |
| `NOMAD_TELEGRAM_ROTATE_CHAT_IDS` | fallback rotate list |

### Production notes

1. source of truth по recipient lists лучше держать в backend;
2. `.env` остаётся fallback path на случай аварийного запуска;
3. `NOMAD_BACKEND_AUTOMATION_TOKEN` должен ротироваться отдельно от staff credentials.

## 6. Secret ownership

### Backend

1. `NOMAD_AUTOMATION_KEY`
2. `NOMAD_TOKEN_SECRET`
3. `DATABASE_URL`

### Telegram bot

1. `TELEGRAM_BOT_TOKEN`
2. `NOMAD_BACKEND_AUTOMATION_TOKEN`

### Bootstrap operation

1. `NOMAD_BOOTSTRAP_ADMIN_PASSWORD`

## 7. Минимальный production комплект

Для первого production/pilot запуска должны быть заданы:

1. backend:
   - `DATABASE_URL`
   - `NOMAD_AUTOMATION_KEY`
   - `NOMAD_TOKEN_SECRET`
2. web:
   - `VITE_API_BASE_URL` в обоих фронтах
3. bot:
   - `TELEGRAM_BOT_TOKEN`
   - `NOMAD_BACKEND_URL`
   - `NOMAD_BACKEND_AUTOMATION_TOKEN`
   - `NOMAD_BOT_STATE_PATH`
