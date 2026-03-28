# [Nomad] Slice 3 — Mix catalog and component editor

_Локальный issue body mirror для `.github/ISSUE_TEMPLATE/nomad-feature.yml`._

## Primary scope

`apps/nomad-master-web`

## Problem

Сценарий работы с миксами сейчас неудобен как для каталога, так и для наполнения. Ключевая проблема в отсутствии component-centric editor: оператор не управляет компонентами микса как структурой с долями, не видит rail membership и не работает с миксами через table-first flow.

## Success criteria

1. backend contract для микса использует `components[]` с `tobaccoId`, `proportion`, `sortOrder`;
2. UI mix catalog становится table-first экраном с фильтрами по доступности, вкусовым атрибутам, производителям компонентов и участию в rails;
3. редактор компонентов позволяет задавать доли через удобный percent picker / equivalent control;
4. сумма процентов валидируется явно и не проходит в неконсистентном состоянии;
5. оператор видит, в какие rails входит микс;
6. проверки backend/frontend проходят, а критическая валидация долей покрыта тестами.

## Active scope

- `apps/nomad-backend/src/**`
- `apps/nomad-master-web/src/**`
- `apps/nomad-master-web/README.md`
- `NOTES.md`
- `HANDOFF.md`

## Out of scope

- redesign inventory beyond dependency summaries
- broad rail manager rewrite, кроме отображения membership
- Telegram access flow
- guest-side recommendation rewrite
- shared package extraction

## Constraints

- интерфейс на русском языке
- компонентная модель микса должна быть прозрачной и тестируемой
- проценты должны иметь явную валидацию суммы и порядка компонентов
- удаление/скрытие микса не должно молча ломать guest catalog semantics
- вкусовые атрибуты в фильтрах и карточках соблюдают разделение `flavorProfiles`, `flavors`, `flavorTags`

## Design / UX baseline

- использовать `shadcn/ui` для table primitives, combobox/select, dialog, popover и form controls там, где это уместно
- не оставлять случайный generated form stack как финальный UX
- визуально это должен быть curated мастерский инструмент, а не сырой CRUD для сущности `mix`
- использовать TIMELESS / TIS как benchmark по плотности деталей, hierarchy и премиальному тону

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
