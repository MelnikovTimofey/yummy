# AI Task Brief

Использовать этот шаблон перед запуском заметной Nomad-задачи в Codex или multi-agent flow.

## Goal

Коротко: что должно измениться и зачем.

## Contour

- `Nomad`
- `legacy Yummy`

## Scope

Разрешённые write paths:

- `...`

Разрешённые read paths, если они шире write scope:

- `...`

## Out Of Scope

Что нельзя трогать в этой задаче:

- `...`

## Expected Result

Что должно работать в конце:

- `...`

## Constraints

Продуктовые, архитектурные, UX или runtime-ограничения:

- `...`

## Checks

Какие команды или smoke-проходы обязательны:

```bash
# example
cd apps/nomad-backend && npm test && npm run build
cd tests/nomad-smoke && npm run smoke
```

## Human Review Needed

- `yes`
- `no`

Если `yes`, указать причину:

- `schema/auth/env/runtime/process/public contract/...`

## Notes For AI Lead

Если задача пойдёт через несколько агентов, зафиксировать:

1. single-agent или multi-agent;
2. write scope каждого worker;
3. verification owner;
4. merge owner.
