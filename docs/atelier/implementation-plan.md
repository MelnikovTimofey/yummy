# План реализации Арома Ателье с ИИ

## 1. Problem Statement And Outcomes

* `fact`: в текущем репозитории уже есть legacy mobile web + backend, но они спроектированы под magic-link, избранное, сессии курения и ML/fallback-персонализацию.
* `fact`: новый сценарий Арома Ателье требует другой продуктовый режим: guest web без авторизации, daily code, age gate, staff backoffice и Telegram-бот.
* `inference`: если дорабатывать legacy-контур точечно, продукт быстро накопит противоречия между старой и новой моделью доступа.
* `decision`: базовый вектор реализации — развивать Арома Ателье параллельно legacy-контуру в отдельных приложениях и сервисах внутри этого же репозитория.

Желаемые outcomes:

1. гость доходит от QR до карточки микса за 1-2 минуты;
2. мастер в реальном времени управляет наличием и рейлами;
3. рекомендации учитывают наличие табаков;
4. аналитика опирается на реальные guest-события, а не на отсутствующие user sessions;
5. проект остаётся достаточно простым для быстрой итерации с ИИ.

## 2. User Segments And JTBD

### Гость Арома Ателье

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
* `fact`: цветовая база должна опираться на Арома Ателье, primary `#551817`.

### Assumptions

* `assumption`: staff готовы работать с одной общей учётной записью `nomad` на MVP.
* `assumption`: Telegram-боту достаточно staff-чата или whitelist сотрудников без сложной ACL.
* `assumption`: rule-based рекомендации дадут достаточное качество на старте и ML можно отложить.
* `assumption`: в inventory достаточно бинарного статуса `в наличии / не в наличии`, без партий и остатков по граммам.
* `assumption`: daily code меняется раз в сутки по timezone Арома Ателье, то есть по локальному времени заведения.

### Critical Unknowns

* `assumption`: нужно подтвердить, будет ли один код на весь день или отдельные коды по сменам.
* `assumption`: нужно подтвердить, кто именно получает Telegram-сообщения и можно ли использовать общий чат.
* `assumption`: нужно подтвердить, нужен ли audit trail для staff-изменений inventory и mix catalog.

## 4. Option Comparison

| Опция | Описание | Ценность | Риски | Effort | Dependencies |
|---|---|---|---|---|---|
| A | Parallel track в том же репозитории: отдельные apps/services + отдельный bot worker | Высокая: legacy защищён, Арома Ателье изолирован, ИИ видит чистый контур | Средние: нужен repo bootstrap и отдельная dev-инфраструктура | Средний | новые app skeletons, отдельные env/db/docker paths |
| B | Переиспользовать текущие `backend` + `YummyWeb` как основу Арома Ателье | Средняя на старте | Очень высокие: конфликт доменных моделей, риск сломать legacy | Средний | сложная миграция schema/auth/UI |
| C | Сразу разделить на guest API, staff API, analytics service, bot service | Средняя | Высокие: сложность деплоя, связность схем, большой cost на coordination | Высокий | infra, service contracts, observability |

* `decision`: рекомендована опция `A`.
* `inference`: опция `A` даёт лучший баланс скорости, обратимости и качества работы с ИИ.

## 5. Recommended Technical Architecture

### Backend

* `decision`: не repurpose-ить текущий `backend/` под Арома Ателье.
* `decision`: поднять отдельный `apps/backend` как модульный backend Арома Ателье.
* `decision`: внутри `apps/backend` держать bounded modules:
  1. `guest-access`
  2. `guest-onboarding`
  3. `inventory`
  4. `rails`
  5. `analytics`
  6. `staff-auth`
* `decision`: legacy-модули `magic-link`, `favorites`, `preferences`, `sessions`, `personal recommendations` оставить в legacy-контуре и не тянуть их в Арома Ателье без явного решения.

### Frontend

* `decision`: не переориентировать текущий `YummyWeb` на Арома Ателье.
* `decision`: создать отдельные фронты:
  - `apps/aroma-web`
  - `apps/master-web`
* `inference`: отдельные фронты проще для ИИ, потому что исключают смешение guest UX и legacy flow.

### Bot

* `decision`: Telegram-бот реализовать как отдельный process/package, работающий с backend-domain и data model Арома Ателье.
* `decision`: не делать бот самостоятельным источником бизнес-логики; он только читает/создаёт daily code и рассылает его.

### Data Model Delta

* `decision`: в data model Арома Ателье добавить `StaffUser`, `DailyAccessCode`, `InventoryStatus`, `Rail`, `RailMix`, `GuestEvent`.
* `decision`: `MixRating` сохранить, но отвязать от обязательного зарегистрированного user-flow.
* `decision`: рекомендации считать на лету по rule-based scoring.
* `decision`: schema и product DB Арома Ателье должны быть отделены от legacy schema/DB.

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

### Master production redesign note

Для `Мастер` текущий roadmap-level redesign нужно вести не одним broad rewrite, а отдельной программой hardening:

1. `dashboard analytics contract`
2. `inventory table + bulk operations`
3. `mix catalog + component editor`
4. `rail manager hardening`
5. `access + Telegram delivery redesign`
6. `QA and release hardening`

Источник контракта для этой программы:

1. `docs/atelier/master-production-redesign.md`

Правило:

1. не запускать параллельную реализацию этих частей, пока не зафиксирован payload/acceptance contract каждого слайса;
2. access/Telegram slice по умолчанию требует human review, так как может затронуть schema/access/runtime semantics.

### Практики работы с ИИ

1. Перед началом slice обновлять фактологию в документации.
2. Просить ИИ менять только один bounded context за раз.
3. На каждую большую гипотезу сначала создавать contract-first doc или checklist.
4. Любые risky migrations выполнять только после явного описания rollback path.
5. Не смешивать redesign guest-flow и backoffice CRUD в одном change-set.
6. Проверять сборку затронутых subproject после каждого логического блока.

## 8. Recommendation

* `decision`: двигаться по опции `A` — parallel track в том же репозитории с отдельными apps/services Арома Ателье.
* `decision`: сначала создать изолированный scaffold Арома Ателье и только потом писать feature code.
* `decision`: персонализацию оставить rule-based, без ML, до накопления событий `smoke_cta_clicked` и `mix_rated`.

Следующая точка принятия решения:

* `decision`: после завершения `Slice 2`, когда будет видно качество рекомендаций и достаточность текущей схемы inventory.
* `decision`: целевая дата пересмотра архитектуры — после первого рабочего pilot в Арома Ателье, а не раньше.

## 9. Open Questions And Blocking Risks

1. `blocking risk`: не подтверждена точная модель daily code: один код в день или коды по сменам.
2. `blocking risk`: не определён production-канал рассылки Telegram-кода и кто именно считается staff-получателем.
3. `blocking risk`: не подтверждено, можно ли хранить оценки без guest-account и как защищаться от накрутки.
4. `risk`: при слишком раннем выносе shared packages можно случайно связать Арома Ателье и legacy сильнее, чем нужно.
5. `risk`: если оставить Арома Ателье без отдельного workflow и active scope, AI-агенты будут продолжать случайно опираться на legacy-модель.
