# План параллельной реализации Nomad

## 1. Цель

Подготовить безопасный способ вести разработку Nomad параллельно текущему продукту `Yummy`, не ломая существующий контур и не смешивая две разные доменные модели в одних и тех же приложениях.

## 2. Базовое решение

### Decision

1. Legacy `Yummy` остаётся в текущем состоянии и продолжает жить в:
   - `YummyWeb/`
   - `backend/`
   - `services/catalog-updater/`
2. Nomad развивается в отдельной ветке `codex/nomad-parallel-track`.
3. Nomad получает отдельные каталоги приложений и сервисов, а не переписывает существующие.

### Why

1. Это снижает риск сломать текущий продукт.
2. Это снимает конфликт между старой user-centric моделью и новым guest/staff-сценарием.
3. Это создаёт для ИИ однозначный контур изменений.

## 3. Целевая структура репозитория

Рекомендуемая структура:

```text
apps/
  nomad-aroma-web/
  nomad-master-web/
  nomad-backend/
services/
  nomad-telegram-bot/
packages/
  shared-ui/
  shared-types/
  shared-domain/
```

Правила:

1. `packages/shared-*` создавать только после явного решения о выносе общего кода.
2. До этого переиспользование из legacy допустимо как `copy with adaptation`.
3. У Nomad должны быть отдельные `.env`, docker-сервисы, scripts и база данных.

## 4. Фазы реализации

### Phase 0. Repo bootstrap

1. Создать каркас Nomad-каталогов.
2. Добавить отдельные `package.json`, `tsconfig`, `.env.example`.
3. Подготовить отдельный local run path и docker-compose override для Nomad.

### Phase 1. Access foundation

1. `18+` gate.
2. Daily access code.
3. Guest-shell `Арома Ателье`.
4. Staff auth для `admin` и `nomad`.

### Phase 2. Recommendation foundation

1. Онбординг.
2. Rule-based scoring.
3. Учет `in stock` табаков.
4. Карточка микса и CTA `Покурить`.

### Phase 3. Staff operations

1. Инвентаризация.
2. Менеджер табаков.
3. Менеджер миксов.

### Phase 4. Rails and analytics

1. Statistical rails.
2. Prepared rails.
3. Curated rails.
4. Dashboard по событиям `Покурить` и оценкам.

### Phase 5. Telegram bot

1. Выдача daily code.
2. Рассылка staff.
3. Ручной запрос текущего кода.

### Phase 6. Hardening

1. QA.
2. Smoke flows.
3. Deployment notes.
4. Observability и handoff.

## 5. Модель работы с ИИ

### Основной принцип

Один агент владеет интеграцией, архитектурой и итоговой сборкой. Параллельные агенты используются только для ограниченных подзадач.

### Когда multi-agent полезен

1. Нужно отдельно исследовать, что можно переиспользовать из legacy-кода.
2. Нужно параллельно scaffold-ить несколько Nomad-приложений с непересекающимися write scopes.
3. Нужно независимо подготовить backend contracts и frontend shell.

### Когда multi-agent вреден

1. Когда ещё не зафиксирован directory layout.
2. Когда меняется схема данных и API-контракт одновременно.
3. Когда несколько агентов начнут трогать один и тот же Nomad-app.

## 6. Рекомендуемая multi-agent схема по фазам

### Для старта

Без multi-agent.

Причина:

1. Сначала нужно зафиксировать структуру каталогов, naming и базовые контракты.

### После Phase 0

Допустимы параллельные подзадачи:

1. `explorer`: аудит legacy-кода на предмет переиспользуемых UI/domain частей.
2. `worker`: scaffold `apps/nomad-aroma-web`.
3. `worker`: scaffold `apps/nomad-master-web`.
4. `worker`: scaffold `apps/nomad-backend`.

Условие:

1. У каждого worker должен быть свой write scope.

### После Phase 1

Допустимы:

1. backend worker для `daily access code` и `staff auth`;
2. frontend worker для `18+` и guest access flow;
3. explorer для контракта inventory/recommendation.

### После Phase 3

Допустимы:

1. один worker на analytics;
2. один worker на rail manager;
3. один worker на Telegram bot.

## 7. Symphony: когда нужен и как использовать

### Текущее состояние

Текущий `WORKFLOW.md` настроен под legacy `YummyWeb`, `backend`, `services/catalog-updater`.

### Decision

1. Не использовать текущий `WORKFLOW.md` для Nomad-задач.
2. Не пытаться вести Nomad через legacy active scope.
3. Для Nomad создать отдельный Symphony workflow только после появления Nomad-каталогов.

### Когда Symphony действительно нужен

Symphony полезен, если одновременно выполняются много маленьких безопасных Nomad-задач, например:

1. локальные UI-fix в `apps/nomad-aroma-web`;
2. изолированные backend-endpoint задачи в `apps/nomad-backend`;
3. документационные и workflow-задачи в Nomad-контуре.

### Когда Symphony пока не нужен

1. на этапе архитектурного проектирования;
2. при первом scaffold;
3. при крупных schema/auth/contract-изменениях.

### Требования к отдельному Nomad workflow

Отдельный Nomad workflow должен иметь:

1. active scope только для Nomad-путей;
2. отдельные build/check команды для Nomad-apps;
3. запрет на auto-merge в `main` без явного human review, пока Nomad-контур не стабилизирован;
4. явную ссылку на `AGENTS.md` и этот план.

## 8. Первая пачка задач

Рекомендуемый порядок:

1. Создать Nomad directory scaffold.
2. Подготовить Nomad backend skeleton.
3. Подготовить Aroma Atelier web skeleton.
4. Подготовить Master web skeleton.
5. Зафиксировать env/docker/dev-run контур.
6. После этого перейти к `18+` и daily code.

## 9. Критерии готовности к активной разработке

Nomad-контур готов к feature-разработке, если:

1. есть отдельная ветка;
2. есть отдельные каталоги приложений;
3. есть отдельный AGENTS-контекст;
4. есть отдельный delivery plan;
5. понятно, какие части legacy разрешено читать и переиспользовать, а какие нельзя трогать.
