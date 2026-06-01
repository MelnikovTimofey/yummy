# Данные каталога Арома Ателье

Здесь лежат **источники** контентного наполнения dev-БД Nomad: подборка миксов
и предустановленные рейлы. Это не seed (демо-фикстуры для smoke живут в
`apps/nomad-backend/prisma/seed.ts`) и не сами данные БД — это «человекочитаемый»
исходник, из которого скрипт собирает миксы и рейлы поверх каталога табаков.

## Файлы

- [`top-20-mixes.md`](top-20-mixes.md) — 20 миксов с составом (бренд / вкус / %)
  и таксономией (`flavorProfiles`, `flavors`, `flavorTags`).
- [`preset-rails.md`](preset-rails.md) — 5 `prepared`-рейлов и какие миксы (по №)
  в них входят.

## Как наполнить данные в dev-БД

Скрипт `apps/nomad-backend/scripts/build-catalog-backup.ts` (npm-скрипт
`build:catalog`) парсит файлы выше, матчит компоненты «бренд + вкус» на реальные
`NomadTobacco` и грузит миксы + prepared-рейлы.

```bash
cd apps/nomad-backend
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
`NomadMixComponent.tobaccoId`) и при каталоге <1000 строк остановится с ошибкой.

### Что делает `build:catalog`

- **Идемпотентен** — владеет слоем mix/rail целиком и пересобирает его при каждом
  запуске. Каталог табаков по составу/текстам не меняет.
- **Матчинг.** Нормализует бренды (Darkside↔DARKSIDE, AlFakher↔Al Fakher,
  BlackBurn↔Black Burn, MustHave↔MUSTHAVE) и алиасы вкусов (RU→EN: дыня→melon,
  молоко→milk, жвачка→gum …). Несопоставленные компоненты — в лог.
- **Чистые данные > полноты.** Микс с любым несопоставленным компонентом
  пропускается (текущий итог: 15/20 миксов; 5 пропущено — у них есть компонент,
  которого нет в каталоге).
- **Видимость.** Помечает каталог `inStock=true`, иначе миксы не guest-visible и
  prepared-рейлы не покажутся на Главной (инвариант №3: видимость зависит от
  инвентаря).
- **Statistical-рейлы** («Больше всего выбирают», «Лучшие оценки») строками не
  создаёт — backend синтезирует их на лету из событий smoke/рейтингов.

### Проверить результат

```bash
curl -s http://127.0.0.1:3021/health
curl -s http://127.0.0.1:3021/guest/home/rails | jq '.items[] | {name, type, mixes: (.mixes|length)}'
```

## Снэпшот для быстрого развёртывания

В репозитории лежит [`../../snapshots/nomad-product-data.dump`](../../snapshots/nomad-product-data.dump)
— custom-format `pg_restore` дамп **только продуктовых таблиц** (`NomadTobacco`,
`NomadMix`, `NomadMixComponent`, `NomadRail`, `NomadRailMix`), ~1.3 МБ. Им
поднимают готовое наполнение за секунды без краулинга htreviews — см. раздел
«Быстрое развёртывание (из снэпшота)» в корневом [`README.md`](../../README.md).

Пересобрать снэпшот после обновления данных (БД с актуальным состоянием уже
поднята на порту 5433):

```bash
docker exec yummy-db-1 pg_dump -U nomad -d nomad -Fc --no-owner --no-privileges \
  -t 'public."NomadTobacco"' -t 'public."NomadMix"' -t 'public."NomadMixComponent"' \
  -t 'public."NomadRail"' -t 'public."NomadRailMix"' -f /tmp/product.dump
docker cp yummy-db-1:/tmp/product.dump snapshots/nomad-product-data.dump
```

## Бэкапы и restore

Полные дампы состояния (включая staff/auth и `nomad_test`) лежат вне репозитория
в `~/nomad-backups/` (большие бинарные `pg_dump`). Команды restore «из коробки» и
снятия новых бэкапов — в `~/nomad-backups/README.md`.

## Соглашения

Таксономия каталога строго разделяет три поля (см. `CLAUDE.md` §7):
`flavorProfiles` — категории-«полки», `flavors` — конкретные ноты, `flavorTags` —
только мета-теги. При правке источников не смешивать колонки. Сумма процентов в
составе каждого микса = 100.
