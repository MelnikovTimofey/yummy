# NOTES

Обновление от 3 апреля 2026 (docs: сократить артефактные файлы и вынести полную историю в архив):
- Полные версии рабочих артефактов сохранены без сокращений:
  - `docs/artifacts/archive/2026-04-03-NOTES-full.md`
  - `docs/artifacts/archive/2026-04-03-HANDOFF-full.md`
- Основные `NOTES.md` и `HANDOFF.md` переведены в компактный rolling-формат:
  - здесь остаётся только актуальный срез и краткая история последних значимых блоков;
  - детальный журнал больше не дублируется в основном файле, если он уже сохранён в архиве.
- Это docs-only изменение: runtime, контракты и продуктовая семантика не менялись.

## Как вести файл дальше

- Держать в основном файле только актуальный контекст, нужный для следующего рабочего шага.
- Не тащить сюда полный changelog по каждому локальному микро-изменению, если для этого уже есть `HANDOFF.md` или архив.
- При очередном разрастании переносить старый хвост в новый archive snapshot, а не раздувать основной файл.

## Актуальный срез на 3 апреля 2026

### Repo-level

- `legacy Yummy` и `Nomad` по-прежнему изолированы; текущие активные изменения идут в Nomad-контуре.
- Для больших рабочих записей теперь используется схема:
  - compact main artifact;
  - full archive snapshot в `docs/artifacts/archive/`.

### Nomad Master

- В `Inventory` и `Mixes` giant tag walls заменены на компактные searchable multi-select фильтры.
- Создание нового микса вынесено в отдельный экран внутри вкладки `Миксы`; быстрое редактирование существующего микса остаётся рядом с каталогом.
- Последний UX pass уплотнил shell и navigation:
  - меньше пустого chrome;
  - top navigation вместо тяжёлого sidebar;
  - desktop-first operational layout без изменения backend/contracts.

### Nomad Backend / HTReviews

- Поднят изолированный HTReviews integration foundation:
  - preview import;
  - live sync в текущую Nomad DB;
  - detail backfill для вкусов, тегов и крепости.
- `NomadTobacco` расширен source-полями (`lineName`, source metadata, strength, status, country, image/raw tags).
- Новые HTReviews tobacco по умолчанию импортируются с `inStock=false`.
- Тестовый backend-контур вынесен в отдельную Prisma schema `nomad_test`; `resetNomadState()` запрещён вне test-mode без явного opt-in.

### Staff surfaces

- `Inventory` в `Nomad Master` показывает линейку, крепость, страну, статус и описание табака.
- По клику на табак открывается popup-карточка с атрибутами и зависимыми миксами.
- `Inventory` и `Mixes` работают с opt-in pagination и debounce поиска.

### Фактическое рабочее состояние каталога

- После live rebuild текущий Nomad-каталог собран поверх HTReviews-данных.
- В зафиксированном состоянии из полного журнала:
  - `1674` tobacco rows;
  - `1674` rows с `sourceKind='htreviews'`;
  - `14` rows `inStock=true`;
  - `11` mixes;
  - `3` rails.

## Последние значимые блоки

### 3 апреля 2026 — Nomad Master UX cleanup

- Компактные multi-select фильтры для `Inventory` и `Mixes`.
- Отдельный экран создания микса.
- Проверки в полном журнале: `npm test`, `npm run build`, `git diff --check`, targeted browser pass.

### 3 апреля 2026 — HTReviews live catalog и enrichment

- Live sync в текущую БД, затем controlled rebuild каталога.
- Detail backfill подтянул strength, taste tags и derived taxonomy.
- Добавлены safe operational scripts:
  - `import:htreviews:preview`
  - `sync:htreviews`
  - `rebuild:live-catalog`
  - `backfill:htreviews:details`

### 3 апреля 2026 — Staff inventory usability

- Tobacco popup-card в `Nomad Master`.
- Pagination + debounce для `Inventory` и `Mixes`.
- Контракты backend/frontend синхронизированы под paginated staff lists.

## Архив

- Полная прежняя история `NOTES.md`: `docs/artifacts/archive/2026-04-03-NOTES-full.md`
- Полная прежняя история `HANDOFF.md`: `docs/artifacts/archive/2026-04-03-HANDOFF-full.md`
