# HANDOFF — Yummy

## 2.21) Docs (3 апреля 2026) — сократить `NOTES.md` и `HANDOFF.md`, полную историю вынести в архив

- Запрос:
  - сократить разросшиеся артефактные файлы;
  - сохранить полный журнал без потери информации.

- Реализация:
  - созданы archive snapshot'ы:
    - `docs/artifacts/archive/2026-04-03-NOTES-full.md`
    - `docs/artifacts/archive/2026-04-03-HANDOFF-full.md`
  - основные `NOTES.md` и `HANDOFF.md` переписаны в компактный rolling-формат;
  - в основных файлах оставлен:
    - актуальный operational context;
    - краткий срез последних значимых блоков;
    - ссылки на полный архив.

- Проверки:
  - `wc -l docs/artifacts/archive/2026-04-03-NOTES-full.md docs/artifacts/archive/2026-04-03-HANDOFF-full.md`
  - `git diff --check`

- Остаточный риск:
  - старые записи теперь нужно искать через archive snapshot, а не в корневом артефакте;
  - если позже понадобится machine-parsed полный changelog из корневых файлов, текущий compact format придётся учесть отдельно.

- Эффект:
  - рабочие артефакты снова короткие и читаемые;
  - полная история сохранена без удаления.

## Активный срез на 3 апреля 2026

### Nomad Master

- `Inventory` и `Mixes` переведены на компактные searchable multi-select фильтры вместо длинных облаков тегов.
- Создание нового микса вынесено в отдельный экран; быстрый edit-flow существующих миксов остаётся рядом с каталогом.
- Последний UX pass уплотнил shell:
  - top navigation вместо тяжёлого sidebar;
  - меньше пустого chrome;
  - более плотные toolbars, stats и form surfaces.

Проверенный контур:
- `cd apps/nomad-master-web && npm test`
- `cd apps/nomad-master-web && npm run build`
- targeted browser pass через `Playwright`

Остаточный риск:
- `Master` всё ещё desktop-first; отдельный mobile/tablet sign-off не был целью последних pass'ов.

### HTReviews / Nomad Backend

- Добавлен изолированный integration foundation для `https://htreviews.org`.
- Подняты operational scripts:
  - `npm run import:htreviews:preview`
  - `npm run sync:htreviews`
  - `npm run rebuild:live-catalog`
  - `npm run backfill:htreviews:details`
- `NomadTobacco` расширен source metadata, line-level identity и табачными атрибутами.
- Backend tests переведены в отдельную Prisma schema `nomad_test`.
- `resetNomadState()` запрещён вне test-mode без явного opt-in.

Фактический live-state из последнего полного журнала:
- `1674` tobacco rows total
- `1674` rows с `sourceKind='htreviews'`
- `14` rows `inStock=true`
- `11` mixes
- `3` rails

Проверенный контур:
- `cd apps/nomad-backend && npm test`
- `cd apps/nomad-backend && npm run build`
- targeted live scripts против `public` schema по отдельным handoff block'ам

Остаточный риск:
- live catalog сейчас зависит от rule-based rebuild overrides;
- для richer taxonomy или более глубокого enrichment нужен отдельный controlled slice, а не быстрый operational rerun.

### Staff inventory / mixes

- `Inventory` теперь показывает strength, country, production status и description.
- По клику на табак открывается popup-карточка с атрибутами и зависимыми миксами.
- `Inventory` и `Mixes` получили opt-in pagination и debounce поиска.

Проверенный контур:
- `cd apps/nomad-master-web && npm test`
- `cd apps/nomad-master-web && npm run build`
- `cd apps/nomad-backend && npm test`

Остаточный риск:
- после pagination стоит при следующем smoke-pass руками подтвердить page switching и поведение после batch/update действий.

## Архив полной истории

- Полный старый `NOTES.md`: `docs/artifacts/archive/2026-04-03-NOTES-full.md`
- Полный старый `HANDOFF.md`: `docs/artifacts/archive/2026-04-03-HANDOFF-full.md`
