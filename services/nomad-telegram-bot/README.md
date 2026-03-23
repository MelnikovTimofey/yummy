# Nomad Telegram Bot

Сервис для автоматической выдачи и рассылки daily code в Nomad.

## Назначение

Это отдельный worker для продукта `Nomad`. Он не содержит продуктовую бизнес-логику и работает поверх automation API backend:

- `GET /automation/daily-code/current`
- `POST /automation/daily-code/ensure`
- `POST /automation/daily-code/rotate`

Бот делает три вещи:

1. отвечает на команды staff в Telegram;
2. автоматически рассылает текущий daily code по расписанию и при старте;
3. защищается от дублей через локальное состояние.

## Команды

- `/start` - приветствие и краткая навигация
- `/help` - список команд
- `/code` - показать текущий daily code
- `/rotate` - выпустить новый daily code и разослать его
- `/whoami` - показать информацию о чате и доступе

## Поведение

1. Команды доступны только чатам из `NOMAD_TELEGRAM_ALLOWED_CHAT_IDS`.
2. Авторассылка идёт в чаты из `NOMAD_TELEGRAM_BROADCAST_CHAT_IDS`.
3. Ручная `/rotate` ограничивается списком `NOMAD_TELEGRAM_ROTATE_CHAT_IDS`; если список пуст, используется allowlist.
4. При старте бот делает `ensure` current code и отправляет его в broadcast-чаты, если это ещё не было сделано для текущего кода.
5. По расписанию бот повторяет ту же проверку.
6. Ротация через `/rotate` выпускает новый код через automation endpoint backend.
7. Если backend уже хранит чаты Telegram, бот читает их через automation API и использует `.env` только как fallback.
8. Последняя отправка сохраняется локально в `NOMAD_BOT_STATE_PATH`, чтобы не слать дубликаты после рестарта.

## Локальный запуск

```bash
cd services/nomad-telegram-bot
npm install
npm test
npm run build
npm run start
```

## Managed runtime

Для production в репозитории подготовлены шаблоны:

1. `services/nomad-telegram-bot/ops/ecosystem.config.cjs` для `pm2`;
2. `services/nomad-telegram-bot/ops/nomad-telegram-bot.service` для `systemd`.

Они являются шаблонами и требуют адаптации путей:

1. рабочий каталог;
2. путь к `node`;
3. путь к env-файлу;
4. пользователь сервиса.

## Переменные окружения

```bash
TELEGRAM_BOT_TOKEN=
NOMAD_TELEGRAM_API_BASE_URL=https://api.telegram.org
NOMAD_BACKEND_URL=http://localhost:3021
NOMAD_BACKEND_AUTOMATION_TOKEN=
NOMAD_TELEGRAM_ALLOWED_CHAT_IDS=
NOMAD_TELEGRAM_BROADCAST_CHAT_IDS=
NOMAD_TELEGRAM_ROTATE_CHAT_IDS=
NOMAD_BOT_STATE_PATH=.nomad-telegram-bot-state.json
NOMAD_DAILY_BROADCAST_HOUR=9
NOMAD_DAILY_BROADCAST_MINUTE=0
NOMAD_TELEGRAM_UPDATE_TIMEOUT_SECONDS=25
```

Полная operating matrix по всем Nomad-сервисам зафиксирована в `NOMAD_ENV_MATRIX.md`.

## Стадия

Текущая стадия: рабочий Nomad worker для daily code automation и staff рассылок.
