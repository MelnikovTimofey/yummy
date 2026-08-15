# Smoke Арома Ателье

Playwright-прогон по гостевому контуру (`aroma-web`) и консоли Мастера
(`master-web`). Обязателен после правок разметки, текстов, ARIA и навигации —
см. `CLAUDE.md` §3.

```bash
cd tests/smoke
npm run smoke
```

## От какого состояния базы smoke обязан проходить

Прогон **не зависит от демо-фикстур** `apps/backend/prisma/seed.ts`: имена
табаков, миксов и prepared-рейлов берутся из самих данных, а строки таблиц
адресуются по `data-tobacco-id` / `data-mix-id`. Требуется только:

| Предпосылка | Зачем |
|---|---|
| учётка с ролью `admin` | инвентарь, каталог миксов, рейлы, раздел «Доступ» |
| учётка с ролью `master` | проверка ограничений не-админа |
| активный daily code | вход в гостевой контур |
| ≥ 1 табак в каталоге | батч-флоу наличия |
| ≥ 1 микс с составом | редактор микса и диалог удаления |
| ≥ 1 guest-visible микс | статистический рейл «Больше всего выбирают» |

Оба документированных способа наполнения базы этим условиям удовлетворяют:

- **демо-seed** — `cd apps/backend && npm run prisma:seed` (учётки
  `admin`/`admin` и `atelier`/`atelier`, daily code `1234`);
- **продуктовый снапшот** — `snapshots/atelier-product-data.dump` (см.
  `docs/data/README.md`). Снапшот содержит **только каталог** (`Tobacco`, `Mix`,
  `MixComponent`, `Rail`, `RailMix`), поэтому учётки и код после восстановления
  надо завести отдельно:

  ```bash
  cd apps/backend
  ATELIER_BOOTSTRAP_ADMIN_LOGIN=… ATELIER_BOOTSTRAP_ADMIN_PASSWORD=… npm run bootstrap:admin
  ```

  daily code создаётся в консоли Мастера, раздел «Доступ».

Прогон **неразрушающий**: наличие снимается и тут же возвращается, диалог
удаления микса закрывается «Отменой», мусора в базе не остаётся.

## Переменные окружения

| Переменная | По умолчанию | Что задаёт |
|---|---|---|
| `ATELIER_AROMA_URL` | `http://127.0.0.1:5174` | адрес гостевого фронта |
| `ATELIER_MASTER_URL` | `http://127.0.0.1:5176` | адрес консоли Мастера |
| `ATELIER_SMOKE_ADMIN_LOGIN` / `…_PASSWORD` | `admin` / `admin` | учётка admin |
| `ATELIER_SMOKE_OPERATOR_LOGIN` / `…_PASSWORD` | `atelier` / `atelier` | учётка master |
| `ATELIER_SMOKE_ACCESS_CODE` | `1234` | daily code гостя |

Пример прогона на базе из снапшота:

```bash
ATELIER_SMOKE_ADMIN_LOGIN=snapadmin ATELIER_SMOKE_ADMIN_PASSWORD=… \
ATELIER_SMOKE_OPERATOR_LOGIN=snapmaster ATELIER_SMOKE_OPERATOR_PASSWORD=… \
ATELIER_SMOKE_ACCESS_CODE=9876 npm run smoke
```

## Проекты

| Проект | Файл | Предпосылка |
|---|---|---|
| `aroma-chromium` | `aroma-smoke.spec.ts` | любая наполненная база |
| `master-chromium` | `master-smoke.spec.ts` | любая наполненная база |
| `master-seed-chromium` | `master-seed.spec.ts` | **только демо-seed** |

`master-seed-chromium` держит сценарии, которым нужны именно известные связи
демо-фикстур (микс «Цитрусовый караван» в рейле «Свежая линия», его состав из
двух конкретных табаков). Предпосылка проверяется в самом тесте: если фикстур
нет, сценарий помечается `skipped` с внятной причиной, а не падает как
UI-регрессия. Поэтому `npm run smoke` зелёный на обоих состояниях базы:

- на демо-seed — 6 passed;
- на продуктовом снапшоте — 4 passed, 2 skipped.

## Что делать, когда smoke красный

1. Проверить, что подняты `apps/backend` (`:3021`), `apps/aroma-web` (`:5174`) и
   `apps/master-web` (`:5176`), и что фронты смотрят на живой API — у гостевого
   контура адрес переопределяется в gitignored `apps/aroma-web/.env.local`
   (см. его README).
2. Посмотреть артефакты: `output/playwright/atelier-quality/` — скриншот, видео,
   trace и `error-context.md` со снимком страницы.
3. Не мерджить «оранжевый» smoke со списком «починим потом» — drift лечится в
   том же PR, что его породил (`CLAUDE.md` §3).
