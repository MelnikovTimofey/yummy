# Мастер · Арома Ателье

Staff/admin frontend для продукта `Мастер`.

## Назначение

Этот пакет отвечает за служебные сценарии `Мастера`:

1. авторизация сотрудников;
2. инвентаризация;
3. менеджер миксов;
4. менеджер рейлов;
5. аналитические дашборды;
6. управление доступом и Telegram allowlist.

## UX audit и redesign pass

Последний pass сфокусирован на качестве операционного опыта, а не на смене backend-семантики:

1. shell стал строже и ближе к control-surface, а не к lounge-like hero UI;
2. авторизация переведена в более понятный split-layout с явным контекстом среды и роли сценария;
3. широкий sidebar убран: основная навигация теперь работает как верхнее меню, а активный модуль читается без потери полезной ширины;
4. palette смещена в muted-наследника `Арома Ателье`: бордово-янтарные акценты сохранены, но сам backoffice остаётся спокойнее и утилитарнее;
5. dashboard, filters, stats и editor-surfaces уплотнены: меньше лишнего текста, меньше пустой высоты, глобальная KPI-полоска остаётся только на `Дашборде`;
6. toolbar filters переведены в более жёсткую desktop-сетку без наложений, а filter-groups больше не растягиваются в равновысотные пустые блоки;
7. создание микса открывается как отдельный экран без таблицы, а редактирование выбранного микса остаётся рядом с каталогом;
8. product semantics, role boundaries и API contracts при этом не менялись.

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
3. `master` не отправляет код из `Мастера`, а получает его в Telegram-боте;
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
cd apps/master-web
npm install
npm run dev
```

По умолчанию frontend слушает `5176`.

## Стадия

Текущая стадия: рабочий MVP для staff/admin операций.

Для перехода из MVP в production-ready backoffice зафиксирован отдельный redesign contract:

1. `docs/atelier/master-production-redesign.md`

Текущий GitHub-backed redesign sequence:

1. `#2` — `Master shell foundation under TIMELESS TIS benchmark`
2. `#3` — `Harmonize operational surfaces across Master modules`
3. `#4` — `Master visual polish, responsive hardening and design sign-off`

## Issue #2. Master shell foundation

Первый GitHub-backed redesign slice позже был дополнительно пересобран по итогам UX audit:

1. авторизованный `Master` остаётся console shell, но основной маршрут смены теперь вынесен в верхнее horizontal menu вместо тяжёлого sidebar;
2. shell-level hierarchy стала компактнее: identity, runtime status и active module summary считываются в одном верхнем ряду;
3. полезная ширина рабочего полотна возвращена в `Dashboard`, `Inventory`, `Mixes`, `Rails` и `Access`, поэтому dense CRUD/table flows меньше теряют место на chrome;
4. product semantics, staff/admin boundaries и API contracts не менялись.

## Issue #3. Harmonize operational surfaces across Master modules

Реализован второй GitHub-backed redesign slice по унификации модульных operational surfaces:

1. `Inventory` и `Mixes` уже использовали общий `ops-surface` язык для headers, stats, toolbars, table shells и editor surfaces;
2. `Rails` подтянут к этому же visual contract: section header со stats, отдельный operational toolbar, единый surface для списка рейлов, editor и состава рейла;
3. `Access` больше не выглядит как набор несвязанных admin-блоков: daily code, bot observability, allowlist, staff accounts и audit приведены к одному surface rhythm;
4. admin-only и `master`-restricted панели сохранили текущие role boundaries, менялся только visual/system layer;
5. targeted Playwright smoke для `Master` проходит и после harmonization `Rails`/`Access`.

## Issue #4. Master visual polish and desktop sign-off

Реализован финальный desktop-oriented polish pass для `Master`:

1. `Rails` и `Access` получили split-header layout, чтобы intro и operational stats не создавали пустые dead zones на desktop;
2. destructive actions в `Access` теперь визуально отделены от обычных secondary actions;
3. restricted panels для роли `master` стали считываться как intentional forbidden state, а не как случайный пустой блок;
4. keyboard/focus path усилен для dense control surfaces: filters, toggles, tabs и destructive actions;
5. финальный sign-off для этого slice выполнен как desktop-only по актуальному рабочему допущению интерфейса `Master`.

## Slice 1. Dashboard analytics

Реализован первый production-hardening slice для дашборда:

1. окно аналитики `7 / 14 / 30` дней;
2. разделение `product metrics` и `ops metrics`;
3. breakdown по производителям, flavor profiles и вкусам;
4. топ по выборам, топ по guest-оценкам и распределение оценок;
5. daily activity trend;
6. операционные сигналы по blocked mixes и состоянию rails;
7. `shadcn/ui` foundation для `master-web` как новый UI baseline;
8. visual redesign dashboard под premium HoReCa direction вместо прежней MVP-сводки.

## Slice 2. Inventory operations hardening

Inventory переведён в новый operational flow:

1. `GET /staff/inventory/tobaccos` поддерживает `search`, `stock`, фильтры по производителям, `flavorProfiles`, вкусам и `flavorTags`, server-side sort и paginated staff list contract (`page`, `pageSize`);
2. строки инвентаризации показывают dependent mixes, blocked mix count и время последнего изменения;
3. staff получил table-first экран с filters bar, bulk selection и batch actions `вернуть в наличие / убрать из наличия`;
4. создание и редактирование табака теперь доступны прямо из `Inventory`: editor сохраняет позицию через `POST /staff/inventory/tobaccos` и `PATCH /staff/inventory/tobaccos/:id`;
5. для `производителя`, `линейки`, `страны`, `категорий`, `вкусов` и `мета-тегов` editor позволяет выбрать текущее значение из каталога или добавить новое; `статус производства` ограничен существующими значениями;
6. после inventory save frontend сначала обновляет сам inventory, а `dashboard`, `mixes` и связанные справочники синхронизирует в фоне, чтобы staff-действия не блокировались лишними запросами;
7. таблица inventory работает постранично и не перерисовывает весь staff-каталог разом; текстовый поиск отправляется с debounce;
8. `archive/delete` для inventory намеренно не включён без отдельного product-approved contract по semantics.

## Slice 3. Mix catalog and component editor

Mixes переведены в новый contract-first flow:

1. `GET /staff/mixes` поддерживает `search`, `status`, `railState`, фильтры по производителям компонентов, `flavorProfiles`, вкусам и `flavorTags`, server-side sort и paginated staff list contract (`page`, `pageSize`);
2. backend create/update для миксов принимает `components[]` с `tobaccoId`, `proportion` и `sortOrder`, а сумма процентов валидируется строго до `100%`;
3. staff получил table-first экран каталога миксов с rail membership summary, статусами `виден гостю / скрыт / заблокирован наличием`, быстрым переходом в редактор и отдельным экраном создания нового микса;
4. editor компонентов больше не требует ручного ввода `componentIds`: оператор выбирает табаки из catalog-backed списка, задаёт доли, меняет порядок строк и может распределить проценты поровну;
5. оператор больше не заполняет вручную `популярность` и `базовый рейтинг`: эти метрики остаются производными от аналитики и оценок;
6. каталог миксов теперь открывается и фильтруется постранично, а текстовый поиск идёт через debounce вместо запроса на каждый символ;
7. после rail update frontend синхронно перезагружает `mixes`, чтобы rail membership в каталоге не устаревал.

## Slice 4. Rail contract hardening

Rails переведены на более явный staff contract:

1. `GET /staff/rails` теперь несёт `editable` и `readOnlyReason`, поэтому statistical rails больше не выглядят как обычный CRUD-объект;
2. в guest и staff rail surfaces теперь есть два auto rail: `Больше всего выбирают` и `Лучшие оценки`;
3. create flow больше не просит выбирать `type`: новый rail всегда создаётся как editable master-curated rail;
4. в менеджере рейлов read-only rails визуально отделены от редактируемых и открываются в режиме просмотра с объяснением причины блокировки;
5. состав rail больше не редактируется строкой `mixIds`: staff работает через отдельный select/reorder flow с добавлением, удалением и изменением порядка миксов;
6. selector добавления миксов в rail теперь использует тот же searchable picker pattern, что и выбор табаков в редакторе микса;
7. существующие prepared и curated rails остаются редактируемыми без изменения guest semantics.
