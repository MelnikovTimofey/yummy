# Telegram-бот Арома Ателье

Сервис для автоматической выдачи daily code по request-модели.

## Назначение

Это отдельный worker для контура `Арома Ателье`. Он не содержит продуктовую бизнес-логику и работает поверх automation API backend:

- `GET /automation/daily-code/current`
- `POST /automation/daily-code/ensure`
- `POST /automation/daily-code/rotate`
- `GET /automation/telegram/operators/by-chat/:chatId`
- `POST /automation/telegram/operators/link`
- `GET /automation/telegram/state`
- `POST /automation/telegram/state/report`

Бот делает три вещи:

1. отвечает на команды staff в Telegram;
2. связывает chat id с allowlist-номером после `share contact`;
3. гарантирует наличие актуального кода на текущую неделю (пн–вс по Москве) и отдаёт его по `/code`.

## Команды

- `/start` - приветствие и краткая навигация
- `/help` - список команд
- `/code` - показать текущий daily code
- `/whoami` - показать информацию о чате и текущей привязке

## Поведение

1. При первом входе оператор обязан поделиться своим контактом в Telegram.
2. Бот сверяет номер телефона с backend allowlist и привязывает текущий `chatId`.
3. После привязки `/code` отдаёт текущий автоматически выпущенный daily code.
4. По расписанию бот делает `ensure` current code, чтобы код существовал для нового дня ещё до первого запроса.
5. Бот отправляет heartbeat, request events и ошибки в backend, чтобы `Мастер` видел текущее состояние automation без чтения логов.

## Режим входа гостей (`ATELIER_BOT_MODE=guest-login`)

Тот же образ запускается вторым ботом — `@aroma_atelier_client_bot`, провайдером
входа гостя в кабинет (PRD §3.3, #239, #266). В этом режиме работает только
обработчик входа: staff-команды, allowlist, код смены, рассылки и отчёты
состояния в backend выключены.

1. `/start <код>` → `POST /automation/guest-login/confirm { code, telegramId }`:
   - `200` — «Готово — вернитесь в Ателье.» с кнопкой «Вернуться в Ателье»
     (`ATELIER_GUEST_LOGIN_RETURN_URL`);
   - `404` / `410` — «Ссылка устарела. Нажмите «Войти через Telegram» на сайте ещё раз.»;
   - сеть или другой код — «Не получилось подтвердить вход. Попробуйте ещё раз через минуту.»
2. `/start` без кода и любое другое сообщение — одна справка о том, что войти
   можно кнопкой «Войти через Telegram» на сайте заведения.
3. В логах — только факт подтверждения и HTTP-код backend: без имени, username,
   текста сообщений и кода входа.

## Локальный запуск

```bash
cd services/telegram-bot
npm install
npm test
npm run build
npm run start
```

## Managed runtime

Для production в репозитории подготовлены шаблоны:

1. `services/telegram-bot/ops/ecosystem.config.cjs` для `pm2`;
2. `services/telegram-bot/ops/telegram-bot.service` для `systemd`.

Они являются шаблонами и требуют адаптации путей:

1. рабочий каталог;
2. путь к `node`;
3. путь к env-файлу;
4. пользователь сервиса.

## Переменные окружения

```bash
TELEGRAM_BOT_TOKEN=
ATELIER_TELEGRAM_API_BASE_URL=https://api.telegram.org
ATELIER_BACKEND_URL=http://localhost:3021
ATELIER_BACKEND_AUTOMATION_TOKEN=
ATELIER_BOT_STATE_PATH=.atelier-telegram-bot-state.json
ATELIER_DAILY_BROADCAST_HOUR=9
ATELIER_DAILY_BROADCAST_MINUTE=0
ATELIER_TELEGRAM_UPDATE_TIMEOUT_SECONDS=25
# staff (по умолчанию) или guest-login
ATELIER_BOT_MODE=staff
# только для guest-login: адрес кнопки «Вернуться в Ателье»
ATELIER_GUEST_LOGIN_RETURN_URL=
```

Полная operating matrix по всем сервисам контура зафиксирована в `docs/atelier/env-matrix.md`.

## Стадия

Текущая стадия: рабочий worker для `share contact -> /code` flow и backend-reported heartbeat/request status.
