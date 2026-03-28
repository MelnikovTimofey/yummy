# Nomad Master Web

Staff/admin frontend для продукта `Мастер`.

## Назначение

Этот пакет отвечает за служебные сценарии Nomad:

1. авторизация сотрудников;
2. инвентаризация;
3. менеджер миксов;
4. менеджер рейлов;
5. аналитические дашборды;
6. управление доступом и Telegram allowlist.

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

1. текущий daily code показывается как read-only operational surface;
2. `admin` управляет Telegram allowlist операторов по `имя + телефон`;
3. `nomad` не отправляет код из `Мастера`, а получает его в Telegram-боте;
4. staff accounts остаются отдельным admin-only блоком для входа в сам `Мастер`.

## Telegram allowlist и bot-request flow

Добавлен новый admin-only блок для bot access:

1. список, создание, редактирование и удаление allowlist-операторов через `/staff/access/telegram-operators`;
2. allowlist хранится по `имя + телефон`, а не по `chatId`;
3. оператор впервые пишет боту и делится контактом, после чего backend привязывает текущий `chatId`;
4. после привязки оператор получает актуальный daily code через `/code`;
5. ручной send/re-send flow из `Мастера` отсутствует.

## Telegram automation state

Добавлен admin-only обзор состояния Telegram automation:

1. heartbeat бота;
2. last request кода и связанный оператор;
3. последняя backend-зафиксированная ошибка;
4. summary по active allowlist entries и linked chats.

## Audit trail

Добавлен admin-only журнал staff-операций:

1. `GET /staff/audit/events` показывает последние изменения;
2. журнал покрывает daily codes, staff accounts, Telegram allowlist, inventory toggle, mixes и rails;
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

## Slice 4. Rail contract hardening

Rails переведены на более явный staff contract:

1. `GET /staff/rails` теперь несёт `editable` и `readOnlyReason`, поэтому statistical rails больше не выглядят как обычный CRUD-объект;
2. в guest и staff rail surfaces теперь есть два auto rail: `Больше всего выбирают` и `Лучшие оценки`;
3. create flow больше не просит выбирать `type`: новый rail всегда создаётся как editable master-curated rail;
4. в менеджере рейлов read-only rails визуально отделены от редактируемых и открываются в режиме просмотра с объяснением причины блокировки;
5. состав rail больше не редактируется строкой `mixIds`: staff работает через отдельный select/reorder flow с добавлением, удалением и изменением порядка миксов;
6. существующие prepared и curated rails остаются редактируемыми без изменения guest semantics.
