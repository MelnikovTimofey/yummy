# Nomad Master Web

Staff/admin frontend для продукта `Мастер`.

## Назначение

Этот пакет отвечает за служебные сценарии Nomad:

1. авторизация сотрудников;
2. инвентаризация;
3. менеджер миксов;
4. менеджер рейлов;
5. аналитические дашборды;
6. управление доступом.
7. управление Telegram-чатами для bot automation.

## Phase 1

В текущем спринте реализован минимальный staff login flow:

1. вход по `admin` или `nomad`;
2. запрос `POST /staff/auth/login`;
3. подтверждение через `GET /staff/auth/me`;
4. хранение токена в `sessionStorage`;
5. authenticated shell с профилем и списком следующих модулей.

## Phase 2

Добавлены первые рабочие staff-экраны:

1. инвентаризация табаков с загрузкой `/staff/inventory/tobaccos`;
2. переключение `in stock / out of stock` через `PATCH /staff/inventory/tobaccos/:id`;
3. сводка дашборда из `/staff/dashboard/summary`.

## Phase 4

Добавлены контентные менеджеры:

1. список и редактирование миксов через `/staff/mixes`;
2. создание и обновление рейлов через `/staff/rails`;
3. табовый staff-shell с экранами `Дашборд`, `Инвентаризация`, `Миксы`, `Рейлы`.

## Access management

Добавлен раздел `Доступ`:

1. список, создание, редактирование и удаление daily codes через `/staff/access/daily-codes`;
2. список, создание, редактирование и удаление staff accounts через `/staff/access/accounts`;
3. роли `nomad` доступно управление daily codes, но staff accounts открыты только для `admin`;
4. формы приведены к одному CRUD-паттерну с остальными менеджерами `Мастера`.

## Telegram provisioning

Добавлен admin-only блок для bot recipients:

1. список, создание, редактирование и удаление чатов Telegram через `/staff/access/telegram-recipients`;
2. поддержаны типы `allowed`, `broadcast`, `rotate`;
3. эти записи используются Telegram-ботом как backend-driven recipient lists;
4. если записей в backend нет, bot может fallback-нуться на `.env`.

## Telegram automation state

Добавлен admin-only обзор состояния Telegram automation:

1. heartbeat бота;
2. last rotate и last broadcast;
3. последняя backend-зафиксированная ошибка;
4. summary по active Telegram chats.

## Audit trail

Добавлен admin-only журнал staff-операций:

1. `GET /staff/audit/events` показывает последние изменения;
2. журнал покрывает daily codes, staff accounts, Telegram recipients, inventory toggle, mixes и rails;
3. журнал предназначен для операционного контроля и быстрой верификации изменений после staff CRUD-действий.

## Локальный запуск

```bash
cd apps/nomad-master-web
npm install
npm run dev
```

По умолчанию frontend слушает `5176`.

## Стадия

Текущая стадия: рабочий MVP для staff/admin операций.

Для перехода из MVP в production-ready backoffice зафиксирован отдельный redesign contract:

1. `docs/nomad/master-production-redesign.md`

## Slice 1. Dashboard analytics

Реализован первый production-hardening slice для дашборда:

1. окно аналитики `7 / 14 / 30` дней;
2. разделение `product metrics` и `ops metrics`;
3. breakdown по производителям, flavor profiles и вкусам;
4. топ по выборам, топ по guest-оценкам и распределение оценок;
5. daily activity trend;
6. операционные сигналы по blocked mixes и состоянию rails;
7. `shadcn/ui` foundation для `nomad-master-web` как новый UI baseline;
8. visual redesign dashboard под premium HoReCa direction вместо прежней MVP-сводки.

## Slice 2. Inventory operations hardening

Inventory переведён в новый operational flow:

1. `GET /staff/inventory/tobaccos` поддерживает `search`, `stock`, фильтры по производителям, `flavorProfiles`, вкусам и `flavorTags`, а также server-side sort;
2. строки инвентаризации показывают dependent mixes, blocked mix count и время последнего изменения;
3. staff получил table-first экран с filters bar, bulk selection и batch actions `вернуть в наличие / убрать из наличия`;
4. после inventory update frontend синхронно перезагружает и `dashboard`, и `mixes`, чтобы UI не жил на устаревшем состоянии;
5. `archive/delete` для inventory намеренно не включён без отдельного product-approved contract по semantics.

## Slice 3. Mix catalog and component editor

Mixes переведены в новый contract-first flow:

1. `GET /staff/mixes` поддерживает `search`, `status`, `railState`, фильтры по производителям компонентов, `flavorProfiles`, вкусам и `flavorTags`, а также server-side sort;
2. backend create/update для миксов принимает `components[]` с `tobaccoId`, `proportion` и `sortOrder`, а сумма процентов валидируется строго до `100%`;
3. staff получил table-first экран каталога миксов с rail membership summary, статусами `виден гостю / скрыт / заблокирован наличием` и быстрым переходом в редактор;
4. editor компонентов больше не требует ручного ввода `componentIds`: оператор выбирает табаки из catalog-backed списка, задаёт доли, меняет порядок строк и может распределить проценты поровну;
5. после rail update frontend синхронно перезагружает `mixes`, чтобы rail membership в каталоге не устаревал.
