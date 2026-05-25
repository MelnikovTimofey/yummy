# Nomad Review Policy

## Назначение

Этот документ фиксирует GitHub-layer для репозитория Nomad.

Цель:

1. структурировать входящие Nomad issues;
2. стандартизировать Nomad PR review;
3. запускать автоматические проверки только по Nomad active scope;
4. вводить enforcement поэтапно, не ломая текущий `Human Review` workflow.

## Base branch

Для Nomad PR использовать base branch `main` — production-ветка репозитория.

## Branch naming

1. `feature/<short-slug>` — новый функционал, рефакторинг, обновление документации/процесса;
2. `bug/<short-slug>` — исправление багов.

Slug — короткое имя в kebab-case (например `feature/master-shell-foundation`,
`bug/onboarding-empty-state`). Допустимо префиксом включать issue номер
(`feature/123-master-shell`), если это помогает trace.

## PR shape

Для Nomad действует правило:

1. `1 PR = 1 bounded context = 1 проверяемый результат`

В одном PR не смешивать без явного интеграционного шага:

1. schema + auth + UI + infra;
2. process-governance changes и unrelated feature work.

## Issue shape

Для Nomad feature work базовым intake path считается:

1. `.github/ISSUE_TEMPLATE/nomad-feature.yml`

Каждая нетривиальная задача начинается с issue до написания кода.

Каждый Nomad feature issue должен зафиксировать:

1. `Primary scope`
2. `Problem`
3. `Success criteria`
4. `Active scope`
5. `Out of scope`
6. `Constraints`
7. `Checks`

Для UI/redesign задач в `apps/nomad-master-web` issue также должен содержать:

1. `Design / UX baseline`
2. visual references
3. явное ожидание по `shadcn/ui`, если его нужно использовать в slice
4. указание, что benchmark не должен скатываться в generic auto-generated UI

## Required PR fields

Каждый Nomad PR обязан содержать:

1. `Contour: Nomad`
2. `Bounded context`
3. `Touched paths`
4. `Write scope`
5. `Checks run`
6. `Docs updated`
7. `Risks / Human Review needed`

Для этого в `.github/pull_request_template.md` зафиксирован обязательный шаблон.

## Auto review flags

PR должен считаться `needs-human-review`, если затронуто хотя бы одно из условий:

1. `apps/nomad-backend/prisma/**`
2. Nomad auth-related backend files:
   - `apps/nomad-backend/src/auth.ts`
   - `apps/nomad-backend/src/auth.test.ts`
   - `apps/nomad-backend/src/access.ts`
   - `apps/nomad-backend/src/access.test.ts`
   - `apps/nomad-backend/src/config.ts`
   - `apps/nomad-backend/scripts/bootstrap-admin.ts`
   - `apps/nomad-backend/.env.example`
3. runtime / env / bot operation paths:
   - `services/nomad-telegram-bot/ops/**`
   - `services/nomad-telegram-bot/.env.example`
   - `docs/nomad/env-matrix.md`
   - `docs/nomad/deployment-smoke-checklist.md`
4. process-governance files:
   - `CLAUDE.md`
   - `docs/**`
   - `tests/nomad-smoke/**`
   - `.github/**`
   - `.claude/**`

Если GitHub label `risk:human-review` существует, workflow пытается применить его автоматически.

## Labels

Source of truth по GitHub labels хранится в `.github/labels.md`.

Минимальный Nomad set:

1. `contour:nomad`
2. `type:*`
3. `scope:*`
4. `risk:*`
5. `batch:*`

## Phase rollout

### Phase 1

Включить:

1. issue templates для Nomad как базовый intake path;
2. PR template для Nomad;
3. `CODEOWNERS` для Nomad paths;
4. Nomad-only GitHub Actions;
5. ручное создание labels в GitHub UI или через CLI.

Не включать пока:

1. auto-merge для Nomad;
2. branch protection, если required checks ещё нестабильны.

### Phase 2

После стабилизации CI вручную включить branch protection или ruleset для `main`:

1. require 1 approving review;
2. require `CODEOWNERS` review для Nomad process files;
3. require relevant Nomad checks;
4. не включать auto-merge до отдельного решения.

Рекомендуемые required checks:

1. `nomad-aroma-build`
2. `nomad-master-build`
3. `nomad-backend-build`
4. `nomad-bot-build`
5. `nomad-smoke`

Если используется GitHub ruleset с path targeting, применять эти checks только для Nomad paths.

## Docs sync

Если GitHub governance для Nomad меняется, обновлять:

1. `CLAUDE.md`, если меняются правила агента, процесс или operating model
2. `.claude/agents/` или `.claude/skills/`, если меняются роли или скиллы

`HANDOFF.md` — архив прошлых решений; новые записи в нём не ведутся, обновлять не требуется.

## Non-goals

Этот policy не нормализует пока:

1. legacy `Yummy` GitHub governance;
2. repo-wide branch protection для всех контуров;
3. auto-merge стратегию для Nomad.
