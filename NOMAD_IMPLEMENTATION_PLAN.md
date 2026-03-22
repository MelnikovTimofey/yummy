# План реализации Nomad с ИИ

## 1. Problem Statement And Outcomes

* `fact`: в текущем репозитории уже есть mobile web + backend, но они спроектированы под magic-link, избранное, сессии курения и ML/fallback-персонализацию.
* `fact`: новый сценарий Nomad требует другой продуктовый режим: guest web без авторизации, daily code, age gate, staff backoffice и Telegram-бот.
* `inference`: если просто дорабатывать текущий контур точечно, продукт быстро накопит противоречия между старой и новой моделью доступа.
* `decision`: базовый вектор реализации — переиспользовать текущий `backend + YummyWeb` как основу, но сменить доменную модель и экранную карту под Nomad.

Желаемые outcomes:

1. гость доходит от QR до карточки микса за 1-2 минуты;
2. мастер в реальном времени управляет наличием и рейлами;
3. рекомендации учитывают наличие табаков;
4. аналитика опирается на реальные guest-события, а не на отсутствующие user sessions;
5. проект остаётся достаточно простым для быстрой итерации с ИИ.

## 2. User Segments And JTBD

### Гость Nomad

* `fact`: приходит по QR-коду.
* `job`: быстро понять, что выбрать, не регистрируясь.
* `job`: показать мастеру готовую карточку микса.

### Кальянный мастер

* `fact`: отвечает за наличие и фактическую выдачу.
* `job`: быстро актуализировать наличие.
* `job`: управлять миксами и рейлами без работы через БД или JSON вручную.

### Администратор

* `job`: контролировать контент, права доступа и статистику.

### Официант / staff

* `job`: получить актуальный daily code в Telegram и сообщить его гостю.

## 3. Known Facts Vs Assumptions

### Facts

* `fact`: backend уже использует `Fastify + Prisma + PostgreSQL`.
* `fact`: frontend `YummyWeb` уже mobile-first и подходит как база для `Арома Ателье`.
* `fact`: текущая схема содержит `User`, `MagicLinkToken`, `PreferenceProfile`, `SmokingSession`, `FavoriteMix`, `Recommendation`.
* `fact`: home rails и рейтинги уже частично реализованы.
* `fact`: цветовая база должна опираться на Nomad, primary `#551817`.

### Assumptions

* `assumption`: staff готовы работать с одной общей учётной записью `nomad` на MVP.
* `assumption`: Telegram-боту достаточно staff-чата или whitelist сотрудников без сложной ACL.
* `assumption`: rule-based рекомендации дадут достаточное качество на старте и ML можно отложить.
* `assumption`: в inventory достаточно бинарного статуса `в наличии / не в наличии`, без партий и остатков по граммам.
* `assumption`: daily code меняется раз в сутки по timezone Nomad, то есть по локальному времени заведения.

### Critical Unknowns

* `assumption`: нужно подтвердить, будет ли один код на весь день или отдельные коды по сменам.
* `assumption`: нужно подтвердить, кто именно получает Telegram-сообщения и можно ли использовать общий чат.
* `assumption`: нужно подтвердить, нужен ли audit trail для staff-изменений inventory и mix catalog.

## 4. Option Comparison

| Опция | Описание | Ценность | Риски | Effort | Dependencies |
|---|---|---|---|---|---|
| A | Модульный монолит: текущий `backend` + `YummyWeb` + отдельный bot worker | Высокая, потому что переиспользует код и минимизирует архитектурный шум | Средние: нужна аккуратная миграция legacy-сущностей | Средний | Prisma migration, новый auth-flow, Telegram Bot API |
| B | Сразу разделить на guest API, staff API, analytics service, bot service | Средняя | Высокие: сложность деплоя, связность схем, большой cost на coordination | Высокий | infra, service contracts, observability |
| C | Оставить backend как есть и сверху добавить только новые экраны | Низкая | Очень высокие: конфликт старого PRD и нового сценария, грязная доменная модель | Низкий на старте, высокий дальше | почти без новых зависимостей |

* `decision`: рекомендована опция `A`.
* `inference`: опция `A` даёт лучший баланс скорости, обратимости и качества работы с ИИ.

## 5. Recommended Technical Architecture

### Backend

* `decision`: оставить один `backend` как модульный монолит.
* `decision`: добавить новые bounded modules:
  1. `guest-access`
  2. `guest-onboarding`
  3. `inventory`
  4. `rails`
  5. `analytics`
  6. `staff-auth`
  7. `telegram-bot`
* `decision`: legacy-модули `magic-link`, `favorites`, `preferences`, `sessions`, `personal recommendations` не развивать и постепенно вывести из guest-flow.

### Frontend

* `decision`: `YummyWeb` переориентировать на `Арома Ателье`.
* `decision`: staff UI добавить либо в том же Vite app как отдельный route-space `/master`, либо как второй app только если UI начнёт мешать guest-flow.
* `inference`: на MVP выгоднее держать один frontend repo/package с чётким разделением route-space и domain state.

### Bot

* `decision`: Telegram-бот реализовать как отдельный process/package, работающий с той же БД и backend-domain.
* `decision`: не делать бот самостоятельным источником бизнес-логики; он только читает/создаёт daily code и рассылает его.

### Data Model Delta

* `decision`: добавить `StaffUser`, `DailyAccessCode`, `InventoryStatus`, `Rail`, `RailMix`, `GuestEvent`.
* `decision`: `MixRating` сохранить, но отвязать от обязательного зарегистрированного user-flow.
* `decision`: рекомендации считать на лету по rule-based scoring.

## 6. Validation Plan

| Эксперимент | Owner | Success metric | Stop condition |
|---|---|---|---|
| Прототип guest-flow от QR до карточки микса | product + frontend | 1 тестовый пользователь проходит flow < 2 минут | если flow длиннее 3 минут или непонятен без пояснений |
| Rule-based recommendation v1 на реальном каталоге | backend | минимум 70% рекомендаций субъективно релевантны на 10 ручных сценариях | если выборка выглядит случайной или не учитывает наличие |
| Inventory toggle -> recommendation refresh | backend | выключение табака мгновенно убирает зависимые миксы из выдачи | если требуется ручной rebuild |
| Telegram daily code pilot | backend/bot | персонал получает код без ручной рассылки | если staff продолжают обходить бот |
| Staff rail manager pilot | admin + staff | мастер может сам собрать рейл без помощи разработчика | если требуется ручное SQL/JSON-редактирование |

## 7. AI Delivery Workflow

### Принципы

* `decision`: поставка только маленькими вертикальными slices.
* `decision`: каждый slice закрывает `schema -> backend rules -> API -> UI -> verification -> docs`.
* `decision`: каждая задача должна оставлять систему в запускаемом состоянии.

### Рекомендуемая последовательность slices

1. `Slice 0` — обновление PRD, implementation plan, cleanup целевой архитектуры.
2. `Slice 1` — age gate + daily code + новый guest shell.
3. `Slice 2` — onboarding + rule-based recommendations from in-stock mixes.
4. `Slice 3` — staff auth + inventory management.
5. `Slice 4` — mix manager + rail manager.
6. `Slice 5` — analytics events + statistical rails + dashboards.
7. `Slice 6` — Telegram-бот + code rotation automation.
8. `Slice 7` — UX polish, observability, acceptance smoke.

### Практики работы с ИИ

1. Перед началом slice обновлять фактологию в документации.
2. Просить ИИ менять только один bounded context за раз.
3. На каждую большую гипотезу сначала создавать contract-first doc или checklist.
4. Любые risky migrations выполнять только после явного описания rollback path.
5. Не смешивать redesign guest-flow и backoffice CRUD в одном change-set.
6. Проверять сборку затронутых subproject после каждого логического блока.

## 8. Recommendation

* `decision`: двигаться по опции `A` — модульный монолит с отдельным bot worker.
* `decision`: сначала перевести проект на новый продуктовый baseline и только потом писать feature code.
* `decision`: персонализацию оставить rule-based, без ML, до накопления событий `smoke_cta_clicked` и `mix_rated`.

Следующая точка принятия решения:

* `decision`: после завершения `Slice 2`, когда будет видно качество рекомендаций и достаточность текущей схемы inventory.
* `decision`: целевая дата пересмотра архитектуры — после первого рабочего pilot в Nomad, а не раньше.

## 9. Open Questions And Blocking Risks

1. `blocking risk`: не подтверждена точная модель daily code: один код в день или коды по сменам.
2. `blocking risk`: не определён production-канал рассылки Telegram-кода и кто именно считается staff-получателем.
3. `blocking risk`: не подтверждено, можно ли хранить оценки без guest-account и как защищаться от накрутки.
4. `risk`: текущая Prisma schema сильно заточена под user-centric продукт; миграцию нужно делать поэтапно, а не одним большим сломом.
5. `risk`: если оставить legacy guest-auth в кодовой базе без явного отсечения, AI-агенты будут продолжать случайно опираться на старую модель.
