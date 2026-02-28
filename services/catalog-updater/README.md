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
  "includeHookahPortalTobaccos": false,
  "hookahPortalTobaccosLimit": 250,
  "hookahPortalMixesLimit": 250,
  "hookahPortalDelayMs": 100
}
```

Минимум один источник должен быть включен:
- `includeLocalSeeds`
- `includeHookahPortalTobaccos`

Если задан `UPDATER_API_KEY`, нужно передать заголовок `x-api-key`.

## Источники данных

- `local-seed`: только табаки из `backend/seed/tobaccos.json`
- `hookahportal-catalog-test`: тестовый импорт табаков и миксов из `https://hookahportal.ru`

## Test-only источник HookahPortal

По умолчанию источник отключен. Для включения:

1. Установить `CATALOG_ALLOW_TEST_SOURCES=true`
2. Передать в job:
```json
{
  "includeHookahPortalTobaccos": true,
  "hookahPortalTobaccosLimit": 2683,
  "hookahPortalMixesLimit": 1018
}
```

Рекомендуется использовать только в тестовом контуре.

## Локальный JSON-кеш HookahPortal

Updater поддерживает кеш в файлах:
- `cache/hookahportal/tobaccos.json`
- `cache/hookahportal/mixes.json`

Параметры окружения:
- `HOOKAHPORTAL_CACHE_DIR` путь к кешу
- `HOOKAHPORTAL_CACHE_READ=true|false` читать данные из кеша
- `HOOKAHPORTAL_CACHE_WRITE=true|false` записывать кеш после загрузки
- `HOOKAHPORTAL_CONCURRENCY` параллельная загрузка страниц
- `HOOKAHPORTAL_TIMEOUT_MS` таймаут одного HTTP-запроса

Рекомендуемый режим для локальной разработки:
- первый прогон: `HOOKAHPORTAL_CACHE_READ=false`, `HOOKAHPORTAL_CACHE_WRITE=true`
- повторные прогоны: `HOOKAHPORTAL_CACHE_READ=true`, `HOOKAHPORTAL_CACHE_WRITE=false`

## Обновление артефактов и БД

Через npm-скрипты:
```bash
cd /Users/admin/PycharmProjects/yummy/services/catalog-updater
npm run cache:refresh:hookahportal
DATABASE_URL='postgresql://yummy:yummy@localhost:5432/yummy' npm run catalog:refresh:from-cache
```

Обновить локальные JSON-артефакты:
```bash
cd /Users/admin/PycharmProjects/yummy/services/catalog-updater
npm run build
HOOKAHPORTAL_CACHE_READ=false HOOKAHPORTAL_CACHE_WRITE=true node -e "
const path=require('node:path');
const { loadHookahPortalCatalog }=require('./dist/importers/hookahPortalTobaccoImporter');
(async()=>{await loadHookahPortalCatalog({
  tobaccosSitemapUrl:'https://hookahportal.ru/tobaccos.xml',
  mixesSitemapUrl:'https://hookahportal.ru/mixes.xml',
  maxTobaccos:2683,
  maxMixes:1018,
  delayMs:0,
  concurrency:16,
  timeoutMs:15000,
  cacheDir:path.resolve('./cache/hookahportal'),
  cacheRead:false,
  cacheWrite:true
});})().catch(e=>{console.error(e);process.exit(1);});
"
```

Перезалить БД только из кеша:
```bash
DATABASE_URL='postgresql://yummy:yummy@localhost:5432/yummy' \
CATALOG_ALLOW_TEST_SOURCES=true \
HOOKAHPORTAL_CACHE_READ=true \
HOOKAHPORTAL_CACHE_WRITE=false \
node -e "
const { runRefreshCatalogJob }=require('./dist/jobs/refreshCatalogJob');
(async()=>{console.log(await runRefreshCatalogJob({
  includeLocalSeeds:false,
  includeHookahPortalTobaccos:true,
  hookahPortalTobaccosLimit:2683,
  hookahPortalMixesLimit:1018,
  hookahPortalDelayMs:0
}));})().catch(e=>{console.error(e);process.exit(1);});
"
```

## Ограничения текущего этапа

- Пока нет cron внутри сервиса (запуск через внешний scheduler/CI).
- Логика нормализации и алиасы базовые; будут расширяться отдельными PR.
