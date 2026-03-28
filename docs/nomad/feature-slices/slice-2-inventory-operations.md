# [Nomad] Slice 2 — Inventory operations hardening

_Локальный issue body mirror для `.github/ISSUE_TEMPLATE/nomad-feature.yml`._

## Primary scope

`apps/nomad-master-web`

## Problem

Inventory в `Nomad Master` остаётся card-first CRUD и не годится для ежедневной операционной работы. Нет table view, фильтров по ключевым атрибутам, bulk selection, batch actions и быстрого понимания того, какие миксы зависят от конкретных табаков.

## Success criteria

1. backend list contract поддерживает filters, search и sort для inventory;
2. backend поддерживает batch operations для `вернуть в наличие`, `убрать из наличия` и согласованного `delete/archive` действия;
3. UI inventory становится table-first экраном с bulk selection;
4. фильтры покрывают наличие, производителя, `flavorProfiles`, вкусы и при необходимости мета-теги;
5. у оператора есть быстрый путь к зависимым миксам;
6. проверки backend/frontend проходят, а batch behavior покрыт тестами.

## Active scope

- `apps/nomad-backend/src/**`
- `apps/nomad-master-web/src/**`
- `apps/nomad-master-web/README.md`
- `NOTES.md`
- `HANDOFF.md`

## Out of scope

- redesign dashboard analytics beyond integration with new inventory signals
- новый mix component editor
- rail creation and read-only semantics
- Telegram access flow
- broad schema migration вне inventory contract

## Constraints

- интерфейс на русском языке
- table-first UX обязателен; карточки не могут оставаться основным operational mode
- фильтры по вкусовым данным должны соблюдать разделение `flavorProfiles`, `flavors`, `flavorTags`
- bulk operations не должны ломать guest recommendations и current availability semantics
- решение `delete` vs `archive` требует product sign-off, если меняет inventory semantics

## Design / UX baseline

- использовать `shadcn/ui` для таблиц, dropdown filters, dialog/sheet и selection controls там, где это ускоряет slice
- не оставлять generated-by-default admin layout как финальный UI
- визуальный тон: premium staff console для HoReCa с тёплой layered surface архитектурой
- использовать TIMELESS / TIS как benchmark по polish и ощущению собственного операционного продукта

## References

- [nomad-feature.yml](/Users/admin/PycharmProjects/yummy/.github/ISSUE_TEMPLATE/nomad-feature.yml)
- [master-production-redesign.md](/Users/admin/PycharmProjects/yummy/docs/nomad/master-production-redesign.md)
- [README for feature slices](/Users/admin/PycharmProjects/yummy/docs/nomad/feature-slices/README.md)
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
