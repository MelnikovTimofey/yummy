# Nomad Task Intake Checklist

## Field order

1. `Goal`
2. `Contour`
3. `Scope`
4. `Out of scope`
5. `Expected result`
6. `Constraints`
7. `Checks`
8. `Human review needed`

## Safe defaults

- `Contour: Nomad`, если пользователь явно говорит о Nomad.
- `Human review needed: no`, если изменение локальное и не затрагивает schema/auth/env/runtime/process.
- Базовые проверки по scope:
  - `apps/nomad-aroma-web`: `cd apps/nomad-aroma-web && npm run build`
  - `apps/nomad-master-web`: `cd apps/nomad-master-web && npm test && npm run build`
  - `apps/nomad-backend`: `cd apps/nomad-backend && npm test && npm run build`
  - UI или cross-app integration: `cd tests/nomad-smoke && npm run smoke`

## Обязательная эскалация

Нужно уточнение или `Human review needed: yes`, если задача:

- шире одного bounded context;
- звучит как `переделай весь Nomad`;
- смешивает `Nomad` и `legacy Yummy` в одном изменении;
- затрагивает schema/auth/env/runtime;
- затрагивает `.github/**`, `.codex/skills/**`, `AGENTS.md`, `AI_DEVELOPMENT_PROCESS.md`, `WORKFLOW_NOMAD.md`;
- не содержит проверяемого expected result.

## Финальная форма brief

```md
Контур: Nomad
Тип: feature | bug | docs | ops | visual polish
Goal: ...
Scope:
- ...

Out of scope:
- ...

Expected result:
- ...

Constraints:
- ...

Checks:
- ...

Human review needed: yes | no
```
