# Nomad Master Production Redesign

## Назначение

Этот документ фиксирует contract-first пакет для преобразования `Nomad Master` из MVP в production-ready staff/admin контур.

Локальные issue-shaped mirrors для каждого slice лежат в [docs/nomad/feature-slices/README.md](/Users/admin/PycharmProjects/yummy/docs/nomad/feature-slices/README.md) и повторяют поля `.github/ISSUE_TEMPLATE/nomad-feature.yml`.

Документ нужен до начала широкого рефакторинга, чтобы:

1. не смешать discovery, product decisions и кодинг в одном change-set;
2. не запускать несколько агентов в пересекающийся write scope;
3. разложить redesign на проверяемые слайсы с явными stop conditions.

## Контур и ограничения

- Контур: `Nomad`
- Reuse decision: `keep separate`
- Execution mode:
  - `single-agent` на discovery, contracts и doc sync
  - `multi-agent` только после фиксации payload/contracts по каждому слайсу

Непереговорные инварианты:

1. `Арома Ателье` остаётся guest-продуктом без пользовательской авторизации.
2. `Покурить` остаётся аналитическим событием выбора микса, а не smoking session.
3. Рекомендации продолжают зависеть от онбординга и наличия табаков.
4. Nomad развивается параллельно и не repurpose-ит legacy runtime paths.

## Текущий статус по аудиту

### Frontend

`apps/nomad-master-web/src/App.tsx` уже превратился в монолитный staff shell:

1. один файл `App.tsx` на 2459 строк;
2. все модули `dashboard / inventory / mixes / rails / access` живут в одном stateful контейнере;
3. operational UX построен на карточках и формах, а не на production-ready таблицах и массовых операциях;
4. role-aware логика, формы и сетевые мутации слишком тесно переплетены.

Главные UX-ограничения текущего MVP:

1. дашборд даёт только базовую сводку и не помогает принимать решения по данным;
2. inventory не поддерживает table view, фильтры, сортировки, поиск и batch actions;
3. mixes не поддерживают полноценный component editor с явным управлением долями;
4. rails не разделяют достаточно явно `auto/read-only` и `editable` operational modes;
5. access/telegram привязаны к CRUD по staff accounts и Telegram chats, а не к упрощённому admin flow из текущего product request.

### Backend и Telegram

Текущий backend уже даёт рабочий MVP surface, но не production-ready contracts:

1. `dashboard` возвращает только `inventory.total`, `inStockCount`, `outOfStockCount`, `smokeCtaTotal`, `topMixes`;
2. inventory поддерживает только list + toggle `inStock`;
3. mixes поддерживают list/create/update, но сейчас принимают только `componentIds` вместо явной структуры компонентов с процентами;
4. rails поддерживают list/create/update; statistical rail уже частично защищён от редактирования, но contracts ещё не отражают `readOnlyReason/editability`;
5. Telegram automation operationally уже работает, но access model пока построена вокруг `chatId + scope`, без `ФИО + телефон + code delivery` flow.

Вероятные schema/contract pressure points:

1. analytics breakdowns и time slicing;
2. bulk inventory mutations;
3. mix component payload с `proportion` и валидацией суммы;
4. второй automatic statistical rail для лучших оценок;
5. более богатая access/contact модель, если сохраняется сценарий `ФИО + телефон -> Telegram delivery`.

## Целевой результат

## Visual baseline

Для `Nomad Master` redesign использовать следующий baseline:

1. предпочитать `shadcn/ui` для базовых UI primitives там, где это ускоряет delivery и не тянет широкий UI rewrite;
2. не оставлять default Codex-generated components как финальный visual слой;
3. целиться не в generic admin SaaS, а в premium HoReCa console;
4. использовать TIMELESS / TIS как visual benchmark:
   - [Основатель TIMELESS: как делать next-gen в HoReCa](https://vc.ru/offline/1765963-osnovatel-timeless-kak-delat-next-gen-v-horeca)

Что брать из TIMELESS как направление:

1. ощущение `третьего места`, а не холодной CRM;
2. премиальность без кричащего люкса;
3. единая концепция при сложной детализации;
4. интерьерная теплая глубина, layered surfaces и продуманная визуальная драматургия;
5. ощущение, что продукт сделан как собственная система для реальной команды, а не как шаблонный backoffice.

### 1. Dashboard

Целевой dashboard должен разделять `product metrics` и `ops metrics`.

Обязательные блоки:

1. inventory summary:
   - всего табаков
   - в наличии / нет в наличии
   - breakdown по производителям
   - breakdown по `flavorProfiles`
   - breakdown по вкусам
2. guest choice analytics:
   - total `Покурить`
   - топ миксов по выборам
   - топ миксов по оценкам
   - распределение оценок
   - динамика по окну времени
3. operational modules:
   - проблемные миксы из-за отсутствующих компонентов
   - краткая сводка по rail performance
   - состояние Telegram automation

Правило:

1. dashboard не должен быть только “красивой сводкой”; он должен приводить к действиям в inventory, mixes, rails и access.

### 2. Inventory

Целевой inventory должен стать table-first интерфейсом.

Обязательные свойства:

1. таблица вместо card-only ленты;
2. фильтры по:
   - наличию
   - производителю
   - `flavorProfiles`
   - вкусам
   - мета-тегам, если они реально нужны оператору
3. поиск и сортировки;
4. bulk selection;
5. batch actions:
   - вернуть в наличие
   - убрать из наличия
   - удалить или архивировать, если это разрешено отдельным contract decision
6. быстрый переход к зависимым миксам.

### 3. Mixes

Целевой mix manager должен быть catalog-first и component-centric.

Обязательные свойства:

1. список миксов как таблица с фильтрами;
2. фильтры по доступности, атрибутам вкуса, производителям компонентов и участию в rails;
3. редактор компонентов, где оператор задаёт:
   - табак
   - долю компонента
   - порядок компонента
4. явная проверка суммы процентов;
5. видимость того, в каких rails участвует микс;
6. поддержка безопасного скрытия/удаления по product-approved contract.

### 4. Rails

Целевой rail manager должен разделять auto-generated и editable rails.

Обязательные правила:

1. `statistical rails` видимы, но read-only;
2. обязательные auto rails:
   - `Больше всего выбирают`
   - `Лучшие оценки`
3. prepared/editorial rails редактируемы;
4. новые rails, созданные мастером, всегда относятся к editable мастерским rail без выбора типа при создании;
5. оператор видит причину, почему rail нельзя редактировать;
6. выбор и порядок миксов в rail должен быть удобен как отдельный flow.

### 5. Access и Telegram

На текущем этапе не вводится полноценный multi-staff contour.

Текущий target state:

1. основной рабочий вход остаётся под одним админом;
2. admin управляет staff contact data для выдачи кода;
3. код доступа не создаётся вручную как ежедневная операция;
4. Telegram-бот должен уметь доставлять code по управляемому backend flow.

Этот блок требует отдельного human review, потому что текущий runtime всё ещё опирается на `staff accounts + Telegram recipients`.

## Delivery slices

### Slice 0. Contract-first redesign

Результат:

1. этот документ;
2. синхронизация `NOMAD_IMPLEMENTATION_PLAN.md` и `NOMAD_ROADMAP.md`;
3. фиксация verification gates и agent scopes.

Stop condition:

1. не начинать массовый рефакторинг `App.tsx`, пока не зафиксированы backend/frontend payloads для следующего слайса.

### Slice 1. Dashboard analytics contract

Scope:

- `apps/nomad-backend/`
- `apps/nomad-master-web/`

Результат:

1. новый summary DTO с product/ops separation;
2. breakdowns по производителям и вкусовым атрибутам;
3. time-window support;
4. UI dashboard modules без смешения с inventory CRUD.

Human review trigger:

1. если для метрик понадобятся schema additions или новые агрегаты.

### Slice 2. Inventory operations hardening

Scope:

- `apps/nomad-backend/`
- `apps/nomad-master-web/`

Результат:

1. list contract с query params для filters/search/sort;
2. batch mutation contract;
3. table UI с bulk selection;
4. audit coverage для batch operations.

Human review trigger:

1. если вместо archive/delete потребуется менять базовую inventory semantics.

### Slice 3. Mix catalog and component editor

Scope:

- `apps/nomad-backend/`
- `apps/nomad-master-web/`

Результат:

1. backend payload `components[]` с `tobaccoId`, `proportion`, `sortOrder`;
2. UI editor долей;
3. rail membership summary на уровне микса;
4. каталог миксов в table-first формате.

Human review trigger:

1. если удаление микса меняет guest semantics или recommendation behavior.

### Slice 4. Rail manager hardening

Scope:

- `apps/nomad-backend/`
- `apps/nomad-master-web/`

Результат:

1. явный read-only contract для statistical rails;
2. второй auto rail по оценкам;
3. создание новых rails без выбора типа;
4. удобный reorder/select flow для mixes inside rail.

Human review trigger:

1. если auto rail logic начинает влиять на guest ranking semantics шире, чем описано в PRD.

### Slice 5. Access and Telegram redesign

Scope:

- `apps/nomad-backend/`
- `services/nomad-telegram-bot/`
- `apps/nomad-master-web/`

Результат:

1. упрощённый admin flow для code delivery;
2. либо расширение существующей recipient model, либо новый contact directory contract;
3. UI, где `ФИО + телефон` поддержаны как операторский сценарий, если это подтверждено human review;
4. сохранение operational visibility по Telegram automation.

Human review trigger:

1. обязателен, потому что этот slice затрагивает access model и вероятно schema/runtime behavior.

### Slice 6. Hardening and QA

Scope:

- `tests/nomad-smoke/`
- затронутые Nomad apps/services

Результат:

1. smoke для ключевых staff/admin сценариев;
2. визуальный и accessibility review;
3. release-ready handoff.

## Рекомендуемая агентная команда

### Фаза discovery/contracts

Использовать `single-agent`.

Владелец:

1. `AI Lead / Integrator`

### Фаза implementation

Использовать `leader + specialists` после фиксации contract per slice.

Роли:

1. `AI Lead / Integrator`
2. `System Analyst / Product Analyst`
3. `Backend Worker`
4. `Frontend Worker`
5. `QA Agent`
6. `Design / UX Agent` после получения внешних референсов

### Допустимые parallel write scopes

1. `apps/nomad-master-web/**`
2. `apps/nomad-backend/**`
3. `services/nomad-telegram-bot/**`
4. `tests/nomad-smoke/**`

Правила:

1. `AI Lead` не отдаёт двум worker-агентам один и тот же файл;
2. docs sync, merge и финальный smoke остаются у `AI Lead`;
3. cross-app slice стартует только после фиксации payload и acceptance criteria.

## Verification path

Базовый gate:

```bash
cd apps/nomad-master-web && npm test && npm run build
cd apps/nomad-backend && npm test && npm run build
cd services/nomad-telegram-bot && npm test && npm run build
cd tests/nomad-smoke && npm run smoke
```

Дополнительный expectation:

1. на каждый slice фиксировать, какие команды реально были запущены;
2. если smoke не запускался, это должно быть явно отмечено в handoff.

## Human review checkpoints

Обязательны до реализации:

1. целевой список dashboard metrics;
2. policy по `delete` vs `archive` для inventory и mixes;
3. финальная access model:
   - остаётся ли runtime на одном admin login;
   - нужен ли новый backend contact directory;
   - обязателен ли сценарий `ФИО + телефон -> Telegram code delivery`.
4. внешние UX references, включая Timeless links, если они используются как benchmark.

## Next executable step

Следующий безопасный шаг после этого документа:

1. зафиксировать `Slice 1` payload для dashboard analytics;
2. только потом выделять frontend/backend workers на реализацию.
