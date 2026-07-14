# Review Policy — Арома Ателье

> Имя файла (`NOMAD_REVIEW_POLICY.md`) и CI-идентификаторы (`nomad-review-flags`,
> `nomad-smoke`, `nomad-*-build`) сохранены как функциональные идентификаторы —
> на них завязаны CLAUDE.md, required-checks и branch protection. Переименование
> человекочитаемого слоя не трогает эти идентификаторы намеренно.

## Назначение

Этот документ фиксирует GitHub-layer репозитория Арома Ателье.

Цель:

1. структурировать входящие issues;
2. стандартизировать PR review;
3. запускать автоматические проверки только по active scope изменения;
4. вводить enforcement поэтапно, не ломая текущий `Human Review` workflow.

## Base branch

Использовать base branch `main` — production-ветка репозитория.

## Branch naming

1. `feature/<short-slug>` — новый функционал, рефакторинг, обновление документации/процесса;
2. `bug/<short-slug>` — исправление багов.

Slug — короткое имя в kebab-case (например `feature/master-shell-foundation`,
`bug/onboarding-empty-state`). Допустимо префиксом включать issue номер
(`feature/123-master-shell`), если это помогает trace.

## PR shape

Действует правило:

1. `1 PR = 1 bounded context = 1 проверяемый результат`

В одном PR не смешивать без явного интеграционного шага:

1. schema + auth + UI + infra;
2. process-governance changes и unrelated feature work.

## Issue shape

Базовым intake path для feature work считается:

1. `.github/ISSUE_TEMPLATE/atelier-feature.yml`

Каждая нетривиальная задача начинается с issue до написания кода.
Blank issues отключены (`config.yml`) — задача заводится только по шаблону.

Каждый feature issue должен зафиксировать:

1. `Primary scope`
2. `Problem`
3. `Success criteria`
4. `Active scope`
5. `Out of scope`
6. `Constraints`
7. `Checks`

Для UI/redesign задач в `apps/master-web` issue также должен содержать:

1. `Design / UX baseline`
2. visual references
3. явное ожидание по `shadcn/ui`, если его нужно использовать в slice
4. указание, что benchmark не должен скатываться в generic auto-generated UI

## Required PR fields

Каждый PR обязан содержать:

1. `Closes #<issue>` — ссылка на закрываемый issue (1 PR = 1 issue)
2. `Bounded context`
3. `Touched paths`
4. `Write scope`
5. `Checks run`
6. `Docs updated`
7. `Risks / Human Review needed`

Для этого в `.github/pull_request_template.md` зафиксирован обязательный шаблон.

## Auto review flags

PR должен считаться `needs-human-review`, если затронуто хотя бы одно из условий:

1. `apps/backend/prisma/**`
2. auth-related backend files:
   - `apps/backend/src/auth.ts`
   - `apps/backend/src/auth.test.ts`
   - `apps/backend/src/access.ts`
   - `apps/backend/src/access.test.ts`
   - `apps/backend/src/config.ts`
   - `apps/backend/scripts/bootstrap-admin.ts`
   - `apps/backend/.env.example`
3. runtime / env / bot operation paths:
   - `services/telegram-bot/ops/**`
   - `services/telegram-bot/.env.example`
   - `docs/atelier/env-matrix.md`
   - `docs/atelier/deployment-smoke-checklist.md`
4. process-governance files:
   - `CLAUDE.md`
   - `docs/**`
   - `tests/smoke/**`
   - `.github/**`
   - `.claude/**`

Если GitHub label `risk:human-review` существует, workflow пытается применить его автоматически.

## Labels

Source of truth по GitHub labels хранится в `.github/labels.md`.

Минимальный set:

1. `type:*`
2. `scope:*`
3. `risk:*`
4. `batch:*` (дублируется milestone'ом)

Метка `contour:nomad` — legacy (см. `labels.md`), на новые issue/PR не навешивается.

## Phase rollout

### Phase 1

Включить:

1. issue templates как базовый intake path;
2. PR template;
3. `CODEOWNERS` для process paths;
4. GitHub Actions по scope изменения;
5. ручное создание labels в GitHub UI или через CLI.

Не включать пока:

1. auto-merge (self-merge выполняется вручную командой, см. CLAUDE.md §5.6);
2. required status checks — до появления always-running gate-job (см. Phase 2).

### Phase 2 — включено

Репозиторий публичный, на `main` включена branch protection:

1. **PR обязателен** для изменения `main` — прямой push/force-push/удаление запрещены;
2. **`enforce_admins: true`** — правило связывает всех, включая владельца и агентов
   (CLAUDE.md §5 «не писать в `main` напрямую» стало hard-гарантией);
3. **required approving reviews = 0** — self-merge сохранён (CLAUDE.md §5.6): safe-PR
   Claude мерджит сам, human review для risk-PR остаётся процедурным (label
   `risk:human-review` + ожидание), не hard-gate.

### Required status checks — пока НЕ включены

Все воркфлоу используют path-фильтры (`on.paths` + `if: needs.changes...`), поэтому
если пометить чек required, PR, не трогающий его пути, **навсегда зависнет** в
ожидании чека, который не запустится. Прежде чем делать чеки required, нужен
always-running aggregating gate-job (один чек, который всегда репортит и агрегирует
результат остальных).

Кандидаты в required (после появления gate-job):

1. `nomad-aroma-build`
2. `nomad-master-build`
3. `nomad-backend-build`
4. `nomad-bot-build`
5. `nomad-smoke`
6. `nomad-docs-lint`

## Docs sync

Если GitHub governance меняется, обновлять:

1. `CLAUDE.md`, если меняются правила агента, процесс или operating model
2. `.claude/agents/` или `.claude/skills/`, если меняются роли или скиллы

`HANDOFF.md` — архив прошлых решений; новые записи в нём не ведутся, обновлять не требуется.

## Non-goals

Этот policy не нормализует пока:

1. legacy `Yummy` GitHub governance;
2. repo-wide branch protection;
3. auto-merge стратегию.
