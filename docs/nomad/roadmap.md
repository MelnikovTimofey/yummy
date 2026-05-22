# Roadmap Nomad

## 1. Текущий статус

Nomad уже находится не на стадии идеи, а на стадии рабочего MVP-контура.

Что уже сделано:

1. отдельный parallel track без вмешательства в legacy `Yummy`;
2. отдельные приложения:
   - `apps/nomad-aroma-web`
   - `apps/nomad-master-web`
   - `apps/nomad-backend`
   - `services/nomad-telegram-bot`
3. отдельный Postgres + Prisma storage для Nomad;
4. guest flow:
   - `18+`
   - daily code
   - знакомство
   - онбординг
   - рекомендации
   - главная
   - каталог
   - карточка микса
   - оценка
5. staff flow:
   - логин
   - дашборд
   - инвентаризация
   - менеджер миксов
   - менеджер рейлов
   - управление daily codes
   - управление staff accounts
   - управление Telegram-чатами
6. Telegram-бот:
   - `/whoami`
   - `/code`
   - `/rotate`
   - daily code automation
   - авторассылка
   - backend-driven recipient lists с fallback на `.env`

## 2. Общая оценка готовности

### Готово для pilot / internal use

1. основные пользовательские сценарии;
2. основные staff-сценарии;
3. persisted access model;
4. persisted content model;
5. bot automation для daily code.

### Не готово для production launch

1. managed runtime и deployment runbook;
2. audit trail;
3. production-grade observability;
4. расширенные e2e smoke flows;
5. финальный visual polish.

## 3. Направления roadmap

Roadmap дальше лучше вести не только фазами, но и по рабочим направлениям.

### Направление A. Release Foundation

Цель:
подготовить Nomad к устойчивому запуску вне локальной машины.

Текущий статус:
`in progress`

Следующие шаги:

1. подготовить production env matrix для всех Nomad-сервисов;
2. оформить managed runtime для `services/nomad-telegram-bot`;
3. оформить bootstrap-path для первого admin без dev seed-паролей;
4. зафиксировать backup/restore policy для Nomad Postgres;
5. подготовить deployment notes и smoke checklist.

Definition of done:

1. backend, оба web-приложения и bot поднимаются по runbook;
2. секреты и базовые учётные данные не завязаны на dev defaults;
3. есть воспроизводимый post-deploy smoke.

### Направление B. Aroma Atelier Product Polish

Цель:
довести guest-side UX до launch-ready состояния.

Текущий статус:
`foundation complete`

Следующие шаги:

1. доработать copywriting и микро-сценарии;
2. улучшить empty/loading/error states;
3. сделать mobile QA по реальным viewport;
4. провести отдельный visual pass под Nomad brand layer;
5. при необходимости уточнить порядок экранов `рекомендации -> главная -> каталог`.

Definition of done:

1. guest flow проходится без пояснений;
2. интерфейс стабилен на мобильном;
3. визуальный слой соответствует запуску в реальном заведении.

### Направление C. Master Operations

Цель:
сделать `Мастер` полноценным рабочим контуром для персонала.

Текущий статус:
`foundation complete`

Следующие шаги:

1. добавить поиск, фильтры и сортировки в inventory/mixes/rails/access;
2. улучшить менеджер рейлов, включая порядок миксов;
3. расширить dashboard по inventory в нужных разрезах;
4. добавить admin-view по состоянию Telegram automation;
5. привести CRUD-экраны к единому operational UX;
6. перевести inventory и mixes из card-first MVP в table-first operational workflow с bulk actions.

Definition of done:

1. staff выполняет ежедневные операции без ручной помощи разработчика;
2. admin видит состояние доступа, контента и Telegram automation в одном месте.

### Направление D. Analytics And Rails

Цель:
довести аналитику выбора и статистические рейлы до полезного уровня.

Текущий статус:
`partially complete`

Следующие шаги:

1. выделить целевой набор продуктовых метрик;
2. расширить дашборд по `Выбрать`, оценкам и популярности;
3. стабилизировать statistical rails как операционный инструмент;
4. при необходимости добавить anti-top / declining mixes;
5. отделить product metrics от ops metrics;
6. зафиксировать read-only contract для automatic rails и добавить второй rail по лучшим оценкам.

Definition of done:

1. staff и admin могут принимать решения по данным;
2. statistical rails не выглядят случайными и объяснимы по данным.

См. детальный execution contract:

1. `docs/nomad/master-production-redesign.md`

### Направление E. Telegram And Automation

Цель:
сделать Telegram-бота операционно надёжным, а не только функциональным.

Текущий статус:
`functional MVP complete`

Следующие шаги:

1. перевести bot worker в `pm2` или `systemd`;
2. добавить status/heartbeat для бота;
3. добавить просмотр last rotate / last broadcast в `Мастер`;
4. определить production-политику recipient lists;
5. добавить bot-side smoke checks и recovery runbook.

Definition of done:

1. бот устойчиво работает без ручного поднятия из терминала;
2. администратор понимает текущее состояние бота без чтения логов;
3. daily code delivery не зависит от ручных проверок.

### Направление F. Quality And Hardening

Цель:
закрыть риски регрессий и упростить дальнейшую AI-разработку.

Текущий статус:
`in progress`

Следующие шаги:

1. добавить targeted e2e flows для `Арома Ателье` и `Мастер`;
2. расширить integration coverage backend contracts;
3. зафиксировать acceptance checklist для pilot;
4. добавить audit trail для staff-sensitive изменений;
5. улучшить error handling и observability.

Definition of done:

1. ключевые сценарии прикрыты автоматическими или чётко описанными smoke-проверками;
2. критические staff-изменения оставляют audit trace;
3. новые Nomad slices можно безопасно развивать через AI.

## 4. Приоритеты

### Must

1. `Release Foundation`
2. `Telegram And Automation`
3. `Quality And Hardening`

### Should

1. `Master Operations`
2. `Analytics And Rails`

### Later

1. `Aroma Atelier Product Polish`
2. вынос общего кода в `packages/shared-*` только после явной повторяемости

## 5. Symphony-модель реализации

Symphony не должен вести Nomad как один длинный epic без структуры.

Рекомендуемая модель:

### Batch 1. Release Foundation

Включать только:

1. deployment/runbook;
2. managed bot runtime;
3. bootstrap admin;
4. env/ops hardening.

Почему:
это критический путь к реальному запуску.

### Batch 2. Master Operations

Включать:

1. улучшения inventory UX;
2. mix/rail operations;
3. admin access tooling;
4. Telegram automation panel.

### Batch 3. Analytics And Rails

Включать:

1. metrics cleanup;
2. dashboard slices;
3. statistical rail improvements.

### Batch 4. Quality And Hardening

Включать:

1. e2e;
2. audit trail;
3. release acceptance checks.

### Batch 5. Aroma Polish

Включать:

1. visual polish;
2. copy polish;
3. guest UX refinements.

## 6. Правила дробления задач для Symphony

### Разрешённый формат задачи

1. `1 issue = 1 bounded context = 1 проверяемый результат`
2. по умолчанию один active scope:
   - `apps/nomad-aroma-web/`
   - `apps/nomad-master-web/`
   - `apps/nomad-backend/`
   - `services/nomad-telegram-bot/`
3. multi-agent использовать только для непересекающихся write scopes.

### Что можно пускать в Symphony

1. изолированные backend contracts;
2. локальные UI slices;
3. test-only tasks;
4. docs/runbook tasks;
5. bot tasks без repo-level перестройки.

### Что не пускать в Symphony

1. крупные schema/auth/ui/infra изменения в одном issue;
2. repo-wide architecture decisions;
3. shared package extraction до явного решения;
4. изменения legacy-контуров без отдельного подтверждения.

## 7. Рекомендуемая первая очередь Symphony issues

### Queue 1

1. `Nomad / Ops / Managed bot runtime`
2. `Nomad / Ops / Production env matrix`
3. `Nomad / Master / Telegram automation status panel`

### Queue 2

1. `Nomad / Backend / Audit trail for access and inventory`
2. `Nomad / QA / Guest flow e2e smoke`
3. `Nomad / QA / Master flow e2e smoke`

### Queue 3

1. `Nomad / Analytics / Dashboard metric cleanup`
2. `Nomad / Rails / Statistical rails refinement`
3. `Nomad / Aroma / UX and copy polish`

## 8. Exit Criteria For Roadmap Stage

Nomad можно считать готовым к следующей стадии, если:

1. daily code delivery стабильно работает через backend + bot;
2. `Мастер` покрывает ежедневные операции staff;
3. guest flow стабилен и проверяем;
4. есть production run path;
5. есть минимальная операционная наблюдаемость.
