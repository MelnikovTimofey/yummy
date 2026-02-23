# Catalog Updater (микросервис обновления каталога)

Отдельный сервис для обновления базы табаков и миксов.

Назначение:
- отделить ingestion/обновление данных от пользовательского API backend;
- запускать обновление вручную или по расписанию;
- хранить в backend только чтение и продуктовые endpoint-ы.

## Что обновляет

Сущности в общей PostgreSQL базе:
- `Manufacturer`
- `Tobacco`
- `Mix`
- `MixComponent`
- `User` (технический автор импортированных миксов)

## Локальный запуск

1. Установить зависимости:
```bash
npm install
```

2. Создать `.env`:
```bash
cp .env.example .env
```

3. Сгенерировать Prisma Client (используется схема backend):
```bash
npm run prisma:generate
```

4. Запустить сервис:
```bash
npm run dev
```

По умолчанию сервис доступен на `http://localhost:3011`.

## API

- `GET /health`
- `POST /jobs/refresh`
- `GET /jobs`
- `GET /jobs/:id`

### POST /jobs/refresh

Тело запроса:
```json
{
  "includeLocalSeeds": true,
  "includeMustHaveMixes": false,
  "mustHaveFromId": 1,
  "mustHaveToId": 2000,
  "delayMs": 250
}
```

Минимум один источник должен быть включен:
- `includeLocalSeeds`
- `includeMustHaveMixes`

Если задан `UPDATER_API_KEY`, нужно передать заголовок `x-api-key`.

## Источники данных

- `local-seed`: файлы `backend/seed/tobaccos.json` и `backend/seed/mixes.json`
- `musthave-mixes`: парсинг карточек миксов MustHave

## Ограничения текущего этапа

- Пока нет cron внутри сервиса (запуск через внешний scheduler/CI).
- Источник табаков сейчас только из локального seed.
- Логика нормализации и алиасы базовые; будут расширяться отдельными PR.
