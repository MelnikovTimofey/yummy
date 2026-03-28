# [Nomad] Slice 5 — Access and Telegram redesign

_Локальный issue body mirror для `.github/ISSUE_TEMPLATE/nomad-feature.yml`._

## Primary scope

`apps/nomad-backend`

## Problem

Текущий access flow ориентирован на MVP-модель `staff accounts + Telegram recipients`, тогда как целевой операционный сценарий уже уточнён: один admin контур, allowlist операторов по `имя + телефон`, first-link через `share contact` в Telegram и получение актуального daily code по запросу `/code`, без ручной отправки из `Мастера`.

## Success criteria

1. backend contract поддерживает `phone allowlist + linked chat` и request-based bot flow;
2. UI `Мастера` показывает allowlist операторов, текущий daily code и bot observability вместо operator-driven send flow;
3. Telegram-бот поддерживает `share contact -> link -> /code`;
4. ручное создание или ручная отправка кода убраны из основного operator path;
5. operational visibility по Telegram automation и последнему запросу кода остаётся доступной;
6. проверки backend/master/bot проходят.

## Active scope

- `apps/nomad-backend/src/**`
- `apps/nomad-master-web/src/**`
- `services/nomad-telegram-bot/**`
- `apps/nomad-master-web/README.md`
- `NOTES.md`
- `HANDOFF.md`

## Out of scope

- полноценный multi-staff contour
- role matrix beyond current one-admin operating model
- broad auth redesign за пределами согласованного access slice
- guest-side onboarding or recommendation changes
- legacy Telegram/runtime reuse without explicit decision

## Constraints

- интерфейс на русском языке
- код доступа не должен создаваться вручную как основной сценарий
- текущая рабочая модель остаётся `один админ, под которым ходят все` до второго этапа
- schema/runtime изменения допустимы только после явного product confirmation по Telegram semantics
- Telegram delivery flow должен оставаться наблюдаемым и диагностируемым

## Design / UX baseline

- использовать `shadcn/ui` там, где это помогает собрать ясный admin flow без случайного form CRUD
- интерфейс должен выглядеть как уверенный operational console, а не как техническая панель интеграции
- TIMELESS / TIS использовать как benchmark по polished admin experience, но без слепого копирования UI

## References

- [nomad-feature.yml](/Users/admin/PycharmProjects/yummy/.github/ISSUE_TEMPLATE/nomad-feature.yml)
- [master-production-redesign.md](/Users/admin/PycharmProjects/yummy/docs/nomad/master-production-redesign.md)
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
- [x] Задача затрагивает public contract
- [ ] Задача меняет process/workflow/docs rules
- [ ] Можно делать как локальный bounded slice без cross-app rewrite
- [x] Это UI/redesign slice для `apps/nomad-master-web` и нужен visual benchmark / design sign-off
