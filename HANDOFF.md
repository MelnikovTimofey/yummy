# HANDOFF — Yummy

## 0) Последнее обновление (28 февраля 2026, финальная миграция каталога)

- Схема табака приведена к целевому виду:
  - `flavorProfiles` (+ `perfume`),
  - `flavors` (отдельный массив вкусов),
  - `flavorTags` только для мета-тегов (`редкие`, `напитки`, `охлаждающий`),
  - `line` удалён.
- Применены миграции:
  - `20260228213000_tobacco_flavor_perfume_cleanup`
  - `20260228222000_sanitize_tobacco_flavor_fields`
- Выполнен полный uncached refresh из единственного источника `hookahportal.ru`:
  - job: `11944911-aebf-4bd0-affd-e26e5421bf51`
  - `input.tobaccos=2585`, `input.mixes=602`
  - `tobaccosCreated=33`, `tobaccosUpdated=2552`
  - `mixesCreated=54`, `mixesUpdated=510`, `mixesSkipped=38`
- Итоговая контрольная выборка для `RED`:
  - `flavorProfiles={floral_herbal,perfume}`
  - `flavorTags={редкие}`
  - `flavors={травы}`
- Контроль чистоты таксономии:
  - `tobaccos_with_non_meta_tags = 0`
  - в таблице `Tobacco` нет колонок `line` и `flavor` (используется `flavors`).

## 1) Статус на 23 февраля 2026 (обновлено: 28 февраля 2026)

- Каталог обновляется отдельным микросервисом `services/catalog-updater`.
- Источник миксов и табаков для тестового наполнения: `hookahportal.ru`.
- Поддержан локальный JSON-кеш артефактов:
  - `/Users/admin/PycharmProjects/yummy/services/catalog-updater/cache/hookahportal/tobaccos.json`
  - `/Users/admin/PycharmProjects/yummy/services/catalog-updater/cache/hookahportal/mixes.json`
- В `local-seed` оставлены только табаки (миксы из `local-seed` не используются).
- Все импортированные миксы пишутся с автором `hookahportal`.
- Добавлен корневой `docker-compose.yml` для полного контура:
  - `db`, `mailpit`, `backend`, `catalog-updater`, `yummy-web`
  - profile `setup`: `backend-migrate`, `backend-seed`
  - profile `ml`: `ml`
- Добавлены команды в `services/catalog-updater`:
  - `npm run cache:refresh:hookahportal`
  - `npm run catalog:refresh:from-cache`
- Добавлен `backend`-скрипт запуска импорта через updater:
  - `npm run import:tobaccos`
- Каталоговая модель расширена до prod-ready таксономии:
  - `FlavorProfile`: добавлены `minty`, `fruity`, `floral_herbal`, `citrus`, `berry`
  - `Tobacco`: используется `flavors` + `flavorTags` (мета-теги), `line` удалён
  - `Mix`: добавлен `flavors`, наследование `flavorProfiles/flavors/tags` от компонент

## 2) Актуальные артефакты каталога

По состоянию на обновление артефактов:
- `tobaccos.json`: `count=2616`, `fetchedAt=2026-02-23T16:19:44.798Z`
- `mixes.json`: `count=587`, `fetchedAt=2026-02-23T16:27:54.944Z`

## 3) Последняя проверенная загрузка в БД (только HookahPortal)

Последний запуск refresh-job (28 февраля 2026, `id=7f01ddd7-fc8a-4865-9258-14d22a3f24a4`):
- `sourceNames`: `["hookahportal-catalog-test"]` (только HookahPortal)
- `input`: `tobaccos=2592`, `mixes=581`
- `tobaccosUpdated=2592`
- `mixesUpdated=533`
- `mixesSkipped=48`

Текущие размеры таблиц после пересборки:
- `Manufacturer`: `72`
- `Tobacco`: `2592`
- `Mix`: `533`
- `MixComponent`: `1771`

Примечания:
- Импорт выполнялся через `runRefreshCatalogJob` с `HOOKAHPORTAL_CACHE_READ=true`.
- Пропущенные миксы в основном из-за суммы пропорций != 100 и/или отсутствующих компонентов.

## 4) Как обновить артефакты

```bash
cd /Users/admin/PycharmProjects/yummy/services/catalog-updater
npm run cache:refresh:hookahportal
```

## 5) Как перезалить БД только из HookahPortal-кеша

Очистка каталога:
```bash
docker exec backend-db-1 psql -U yummy -d yummy -v ON_ERROR_STOP=1 -c \
"BEGIN; TRUNCATE TABLE \"Recommendation\", \"FavoriteMix\", \"SessionRating\", \"SmokingSession\", \"MixRating\", \"MixComponent\", \"Mix\", \"Tobacco\", \"Manufacturer\" RESTART IDENTITY CASCADE; COMMIT;"
```

Импорт из кеша:
```bash
cd /Users/admin/PycharmProjects/yummy/services/catalog-updater
DATABASE_URL='postgresql://yummy:yummy@localhost:5432/yummy' npm run catalog:refresh:from-cache
```

## 6) Ограничения и риски

- Для `backend` и `catalog-updater` используется `node:bookworm-slim` + `openssl` в Dockerfile (устраняет падения Prisma на `node:alpine`).
- Источник HookahPortal помечен как test-only (`CATALOG_ALLOW_TEST_SOURCES=true`).
- Часть миксов отбрасывается текущими правилами валидации состава.
- Для новых полей таксономии нужна миграция `20260228204000_expand_tobacco_mix_taxonomy` перед сидингом/импортом.

## 7) Следующие шаги

1. Добавить артефакт-отчёт (JSON) с метриками импорта в `services/catalog-updater/cache/hookahportal/`.
2. Добавить флаг soft-validation для миксов, где сумма пропорций != 100 (чтобы не терять контент полностью).
3. Определить стратегию хранения/чистки кеша в docker-окружении (volume и ретеншн).
