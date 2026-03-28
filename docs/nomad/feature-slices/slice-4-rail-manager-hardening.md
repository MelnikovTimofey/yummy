# [Nomad] Slice 4 — Rail manager hardening

_Локальный issue body mirror для `.github/ISSUE_TEMPLATE/nomad-feature.yml`._

## Primary scope

`apps/nomad-master-web`

## Problem

`Rails` в `Nomad Master` пока недостаточно чётко разделяют auto-generated и editable сценарии. Оператору нужно видеть статистические rails, но понимать, что они read-only; editor rails должны редактироваться полноценно; новые rails должны создаваться без выбора типа, а сам flow выбора и порядка миксов должен стать удобным operational surface.

## Success criteria

1. statistical rails `Больше всего выбирают` и `Лучшие оценки` отображаются, но помечены как read-only;
2. contract явно несёт editability status и причину блокировки редактирования;
3. prepared/editorial rails и мастерские rails редактируемы;
4. создание нового rail не требует выбора типа и всегда создаёт editable master-curated rail;
5. выбор и reorder миксов внутри rail становится удобным отдельным flow;
6. проверки backend/frontend проходят.

## Active scope

- `apps/nomad-backend/src/**`
- `apps/nomad-master-web/src/**`
- `apps/nomad-master-web/README.md`
- `NOTES.md`
- `HANDOFF.md`

## Out of scope

- redesign inventory and mix editor beyond points интеграции
- Telegram access flow
- изменения guest rail ranking semantics за пределами утверждённого auto-rail contract
- process/workflow refactor

## Constraints

- интерфейс на русском языке
- statistical rails создаются автоматически и не редактируются мастером
- prepared/editorial rails остаются редактируемыми
- новые rails, созданные мастером, всегда мастерские и не требуют выбора типа
- если auto rail logic меняет guest ranking semantics шире текущего PRD, нужен human review

## Design / UX baseline

- использовать `shadcn/ui` для list/table primitives, reorder-friendly dialogs/sheets и selection UI там, где это полезно для bounded slice
- read-only и editable rails должны различаться визуально и семантически, а не только текстом
- визуальное направление: premium operational curation tool, близкий к TIMELESS / TIS по аккуратности и уверенности интерфейса
- не принимать default Codex-generated cards как финальную структуру manager flow

## References

- [nomad-feature.yml](/Users/admin/PycharmProjects/yummy/.github/ISSUE_TEMPLATE/nomad-feature.yml)
- [master-production-redesign.md](/Users/admin/PycharmProjects/yummy/docs/nomad/master-production-redesign.md)
- [TIMELESS article](https://vc.ru/offline/1765963-osnovatel-timeless-kak-delat-next-gen-v-horeca)

## Checks

```bash
cd apps/nomad-backend && npm test && npm run build
cd apps/nomad-master-web && npm test && npm run build
cd tests/nomad-smoke && npm run smoke
git diff --check
```

## Risk flags

- [ ] Нужен Human Review из-за schema/auth/env/runtime
- [x] Задача затрагивает public contract
- [ ] Задача меняет process/workflow/docs rules
- [x] Можно делать как локальный bounded slice без cross-app rewrite
- [x] Это UI/redesign slice для `apps/nomad-master-web` и нужен visual benchmark / design sign-off
