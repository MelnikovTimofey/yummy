# CONTRIBUTING_NOMAD.md

## Назначение

Этот документ фиксирует минимальный solo-agent workflow для `Nomad parallel track`.

Он нужен для одного оператора, который:

1. ставит задачи;
2. выбирает, когда использовать одного агента или несколько;
3. принимает решение о merge;
4. при необходимости делает ручную проверку результата.

## Кто управляет процессом

Основная модель для Nomad:

1. человек выступает как `AI Lead / Integrator`;
2. Codex и другие агенты выполняют discovery, delivery, verification и docs-работу внутри выданного scope;
3. итоговое решение о merge, risk acceptance и `Human Review` остаётся у человека.

## Active Nomad Scope

Основной active scope:

1. `apps/nomad-backend/`
2. `apps/nomad-aroma-web/`
3. `apps/nomad-master-web/`
4. `services/nomad-telegram-bot/`
5. `NOMAD_*.md`
6. `WORKFLOW_NOMAD.md`
7. `AI_DEVELOPMENT_PROCESS.md`
8. `.github/` Nomad governance files
9. `.codex/skills/` Nomad repo-specific skills

Legacy paths не менять без явного extract/reuse решения:

1. `YummyWeb/`
2. `backend/`
3. `services/catalog-updater/`
4. `Yummy/`
5. `YummyExpo/`
6. `ml/`

## Branch Policy

Для Nomad использовать:

1. base branch: `codex/nomad-parallel-track`;
2. feature branches с префиксом `codex/nomad-...`;
3. merge только через PR;
4. прямой push в integration branch не использовать как routine flow;
5. один PR = один bounded context.

## Canonical Local Runtime

Локальные runtime assumptions по умолчанию:

1. backend: `http://localhost:3021`
2. aroma web: `http://localhost:5174`
3. master web: `http://localhost:5176`
4. backend DB: `postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public`

Dev credentials из текущего seed:

1. `admin / admin`
2. `nomad / nomad`
3. daily code: `NOMAD-2026`

## Quick Start

### 1. Bootstrap

Выполнить:

```bash
./scripts/nomad/bootstrap-local.sh
```

Опции:

```bash
./scripts/nomad/bootstrap-local.sh --with-bot
./scripts/nomad/bootstrap-local.sh --skip-install
```

Скрипт:

1. ставит зависимости в Nomad-пакетах;
2. поднимает локальный Postgres для `apps/nomad-backend`;
3. генерирует Prisma client;
4. сбрасывает и накатывает локальную Nomad schema;
5. применяет seed.

### 2. Run stack

После bootstrap запускать сервисы в отдельных терминалах:

```bash
cd apps/nomad-backend && npm run dev
cd apps/nomad-aroma-web && npm run dev
cd apps/nomad-master-web && npm run dev
```

Bot запускать только если задача реально требует runtime-проверку:

```bash
cd services/nomad-telegram-bot && npm run start
```

### 3. Smoke

Тонкий browser smoke:

```bash
cd tests/nomad-smoke
npm run smoke
```

Этот smoke предполагает, что backend, `Арома Ателье` и `Мастер` уже запущены.

## Solo-Agent Dev Loop

Для любой заметной Nomad-задачи использовать такой цикл:

1. создать issue через `.github/ISSUE_TEMPLATE/nomad-feature.yml` для feature slice;
2. использовать локальный `docs/templates/ai-task-brief.md` только как fallback, если issue ещё не создан или задача остаётся вне GitHub;
3. зафиксировать bounded context и write scope;
4. выбрать single-agent или multi-agent режим;
5. выполнить один вертикальный slice;
6. запустить релевантные build/test/smoke checks;
7. оформить результат и риски через `docs/templates/agent-handoff.md`;
8. обновить `NOTES.md` и `HANDOFF.md`, если изменились правила, workflow, UX, startup, verification или delivery discipline;
9. открыть PR в `codex/nomad-parallel-track`;
10. пройти self-review до merge.

## Task Intake Minimum

Перед запуском агента задача должна содержать минимум:

1. `goal`
2. `contour`
3. `scope`
4. `out-of-scope`
5. `expected result`
6. `constraints`
7. `checks`
8. `human review needed`

Базовый путь для feature slice:

1. сначала заполнить `.github/ISSUE_TEMPLATE/nomad-feature.yml`;
2. для UI/redesign slices в `apps/nomad-master-web` обязательно зафиксировать:
   - `Design / UX baseline`
   - ссылки на visual references
   - ожидание по `shadcn/ui`, если он должен использоваться

Если issue ещё не создан, использовать [docs/templates/ai-task-brief.md](/Users/admin/PycharmProjects/yummy/docs/templates/ai-task-brief.md) как временный локальный контракт.

Если хотите, чтобы агент сам задал недостающие вопросы и собрал brief по шаблону, используйте `$nomad-task-intake`.

## Handoff Minimum

После каждого логического блока нужен handoff со следующими секциями:

1. `done`
2. `not done`
3. `files touched`
4. `checks run`
5. `risks`
6. `next agent`

Если запись делается для истории репозитория, использовать [docs/templates/agent-handoff.md](/Users/admin/PycharmProjects/yummy/docs/templates/agent-handoff.md) как исходную форму.

## Verification Baseline

Минимальный verification gate по changed scope:

1. `apps/nomad-aroma-web/`:
   `cd apps/nomad-aroma-web && npm run build`
2. `apps/nomad-master-web/`:
   `cd apps/nomad-master-web && npm test && npm run build`
3. `apps/nomad-backend/`:
   `cd apps/nomad-backend && npm test && npm run build`
4. `services/nomad-telegram-bot/`:
   `cd services/nomad-telegram-bot && npm test && npm run build`
5. UI or integration changes:
   `cd tests/nomad-smoke && npm run smoke`

Если smoke не запускался, это нужно явно указать в handoff.

## Когда обновлять NOTES.md и HANDOFF.md

Обновлять оба файла обязательно, если изменились:

1. процесс разработки;
2. startup/bootstrap;
3. verification path;
4. CI/workflow/governance;
5. product behavior;
6. UX/UI semantics;
7. repo-specific skills;
8. handoff rules.

## Связанные документы

1. `AGENTS.md`
2. `AI_DEVELOPMENT_PROCESS.md`
3. `WORKFLOW_NOMAD.md`
4. `.github/NOMAD_REVIEW_POLICY.md`
5. `docs/templates/ai-task-brief.md`
6. `docs/templates/agent-handoff.md`
7. `docs/skills/forward-testing.md`
