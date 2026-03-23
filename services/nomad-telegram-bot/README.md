# Nomad Telegram Bot

Сервис для автоматической выдачи и рассылки daily code в Nomad.

## Назначение

Это отдельный worker для продукта `Nomad`. Он не содержит продуктовую бизнес-логику и работает поверх backend automation endpoints:

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
3. При старте бот делает `ensure` current code и отправляет его в broadcast-чаты, если это ещё не было сделано для текущего кода.
4. По расписанию бот повторяет ту же проверку.
5. Ротация через `/rotate` деактивирует текущий код на backend и выпускает новый.
6. Последняя отправка сохраняется локально в `NOMAD_BOT_STATE_PATH`, чтобы не слать дубликаты после рестарта.

## Локальный запуск

```bash
cd services/nomad-telegram-bot
npm install
npm test
npm run build
npm run start
```

## Переменные окружения

```bash
TELEGRAM_BOT_TOKEN=
NOMAD_TELEGRAM_API_BASE_URL=https://api.telegram.org
NOMAD_BACKEND_URL=http://localhost:3021
NOMAD_BACKEND_AUTOMATION_TOKEN=
NOMAD_TELEGRAM_ALLOWED_CHAT_IDS=
NOMAD_TELEGRAM_BROADCAST_CHAT_IDS=
NOMAD_BOT_STATE_PATH=.nomad-telegram-bot-state.json
NOMAD_DAILY_CODE_PREFIX=NOMAD
NOMAD_DAILY_CODE_LABEL_PREFIX=Код на
NOMAD_DAILY_BROADCAST_HOUR=9
NOMAD_DAILY_BROADCAST_MINUTE=0
NOMAD_TELEGRAM_UPDATE_TIMEOUT_SECONDS=25
```

## Стадия

Текущая стадия: рабочий Nomad worker для daily code automation и staff рассылок.
