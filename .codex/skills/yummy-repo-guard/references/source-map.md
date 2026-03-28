# Yummy Repo Guard Reference

## Source Map

Use this file to decide which documents govern the current task.

### Always read

1. `AGENTS.md`
2. `AI_DEVELOPMENT_PROCESS.md`

### Read for legacy Yummy tasks

1. `WORKFLOW.md`
2. `YummyWeb/README.md`
3. `backend/README.md`
4. `services/catalog-updater/README.md`

### Read for Nomad tasks

1. `WORKFLOW_NOMAD.md`
2. `PRD.md`
3. `NOMAD_IMPLEMENTATION_PLAN.md`
4. `NOMAD_PARALLEL_EXECUTION_PLAN.md`
5. `NOMAD_ROADMAP.md`
6. `NOMAD_ENV_MATRIX.md`
7. relevant app README in `apps/nomad-*` or `services/nomad-telegram-bot/`

## Contour Rules

### Legacy Yummy

Default active scope:

1. `YummyWeb/`
2. `backend/`
3. `services/catalog-updater/`

Do not change Nomad apps unless the task explicitly requires shared extraction.

### Nomad

Default active scope:

1. `apps/nomad-aroma-web/`
2. `apps/nomad-master-web/`
3. `apps/nomad-backend/`
4. `services/nomad-telegram-bot/`

Do not repurpose `YummyWeb/`, `backend/`, or `services/catalog-updater/` as Nomad runtime paths.

## Reuse Decision

Use exactly one label:

1. `copy with adaptation`
   when the legacy idea is useful but the runtime must stay isolated.
2. `extract shared module`
   only after duplication is understood and human review agrees on shared ownership.
3. `keep separate`
   when coupling would create product or operational risk.

## Execution Mode Rules

1. `single-agent`
   default for architecture, schema, auth, public contracts, and unclear tasks.
2. `multi-agent`
   allowed only with fixed contracts and non-overlapping write scopes.
3. `Symphony`
   use only for many small safe tasks with one bounded context per issue.
