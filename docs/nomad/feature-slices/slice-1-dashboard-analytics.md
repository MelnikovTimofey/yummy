# [Nomad] Slice 1 — Dashboard analytics contract

_Локальный issue body mirror для `.github/ISSUE_TEMPLATE/nomad-feature.yml`._

## Primary scope

`apps/nomad-master-web`

## Problem

Текущий dashboard `Nomad Master` был банальной MVP-сводкой и не давал production-ready аналитики для решений по ассортименту и витринам. Не хватало разрезов по производителям, `flavorProfiles`, вкусам, динамики по окну времени, разделения `product metrics` и `ops metrics`, а также явных сигналов по blocked mixes и rail health.

## Success criteria

1. `GET /staff/dashboard/summary` отдаёт production-oriented contract с окнами `7d`, `14d`, `30d`;
2. dashboard разделяет `product metrics` и `ops metrics`;
3. inventory analytics включает breakdown по производителям, `flavorProfiles` и вкусам;
4. guest choice analytics включает top mixes по выборам и оценкам, rating distribution и daily trend;
5. UI dashboard не смешан с inventory CRUD и может служить входной точкой в action surfaces;
6. frontend и backend проверки проходят.

## Active scope

- `apps/nomad-backend/src/**`
- `apps/nomad-master-web/src/**`
- `apps/nomad-master-web/README.md`
- `NOTES.md`
- `HANDOFF.md`

## Out of scope

- table-first inventory UI
- bulk inventory operations
- новый component editor для mixes
- rail management hardening
- access/Telegram redesign

## Constraints

- интерфейс на русском языке
- не трогать legacy runtime paths
- product semantics `Покурить` остаётся аналитическим событием выбора микса
- breakdown по вкусовым атрибутам должен использовать разделение `flavorProfiles`, `flavors`, `flavorTags`
- если метрики требуют schema change, задача уходит в `Human Review`

## Design / UX baseline

- использовать `shadcn/ui` там, где это уместно и не требует broad rewrite текущего slice
- не оставлять default Codex-generated UI как финальный visual layer
- целиться в premium HoReCa console, а не generic admin SaaS
- использовать TIMELESS / TIS как visual benchmark

## References

- [nomad-feature.yml](/Users/admin/PycharmProjects/yummy/.github/ISSUE_TEMPLATE/nomad-feature.yml)
- [master-production-redesign.md](/Users/admin/PycharmProjects/yummy/docs/nomad/master-production-redesign.md)
- [Slice 1 commit context in HANDOFF](/Users/admin/PycharmProjects/yummy/HANDOFF.md)
- [TIMELESS article](https://vc.ru/offline/1765963-osnovatel-timeless-kak-delat-next-gen-v-horeca)

## Checks

```bash
cd apps/nomad-backend && npm test && npm run build
cd apps/nomad-master-web && npm test && npm run build
git diff --check
```

## Risk flags

- [ ] Нужен Human Review из-за schema/auth/env/runtime
- [x] Задача затрагивает public contract
- [ ] Задача меняет process/workflow/docs rules
- [x] Можно делать как локальный bounded slice без cross-app rewrite
- [x] Это UI/redesign slice для `apps/nomad-master-web` и нужен visual benchmark / design sign-off
