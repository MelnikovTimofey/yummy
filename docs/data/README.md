# Данные каталога Арома Ателье

Здесь лежат **источники** контентного наполнения dev-БД Арома Ателье: подборка миксов
и предустановленные рейлы. Это не seed (демо-фикстуры для smoke живут в
`apps/backend/prisma/seed.ts`) и не сами данные БД — это «человекочитаемый»
исходник, из которого скрипт собирает миксы и рейлы поверх каталога табаков.

## Файлы

- [`mixes.md`](mixes.md) — пул миксов: хиты (по сигналам спроса из публичных
  каталогов) и ниша для ценителей; состав — «производитель / линейка / название %».
- [`preset-rails.md`](preset-rails.md) — `prepared`-рейлы: заголовок, подпись и
  **правило** над таксономией табаков, по которому рейл собирается сам.

## Как наполнить данные в dev-БД

Скрипт `apps/backend/scripts/build-catalog-backup.ts` (npm-скрипт
`build:catalog`) парсит файлы выше, находит табаки состава в `Tobacco` и
раскладывает миксы по рейлам правилами из `apps/backend/src/editorial-rails.ts`.

```bash
cd apps/backend
npm run db:start                 # 1) контейнер БД (если не поднят)
npm run prisma:dbpush            # 2) схема (если БД новая/пустая)

# 3) каталог табаков — ОДИН из источников:
npm run sync:htreviews           #    а) тянуть с htreviews.org (долго, нужна сеть)
#  …или быстро восстановить из бэкапа (см. ~/nomad-backups/README.md)

# 4) миксы + prepared-рейлы поверх каталога:
npm run build:catalog            #    превью: отчёт по матчингу, БД не меняется
npm run build:catalog -- --yes   #    запись
```

Порядок важен: шаг 4 требует уже залитого каталога (FK
`MixComponent.tobaccoId`) и при каталоге <1000 строк остановится с ошибкой.

### Что делает `build:catalog`

- **Владеет только своими строками** — миксами `mix-catalog-*` и рейлами
  `rail-prepared-*` — и пересобирает их при каждом запуске. Миксы и
  curated-рейлы Мастера, инвентарь, каталог табаков и staff/auth не трогает.
- **Точное сопоставление.** Компонент ищется по `manufacturer` + `lineName` +
  `name` без нечёткого матчинга: опечатка в пуле — пропуск микса с причиной в
  логе, а не молчаливая подмена вкуса.
- **Только актуальные табаки.** В микс идёт табак со статусом «Выпускается», в
  наличии и не в архиве; иначе микс пропускается с отчётом. Инвентарь скрипт
  не меняет — наличие ведёт Мастер.
- **Раскладка по правилам.** Рейл — до 8 миксов в порядке пула, один микс —
  не больше чем в двух рейлах; рейл меньше 5 миксов останавливает сборку.
  Грамматика правил — в [`preset-rails.md`](preset-rails.md).
- **Аналитика.** Пересборка удаляет миксы скрипта вместе с их событиями
  «Покурить» и оценками. Если они есть, запись останавливается; осознанно —
  `npm run build:catalog -- --yes --drop-analytics` после `pg_dump`.
- **Statistical-рейлы** («Больше всего выбирают», «Лучшие оценки») строками не
  создаёт — backend синтезирует их на лету из событий smoke/рейтингов.

Пул сверен с прод-каталогом. На старом снэпшоте или бэкапе часть табаков может
отсутствовать или числиться снятой — превью это покажет пропусками.

### На проде

В прод-образе backend нет `docs/data` и `tsx`. Скрипт запускается разовым
контейнером из свежего образа: источники монтируются из `/opt/atelier` в
`/docs/data`, где их ищет скрипт (`/app/scripts/../../../docs/data`). Перед
записью — `pg_dump` (см. `docs/atelier/prod-operations.md`).

```bash
cd /opt/atelier && git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env up -d --build backend
docker compose -f docker-compose.prod.yml --env-file .env run --rm --no-deps \
  -v /opt/atelier/docs/data:/docs/data:ro backend \
  npx -y tsx scripts/build-catalog-backup.ts          # превью
# то же с `--yes` в конце — запись
```

### Проверить результат

```bash
curl -s http://127.0.0.1:3021/health
curl -s http://127.0.0.1:3021/guest/home/rails | jq '.items[] | {name, type, mixes: (.mixes|length)}'
```

## Снэпшот для быстрого развёртывания

В репозитории лежит [`../../snapshots/atelier-product-data.dump`](../../snapshots/atelier-product-data.dump)
— custom-format `pg_restore` дамп **только продуктовых таблиц** (`Tobacco`,
`Mix`, `MixComponent`, `Rail`, `RailMix`), ~1.3 МБ. Им
поднимают готовое наполнение за секунды без краулинга htreviews — см. раздел
«Быстрое развёртывание (из снэпшота)» в корневом [`README.md`](../../README.md).

Пересобрать снэпшот после обновления данных (БД с актуальным состоянием уже
поднята на порту 5433):

```bash
docker exec yummy-db-1 pg_dump -U atelier -d atelier -Fc --no-owner --no-privileges \
  -t 'public."Tobacco"' -t 'public."Mix"' -t 'public."MixComponent"' \
  -t 'public."Rail"' -t 'public."RailMix"' -f /tmp/product.dump
docker cp yummy-db-1:/tmp/product.dump snapshots/atelier-product-data.dump
```

### Что снэпшот не содержит

В нём нет ни `StaffAccount`, ни `DailyAccessCode`, поэтому на свежевосстановленной
базе нельзя ни войти в консоль Мастера, ни пройти гостевой вход. После restore
нужно завести учётки и код:

```bash
cd apps/backend
ATELIER_BOOTSTRAP_ADMIN_LOGIN=… ATELIER_BOOTSTRAP_ADMIN_PASSWORD=… npm run bootstrap:admin
```

daily code создаётся в консоли Мастера, раздел «Доступ».

## Smoke и состояние базы

`tests/smoke` проходит **и на демо-seed, и на продуктовом снэпшоте** — тесты не
ссылаются на имена сущностей каталога и адресуют строки по `data-tobacco-id` /
`data-mix-id`. Требования к состоянию базы, переменные окружения для нестандартных
учёток и разбор проекта `master-seed-chromium` — в
[`../../tests/smoke/README.md`](../../tests/smoke/README.md).

## Бэкапы и restore

Полные дампы состояния (включая staff/auth и `atelier_test`) лежат вне репозитория
в `~/nomad-backups/` (большие бинарные `pg_dump`). Команды restore «из коробки» и
снятия новых бэкапов — в `~/nomad-backups/README.md`.

## Соглашения

Таксономия каталога строго разделяет три поля (см. `CLAUDE.md` §7):
`flavorProfiles` — категории-«полки», `flavors` — конкретные ноты, `flavorTags` —
только мета-теги. При правке источников не смешивать колонки. Сумма процентов в
составе каждого микса = 100.
