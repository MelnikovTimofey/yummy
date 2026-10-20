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
| `DATABASE_URL` | подключение к Postgres Арома Ателье | `postgresql://...` (в `docker-compose.prod.yml` собирается из `POSTGRES_PASSWORD`) |
| `PORT` | порт backend | `3021` |
| `HOST` | bind host | `0.0.0.0` |
| `APP_NAME` | service name | `atelier-backend` |
| `TZ` | часовой пояс точки: границы дня дашборда, недели расхода, месяц трат | `Europe/Volgograd` (задан в `docker-compose.prod.yml`) |
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

1. в прод-контуре Postgres — сервис `db` того же compose; оператор задаёт только
   `POSTGRES_PASSWORD` (URL-безопасные символы), `DATABASE_URL` compose собирает сам;
2. не использовать `prisma seed` как путь создания production admin;
3. использовать `npm run bootstrap:admin`;
4. `ATELIER_AUTOMATION_KEY`, `ATELIER_TOKEN_SECRET` и `POSTGRES_PASSWORD` должны быть независимыми secret values.

## 3. apps/aroma-web

### Required

| Переменная | Назначение | Пример |
|---|---|---|
| `VITE_API_BASE_URL` | base URL backend | `https://api.atelier.example` |

### Production notes

1. должен указывать на production backend Арома Ателье;
2. не должен указывать на legacy `backend`.

## 4. apps/master-web

### Required

| Переменная | Назначение | Пример |
|---|---|---|
| `VITE_API_BASE_URL` | base URL backend | `https://api.atelier.example` |
| `VITE_AROMA_WEB_URL` | адрес гостевого контура для кнопки «Витрина гостя»; в проде `https://${AROMA_DOMAIN}` | `https://atelier.example` |

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

### Туннель до Telegram (хосты без IPv6)

| Переменная | Назначение |
|---|---|
| `COMPOSE_PROFILES` | `tg-tunnel` — включает сервис `telegram-tunnel` |
| `TG_TUNNEL_TARGET` | `user@host` SSH-хоста вне РФ |
| `TG_TUNNEL_PORT` | SSH-порт этого хоста (по умолчанию `22`) |

Ключ и `known_hosts` — файлы в `secrets/telegram-tunnel/` на прод-хосте, не env.

### Production notes

1. source of truth по Telegram access должен жить в backend allowlist по телефонам;
2. first-link идёт через `share contact`, после чего backend привязывает `chatId` к allowlist-номеру;
3. `ATELIER_DAILY_BROADCAST_*` сохраняют старое имя только ради совместимости env, но управляют уже не рассылкой, а ежедневным `ensure` current code;
4. `ATELIER_BACKEND_AUTOMATION_TOKEN` должен ротироваться отдельно от staff credentials.

## 4a. Версии образов (прод-хост)

Пишет `scripts/atelier/deploy.sh` после успешной выкатки, руками не править.
Не заданы — compose берёт плавающий тег `main`.

| Переменная | Назначение | Пример |
|---|---|---|
| `ATELIER_TAG_BACKEND`, `ATELIER_TAG_AROMA_WEB`, `ATELIER_TAG_MASTER_WEB`, `ATELIER_TAG_TELEGRAM_BOT`, `ATELIER_TAG_TELEGRAM_TUNNEL` | выкаченный тег образа сервиса в `ghcr.io/melnikovtimofey/atelier-<сервис>` (SHA коммита) | `4037385b…` |

## 5a. Бэкап БД в S3 (прод-хост)

Файл `/opt/atelier/.env.backup` (права 600, в git не коммитится) — читают
`scripts/atelier/pg-backup.sh` и `pg-restore-check.sh`.

| Переменная | Назначение | Пример |
|---|---|---|
| `BACKUP_S3_ENDPOINT` | S3-совместимый endpoint | `https://s3.twcstorage.ru` |
| `BACKUP_S3_REGION` | регион бакета | `ru-1` |
| `BACKUP_S3_BUCKET` | бакет под дампы | `atelier-backups` |
| `BACKUP_S3_ACCESS_KEY` | ключ доступа к бакету | secret |
| `BACKUP_S3_SECRET_KEY` | секретный ключ | secret |
| `BACKUP_S3_KEEP_HOURLY` | сколько часовых дампов хранить в S3 `hourly/` (по умолчанию `48`) | `48` |
| `BACKUP_S3_KEEP_DAILY` | сколько дневных дампов хранить в S3 `daily/` (по умолчанию `30`) | `30` |
| `BACKUP_DAILY_HOUR` | час UTC, дамп которого становится дневным (по умолчанию `03`) | `03` |
| `BACKUP_LOCAL_HOURLY_HOURS` | сколько часов хранить часовые дампы на хосте (по умолчанию `24`) | `24` |
| `BACKUP_LOCAL_DAYS` | сколько дней хранить дневные дампы на хосте (по умолчанию `14`) | `14` |

## 5b. Мониторинг (прод-хост и GitHub)

Файл `/opt/atelier/.env.monitor` (права 600, в git не коммитится) — читает
`scripts/atelier/host-check.sh`. Те же значения — в секретах GitHub-репозитория
для `.github/workflows/atelier-uptime.yml`.

| Переменная | Назначение | Пример |
|---|---|---|
| `ATELIER_ALERT_BOT_TOKEN` | токен отдельного бота для алертов | secret |
| `ATELIER_ALERT_CHAT_ID` | чат, куда слать алерты | `123456789` |

## 6. Secret ownership

### Backend

1. `ATELIER_AUTOMATION_KEY`
2. `ATELIER_TOKEN_SECRET`
3. `POSTGRES_PASSWORD` (из него собирается `DATABASE_URL`)

### Telegram bot

1. `TELEGRAM_BOT_TOKEN`
2. `ATELIER_BACKEND_AUTOMATION_TOKEN`

### Бэкап БД

1. `BACKUP_S3_ACCESS_KEY`, `BACKUP_S3_SECRET_KEY`

### Мониторинг

1. `ATELIER_ALERT_BOT_TOKEN` (хост + секрет GitHub)

### Bootstrap operation

1. `ATELIER_BOOTSTRAP_ADMIN_PASSWORD`

## 7. Минимальный production комплект

Для первого production/pilot запуска должны быть заданы:

1. backend:
   - `POSTGRES_PASSWORD`
   - `ATELIER_AUTOMATION_KEY`
   - `ATELIER_TOKEN_SECRET`
2. web:
   - `VITE_API_BASE_URL` в обоих фронтах
3. bot:
   - `TELEGRAM_BOT_TOKEN`
   - `ATELIER_BACKEND_URL`
   - `ATELIER_BACKEND_AUTOMATION_TOKEN`
   - `ATELIER_BOT_STATE_PATH`
