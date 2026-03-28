# [Nomad] Slice 6 — Hardening and QA

_Локальный issue body mirror для `.github/ISSUE_TEMPLATE/nomad-feature.yml`._

## Primary scope

`repo ops / docs`

## Problem

После реализации functional slices `Nomad Master` нужен не ещё один broad rewrite, а controlled hardening pass: smoke по ключевым staff flows, visual review, accessibility review, release-ready handoff и фиксация остаточных рисков. Без этого redesign может выглядеть завершённым по коду, но остаться нестабильным в реальном использовании.

## Success criteria

1. есть smoke для ключевых сценариев `dashboard`, `inventory`, `mixes`, `rails`, `access`;
2. проведён visual review относительно согласованного baseline;
3. проведён accessibility review для критических staff surfaces;
4. handoff фиксирует реальный verification набор и остаточные риски;
5. Nomad apps/services проходят релевантные build/test/smoke gates.

## Active scope

- `tests/nomad-smoke/**`
- `apps/nomad-master-web/**`
- `apps/nomad-backend/**`
- `services/nomad-telegram-bot/**`
- `NOTES.md`
- `HANDOFF.md`

## Out of scope

- новый продуктовый redesign сверх уже утверждённых slices
- broad schema/auth refactor
- legacy contour changes
- новые design system foundations вне нужного hardening

## Constraints

- интерфейс на русском языке
- hardening не должен превращаться в новый бесконтрольный feature slice
- если smoke недоступен из-за окружения, это должно быть явно отмечено в handoff
- visual/accessibility review должны опираться на уже зафиксированный baseline, а не придумывать новый visual direction

## Design / UX baseline

- подтверждать соответствие `shadcn/ui + custom premium layer`, если этот путь был выбран в предыдущих slices
- проверять, что интерфейс не откатился в default Codex-generated visual language
- валидировать консоль против premium HoReCa benchmark уровня TIMELESS / TIS

## References

- [nomad-feature.yml](/Users/admin/PycharmProjects/yummy/.github/ISSUE_TEMPLATE/nomad-feature.yml)
- [master-production-redesign.md](/Users/admin/PycharmProjects/yummy/docs/nomad/master-production-redesign.md)
- [nomad-accessibility-review skill](/Users/admin/PycharmProjects/yummy/.codex/skills/nomad-accessibility-review/SKILL.md)
- [nomad-ui-visual-review skill](/Users/admin/PycharmProjects/yummy/.codex/skills/nomad-ui-visual-review/SKILL.md)
- [TIMELESS article](https://vc.ru/offline/1765963-osnovatel-timeless-kak-delat-next-gen-v-horeca)

## Checks

```bash
cd apps/nomad-backend && npm test && npm run build
cd apps/nomad-master-web && npm test && npm run build
cd services/nomad-telegram-bot && npm test && npm run build
cd tests/nomad-smoke && npm run smoke
git diff --check
```

## Risk flags

- [x] Нужен Human Review из-за schema/auth/env/runtime
- [ ] Задача затрагивает public contract
- [ ] Задача меняет process/workflow/docs rules
- [ ] Можно делать как локальный bounded slice без cross-app rewrite
- [x] Это UI/redesign slice для `apps/nomad-master-web` и нужен visual benchmark / design sign-off
