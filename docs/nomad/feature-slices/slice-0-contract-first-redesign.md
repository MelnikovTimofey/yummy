# [Nomad] Slice 0 — Contract-first redesign

_Локальный issue body mirror для `.github/ISSUE_TEMPLATE/nomad-feature.yml`._

## Primary scope

`repo ops / docs`

## Problem

`Nomad Master` застрял в состоянии broad MVP: dashboard, inventory, mixes, rails и access живут в одном сыром operational shell, а сам redesign до этого был зафиксирован только как общий план. Без отдельного contract-first slice легко смешать discovery, продуктовые решения, UI rewrite и backend contracts в один неуправляемый change-set.

## Success criteria

1. для `Nomad Master production redesign` существует формальный execution contract, который разбивает работу на проверяемые slices;
2. есть единый redesign document с target state для `dashboard`, `inventory`, `mixes`, `rails`, `access`;
3. определены `verification path`, `stop conditions`, `human review checkpoints` и допустимые agent scopes;
4. дальнейшие slices можно запускать без повторного discovery по базовым продуктовым рамкам.

## Active scope

- `docs/nomad/master-production-redesign.md`
- `NOMAD_IMPLEMENTATION_PLAN.md`
- `NOMAD_ROADMAP.md`
- `apps/nomad-master-web/README.md`
- `NOTES.md`
- `HANDOFF.md`

## Out of scope

- `apps/nomad-master-web/**` runtime implementation
- `apps/nomad-backend/**` runtime implementation
- `services/nomad-telegram-bot/**` runtime implementation
- любые schema/auth/env изменения

## Constraints

- интерфейсные и продуктовые термины остаются на русском языке
- `Nomad` развивается параллельно и не repurpose-ит legacy runtime paths
- `1 issue = 1 bounded context = 1 clear verification result`
- нельзя запускать multi-agent implementation до фиксации contracts и stop conditions
- `Арома Ателье` остаётся guest-контуром без auth

## Design / UX baseline

N/A

## References

- [nomad-feature.yml](/Users/admin/PycharmProjects/yummy/.github/ISSUE_TEMPLATE/nomad-feature.yml)
- [master-production-redesign.md](/Users/admin/PycharmProjects/yummy/docs/nomad/master-production-redesign.md)
- [PRD.md](/Users/admin/PycharmProjects/yummy/PRD.md)
- [NOMAD_IMPLEMENTATION_PLAN.md](/Users/admin/PycharmProjects/yummy/NOMAD_IMPLEMENTATION_PLAN.md)
- [NOMAD_ROADMAP.md](/Users/admin/PycharmProjects/yummy/NOMAD_ROADMAP.md)

## Checks

```bash
git diff --check
```

## Risk flags

- [ ] Нужен Human Review из-за schema/auth/env/runtime
- [ ] Задача затрагивает public contract
- [x] Задача меняет process/workflow/docs rules
- [x] Можно делать как локальный bounded slice без cross-app rewrite
- [ ] Это UI/redesign slice для `apps/nomad-master-web` и нужен visual benchmark / design sign-off
